import { describe, it, expect, vi, beforeEach } from "vitest";

// We test the GET handler by importing it after mocking global fetch.
// The route handler lives at src/app/cgu_cgv.html/route.ts.

const CGU_SOURCE_URL = "https://static.vivasky.media/cgu_cgv.html";

// Dynamic import so we can mock fetch before the module loads.
async function getHandler(): Promise<{ GET: () => Promise<Response> }> {
  // Clear module cache to pick up fresh fetch mock
  vi.resetModules();
  return import("@/app/cgu_cgv.html/route");
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("GET /cgu_cgv.html", () => {
  it("returns upstream HTML with 200 when destination is reachable", async () => {
    const upstreamHtml = "<html><body>CGU content</body></html>";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(upstreamHtml, { status: 200 })),
    );

    const { GET } = await getHandler();
    const res = await GET();

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("text/html; charset=utf-8");
    expect(res.headers.get("Cache-Control")).toContain("max-age=300");
    const body = await res.text();
    expect(body).toBe(upstreamHtml);
    expect(fetch).toHaveBeenCalledWith(
      CGU_SOURCE_URL,
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it("returns fallback HTML with 503 when destination responds with error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("Not Found", { status: 404 })),
    );

    const { GET } = await getHandler();
    const res = await GET();

    expect(res.status).toBe(503);
    expect(res.headers.get("Content-Type")).toBe("text/html; charset=utf-8");
    expect(res.headers.get("Retry-After")).toBe("300");
    const body = await res.text();
    expect(body).toContain("temporairement indisponible");
    expect(body).toContain("manager@vivasky.media");
  });

  it("returns fallback HTML with 503 when fetch throws (timeout / network error)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new DOMException("The operation was aborted", "AbortError")),
    );

    const { GET } = await getHandler();
    const res = await GET();

    expect(res.status).toBe(503);
    expect(res.headers.get("Retry-After")).toBe("300");
    const body = await res.text();
    expect(body).toContain("temporairement indisponible");
  });
});
