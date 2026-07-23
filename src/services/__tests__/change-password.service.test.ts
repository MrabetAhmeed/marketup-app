/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import { User } from "@/models/user.model";
import { Company } from "@/models/company.model";
// Mock connectDb
vi.mock("@/lib/db", () => ({
  connectDb: vi.fn().mockResolvedValue(undefined),
}));

// Mock email sender
vi.mock("@/lib/email/sender", () => ({
  sendOtpEmail: vi.fn().mockResolvedValue(undefined),
  sendPasswordResetEmail: vi.fn().mockResolvedValue(undefined),
  sendPasswordChangedEmail: vi.fn().mockResolvedValue(undefined),
}));

// Mock env
vi.mock("@/lib/env", () => ({
  env: {
    NEXTAUTH_URL: "http://localhost:3000",
    RESEND_API_KEY: "",
    EMAIL_FROM: "test@test.dev",
  },
}));

import { changePassword } from "@/services/auth.service";
import { sendPasswordChangedEmail } from "@/lib/email/sender";
import {
  isSessionInvalidatedByPasswordChange,
  isSessionInvalidatedByCompanyStatus,
} from "@/lib/session-check";

const UserModel = User as any;
const CompanyModel = Company as any;

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

let companyId: string;

beforeEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key of Object.keys(collections)) {
    await collections[key]!.deleteMany({});
  }
  vi.clearAllMocks();

  // Seed a minimal company + user
  const company = await CompanyModel.create({
    slug: "test-co",
    type: "B2B",
    legalId: "TEST123",
    accountEmail: "owner@test.tn",
    data: { displayName: { fr: "Test Co" } },
    liveData: { sectorId: "mecanique", gouvernorat: "sousse", ville: "Sousse" },
    status: "active",
    ownerUserId: new mongoose.Types.ObjectId(),
  });
  companyId = company._id.toString();
});

async function createVerifiedUser(
  email = "owner@test.tn",
  password = "OldPass123!",
  status = "active",
): Promise<string> {
  const hash = await bcrypt.hash(password, 10);
  const user = await UserModel.create({
    email,
    passwordHash: hash,
    firstName: "Test",
    lastName: "Owner",
    role: "OWNER",
    companyId,
    emailVerifiedAt: new Date(),
  });
  if (status !== "active") {
    await CompanyModel.findByIdAndUpdate(companyId, { $set: { status } });
  }
  return user._id.toString();
}

// ═══════════════════════════════════════════════════════════════════════
// changePassword service
// ═══════════════════════════════════════════════════════════════════════

describe("changePassword", () => {
  it("changes password successfully + sets passwordChangedAt + email sent", async () => {
    const userId = await createVerifiedUser();

    await changePassword(userId, {
      currentPassword: "OldPass123!",
      newPassword: "NewPass456!",
    });

    const updated = await UserModel.findById(userId).lean();
    expect(updated.passwordChangedAt).toBeDefined();
    expect(updated.passwordChangedAt).toBeInstanceOf(Date);

    // New password works
    const matchNew = await bcrypt.compare("NewPass456!", updated.passwordHash);
    expect(matchNew).toBe(true);

    // Old password no longer works
    const matchOld = await bcrypt.compare("OldPass123!", updated.passwordHash);
    expect(matchOld).toBe(false);

    // Email sent
    expect(sendPasswordChangedEmail).toHaveBeenCalledWith("owner@test.tn");
  });

  it("rejects wrong current password with INVALID_CURRENT_PASSWORD", async () => {
    const userId = await createVerifiedUser();

    await expect(
      changePassword(userId, {
        currentPassword: "WrongPass99!",
        newPassword: "NewPass456!",
      }),
    ).rejects.toMatchObject({ code: "INVALID_CURRENT_PASSWORD" });
  });

  it("rejects same password with SAME_PASSWORD", async () => {
    const userId = await createVerifiedUser();

    await expect(
      changePassword(userId, {
        currentPassword: "OldPass123!",
        newPassword: "OldPass123!",
      }),
    ).rejects.toMatchObject({ code: "SAME_PASSWORD" });
  });

  it("allows password change for rejected company (accessible)", async () => {
    const userId = await createVerifiedUser("owner@test.tn", "OldPass123!", "rejected");

    // Should NOT throw
    await changePassword(userId, {
      currentPassword: "OldPass123!",
      newPassword: "NewPass456!",
    });

    const updated = await UserModel.findById(userId).lean();
    const matchNew = await bcrypt.compare("NewPass456!", updated.passwordHash);
    expect(matchNew).toBe(true);
  });

  it("email failure does not fail the password change", async () => {
    (sendPasswordChangedEmail as any).mockRejectedValueOnce(new Error("SMTP error"));
    const userId = await createVerifiedUser();

    // Should NOT throw despite email failure
    await changePassword(userId, {
      currentPassword: "OldPass123!",
      newPassword: "NewPass456!",
    });

    const updated = await UserModel.findById(userId).lean();
    const matchNew = await bcrypt.compare("NewPass456!", updated.passwordHash);
    expect(matchNew).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// Session invalidation — extracted pure functions
// ═══════════════════════════════════════════════════════════════════════

describe("isSessionInvalidatedByPasswordChange", () => {
  it("returns false when passwordChangedAt is null", () => {
    expect(isSessionInvalidatedByPasswordChange(null, 1700000000)).toBe(false);
  });

  it("returns false when iat is undefined", () => {
    expect(isSessionInvalidatedByPasswordChange(new Date(), undefined)).toBe(false);
  });

  it("returns true when password changed AFTER token issued", () => {
    const changedAt = new Date(1700000100 * 1000); // 100 seconds after iat
    expect(isSessionInvalidatedByPasswordChange(changedAt, 1700000000)).toBe(true);
  });

  it("returns false when password changed BEFORE token issued", () => {
    const changedAt = new Date(1699999900 * 1000); // 100 seconds before iat
    expect(isSessionInvalidatedByPasswordChange(changedAt, 1700000000)).toBe(false);
  });

  it("returns false when changed in the SAME second (strict >)", () => {
    // Same second: the device that just changed gets a new token in the same second
    const changedAt = new Date(1700000000 * 1000);
    expect(isSessionInvalidatedByPasswordChange(changedAt, 1700000000)).toBe(false);
  });

  it("handles ms→s conversion correctly (sub-second precision)", () => {
    // 500ms into second 1700000001 — floor gives 1700000001 > iat 1700000000
    const changedAt = new Date(1700000001 * 1000 + 500);
    expect(isSessionInvalidatedByPasswordChange(changedAt, 1700000000)).toBe(true);
  });
});

describe("isSessionInvalidatedByCompanyStatus (S8)", () => {
  it("returns true for suspended", () => {
    expect(isSessionInvalidatedByCompanyStatus("suspended")).toBe(true);
  });

  it("returns true for deleted", () => {
    expect(isSessionInvalidatedByCompanyStatus("deleted")).toBe(true);
  });

  it("returns false for active", () => {
    expect(isSessionInvalidatedByCompanyStatus("active")).toBe(false);
  });

  it("returns false for rejected (owner can still access some routes)", () => {
    expect(isSessionInvalidatedByCompanyStatus("rejected")).toBe(false);
  });

  it("returns false for pending", () => {
    expect(isSessionInvalidatedByCompanyStatus("pending")).toBe(false);
  });

  it("returns false for null (SUPER_ADMIN has no company)", () => {
    expect(isSessionInvalidatedByCompanyStatus(null)).toBe(false);
  });
});
