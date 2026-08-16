import { describe, it, expect, vi, afterEach } from "vitest";

// ---------------------------------------------------------------------------
// daysRemaining — canonical formula (same in BoostCards + SponsoringCards)
// Extracted here for unit testing the truth table.
// ---------------------------------------------------------------------------

function daysRemaining(to: string, durationDays: number): number {
  const diff = new Date(to).getTime() - Date.now();
  if (diff <= 0) return 0;
  return Math.min(Math.ceil(diff / 86_400_000), durationDays);
}

const DAY = 86_400_000;

describe("daysRemaining (boost 30j)", () => {
  afterEach(() => { vi.useRealTimers(); });

  it("30j0h0m0s → 30", () => {
    const now = new Date("2026-08-01T12:00:00Z").getTime();
    vi.setSystemTime(now);
    const to = new Date(now + 30 * DAY).toISOString();
    expect(daysRemaining(to, 30)).toBe(30);
  });

  it("29j23h59m59s → 30", () => {
    const now = new Date("2026-08-01T12:00:00Z").getTime();
    vi.setSystemTime(now);
    const to = new Date(now + 29 * DAY + 23 * 3600_000 + 59 * 60_000 + 59_000).toISOString();
    expect(daysRemaining(to, 30)).toBe(30);
  });

  it("29j0h0m1s → 30", () => {
    const now = new Date("2026-08-01T12:00:00Z").getTime();
    vi.setSystemTime(now);
    const to = new Date(now + 29 * DAY + 1000).toISOString();
    expect(daysRemaining(to, 30)).toBe(30);
  });

  it("29j pile → 29", () => {
    const now = new Date("2026-08-01T12:00:00Z").getTime();
    vi.setSystemTime(now);
    const to = new Date(now + 29 * DAY).toISOString();
    expect(daysRemaining(to, 30)).toBe(29);
  });

  it("0j0h0m1s → 1", () => {
    const now = new Date("2026-08-01T12:00:00Z").getTime();
    vi.setSystemTime(now);
    const to = new Date(now + 1000).toISOString();
    expect(daysRemaining(to, 30)).toBe(1);
  });

  it("achat immediat (diff ≈ 30j − 1ms) → 30", () => {
    const now = new Date("2026-08-01T12:00:00Z").getTime();
    vi.setSystemTime(now);
    const to = new Date(now + 30 * DAY - 1).toISOString();
    expect(daysRemaining(to, 30)).toBe(30);
  });

  it("expired (diff <= 0) → 0", () => {
    const now = new Date("2026-08-01T12:00:00Z").getTime();
    vi.setSystemTime(now);
    const to = new Date(now - 1000).toISOString();
    expect(daysRemaining(to, 30)).toBe(0);
  });
});

describe("daysRemaining (sponsoring 7j)", () => {
  afterEach(() => { vi.useRealTimers(); });

  it("7j pile → 7", () => {
    const now = new Date("2026-08-01T12:00:00Z").getTime();
    vi.setSystemTime(now);
    const to = new Date(now + 7 * DAY).toISOString();
    expect(daysRemaining(to, 7)).toBe(7);
  });

  it("6j23h → 7", () => {
    const now = new Date("2026-08-01T12:00:00Z").getTime();
    vi.setSystemTime(now);
    const to = new Date(now + 6 * DAY + 23 * 3600_000).toISOString();
    expect(daysRemaining(to, 7)).toBe(7);
  });

  it("1j pile → 1", () => {
    const now = new Date("2026-08-01T12:00:00Z").getTime();
    vi.setSystemTime(now);
    const to = new Date(now + 1 * DAY).toISOString();
    expect(daysRemaining(to, 7)).toBe(1);
  });

  it("0j0h0m1s → 1", () => {
    const now = new Date("2026-08-01T12:00:00Z").getTime();
    vi.setSystemTime(now);
    const to = new Date(now + 1000).toISOString();
    expect(daysRemaining(to, 7)).toBe(1);
  });
});
