import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock env before importing the module under test
vi.mock("@/lib/env", () => ({
  env: {
    NOMINATIM_USER_AGENT: "MARKET-UP-TEST/1.0",
  },
}));

import { geocodeAddress } from "@/lib/geocoding/nominatim";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mockFetchOk(data: unknown): void {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve(data),
  }));
}

function mockFetchError(): void {
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Network error")));
}

function mockFetchTimeout(): void {
  vi.stubGlobal("fetch", vi.fn().mockImplementation(() =>
    new Promise((_, reject) => {
      setTimeout(() => reject(new DOMException("Aborted", "AbortError")), 10);
    }),
  ));
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("geocodeAddress", () => {
  it("returns lat/lng from valid Nominatim response", async () => {
    mockFetchOk([
      { lat: "35.7628", lon: "10.7148", display_name: "Sahline, Sousse, Tunisia" },
    ]);

    const result = await geocodeAddress({
      address: "Rue de l'Industrie",
      ville: "Sahline",
      gouvernorat: "Sousse",
    });

    expect(result).toEqual({
      lat: 35.7628,
      lng: 10.7148,
      displayName: "Sahline, Sousse, Tunisia",
    });
  });

  it("returns null when Nominatim returns empty array", async () => {
    mockFetchOk([]);

    const result = await geocodeAddress({
      address: "Adresse introuvable",
      ville: "Nowhere",
      gouvernorat: "Unknown",
    });

    expect(result).toBeNull();
  });

  it("returns null on network error (no throw)", async () => {
    mockFetchError();

    const result = await geocodeAddress({
      ville: "Tunis",
      gouvernorat: "Tunis",
    });

    expect(result).toBeNull();
  });

  it("returns null on timeout (no throw)", async () => {
    mockFetchTimeout();

    const result = await geocodeAddress({
      ville: "Tunis",
      gouvernorat: "Tunis",
    });

    expect(result).toBeNull();
  });

  it("builds query from address + ville + gouvernorat + country", async () => {
    mockFetchOk([{ lat: "36.8", lon: "10.1", display_name: "Tunis" }]);

    await geocodeAddress({
      address: "Avenue Bourguiba",
      ville: "Tunis",
      gouvernorat: "Tunis",
    });

    const fetchCall = (fetch as ReturnType<typeof vi.fn>).mock.calls[0]!;
    const url = new URL(fetchCall[0] as string);
    expect(url.searchParams.get("q")).toBe("Avenue Bourguiba, Tunis, Tunis, Tunisia");
    expect(url.searchParams.get("format")).toBe("json");
    expect(url.searchParams.get("limit")).toBe("1");
  });

  it("sends User-Agent header", async () => {
    mockFetchOk([{ lat: "36.8", lon: "10.1", display_name: "Tunis" }]);

    await geocodeAddress({ ville: "Tunis", gouvernorat: "Tunis" });

    const fetchCall = (fetch as ReturnType<typeof vi.fn>).mock.calls[0]!;
    const opts = fetchCall[1] as RequestInit;
    expect((opts.headers as Record<string, string>)["User-Agent"]).toBe("MARKET-UP-TEST/1.0");
  });

  it("skips null address in query", async () => {
    mockFetchOk([{ lat: "36.8", lon: "10.1", display_name: "Tunis" }]);

    await geocodeAddress({
      address: null,
      ville: "Tunis",
      gouvernorat: "Tunis",
    });

    const fetchCall = (fetch as ReturnType<typeof vi.fn>).mock.calls[0]!;
    const url = new URL(fetchCall[0] as string);
    expect(url.searchParams.get("q")).toBe("Tunis, Tunis, Tunisia");
  });
});
