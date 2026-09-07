import { NextResponse } from "next/server";

/** Timeout for the outbound fetch (milliseconds). */
const FETCH_TIMEOUT_MS = 5_000;

/** Browser-side cache: 5 minutes, revalidate in background. */
const CACHE_CONTROL = "public, max-age=300, stale-while-revalidate=60";

/**
 * Escape a string for safe injection into a JS string literal.
 * Guards against broken syntax from malformed env values.
 */
function escapeJsString(s: string): string {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/'/g, "\\'")
    .replace(/`/g, "\\`")
    .replace(/</g, "\\x3C")
    .replace(/>/g, "\\x3E")
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r");
}

/**
 * Build the fallback HTML page shown when the upstream document is unreachable.
 * The `documentLabel` makes the message specific to which document failed.
 */
function buildFallbackHtml(documentLabel: string): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${documentLabel} — vivasky.media</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap" rel="stylesheet" />
  <style>
    body { margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center; font-family: 'Inter', sans-serif; background: #f5f5f5; color: #242424; }
    .box { text-align: center; max-width: 420px; padding: 2rem; }
    h1 { font-size: 1.25rem; font-weight: 600; margin: 0 0 0.5rem; }
    p { font-size: 0.875rem; color: #616161; line-height: 1.6; margin: 0 0 1.5rem; }
    a { display: inline-block; padding: 0.5rem 1.25rem; font-size: 0.8125rem; font-weight: 600; color: #fff; background: #0078D4; border-radius: 8px; text-decoration: none; }
    a:hover { background: #106EBE; }
    .contact { margin-top: 1rem; font-size: 0.75rem; color: #9E9E9E; }
  </style>
</head>
<body>
  <div class="box">
    <h1>Document temporairement indisponible</h1>
    <p>${documentLabel} est momentanément inaccessible. Veuillez réessayer dans quelques instants.</p>
    <a href="/">Retour à l'accueil</a>
    <div class="contact">Contact : manager@vivasky.media</div>
  </div>
</body>
</html>`;
}

/**
 * Proxy a legal document from an external static server.
 *
 * Core behaviour:
 * - If `sourceUrl` contains a fragment (`#section`), the fragment is stripped
 *   before the HTTP request and a scroll script is injected into the response.
 * - If `sourceUrl` has no fragment, the HTML is served as-is.
 * - On upstream failure, a branded fallback page is returned (503).
 *
 * The fragment always comes from server configuration (env var or constant),
 * never from user input.
 *
 * @param sourceUrl  Full URL, optionally with a `#fragment`
 * @param documentLabel  Human-readable document name for the fallback page
 */
export async function proxyLegalDoc(
  sourceUrl: string,
  documentLabel: string,
): Promise<NextResponse> {
  // Parse fragment from the configured URL
  let fetchUrl = sourceUrl;
  let fragment: string | null = null;

  const hashIndex = sourceUrl.indexOf("#");
  if (hashIndex !== -1) {
    fetchUrl = sourceUrl.slice(0, hashIndex);
    fragment = sourceUrl.slice(hashIndex + 1);
  }

  const fallbackHtml = buildFallbackHtml(documentLabel);

  try {
    const res = await fetch(fetchUrl, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      next: { revalidate: 300 },
    });

    if (!res.ok) {
      console.error(`[legal-proxy] upstream responded ${res.status} for ${fetchUrl}`);
      return new NextResponse(fallbackHtml, {
        status: 503,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Retry-After": "300",
        },
      });
    }

    let html = await res.text();

    // If a fragment was configured, verify its presence and inject scroll script
    if (fragment) {
      const anchorId = escapeJsString(fragment);
      if (!html.includes(`id="${fragment}"`)) {
        console.warn(
          `[legal-proxy] anchor id="${fragment}" not found in ${fetchUrl} — page will display without scroll`,
        );
      }
      const scrollScript = `<script>document.getElementById("${anchorId}")?.scrollIntoView({behavior:"smooth"})</script>`;
      // Inject before </body> if present, otherwise append
      if (html.includes("</body>")) {
        html = html.replace("</body>", `${scrollScript}</body>`);
      } else {
        html += scrollScript;
      }
    }

    return new NextResponse(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": CACHE_CONTROL,
      },
    });
  } catch (err) {
    console.error(`[legal-proxy] fetch failed for ${fetchUrl}:`, err);
    return new NextResponse(fallbackHtml, {
      status: 503,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Retry-After": "300",
      },
    });
  }
}
