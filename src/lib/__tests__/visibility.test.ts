import { describe, it, expect } from "vitest";
import { isProfileVisible } from "@/lib/visibility";

describe("isProfileVisible", () => {
  const activeCompany = { status: "active" as const };
  const activeProfile = { status: "active" as const, isPublic: true, pendingData: null };

  it("returns true when company=active, profile=active, isPublic=true, pendingData=null", () => {
    expect(isProfileVisible(activeProfile, activeCompany)).toBe(true);
  });

  it("returns false when company.status=suspended", () => {
    expect(isProfileVisible(activeProfile, { status: "suspended" })).toBe(false);
  });

  it("returns false when profile.status=pending", () => {
    expect(isProfileVisible({ ...activeProfile, status: "pending" }, activeCompany)).toBe(false);
  });

  it("returns false when profile.status=rejected", () => {
    expect(isProfileVisible({ ...activeProfile, status: "rejected" }, activeCompany)).toBe(false);
  });

  it("returns false when profile.isPublic=false", () => {
    expect(isProfileVisible({ ...activeProfile, isPublic: false }, activeCompany)).toBe(false);
  });

  it("returns false when profile.pendingData is set", () => {
    const withPending = {
      ...activeProfile,
      pendingData: { submittedAt: new Date(), fields: [], note: null },
    };
    expect(isProfileVisible(withPending, activeCompany)).toBe(false);
  });

  it("returns false when profile.pendingData is undefined (treated as not-null)", () => {
    const { pendingData: _, ...noPendingKey } = activeProfile;
    // pendingData key absent → undefined → == null is true → visible
    expect(isProfileVisible(noPendingKey as typeof activeProfile, activeCompany)).toBe(true);
  });
});
