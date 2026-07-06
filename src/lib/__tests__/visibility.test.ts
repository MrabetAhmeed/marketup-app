import { describe, it, expect } from "vitest";
import { isProfileVisible } from "@/lib/visibility";

describe("isProfileVisible", () => {
  const activeCompany = { status: "active" as const };
  const publishedDate = new Date("2026-04-01");

  // ── Pré-condition: company.status ──

  it("returns false when company.status !== active (suspended)", () => {
    const profile = { status: "active" as const, isPublic: true, publishedAt: publishedDate };
    expect(isProfileVisible(profile, { status: "suspended" })).toBe(false);
  });

  it("returns false when company.status !== active (pending)", () => {
    const profile = { status: "active" as const, isPublic: true, publishedAt: publishedDate };
    expect(isProfileVisible(profile, { status: "pending" })).toBe(false);
  });

  it("returns false when company.status !== active (deleted)", () => {
    const profile = { status: "active" as const, isPublic: true, publishedAt: publishedDate };
    expect(isProfileVisible(profile, { status: "deleted" })).toBe(false);
  });

  // ── Cas 1: disabled → always hidden ──

  it("Cas 1: disabled is always hidden (even with publishedAt)", () => {
    const profile = { status: "disabled" as const, isPublic: true, publishedAt: publishedDate };
    expect(isProfileVisible(profile, activeCompany)).toBe(false);
  });

  // ── Cas 2: incomplete → always hidden ──

  it("Cas 2: incomplete is always hidden", () => {
    const profile = { status: "incomplete" as const, isPublic: true, publishedAt: null };
    expect(isProfileVisible(profile, activeCompany)).toBe(false);
  });

  // ── Cas 3: publishedAt set + active/pending/rejected → visible ──

  it("Cas 3: active + publishedAt + isPublic → visible", () => {
    const profile = { status: "active" as const, isPublic: true, publishedAt: publishedDate };
    expect(isProfileVisible(profile, activeCompany)).toBe(true);
  });

  it("Cas 3: pending + publishedAt + isPublic → visible (ancienne data)", () => {
    const profile = { status: "pending" as const, isPublic: true, publishedAt: publishedDate };
    expect(isProfileVisible(profile, activeCompany)).toBe(true);
  });

  it("Cas 3: rejected + publishedAt + isPublic → visible (ancienne data)", () => {
    const profile = { status: "rejected" as const, isPublic: true, publishedAt: publishedDate };
    expect(isProfileVisible(profile, activeCompany)).toBe(true);
  });

  it("Cas 3: pending + publishedAt + isPublic=false → hidden (owner toggled off)", () => {
    const profile = { status: "pending" as const, isPublic: false, publishedAt: publishedDate };
    expect(isProfileVisible(profile, activeCompany)).toBe(false);
  });

  it("Cas 3: publishedAt as ISO string works", () => {
    const profile = { status: "pending" as const, isPublic: true, publishedAt: "2026-04-01T00:00:00.000Z" };
    expect(isProfileVisible(profile, activeCompany)).toBe(true);
  });

  // ── Cas 4: publishedAt null (never validated) ──

  it("Cas 4: active + publishedAt null + isPublic → visible", () => {
    const profile = { status: "active" as const, isPublic: true, publishedAt: null };
    expect(isProfileVisible(profile, activeCompany)).toBe(true);
  });

  it("Cas 4: pending + publishedAt null → hidden (first submission)", () => {
    const profile = { status: "pending" as const, isPublic: true, publishedAt: null };
    expect(isProfileVisible(profile, activeCompany)).toBe(false);
  });

  it("Cas 4: rejected + publishedAt null → hidden (never published)", () => {
    const profile = { status: "rejected" as const, isPublic: true, publishedAt: null };
    expect(isProfileVisible(profile, activeCompany)).toBe(false);
  });

  it("Cas 4: active + publishedAt undefined (absent key) → visible (treated as null)", () => {
    const profile = { status: "active" as const, isPublic: true };
    expect(isProfileVisible(profile, activeCompany)).toBe(true);
  });

  // ── pendingData no longer affects visibility ──

  it("pendingData does NOT affect visibility when publishedAt is set", () => {
    const profile = {
      status: "active" as const,
      isPublic: true,
      publishedAt: publishedDate,
      pendingData: { submittedAt: new Date(), fields: [], note: null },
    };
    expect(isProfileVisible(profile, activeCompany)).toBe(true);
  });
});
