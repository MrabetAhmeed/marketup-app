/* eslint-disable @typescript-eslint/no-explicit-any */
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { connectDb } from "@/lib/db";
import { AuthError, ConflictError, AppError } from "@/lib/api-error";
import { sendOtpEmail, sendPasswordResetEmail, sendPasswordChangedEmail } from "@/lib/email/sender";
import { env } from "@/lib/env";
import { otpSendLimit, passwordResetLimit } from "@/lib/rate-limit";
import { generateSlug, ensureUniqueSlug } from "@/lib/slug";
import { AdminUser } from "@/models/admin-user.model";
import { Company } from "@/models/company.model";
import { Gouvernorat } from "@/models/gouvernorat.model";
import { Sector } from "@/models/sector.model";
import { Profile } from "@/models/profile.model";
import { BrandUp } from "@/models/profile-brandup.model";
import { TraceUp } from "@/models/profile-traceup.model";
import { LinkUp } from "@/models/profile-linkup.model";
import { User } from "@/models/user.model";

// Mongoose 9 strict types require casts for dynamic queries
const UserModel = User as any;
const CompanyModel = Company as any;
const AdminUserModel = AdminUser as any;
const SectorModel = Sector as any;
const GouvernoratModel = Gouvernorat as any;
const ProfileModel = Profile as any;
const BrandUpModel = BrandUp as any;
const TraceUpModel = TraceUp as any;
const LinkUpModel = LinkUp as any;

const PROFILE_MODELS = { brandup: BrandUpModel, traceup: TraceUpModel, linkup: LinkUpModel } as const;

import { BCRYPT_ROUNDS, BCRYPT_OTP_ROUNDS } from "@/lib/crypto";
const OTP_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes
const OTP_MAX_ATTEMPTS = 5;
const RESET_TOKEN_EXPIRY_MS = 60 * 60 * 1000; // 60 minutes
const ORPHAN_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateOtp(): string {
  return crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");
}

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return "***@***";
  const visible = local.slice(0, 3);
  return `${visible}***@${domain}`;
}

// ---------------------------------------------------------------------------
// Step 1: Signup Company
// ---------------------------------------------------------------------------

interface SignupCompanyInput {
  type: "B2B" | "B2C";
  displayName: string;
  legalId: string;
  vatNumber?: string | null;
  accountEmail: string;
  sectorId: string;
  gouvernorat: string;
  ville: string;
  address?: string | null;
  identityDocumentUrl?: string | null;
}

interface SignupCompanyResult {
  userId: string;
  companyId: string;
  emailMasked: string;
}

export async function signupCompany(input: SignupCompanyInput): Promise<SignupCompanyResult> {
  await connectDb();

  const email = input.accountEmail.toLowerCase().trim();

  // --- Email reuse check ---
  const existingUser = await UserModel.findOne({ email }).setOptions({ withDeleted: true });

  if (existingUser) {
    if (existingUser.emailVerifiedAt) {
      throw new ConflictError("EMAIL_ALREADY_USED", "Cet email est déjà utilisé par un compte actif.");
    }

    if (existingUser.passwordHash) {
      // User completed step 2 (has password) but never verified email — they must login + OTP
      throw new ConflictError("EMAIL_ALREADY_USED", "Cet email est déjà utilisé. Connectez-vous.");
    }

    // No passwordHash = step 1 only, incomplete signup — overwrite allowed
    if (existingUser.companyId) {
      await CompanyModel.deleteOne({ _id: existingUser.companyId });
    }
    await UserModel.deleteOne({ _id: existingUser._id });
  }

  // --- Validate references ---
  const sectorExists = await SectorModel.exists({ slug: input.sectorId });
  if (!sectorExists) {
    throw new AppError("INVALID_SECTOR", "Secteur invalide.", 400);
  }

  const gouvExists = await GouvernoratModel.exists({ slug: input.gouvernorat });
  if (!gouvExists) {
    throw new AppError("INVALID_GOUVERNORAT", "Gouvernorat invalide.", 400);
  }

  // --- Atomic Company + User creation ---
  const slug = await ensureUniqueSlug(generateSlug(input.displayName));

  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    const [company] = await CompanyModel.create(
      [
        {
          slug,
          type: input.type,
          legalId: input.legalId,
          vatNumber: input.vatNumber || null,
          identityDocumentUrl: input.identityDocumentUrl ?? null,
          country: "TN",
          accountEmail: email,
          data: {
            displayName: { fr: input.displayName, ar: "", en: "" },
            logoUrl: null,
            bannerUrl: null,
            color: "#0078D4",
          },
          liveData: {
            sectorId: input.sectorId,
            gouvernorat: input.gouvernorat,
            ville: input.ville,
            address: input.address || null,
            contactEmail: email,
            phone: null,
            whatsapp: null,
            languages: ["fr"],
          },
          status: "pending",
          ownerUserId: new mongoose.Types.ObjectId(), // placeholder, updated below
        },
      ],
      { session },
    );

    const [user] = await UserModel.create(
      [
        {
          email,
          companyId: company._id,
          role: "OWNER",
          languages: ["fr"],
        },
      ],
      { session },
    );

    // Fix the ownerUserId back-reference
    company.ownerUserId = user._id;
    await company.save({ session });

    await session.commitTransaction();

    return {
      userId: (user._id as mongoose.Types.ObjectId).toString(),
      companyId: (company._id as mongoose.Types.ObjectId).toString(),
      emailMasked: maskEmail(email),
    };
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
}

// ---------------------------------------------------------------------------
// ensureProfilesForCompany — idempotent, creates missing profiles (E11000-safe)
// ---------------------------------------------------------------------------

export async function ensureProfilesForCompany(companyId: string | mongoose.Types.ObjectId): Promise<void> {
  for (const kind of ["brandup", "traceup", "linkup"] as const) {
    try {
      await PROFILE_MODELS[kind].create({
        companyId,
        status: "incomplete",
        isPublic: true,
        data: {},
        stats: { viewsTotal: 0, views30d: 0, clicksTotal: 0 },
      });
    } catch (err: unknown) {
      // Ignore duplicate key (E11000) — profile already exists
      if (err instanceof Error && "code" in err && (err as any).code !== 11000) throw err;
    }
  }
}

// ---------------------------------------------------------------------------
// Step 2: Signup User
// ---------------------------------------------------------------------------

interface SignupUserInput {
  userId: string;
  firstName: string;
  lastName: string;
  phone: string;
  whatsapp: string;
  languages: string[];
  password: string;
  acceptedTermsAt?: string;
}

interface SignupUserResult {
  sent: boolean;
  expiresAt: Date;
}

export async function signupUser(input: SignupUserInput): Promise<SignupUserResult> {
  await connectDb();

  const user = await UserModel.findById(input.userId);
  if (!user) {
    throw new AuthError("USER_NOT_FOUND", "Utilisateur introuvable.", 404);
  }
  if (user.emailVerifiedAt) {
    throw new ConflictError("ALREADY_VERIFIED", "Compte déjà vérifié, connectez-vous.");
  }
  if (user.passwordHash) {
    throw new ConflictError("STEP_ALREADY_COMPLETED", "L'étape 2 a déjà été complétée. Vérifiez votre email.");
  }

  // Hash password — NEVER log the plaintext
  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);

  // Generate OTP
  const otp = generateOtp();
  const otpHash = await bcrypt.hash(otp, BCRYPT_OTP_ROUNDS);
  const otpExpiresAt = new Date(Date.now() + OTP_EXPIRY_MS);

  user.firstName = input.firstName;
  user.lastName = input.lastName;
  user.languages = input.languages;
  user.passwordHash = passwordHash;
  user.acceptedTermsAt = input.acceptedTermsAt ? new Date(input.acceptedTermsAt) : new Date();
  user.otpHash = otpHash;
  user.otpExpiresAt = otpExpiresAt;
  user.otpAttempts = 0;
  user.otpLastSentAt = new Date();
  await user.save();

  // Write phone + whatsapp to Company.liveData + ownerFullName (denormalized for search)
  await CompanyModel.findByIdAndUpdate(user.companyId, {
    $set: {
      "liveData.phone": input.phone,
      "liveData.whatsapp": input.whatsapp,
      ownerFullName: `${input.firstName} ${input.lastName}`.trim(),
    },
  });

  // Send OTP email
  await sendOtpEmail(user.email, otp);

  return { sent: true, expiresAt: otpExpiresAt };
}

// ---------------------------------------------------------------------------
// Step 3: Verify OTP
// ---------------------------------------------------------------------------

interface VerifyOtpInput {
  userId: string;
  otpCode: string;
}

interface VerifyOtpResult {
  user: { id: string; email: string; firstName: string };
  company: { id: string; displayName: string; status: string };
  next: "WAIT_ADMIN_VALIDATION";
}

export async function verifyOtp(input: VerifyOtpInput): Promise<VerifyOtpResult> {
  await connectDb();

  const user = await UserModel.findById(input.userId);
  if (!user) {
    throw new AuthError("USER_NOT_FOUND", "Utilisateur introuvable.", 404);
  }
  if (user.emailVerifiedAt) {
    throw new ConflictError("ALREADY_VERIFIED", "Compte déjà vérifié.");
  }
  if (!user.otpHash) {
    throw new AppError("NO_OTP", "Aucun code en attente. Complétez l'étape 2 d'abord.", 400);
  }

  // Defense-in-depth: step 2 must have populated these before OTP verify
  if (!user.firstName || !user.lastName || !user.passwordHash) {
    throw new AppError("SIGNUP_INCOMPLETE", "Complétez l'étape 2 d'abord.", 400);
  }

  // Check expiry
  if (!user.otpExpiresAt || new Date() > new Date(user.otpExpiresAt)) {
    throw new AppError("OTP_EXPIRED", "Code expiré. Demandez un nouveau code.", 410);
  }

  // Check attempts
  if (user.otpAttempts >= OTP_MAX_ATTEMPTS) {
    throw new AppError("OTP_LOCKED", "Trop de tentatives. Demandez un nouveau code.", 429);
  }

  // Verify OTP
  const valid = await bcrypt.compare(input.otpCode, user.otpHash);
  if (!valid) {
    user.otpAttempts += 1;
    await user.save();
    throw new AuthError("OTP_INVALID", "Code incorrect.", 401);
  }

  // Success — mark email as verified, clear OTP fields
  user.emailVerifiedAt = new Date();
  user.otpHash = null;
  user.otpExpiresAt = null;
  user.otpAttempts = 0;
  user.otpLastSentAt = null;
  await user.save();

  // Create 3 empty profiles for the company (idempotent)
  await ensureProfilesForCompany(user.companyId);

  const company = await CompanyModel.findById(user.companyId);

  return {
    user: {
      id: (user._id as mongoose.Types.ObjectId).toString(),
      email: user.email,
      firstName: user.firstName,
    },
    company: {
      id: company ? (company._id as mongoose.Types.ObjectId).toString() : "",
      displayName: company?.data?.displayName?.fr || "",
      status: company?.status || "pending",
    },
    next: "WAIT_ADMIN_VALIDATION",
  };
}

// ---------------------------------------------------------------------------
// Login
// ---------------------------------------------------------------------------

interface LoginResult {
  id: string;
  email: string;
  companyId: string | null;
  role: "OWNER" | "SUPER_ADMIN";
  companyStatus: "pending" | "active" | "rejected" | "suspended" | "deleted" | null;
}

export async function login(email: string, password: string): Promise<LoginResult> {
  await connectDb();

  const normalizedEmail = email.toLowerCase().trim();

  // Try User first
  const user = await UserModel.findOne({ email: normalizedEmail });

  if (user) {
    if (!user.passwordHash) {
      // No passwordHash = step 1 only — generic response (anti-enumeration)
      throw new AuthError("INVALID_CREDENTIALS", "Email ou mot de passe incorrect.", 401);
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      throw new AuthError("INVALID_CREDENTIALS", "Email ou mot de passe incorrect.", 401);
    }

    if (!user.emailVerifiedAt) {
      throw new AuthError("EMAIL_NOT_VERIFIED", "Votre email n'est pas vérifié.", 403, {
        userId: (user._id as mongoose.Types.ObjectId).toString(),
        accountEmail: user.email,
      });
    }

    const company = await CompanyModel.findById(user.companyId);
    if (!company) {
      throw new AuthError("NO_COMPANY", "Aucune entreprise associée.", 403);
    }

    // Rejected: allow login (user can correct + resubmit)
    // Active: allow login (normal flow)
    // All others: block
    if (company.status !== "active" && company.status !== "rejected") {
      if (company.status === "pending") {
        throw new AuthError("COMPANY_PENDING", "Votre compte est en attente de validation.", 403, {
          submittedAt: company.registeredAt ? new Date(company.registeredAt).toISOString() : null,
        });
      }
      if (company.status === "suspended") {
        throw new AuthError("COMPANY_SUSPENDED", "Votre compte a été désactivé.", 403);
      }
      throw new AuthError("COMPANY_NOT_ACTIVE", "Compte inactif.", 403, { status: company.status });
    }

    user.lastLoginAt = new Date();
    await user.save();

    // Lazy safety net: create missing profiles for existing accounts
    const profileCount = await ProfileModel.countDocuments({ companyId: company._id });
    if (profileCount < 3) {
      await ensureProfilesForCompany(company._id);
    }

    return {
      id: (user._id as mongoose.Types.ObjectId).toString(),
      email: user.email,
      companyId: (company._id as mongoose.Types.ObjectId).toString(),
      role: "OWNER",
      companyStatus: company.status as LoginResult["companyStatus"],
    };
  }

  // Try AdminUser
  const admin = await AdminUserModel.findOne({ email: normalizedEmail });
  if (admin) {
    const valid = await bcrypt.compare(password, admin.passwordHash);
    if (!valid) {
      throw new AuthError("INVALID_CREDENTIALS", "Email ou mot de passe incorrect.", 401);
    }

    admin.lastLoginAt = new Date();
    await admin.save();

    return {
      id: (admin._id as mongoose.Types.ObjectId).toString(),
      email: admin.email,
      companyId: null,
      role: "SUPER_ADMIN",
      companyStatus: null,
    };
  }

  // Neither found
  throw new AuthError("INVALID_CREDENTIALS", "Email ou mot de passe incorrect.", 401);
}

// ---------------------------------------------------------------------------
// Resend OTP (for signup flow — by userId)
// ---------------------------------------------------------------------------

export async function resendOtp(userId: string): Promise<{ expiresAt: Date }> {
  await connectDb();

  const user = await UserModel.findById(userId);
  if (!user) {
    throw new AuthError("USER_NOT_FOUND", "Utilisateur introuvable.", 404);
  }
  if (user.emailVerifiedAt) {
    throw new ConflictError("ALREADY_VERIFIED", "Compte déjà vérifié.");
  }
  if (!user.passwordHash) {
    throw new AppError("SIGNUP_INCOMPLETE", "Complétez l'étape 2 d'abord.", 400);
  }

  // Rate limit
  const limit = otpSendLimit.check(userId);
  if (!limit.allowed) {
    throw new AppError("RATE_LIMITED", "Veuillez patienter avant de renvoyer un code.", 429);
  }

  const otp = generateOtp();
  const otpHash = await bcrypt.hash(otp, BCRYPT_OTP_ROUNDS);
  const otpExpiresAt = new Date(Date.now() + OTP_EXPIRY_MS);

  user.otpHash = otpHash;
  user.otpExpiresAt = otpExpiresAt;
  user.otpAttempts = 0;
  user.otpLastSentAt = new Date();
  await user.save();

  await sendOtpEmail(user.email, otp);

  return { expiresAt: otpExpiresAt };
}

// ---------------------------------------------------------------------------
// Resend Validation Email (by email — anti-enumeration)
// ---------------------------------------------------------------------------

export async function resendValidationEmail(email: string): Promise<void> {
  await connectDb();

  const normalizedEmail = email.toLowerCase().trim();

  // Rate limit by email
  const limit = otpSendLimit.check(`resend-validation:${normalizedEmail}`);
  if (!limit.allowed) {
    // Silent — anti-enumeration (always return success)
    return;
  }

  const user = await UserModel.findOne({ email: normalizedEmail });
  if (!user || user.emailVerifiedAt || !user.passwordHash) {
    // Silent no-op — anti-enumeration
    return;
  }

  const otp = generateOtp();
  const otpHash = await bcrypt.hash(otp, BCRYPT_OTP_ROUNDS);
  const otpExpiresAt = new Date(Date.now() + OTP_EXPIRY_MS);

  user.otpHash = otpHash;
  user.otpExpiresAt = otpExpiresAt;
  user.otpAttempts = 0;
  user.otpLastSentAt = new Date();
  await user.save();

  await sendOtpEmail(user.email, otp);
}

// ---------------------------------------------------------------------------
// Forgot Password
// ---------------------------------------------------------------------------

export async function forgotPassword(email: string): Promise<void> {
  await connectDb();

  const normalizedEmail = email.toLowerCase().trim();

  // Rate limit
  const limit = passwordResetLimit.check(`forgot:${normalizedEmail}`);
  if (!limit.allowed) {
    // Silent — anti-enumeration
    return;
  }

  const user = await UserModel.findOne({ email: normalizedEmail });
  if (!user || !user.passwordHash) {
    // Anti-enumeration: silent no-op
    // Also covers users without passwordHash (step 1 only — no account to reset)
    return;
  }

  // Generate reset token
  const tokenBytes = crypto.randomBytes(32);
  const token = tokenBytes.toString("hex");
  const prefix = token.slice(0, 8);
  const tokenHash = await bcrypt.hash(token, BCRYPT_ROUNDS);

  user.passwordResetTokenHash = tokenHash;
  user.passwordResetTokenPrefix = prefix;
  user.passwordResetExpiresAt = new Date(Date.now() + RESET_TOKEN_EXPIRY_MS);
  await user.save();

  const resetUrl = `${env.NEXTAUTH_URL}/reset?token=${token}`;
  await sendPasswordResetEmail(user.email, resetUrl);
}

// ---------------------------------------------------------------------------
// Reset Password
// ---------------------------------------------------------------------------

export async function resetPassword(token: string, newPassword: string): Promise<void> {
  await connectDb();

  const prefix = token.slice(0, 8);

  const user = await UserModel.findOne({
    passwordResetTokenPrefix: prefix,
    passwordResetExpiresAt: { $gt: new Date() },
  });

  if (!user || !user.passwordResetTokenHash) {
    throw new AppError("TOKEN_INVALID", "Lien invalide ou expiré.", 400);
  }

  const valid = await bcrypt.compare(token, user.passwordResetTokenHash);
  if (!valid) {
    throw new AppError("TOKEN_INVALID", "Lien invalide ou expiré.", 400);
  }

  // Hash new password — NEVER log the plaintext
  const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

  // If the user was never verified (forgot-password on unverified account),
  // mark as verified now — the reset link proves email ownership.
  const wasUnverified = !user.emailVerifiedAt;
  if (wasUnverified) {
    user.emailVerifiedAt = new Date();
  }

  user.passwordHash = passwordHash;
  user.passwordResetTokenHash = null;
  user.passwordResetTokenPrefix = null;
  user.passwordResetExpiresAt = null;
  await user.save();

  // Create profiles if the account was previously unverified (never went through OTP)
  if (wasUnverified && user.companyId) {
    await ensureProfilesForCompany(user.companyId);
  }
}

// ---------------------------------------------------------------------------
// Change Password (authenticated owner, from /dashboard/settings)
// ---------------------------------------------------------------------------

export async function changePassword(
  userId: string,
  input: { currentPassword: string; newPassword: string },
): Promise<void> {
  await connectDb();

  const user = await UserModel.findById(userId);
  if (!user || !user.passwordHash) {
    throw new AuthError("USER_NOT_FOUND", "Utilisateur introuvable.", 404);
  }

  // Verify current password
  const valid = await bcrypt.compare(input.currentPassword, user.passwordHash);
  if (!valid) {
    throw new AuthError("INVALID_CURRENT_PASSWORD", "Le mot de passe actuel est incorrect.", 401);
  }

  // Reject same password
  const isSame = await bcrypt.compare(input.newPassword, user.passwordHash);
  if (isSame) {
    throw new AppError("SAME_PASSWORD", "Le nouveau mot de passe doit être différent de l'ancien.", 422);
  }

  // Hash new password — NEVER log the plaintext
  const newHash = await bcrypt.hash(input.newPassword, BCRYPT_ROUNDS);

  user.passwordHash = newHash;
  user.passwordChangedAt = new Date();
  await user.save();

  // Non-blocking email confirmation
  try {
    await sendPasswordChangedEmail(user.email);
  } catch (err) {
    console.warn("[changePassword] Email failed (non-blocking):", err);
  }
}
