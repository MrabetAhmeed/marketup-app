/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import { Sector } from "@/models/sector.model";
import { Gouvernorat } from "@/models/gouvernorat.model";
import { User } from "@/models/user.model";
import { Company } from "@/models/company.model";
import { AdminUser } from "@/models/admin-user.model";
import { Profile } from "@/models/profile.model";
import "@/models/profile-brandup.model";
import "@/models/profile-traceup.model";
import "@/models/profile-linkup.model";

// Mock connectDb — tests use direct mongoose.connect instead
vi.mock("@/lib/db", () => ({
  connectDb: vi.fn().mockResolvedValue(undefined),
}));

// Mock email sender
vi.mock("@/lib/email/sender", () => ({
  sendOtpEmail: vi.fn().mockResolvedValue(undefined),
  sendPasswordResetEmail: vi.fn().mockResolvedValue(undefined),
  sendAccountApprovedEmail: vi.fn().mockResolvedValue(undefined),
}));

// Mock env
vi.mock("@/lib/env", () => ({
  env: {
    NEXTAUTH_URL: "http://localhost:3000",
    RESEND_API_KEY: "",
    EMAIL_FROM: "test@test.dev",
  },
}));

import {
  signupCompany,
  signupUser,
  verifyOtp,
  login,
  forgotPassword,
  resetPassword,
  resendValidationEmail,
} from "@/services/auth.service";
import { sendOtpEmail, sendPasswordResetEmail } from "@/lib/email/sender";
import { otpSendLimit, passwordResetLimit } from "@/lib/rate-limit";

const SectorModel = Sector as any;
const GouvernoratModel = Gouvernorat as any;
const UserModel = User as any;
const CompanyModel = Company as any;
const AdminUserModel = AdminUser as any;
const ProfileModel = Profile as any;

let replSet: MongoMemoryReplSet;

beforeAll(async () => {
  replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  await mongoose.connect(replSet.getUri());
  await mongoose.connection.syncIndexes();
});

afterAll(async () => {
  await mongoose.disconnect();
  await replSet.stop();
});

beforeEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key of Object.keys(collections)) {
    await collections[key]!.deleteMany({});
  }
  vi.clearAllMocks();
  // Reset rate limiters
  otpSendLimit.reset("resend-validation:test@example.tn");
  passwordResetLimit.reset("forgot:test@example.tn");
  // Seed reference data
  await SectorModel.create({ slug: "mecanique", kind: "B2B", name: { fr: "Mécanique" }, order: 1 });
  await GouvernoratModel.create({ slug: "sousse", name: { fr: "Sousse" }, order: 1 });
});

// Helper: run full signup flow and return userId
async function doFullSignup(email = "test@example.tn") {
  const company = await signupCompany({
    type: "B2B",
    displayName: "Test Company",
    legalId: "1234567",
    accountEmail: email,
    sectorId: "mecanique",
    gouvernorat: "sousse",
    ville: "Sousse",
  });

  await signupUser({
    userId: company.userId,
    firstName: "Ahmed",
    lastName: "Test",
    phone: "+21620123456",
    whatsapp: "+21620123456",
    languages: ["fr"],
    password: "Password1!",
    acceptedTermsAt: new Date().toISOString(),
  });

  return company.userId;
}

// Helper: extract OTP from the mock call
function getLastOtp(): string {
  const calls = (sendOtpEmail as any).mock.calls;
  return calls[calls.length - 1][1]; // 2nd arg is the OTP
}

describe("Auth Service", () => {
  // === (a) Signup happy path ===
  it("signup happy path: company → user → verify-otp", async () => {
    const userId = await doFullSignup();
    const otp = getLastOtp();

    const result = await verifyOtp({ userId, otpCode: otp });

    expect(result.next).toBe("WAIT_ADMIN_VALIDATION");
    expect(result.user.email).toBe("test@example.tn");
    expect(result.company.status).toBe("pending");

    const user = await UserModel.findById(userId);
    expect(user.emailVerifiedAt).toBeTruthy();
    expect(user.otpHash).toBeNull();
  });

  // === (b) Signup email uniqueness ===
  it("signup rejects duplicate active email", async () => {
    const userId = await doFullSignup("dup@example.tn");
    const otp = getLastOtp();
    await verifyOtp({ userId, otpCode: otp });

    await expect(
      signupCompany({
        type: "B2B",
        displayName: "Another Co",
        legalId: "7654321",
        accountEmail: "dup@example.tn",
        sectorId: "mecanique",
        gouvernorat: "sousse",
        ville: "Tunis",
      }),
    ).rejects.toThrow("Cet email est déjà utilisé");
  });

  // === (c) Signup orphan cleanup ===
  it("signup cleans up orphan older than 7 days", async () => {
    // Create orphan user+company with old createdAt
    const oldDate = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);
    const [oldCompany] = await CompanyModel.create([{
      slug: "old-co",
      type: "B2B",
      legalId: "0000001",
      accountEmail: "orphan@example.tn",
      data: { displayName: { fr: "Old Co" } },
      liveData: { sectorId: "mecanique", gouvernorat: "sousse", ville: "X", address: null },
      status: "pending",
      ownerUserId: new mongoose.Types.ObjectId(),
    }]);
    await UserModel.create([{
      email: "orphan@example.tn",
      companyId: oldCompany._id,
      createdAt: oldDate,
    }]);
    // Force createdAt (Mongoose timestamps override)
    await UserModel.updateOne({ email: "orphan@example.tn" }, { $set: { createdAt: oldDate } });

    // New signup with same email should succeed (orphan cleaned up)
    const result = await signupCompany({
      type: "B2B",
      displayName: "New Co",
      legalId: "1111111",
      accountEmail: "orphan@example.tn",
      sectorId: "mecanique",
      gouvernorat: "sousse",
      ville: "Sousse",
    });

    expect(result.userId).toBeTruthy();
    expect(result.companyId).toBeTruthy();
  });

  // === (d) OTP expiry ===
  it("verifyOtp rejects expired OTP", async () => {
    const userId = await doFullSignup();
    // Expire the OTP
    await UserModel.updateOne({ _id: userId }, { $set: { otpExpiresAt: new Date(Date.now() - 1000) } });

    await expect(verifyOtp({ userId, otpCode: "123456" })).rejects.toThrow("Code expiré");
  });

  // === (e) OTP max attempts ===
  it("verifyOtp locks out after 5 wrong attempts", async () => {
    const userId = await doFullSignup();

    for (let i = 0; i < 5; i++) {
      await expect(verifyOtp({ userId, otpCode: "000000" })).rejects.toThrow("Code incorrect");
    }

    // 6th attempt — locked, even with correct OTP
    const otp = getLastOtp();
    await expect(verifyOtp({ userId, otpCode: otp })).rejects.toThrow("Trop de tentatives");
  });

  // === (f) OTP resend rate limit ===
  it("resendValidationEmail rate-limits per email", async () => {
    await doFullSignup();
    vi.clearAllMocks();

    // First call should send
    await resendValidationEmail("test@example.tn");
    expect(sendOtpEmail).toHaveBeenCalledTimes(1);

    // Second call within 60s — rate limited, no email sent
    await resendValidationEmail("test@example.tn");
    expect(sendOtpEmail).toHaveBeenCalledTimes(1); // still 1
  });

  // === (g) Login happy path ===
  it("login succeeds with verified user + active company", async () => {
    const userId = await doFullSignup("login@example.tn");
    const otp = getLastOtp();
    await verifyOtp({ userId, otpCode: otp });
    // Activate the company (admin would do this)
    await CompanyModel.updateOne(
      { ownerUserId: userId },
      { $set: { status: "active" } },
    );

    const result = await login("login@example.tn", "Password1!");

    expect(result.email).toBe("login@example.tn");
    expect(result.role).toBe("OWNER");
    expect(result.companyId).toBeTruthy();
  });

  // === (h) Login refused — pending company ===
  it("login refused when company status is pending", async () => {
    const userId = await doFullSignup("pending@example.tn");
    const otp = getLastOtp();
    await verifyOtp({ userId, otpCode: otp });
    // Company stays "pending" by default

    await expect(login("pending@example.tn", "Password1!")).rejects.toThrow(
      "Votre compte est en attente de validation",
    );
  });

  // === (i) Login refused — unverified email ===
  it("login returns EMAIL_NOT_VERIFIED with userId for unverified user", async () => {
    const userId = await doFullSignup("unverified@example.tn");

    try {
      await login("unverified@example.tn", "Password1!");
      expect.fail("Should have thrown");
    } catch (err: any) {
      expect(err.code).toBe("EMAIL_NOT_VERIFIED");
      expect(err.details.userId).toBe(userId);
    }
  });

  // === (j) Login refused — deleted user ===
  it("login returns INVALID_CREDENTIALS for soft-deleted user", async () => {
    const userId = await doFullSignup("deleted@example.tn");
    const otp = getLastOtp();
    await verifyOtp({ userId, otpCode: otp });
    await UserModel.updateOne({ _id: userId }, { $set: { deletedAt: new Date() } });

    await expect(login("deleted@example.tn", "Password1!")).rejects.toThrow(
      "Email ou mot de passe incorrect",
    );
  });

  // === (k) Admin login ===
  it("admin login via AdminUser fallback", async () => {
    const passwordHash = await bcrypt.hash("Admin1234!", 12);
    await AdminUserModel.create([{
      firstName: "Bassem",
      lastName: "Admin",
      email: "bassem@vivasky.media",
      passwordHash,
      role: "SUPER_ADMIN",
      avatar: { initials: "BA", backgroundColor: "#5C2D91" },
      languages: ["fr"],
    }]);

    const result = await login("bassem@vivasky.media", "Admin1234!");

    expect(result.role).toBe("SUPER_ADMIN");
    expect(result.companyId).toBeNull();
    expect(result.email).toBe("bassem@vivasky.media");
  });

  // === (l) Password reset happy path ===
  it("password reset: forgot → reset → login with new password", async () => {
    const userId = await doFullSignup("reset@example.tn");
    const otp = getLastOtp();
    await verifyOtp({ userId, otpCode: otp });
    await CompanyModel.updateOne({ ownerUserId: userId }, { $set: { status: "active" } });

    // Trigger forgot
    await forgotPassword("reset@example.tn");
    expect(sendPasswordResetEmail).toHaveBeenCalledTimes(1);

    // Extract token from the mock call URL
    const resetUrl: string = (sendPasswordResetEmail as any).mock.calls[0][1];
    const token = new URL(resetUrl).searchParams.get("token")!;

    // Reset password
    await resetPassword(token, "NewPass1!");

    // Login with new password
    const result = await login("reset@example.tn", "NewPass1!");
    expect(result.email).toBe("reset@example.tn");

    // Old password should fail
    await expect(login("reset@example.tn", "Password1!")).rejects.toThrow();
  });

  // === (m) Password reset token expiry ===
  it("resetPassword rejects expired token", async () => {
    const userId = await doFullSignup("expired@example.tn");
    const otp = getLastOtp();
    await verifyOtp({ userId, otpCode: otp });

    await forgotPassword("expired@example.tn");
    const resetUrl: string = (sendPasswordResetEmail as any).mock.calls[0][1];
    const token = new URL(resetUrl).searchParams.get("token")!;

    // Expire the token
    await UserModel.updateOne(
      { email: "expired@example.tn" },
      { $set: { passwordResetExpiresAt: new Date(Date.now() - 1000) } },
    );

    await expect(resetPassword(token, "NewPass1!")).rejects.toThrow("Lien invalide ou expiré");
  });

  // === (n) Resend validation anti-enumeration ===
  it("resendValidationEmail returns silently for unknown email", async () => {
    // Should not throw, should not send email
    await resendValidationEmail("nonexistent@example.tn");
    expect(sendOtpEmail).not.toHaveBeenCalled();
  });

  // === (o) signupUser writes Company.ownerFullName ===
  it("signupUser writes Company.ownerFullName = FirstName LastName", async () => {
    const companyResult = await signupCompany({
      type: "B2B",
      displayName: "OwnerName Co",
      legalId: "ON00001",
      accountEmail: "owner-name@example.tn",
      sectorId: "mecanique",
      gouvernorat: "sousse",
      ville: "Sousse",
    });

    await signupUser({
      userId: companyResult.userId,
      firstName: "Ahmed",
      lastName: "Mrabet",
      phone: "+21620123456",
      whatsapp: "+21620123456",
      languages: ["fr"],
      password: "Password1!",
      acceptedTermsAt: new Date().toISOString(),
    });

    const company = await CompanyModel.findById(companyResult.companyId).lean();
    expect(company.ownerFullName).toBe("Ahmed Mrabet");
  });

  // === (p) verifyOtp creates LinkUP with empty data (no contactCard) ===
  it("verifyOtp creates LinkUP with data: {} (no contactCard)", async () => {
    const userId = await doFullSignup("linkup-empty@example.tn");
    const otp = getLastOtp();
    await verifyOtp({ userId, otpCode: otp });

    const linkup = await ProfileModel.findOne({
      companyId: (await UserModel.findById(userId)).companyId,
      kind: "linkup",
    }).lean();

    expect(linkup).toBeTruthy();
    expect(linkup.data.contactCard).toBeUndefined();
  });

  // === (q) login lazy filet creates LinkUP with empty data ===
  it("login lazy filet creates LinkUP with data: {} (idempotent)", async () => {
    const userId = await doFullSignup("lazy@example.tn");
    const otp = getLastOtp();
    await verifyOtp({ userId, otpCode: otp });

    const user = await UserModel.findById(userId);
    await CompanyModel.updateOne({ _id: user.companyId }, { $set: { status: "active" } });
    await ProfileModel.deleteOne({ companyId: user.companyId, kind: "linkup" });

    await login("lazy@example.tn", "Password1!");

    const linkup = await ProfileModel.findOne({
      companyId: user.companyId,
      kind: "linkup",
    }).lean();

    expect(linkup).toBeTruthy();
    expect(linkup.data.contactCard).toBeUndefined();
  });

  // === (u) signupUser writes phone + whatsapp to Company.liveData ===
  it("signupUser writes phone + whatsapp to Company.liveData", async () => {
    const companyResult = await signupCompany({
      type: "B2B",
      displayName: "PhoneTest Co",
      legalId: "PT00001",
      accountEmail: "phone-test@example.tn",
      sectorId: "mecanique",
      gouvernorat: "sousse",
      ville: "Sousse",
    });

    await signupUser({
      userId: companyResult.userId,
      firstName: "Test",
      lastName: "Phone",
      phone: "+21673222333",
      whatsapp: "+21620999888",
      languages: ["fr"],
      password: "Password1!",
      acceptedTermsAt: new Date().toISOString(),
    });

    const company = await CompanyModel.findById(companyResult.companyId).lean();
    expect(company.liveData.phone).toBe("+21673222333");
    expect(company.liveData.whatsapp).toBe("+21620999888");
  });

  // === (v) signupUser does not write User.phone (field removed) ===
  it("signupUser does not set User.phone (field removed)", async () => {
    const userId = await doFullSignup("no-user-phone@example.tn");
    const user = await UserModel.findById(userId).lean();
    expect(user.phone).toBeUndefined();
  });


  // === (x) Zod SignupUserSchema rejects missing phone ===
  it("signupUser rejects missing phone via service interface", async () => {
    const companyResult = await signupCompany({
      type: "B2B",
      displayName: "NoPhone Co",
      legalId: "NP00001",
      accountEmail: "no-phone@example.tn",
      sectorId: "mecanique",
      gouvernorat: "sousse",
      ville: "Sousse",
    });

    // signupUser with empty phone should fail at the Zod API boundary.
    // At service level, TS enforces required phone — so we test the Zod schema directly.
    const { SignupUserSchema } = await import("@/schemas/auth.schema");
    const result = SignupUserSchema.safeParse({
      userId: companyResult.userId,
      firstName: "Test",
      lastName: "NoPhone",
      languages: ["fr"],
      password: "Password1!",
      passwordConfirm: "Password1!",
    });
    expect(result.success).toBe(false);
  });

  // === (y) Zod SignupUserSchema rejects missing whatsapp ===
  it("Zod SignupUserSchema rejects missing whatsapp", async () => {
    const { SignupUserSchema } = await import("@/schemas/auth.schema");
    const result = SignupUserSchema.safeParse({
      userId: "some-id",
      firstName: "Test",
      lastName: "NoWA",
      phone: "+21620123456",
      languages: ["fr"],
      password: "Password1!",
      passwordConfirm: "Password1!",
    });
    expect(result.success).toBe(false);
  });
});

