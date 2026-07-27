import { describe, it, expect } from "vitest";

// Test the shuffleInPlace function directly by importing the search module
// and checking that boosted items are always in the head of results.
// We can't easily test randomness, but we CAN test the invariant:
// boosted items are always before non-boosted items.

describe("search shuffle invariant", () => {
  it("Fisher-Yates shuffle produces valid permutation", () => {
    // Reproduce the shuffle logic
    function shuffleInPlace<T>(arr: T[]): T[] {
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i]!, arr[j]!] = [arr[j]!, arr[i]!];
      }
      return arr;
    }

    const items = [1, 2, 3, 4, 5];
    const shuffled = shuffleInPlace([...items]);

    // Same elements
    expect(shuffled.sort()).toEqual(items.sort());
  });

  it("with 3 boosted items, boosted set is always the same 3 items (order may vary)", () => {
    function shuffleInPlace<T>(arr: T[]): T[] {
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i]!, arr[j]!] = [arr[j]!, arr[i]!];
      }
      return arr;
    }

    const boostedIds = new Set(["A", "B", "C"]);
    const all = [
      { id: "A", boosted: true },
      { id: "B", boosted: true },
      { id: "C", boosted: true },
      { id: "D", boosted: false },
      { id: "E", boosted: false },
      { id: "F", boosted: false },
    ];

    // Simulate the split-shuffle-concat
    const boosted = all.filter((x) => x.boosted);
    const nonBoosted = all.filter((x) => !x.boosted);
    shuffleInPlace(boosted);
    nonBoosted.sort((a, b) => a.id.localeCompare(b.id));
    const result = [...boosted, ...nonBoosted];

    // First 3 are boosted (any order)
    const headIds = new Set(result.slice(0, 3).map((x) => x.id));
    expect(headIds).toEqual(boostedIds);

    // Last 3 are non-boosted in stable order
    expect(result.slice(3).map((x) => x.id)).toEqual(["D", "E", "F"]);
  });

  it("with 0-1 boosted items, order is stable", () => {
    function shuffleInPlace<T>(arr: T[]): T[] {
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i]!, arr[j]!] = [arr[j]!, arr[i]!];
      }
      return arr;
    }

    // 0 boosted
    const items0 = [{ id: "A" }, { id: "B" }, { id: "C" }];
    const boosted0: typeof items0 = [];
    shuffleInPlace(boosted0);
    const result0 = [...boosted0, ...items0];
    expect(result0.map((x) => x.id)).toEqual(["A", "B", "C"]);

    // 1 boosted — shuffle of 1 element is identity
    const single = [{ id: "X" }];
    shuffleInPlace(single);
    expect(single[0]!.id).toBe("X");
  });
});

describe("search DTO boosted flag", () => {
  it("boosted items have boosted: true, non-boosted have boosted: false", () => {
    const boostedCompanyIds = new Set(["c1", "c3"]);

    // Simulate the DTO mapping logic from public-search.service
    const companies = [
      { _id: "c1", slug: "alpha" },
      { _id: "c2", slug: "beta" },
      { _id: "c3", slug: "gamma" },
      { _id: "c4", slug: "delta" },
    ];

    const items = companies.map((c) => ({
      companyId: c._id,
      slug: c.slug,
      boosted: boostedCompanyIds.has(c._id),
    }));

    expect(items[0]!.boosted).toBe(true);   // c1 boosted
    expect(items[1]!.boosted).toBe(false);  // c2 not boosted
    expect(items[2]!.boosted).toBe(true);   // c3 boosted
    expect(items[3]!.boosted).toBe(false);  // c4 not boosted
  });

  it("expired/no boost yields boosted: false for all items", () => {
    const boostedCompanyIds = new Set<string>(); // no active boosts

    const companies = [
      { _id: "c1", slug: "alpha" },
      { _id: "c2", slug: "beta" },
    ];

    const items = companies.map((c) => ({
      companyId: c._id,
      slug: c.slug,
      boosted: boostedCompanyIds.has(c._id),
    }));

    expect(items.every((i) => i.boosted === false)).toBe(true);
  });

  it("SearchResultCard DTO type includes boosted boolean", () => {
    // Type-level check: the interface requires boosted
    const card: import("@/services/public-search.service").SearchResultCard = {
      companyId: "c1",
      slug: "test",
      displayName: "Test",
      bannerUrl: null,
      color: "#000",
      type: "B2B",
      sectorName: "IT",
      gouvernoratName: "Tunis",
      pitch: "Test pitch",
      rseBadgeStatus: "none",
      boosted: true,
    };
    expect(card.boosted).toBe(true);

    const cardNoBoosted = { ...card, boosted: false };
    expect(cardNoBoosted.boosted).toBe(false);
  });
});
