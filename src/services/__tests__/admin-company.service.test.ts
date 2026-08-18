/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import mongoose from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import { Sector } from "@/models/sector.model";
import { Gouvernorat } from "@/models/gouvernorat.model";
import { User } from "@/models/user.model";
import { Company } from "@/models/company.model";
import "@/models/profile-brandup.model";
import "@/models/profile-traceup.model";
import "@/models/profile-linkup.model";

vi.mock("@/lib/db", () => ({
  connectDb: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/lib/email/sender", () => ({
  sendOtpEmail: vi.fn().mockResolvedValue(undefined),
  sendPasswordResetEmail: vi.fn().mockResolvedValue(undefined),
  sendAccountApprovedEmail: vi.fn().mockResolvedValue(undefined),
  sendCompanyValidatedEmail: vi.fn().mockResolvedValue(undefined),
  sendCompanyRejectedEmail: vi.fn().mockResolvedValue(undefined),
  sendCompanyUpdatesApprovedEmail: vi.fn().mockResolvedValue(undefined),
  sendCompanyUpdatesRejectedEmail: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/services/notifications.service", () => ({
  createNotification: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/lib/storage", () => ({
  storage: { delete: vi.fn().mockResolvedValue(undefined) },
}));
vi.mock("@/lib/env", () => ({
  env: {
    NEXTAUTH_URL: "http://localhost:3000",
    RESEND_API_KEY: "",
    EMAIL_FROM: "test@test.dev",
  },
}));

import { approvePendingUpdates, rejectPendingUpdates } from "@/services/admin-company.service";

const SectorModel = Sector as any;
const GouvernoratModel = Gouvernorat as any;
const UserModel = User as any;
const CompanyModel = Company as any;

let replSet: MongoMemoryReplSet;
let companyId: string;
const adminId = new mongoose.Types.ObjectId().toString();

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

  await SectorModel.create({ slug: "mecanique", kind: "B2B", name: { fr: "Mécanique" }, order: 1 });
  await GouvernoratModel.create({ slug: "sousse", name: { fr: "Sousse" }, order: 1 });

  const user = await UserModel.create({
    email: "ahmed@technofab.tn",
    firstName: "Ahmed",
    lastName: "Mrabet",
    passwordHash: "hashedpw",
    role: "OWNER",
    emailVerifiedAt: new Date(),
    languages: ["fr"],
  });

  const company = await CompanyModel.create({
    slug: "technofab-industries",
    type: "B2B",
    legalId: "TN-RNE-001",
    accountEmail: "ahmed@technofab.tn",
    country: "TN",
    data: {
      displayName: { fr: "TechnoFab Industries", ar: "", en: "" },
    },
    liveData: {
      sectorId: "mecanique",
      gouvernorat: "sousse",
      ville: "Sousse",
      contactEmail: "ahmed@technofab.tn",
      languages: ["fr"],
    },
    status: "active",
    ownerUserId: user._id,
    pendingUpdates: {
      submittedAt: new Date(),
      fields: [{
        key: "data.displayName",
        label: "Nom de l'entreprise",
        currentValue: { fr: "TechnoFab Industries", ar: "", en: "" },
        newValue: { fr: "TechnoFab International", ar: "", en: "" },
      }],
    },
  });

  await UserModel.findByIdAndUpdate(user._id, { companyId: company._id });
  companyId = company._id.toString();
});

describe("approvePendingUpdates", () => {
  it("merges data.displayName, regenerates slug, and records slugHistory", async () => {
    await approvePendingUpdates(companyId, adminId);

    const company = await CompanyModel.findById(companyId).lean();
    expect(company.data.displayName).toEqual({ fr: "TechnoFab International", ar: "", en: "" });
    expect(company.pendingUpdates).toBeNull();
    expect(company.slug).toBe("technofab-international");
    expect(company.slugHistory).toContain("technofab-industries");
  });

  it("adds audit trail entry", async () => {
    await approvePendingUpdates(companyId, adminId);

    const company = await CompanyModel.findById(companyId).lean();
    const lastAudit = company.auditTrail[company.auditTrail.length - 1];
    expect(lastAudit.action).toBe("approve_pending_updates");
    expect(lastAudit.byRole).toBe("SUPER_ADMIN");
    expect(lastAudit.details.fields).toContain("data.displayName");
  });

  it("throws when no pendingUpdates", async () => {
    await CompanyModel.findByIdAndUpdate(companyId, { pendingUpdates: null });

    await expect(approvePendingUpdates(companyId, adminId)).rejects.toThrow("Aucune modification en attente");
  });
});

describe("rejectPendingUpdates", () => {
  it("clears pendingUpdates but keeps data unchanged", async () => {
    await rejectPendingUpdates(companyId, adminId, "Nom non conforme");

    const company = await CompanyModel.findById(companyId).lean();
    expect(company.pendingUpdates).toBeNull();
    expect(company.data.displayName.fr).toBe("TechnoFab Industries");
  });

  it("adds audit trail entry with note", async () => {
    await rejectPendingUpdates(companyId, adminId, "Nom non conforme");

    const company = await CompanyModel.findById(companyId).lean();
    const lastAudit = company.auditTrail[company.auditTrail.length - 1];
    expect(lastAudit.action).toBe("reject_pending_updates");
    expect(lastAudit.details.note).toBe("Nom non conforme");
  });
});

describe("approvePendingUpdates — gouvernorat", () => {
  it("merges liveData.gouvernorat from pendingUpdates", async () => {
    // Replace default pendingUpdates with gouvernorat
    await CompanyModel.findByIdAndUpdate(companyId, {
      pendingUpdates: {
        submittedAt: new Date(),
        fields: [{
          key: "liveData.gouvernorat",
          label: "Gouvernorat",
          currentValue: "sousse",
          newValue: "tunis",
        }],
      },
    });

    await approvePendingUpdates(companyId, adminId);

    const company = await CompanyModel.findById(companyId).lean();
    expect(company.liveData.gouvernorat).toBe("tunis");
    expect(company.pendingUpdates).toBeNull();
  });

  it("merges displayName + gouvernorat together + regenerates slug", async () => {
    await CompanyModel.findByIdAndUpdate(companyId, {
      pendingUpdates: {
        submittedAt: new Date(),
        fields: [
          {
            key: "data.displayName",
            label: "Nom de l'entreprise",
            currentValue: { fr: "TechnoFab Industries", ar: "", en: "" },
            newValue: { fr: "TechnoFab Global", ar: "", en: "" },
          },
          {
            key: "liveData.gouvernorat",
            label: "Gouvernorat",
            currentValue: "sousse",
            newValue: "sfax",
          },
        ],
      },
    });

    await approvePendingUpdates(companyId, adminId);

    const company = await CompanyModel.findById(companyId).lean();
    expect(company.data.displayName.fr).toBe("TechnoFab Global");
    expect(company.liveData.gouvernorat).toBe("sfax");
    expect(company.slug).toBe("technofab-global");
    expect(company.slugHistory).toContain("technofab-industries");
    expect(company.pendingUpdates).toBeNull();
  });
});

describe("approvePendingUpdates — logoUrl + bannerUrl (PP-10)", () => {
  it("merges data.logoUrl from pendingUpdates", async () => {
    await CompanyModel.findByIdAndUpdate(companyId, {
      pendingUpdates: {
        submittedAt: new Date(),
        fields: [{
          key: "data.logoUrl",
          label: "Logo",
          currentValue: null,
          newValue: "https://res.cloudinary.com/test/logo-new.png",
        }],
      },
    });

    await approvePendingUpdates(companyId, adminId);

    const company = await CompanyModel.findById(companyId).lean();
    expect(company.data.logoUrl).toBe("https://res.cloudinary.com/test/logo-new.png");
    expect(company.pendingUpdates).toBeNull();
  });

  it("merges data.bannerUrl from pendingUpdates", async () => {
    await CompanyModel.findByIdAndUpdate(companyId, {
      pendingUpdates: {
        submittedAt: new Date(),
        fields: [{
          key: "data.bannerUrl",
          label: "Bannière",
          currentValue: null,
          newValue: "https://res.cloudinary.com/test/banner-new.png",
        }],
      },
    });

    await approvePendingUpdates(companyId, adminId);

    const company = await CompanyModel.findById(companyId).lean();
    expect(company.data.bannerUrl).toBe("https://res.cloudinary.com/test/banner-new.png");
    expect(company.pendingUpdates).toBeNull();
  });

  it("merges logo + banner + displayName together (3 fields) + slug regen", async () => {
    await CompanyModel.findByIdAndUpdate(companyId, {
      pendingUpdates: {
        submittedAt: new Date(),
        fields: [
          { key: "data.logoUrl", label: "Logo", currentValue: null, newValue: "https://logo.png" },
          { key: "data.bannerUrl", label: "Bannière", currentValue: null, newValue: "https://banner.png" },
          { key: "data.displayName", label: "Nom", currentValue: { fr: "Old", ar: "", en: "" }, newValue: { fr: "New Company", ar: "", en: "" } },
        ],
      },
    });

    await approvePendingUpdates(companyId, adminId);

    const company = await CompanyModel.findById(companyId).lean();
    expect(company.data.logoUrl).toBe("https://logo.png");
    expect(company.data.bannerUrl).toBe("https://banner.png");
    expect(company.data.displayName.fr).toBe("New Company");
    expect(company.slug).toBe("new-company");
    expect(company.slugHistory).toContain("technofab-industries");
    expect(company.pendingUpdates).toBeNull();
  });

  it("reject clears logoUrl pending but keeps data unchanged", async () => {
    const originalLogo = "https://original-logo.png";
    await CompanyModel.findByIdAndUpdate(companyId, { "data.logoUrl": originalLogo });
    await CompanyModel.findByIdAndUpdate(companyId, {
      pendingUpdates: {
        submittedAt: new Date(),
        fields: [{
          key: "data.logoUrl",
          label: "Logo",
          currentValue: originalLogo,
          newValue: "https://new-logo.png",
        }],
      },
    });

    await rejectPendingUpdates(companyId, adminId, "Logo non conforme");

    const company = await CompanyModel.findById(companyId).lean();
    expect(company.pendingUpdates).toBeNull();
    expect(company.data.logoUrl).toBe(originalLogo);
  });
});

// =========================================================================
// Slug γ — PP-12
// =========================================================================

describe("approvePendingUpdates — slug γ", () => {
  it("no-op: slug unchanged when displayName produces same slug", async () => {
    // "TechnoFab Industries" → "technofab-industries" (same as current)
    await CompanyModel.findByIdAndUpdate(companyId, {
      pendingUpdates: {
        submittedAt: new Date(),
        fields: [{
          key: "data.displayName",
          label: "Nom",
          currentValue: { fr: "TechnoFab Industries", ar: "", en: "" },
          newValue: { fr: "Technofab Industries", ar: "", en: "" }, // same slug
        }],
      },
    });

    await approvePendingUpdates(companyId, adminId);

    const company = await CompanyModel.findById(companyId).lean();
    expect(company.slug).toBe("technofab-industries");
    expect(company.slugHistory).toHaveLength(0);
  });

  it("no slug change when only gouvernorat pending (no displayName)", async () => {
    await CompanyModel.findByIdAndUpdate(companyId, {
      pendingUpdates: {
        submittedAt: new Date(),
        fields: [{
          key: "liveData.gouvernorat",
          label: "Gouvernorat",
          currentValue: "sousse",
          newValue: "tunis",
        }],
      },
    });

    await approvePendingUpdates(companyId, adminId);

    const company = await CompanyModel.findById(companyId).lean();
    expect(company.slug).toBe("technofab-industries");
    expect(company.slugHistory).toHaveLength(0);
  });

  it("reject displayName: slug intact, no slugHistory entry", async () => {
    await rejectPendingUpdates(companyId, adminId, "Nom non conforme");

    const company = await CompanyModel.findById(companyId).lean();
    expect(company.slug).toBe("technofab-industries");
    expect(company.slugHistory).toHaveLength(0);
  });

  it("no duplicate slugHistory entries on sequential renames", async () => {
    // First rename
    await approvePendingUpdates(companyId, adminId);
    let company = await CompanyModel.findById(companyId).lean();
    expect(company.slug).toBe("technofab-international");
    expect(company.slugHistory).toEqual(["technofab-industries"]);

    // Second rename
    await CompanyModel.findByIdAndUpdate(companyId, {
      pendingUpdates: {
        submittedAt: new Date(),
        fields: [{
          key: "data.displayName",
          label: "Nom",
          currentValue: { fr: "TechnoFab International", ar: "", en: "" },
          newValue: { fr: "TechnoFab Worldwide", ar: "", en: "" },
        }],
      },
    });
    await approvePendingUpdates(companyId, adminId);

    company = await CompanyModel.findById(companyId).lean();
    expect(company.slug).toBe("technofab-worldwide");
    expect(company.slugHistory).toContain("technofab-industries");
    expect(company.slugHistory).toContain("technofab-international");
    expect(company.slugHistory).toHaveLength(2);
  });

  it("retour interne: company reclaims its own old slug", async () => {
    // First rename: technofab-industries → technofab-international
    await approvePendingUpdates(companyId, adminId);

    // Rename back to original
    await CompanyModel.findByIdAndUpdate(companyId, {
      pendingUpdates: {
        submittedAt: new Date(),
        fields: [{
          key: "data.displayName",
          label: "Nom",
          currentValue: { fr: "TechnoFab International", ar: "", en: "" },
          newValue: { fr: "TechnoFab Industries", ar: "", en: "" },
        }],
      },
    });
    await approvePendingUpdates(companyId, adminId);

    const company = await CompanyModel.findById(companyId).lean();
    expect(company.slug).toBe("technofab-industries");
    // Old slug "technofab-international" should be in history
    expect(company.slugHistory).toContain("technofab-international");
    // Reclaimed slug should NOT be in history
    expect(company.slugHistory).not.toContain("technofab-industries");
  });

  it("anti-collision: another company's slugHistory blocks new slug", async () => {
    // Create a second company that has "acme-corp" in its slugHistory
    const user2 = await UserModel.create({
      email: "other@acme.tn",
      firstName: "Other",
      lastName: "Owner",
      passwordHash: "hashedpw",
      role: "OWNER",
      emailVerifiedAt: new Date(),
      languages: ["fr"],
    });
    await CompanyModel.create({
      slug: "acme-renamed",
      type: "B2B",
      legalId: "TN-RNE-999",
      accountEmail: "other@acme.tn",
      country: "TN",
      data: { displayName: { fr: "ACME Renamed", ar: "", en: "" } },
      liveData: { sectorId: "mecanique", gouvernorat: "sousse", ville: "Sousse", contactEmail: "other@acme.tn", languages: ["fr"] },
      status: "active",
      ownerUserId: user2._id,
      slugHistory: ["acme-corp"],
    });

    // Try to rename TechnoFab to "ACME Corp" — "acme-corp" is reserved
    await CompanyModel.findByIdAndUpdate(companyId, {
      pendingUpdates: {
        submittedAt: new Date(),
        fields: [{
          key: "data.displayName",
          label: "Nom",
          currentValue: { fr: "TechnoFab Industries", ar: "", en: "" },
          newValue: { fr: "ACME Corp", ar: "", en: "" },
        }],
      },
    });
    await approvePendingUpdates(companyId, adminId);

    const company = await CompanyModel.findById(companyId).lean();
    // Should get a suffixed slug since "acme-corp" is reserved
    expect(company.slug).toBe("acme-corp-2");
    expect(company.slugHistory).toContain("technofab-industries");
  });

  it("audit trail records slugChange details", async () => {
    await approvePendingUpdates(companyId, adminId);

    const company = await CompanyModel.findById(companyId).lean();
    const lastAudit = company.auditTrail[company.auditTrail.length - 1];
    expect(lastAudit.details.slugChange).toEqual({
      from: "technofab-industries",
      to: "technofab-international",
    });
  });
});

// =========================================================================
// FB-7a — sync-back User identity on gerant* approval
// =========================================================================

describe("approvePendingUpdates — gerant sync-back (FB-7a)", () => {
  it("syncs User.firstName when gerantFirstName is approved", async () => {
    await CompanyModel.findByIdAndUpdate(companyId, {
      "liveData.gerantFirstName": "Ahmed",
      "liveData.gerantLastName": "Mrabet",
      pendingUpdates: {
        submittedAt: new Date(),
        fields: [{
          key: "liveData.gerantFirstName",
          label: "Prénom du gérant",
          currentValue: "Ahmed",
          newValue: "Mohamed",
        }],
      },
    });

    await approvePendingUpdates(companyId, adminId);

    // Company.liveData.gerantFirstName merged
    const company = await CompanyModel.findById(companyId).lean();
    expect(company.liveData.gerantFirstName).toBe("Mohamed");
    expect(company.pendingUpdates).toBeNull();

    // User.firstName synced back (best-effort)
    const user = await UserModel.findOne({ companyId: company._id }).lean();
    expect(user.firstName).toBe("Mohamed");

    // ownerFullName recalculated
    expect(company.ownerFullName).toBe("Mohamed Mrabet");
  });

  it("syncs both User.firstName + User.lastName when both approved", async () => {
    await CompanyModel.findByIdAndUpdate(companyId, {
      "liveData.gerantFirstName": "Ahmed",
      "liveData.gerantLastName": "Mrabet",
      pendingUpdates: {
        submittedAt: new Date(),
        fields: [
          { key: "liveData.gerantFirstName", label: "Prénom", currentValue: "Ahmed", newValue: "Youssef" },
          { key: "liveData.gerantLastName", label: "Nom", currentValue: "Mrabet", newValue: "Trabelsi" },
        ],
      },
    });

    await approvePendingUpdates(companyId, adminId);

    const user = await UserModel.findOne({ companyId: new (mongoose.Types.ObjectId as any)(companyId) }).lean();
    expect(user.firstName).toBe("Youssef");
    expect(user.lastName).toBe("Trabelsi");

    const company = await CompanyModel.findById(companyId).lean();
    expect(company.ownerFullName).toBe("Youssef Trabelsi");
  });

  it("does NOT sync User when no gerant fields in lot", async () => {
    // Default fixture has displayName pending — no gerant fields
    await approvePendingUpdates(companyId, adminId);

    const user = await UserModel.findOne({ companyId: new (mongoose.Types.ObjectId as any)(companyId) }).lean();
    expect(user.firstName).toBe("Ahmed"); // unchanged
    expect(user.lastName).toBe("Mrabet");
  });
});

describe("approvePendingUpdates — contact fields (FB-7a)", () => {
  it("merges liveData.phone from pendingUpdates", async () => {
    await CompanyModel.findByIdAndUpdate(companyId, {
      pendingUpdates: {
        submittedAt: new Date(),
        fields: [{
          key: "liveData.phone",
          label: "Téléphone",
          currentValue: null,
          newValue: "+21699123456",
        }],
      },
    });

    await approvePendingUpdates(companyId, adminId);

    const company = await CompanyModel.findById(companyId).lean();
    expect(company.liveData.phone).toBe("+21699123456");
    expect(company.pendingUpdates).toBeNull();
  });

  it("merges liveData.contactEmail from pendingUpdates", async () => {
    await CompanyModel.findByIdAndUpdate(companyId, {
      pendingUpdates: {
        submittedAt: new Date(),
        fields: [{
          key: "liveData.contactEmail",
          label: "Email de contact",
          currentValue: "old@test.tn",
          newValue: "new@test.tn",
        }],
      },
    });

    await approvePendingUpdates(companyId, adminId);

    const company = await CompanyModel.findById(companyId).lean();
    expect(company.liveData.contactEmail).toBe("new@test.tn");
  });
});

// =========================================================================
// FB-7b — rejection note mandatory
// =========================================================================

describe("rejectPendingUpdates — mandatory note (FB-7b)", () => {
  it("rejects when note is missing", async () => {
    await expect(rejectPendingUpdates(companyId, adminId, "")).rejects.toThrow("motif du refus est obligatoire");
  });

  it("rejects when note is too short (< 3 chars)", async () => {
    await expect(rejectPendingUpdates(companyId, adminId, "ab")).rejects.toThrow("motif du refus est obligatoire");
  });

  it("persists note in lastPendingRejection", async () => {
    await rejectPendingUpdates(companyId, adminId, "Nom non conforme, merci de corriger");

    const company = await CompanyModel.findById(companyId).lean();
    expect(company.lastPendingRejection).not.toBeNull();
    expect(company.lastPendingRejection.note).toBe("Nom non conforme, merci de corriger");
    expect(company.lastPendingRejection.rejectedAt).toBeDefined();
    expect(company.pendingUpdates).toBeNull();
  });

  it("sends notification + email on rejection (non-blocking)", async () => {
    const { createNotification: mockNotif } = await import("@/services/notifications.service");
    const { sendCompanyUpdatesRejectedEmail: mockEmail } = await import("@/lib/email/sender");

    await rejectPendingUpdates(companyId, adminId, "Données incorrectes");

    expect(mockNotif).toHaveBeenCalledWith(expect.objectContaining({
      kind: "account_updates_rejected",
    }));
    expect(mockEmail).toHaveBeenCalledWith(expect.objectContaining({
      rejectionNote: "Données incorrectes",
    }));
  });
});

describe("approvePendingUpdates — notification + email (FB-7b)", () => {
  it("sends notification + email on approval (non-blocking)", async () => {
    const { createNotification: mockNotif } = await import("@/services/notifications.service");
    const { sendCompanyUpdatesApprovedEmail: mockEmail } = await import("@/lib/email/sender");

    await approvePendingUpdates(companyId, adminId);

    expect(mockNotif).toHaveBeenCalledWith(expect.objectContaining({
      kind: "account_updates_approved",
    }));
    expect(mockEmail).toHaveBeenCalledWith(expect.objectContaining({
      fieldLabels: expect.arrayContaining(["Nom de l'entreprise"]),
    }));
  });

  it("approval succeeds even if notification fails", async () => {
    const { createNotification: mockNotif } = await import("@/services/notifications.service");
    (mockNotif as any).mockRejectedValueOnce(new Error("DB down"));

    // Should not throw
    await approvePendingUpdates(companyId, adminId);

    const company = await CompanyModel.findById(companyId).lean();
    expect(company.pendingUpdates).toBeNull();
    expect(company.data.displayName.fr).toBe("TechnoFab International");
  });
});

// =========================================================================
// FB-7b — identityDocumentUrl in pendingUpdates
// =========================================================================

describe("approvePendingUpdates — identityDocumentUrl (FB-7b)", () => {
  it("merges identityDocumentUrl from pendingUpdates", async () => {
    await CompanyModel.findByIdAndUpdate(companyId, {
      identityDocumentUrl: "https://old-doc.pdf",
      pendingUpdates: {
        submittedAt: new Date(),
        fields: [{
          key: "identityDocumentUrl",
          label: "Document légal",
          currentValue: "https://old-doc.pdf",
          newValue: "https://new-doc.pdf",
        }],
      },
    });

    await approvePendingUpdates(companyId, adminId);

    const company = await CompanyModel.findById(companyId).lean();
    expect(company.identityDocumentUrl).toBe("https://new-doc.pdf");
    expect(company.pendingUpdates).toBeNull();
  });
});

describe("rejectPendingUpdates — identityDocumentUrl cleanup (FB-7b)", () => {
  it("calls storage.delete on rejected document (best-effort)", async () => {
    const { storage: mockStorage } = await import("@/lib/storage");

    await CompanyModel.findByIdAndUpdate(companyId, {
      pendingUpdates: {
        submittedAt: new Date(),
        fields: [{
          key: "identityDocumentUrl",
          label: "Document légal",
          currentValue: "https://old-doc.pdf",
          newValue: "https://rejected-doc.pdf",
        }],
      },
    });

    await rejectPendingUpdates(companyId, adminId, "Document illisible");

    expect(mockStorage.delete).toHaveBeenCalledWith("https://rejected-doc.pdf");
    const company = await CompanyModel.findById(companyId).lean();
    expect(company.identityDocumentUrl).toBeNull(); // old value not touched by reject (Mongoose default)
  });
});
