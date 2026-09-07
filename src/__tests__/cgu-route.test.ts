import { describe, it, expect, vi, beforeEach } from "vitest";
import { proxyLegalDoc } from "@/lib/legal-proxy";

const UPSTREAM_HTML_WITH_ANCHOR =
  '<html><head><title>CGU</title></head><body><div id="cgu">Section CGU</div><div id="cgv">Section CGV</div><div id="mentions-legales">Mentions</div><div id="confidentialite">Confidentialité</div></body></html>';

const UPSTREAM_HTML_NO_ANCHORS =
  "<html><head><title>CGU</title></head><body><p>No anchors here</p></body></html>";

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("proxyLegalDoc", () => {
  it("returns upstream HTML without script when URL has no fragment", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(UPSTREAM_HTML_NO_ANCHORS, { status: 200 })),
    );

    const res = await proxyLegalDoc(
      "https://static.vivasky.media/cgu_cgv.html",
      "Conditions",
    );

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("text/html; charset=utf-8");
    expect(res.headers.get("Cache-Control")).toContain("max-age=300");
    const body = await res.text();
    expect(body).toBe(UPSTREAM_HTML_NO_ANCHORS);
    expect(body).not.toContain("<script>");
    expect(fetch).toHaveBeenCalledWith(
      "https://static.vivasky.media/cgu_cgv.html",
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it("strips fragment from fetch URL and injects scroll script into returned HTML", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(UPSTREAM_HTML_WITH_ANCHOR, { status: 200 })),
    );

    const res = await proxyLegalDoc(
      "https://static.vivasky.media/cgu_cgv.html#cgu",
      "CGU",
    );

    expect(res.status).toBe(200);
    // Fetch must strip the fragment
    expect(fetch).toHaveBeenCalledWith(
      "https://static.vivasky.media/cgu_cgv.html",
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    const body = await res.text();
    // The returned HTML MUST contain the scroll script with the exact anchor ID
    expect(body).toContain(
      '<script>document.getElementById("cgu")?.scrollIntoView({behavior:"smooth"})</script></body>',
    );
  });

  it("injects correct fragment for each of the 4 legal anchors", async () => {
    const anchors = ["mentions-legales", "cgu", "cgv", "confidentialite"] as const;

    for (const anchor of anchors) {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(new Response(UPSTREAM_HTML_WITH_ANCHOR, { status: 200 })),
      );

      const res = await proxyLegalDoc(
        `https://static.vivasky.media/cgu_cgv.html#${anchor}`,
        "Test",
      );

      const body = await res.text();
      expect(body).toContain(
        `<script>document.getElementById("${anchor}")?.scrollIntoView({behavior:"smooth"})</script></body>`,
      );
    }
  });

  it("returns fallback HTML with 503 and document label when upstream responds with error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("Not Found", { status: 404 })),
    );

    const res = await proxyLegalDoc(
      "https://static.vivasky.media/cgu_cgv.html",
      "Mentions légales",
    );

    expect(res.status).toBe(503);
    expect(res.headers.get("Content-Type")).toBe("text/html; charset=utf-8");
    expect(res.headers.get("Retry-After")).toBe("300");
    const body = await res.text();
    expect(body).toContain("temporairement indisponible");
    expect(body).toContain("Mentions légales");
    expect(body).toContain("manager@vivasky.media");
  });

  it("returns fallback HTML with 503 when fetch throws (timeout / network error)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new DOMException("The operation was aborted", "AbortError")),
    );

    const res = await proxyLegalDoc(
      "https://static.vivasky.media/cgu_cgv.html#cgv",
      "CGV",
    );

    expect(res.status).toBe(503);
    expect(res.headers.get("Retry-After")).toBe("300");
    const body = await res.text();
    expect(body).toContain("temporairement indisponible");
    expect(body).toContain("CGV");
  });

  it("logs warning when anchor ID is missing from upstream content but still injects script", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(UPSTREAM_HTML_NO_ANCHORS, { status: 200 })),
    );
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const res = await proxyLegalDoc(
      "https://static.vivasky.media/cgu_cgv.html#missing-section",
      "Document",
    );

    expect(res.status).toBe(200);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('anchor id="missing-section" not found'),
    );
    const body = await res.text();
    // Script is still injected (graceful degradation)
    expect(body).toContain(
      '<script>document.getElementById("missing-section")?.scrollIntoView({behavior:"smooth"})</script></body>',
    );
  });

  it("demonstrates dotenv trap: URL without fragment produces no script injection", async () => {
    // This is what happens when dotenv silently strips the fragment from an unquoted URL.
    // The function receives "https://...cgu_cgv.html" instead of "https://...cgu_cgv.html#cgu".
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(UPSTREAM_HTML_WITH_ANCHOR, { status: 200 })),
    );

    const res = await proxyLegalDoc(
      "https://static.vivasky.media/cgu_cgv.html", // no fragment — as dotenv would deliver it
      "CGU",
    );

    const body = await res.text();
    // No script injected — this is the broken behavior that occurs with unquoted .env values
    expect(body).not.toContain("<script>");
    expect(body).toBe(UPSTREAM_HTML_WITH_ANCHOR);
  });
});
