/* eslint-disable @typescript-eslint/no-explicit-any */
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { connectDb } from "@/lib/db";
import { AuthError, NotFoundError } from "@/lib/api-error";
import { Company } from "@/models/company.model";
import { User } from "@/models/user.model";
import { Profile } from "@/models/profile.model";
import { Transaction } from "@/models/transaction.model";
import { Boost } from "@/models/boost.model";
import { Sponsoring } from "@/models/sponsoring.model";
import { RseReceipt } from "@/models/rse-receipt.model";
import { Notification } from "@/models/notification.model";
import { File } from "@/models/file.model";
import { sendAccountDeletedEmail } from "@/lib/email/sender";

// Mongoose 9 strict types
const CompanyModel = Company as any;
const UserModel = User as any;
const ProfileModel = Profile as any;
const TransactionModel = Transaction as any;
const BoostModel = Boost as any;
const SponsoringModel = Sponsoring as any;
const RseReceiptModel = RseReceipt as any;
const NotificationModel = Notification as any;
const FileModel = File as any;

// ---------------------------------------------------------------------------
// deleteMyAccount — soft-delete cascade in a Mongoose transaction
// ---------------------------------------------------------------------------

export async function deleteMyAccount(
  userId: string,
  password: string,
): Promise<{ email: string; companyName: string }> {
  await connectDb();

  // Load user (include deleted check manually — we want active user only)
  const user = await UserModel.findById(userId);
  if (!user || !user.passwordHash) {
    throw new NotFoundError("User");
  }

  // Verify password
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    throw new AuthError("INVALID_PASSWORD", "Mot de passe incorrect.", 401);
  }

  const companyId = user.companyId?.toString();
  if (!companyId) {
    throw new NotFoundError("Company");
  }

  const company = await CompanyModel.findById(companyId);
  if (!company) {
    throw new NotFoundError("Company");
  }

  const now = new Date();
  const email = user.email;
  const companyName = company.data?.displayName?.fr || company.slug || "Votre entreprise";

  // --- Cascade soft-delete in transaction ---
  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    // 1. Company → deleted
    await CompanyModel.findByIdAndUpdate(
      companyId,
      {
        $set: { status: "deleted", deletedAt: now },
        $push: {
          auditTrail: {
            at: now,
            by: new mongoose.Types.ObjectId(userId),
            byRole: "OWNER",
            action: "account_deleted",
            details: { method: "self_delete" },
          },
        },
      },
      { session },
    );

    // 2. User
    await UserModel.findByIdAndUpdate(
      userId,
      { $set: { deletedAt: now } },
      { session },
    );

    // 3. Profiles (all 3 kinds)
    await ProfileModel.updateMany(
      { companyId: new mongoose.Types.ObjectId(companyId), deletedAt: null },
      { $set: { deletedAt: now } },
      { session },
    );

    // 4. Transactions
    await TransactionModel.updateMany(
      { companyId: new mongoose.Types.ObjectId(companyId), deletedAt: null },
      { $set: { deletedAt: now } },
      { session },
    );

    // 5. Boosts
    await BoostModel.updateMany(
      { companyId: new mongoose.Types.ObjectId(companyId), deletedAt: null },
      { $set: { deletedAt: now } },
      { session },
    );

    // 6. Sponsorings
    await SponsoringModel.updateMany(
      { companyId: new mongoose.Types.ObjectId(companyId), deletedAt: null },
      { $set: { deletedAt: now } },
      { session },
    );

    // 7. RSE Receipts
    await RseReceiptModel.updateMany(
      { companyId: new mongoose.Types.ObjectId(companyId), deletedAt: null },
      { $set: { deletedAt: now } },
      { session },
    );

    // 8. Notifications (by recipientId = userId)
    await NotificationModel.updateMany(
      { recipientId: new mongoose.Types.ObjectId(userId), deletedAt: null },
      { $set: { deletedAt: now } },
      { session },
    );

    // 9. Files (by ownerUserId = userId)
    await FileModel.updateMany(
      { ownerUserId: new mongoose.Types.ObjectId(userId), deletedAt: null },
      { $set: { deletedAt: now } },
      { session },
    );

    await session.commitTransaction();
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }

  // Non-blocking email
  try {
    await sendAccountDeletedEmail({ userEmail: email, companyName });
  } catch (err) {
    console.warn("[deleteMyAccount] Email failed (non-blocking):", err);
  }

  return { email, companyName };
}
