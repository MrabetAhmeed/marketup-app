import { NextResponse } from "next/server";

/**
 * URL of the CGU/CGV document hosted on a separate static server,
 * edited by the client via FTP. Never stored in this repository.
 */
const CGU_SOURCE_URL = "https://static.vivasky.media/cgu_cgv.html";

/** Timeout for the outbound fetch (milliseconds). */
const FETCH_TIMEOUT_MS = 5_000;

/** Browser-side cache: 5 minutes, revalidate in background. */
const CACHE_CONTROL = "public, max-age=300, stale-while-revalidate=60";

const FALLBACK_HTML = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Conditions — vivasky.media</title>
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
    <p>Les Conditions Générales d'Utilisation et de Vente sont momentanément inaccessibles. Veuillez réessayer dans quelques instants.</p>
    <a href="/">Retour à l'accueil</a>
    <div class="contact">Contact : manager@vivasky.media</div>
  </div>
</body>
</html>`;

export async function GET(): Promise<NextResponse> {
  try {
    const res = await fetch(CGU_SOURCE_URL, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      next: { revalidate: 300 },
    });

    if (!res.ok) {
      console.error(`[cgu_cgv] upstream responded ${res.status} for ${CGU_SOURCE_URL}`);
      return new NextResponse(FALLBACK_HTML, {
        status: 503,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Retry-After": "300",
        },
      });
    }

    const html = await res.text();
    return new NextResponse(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": CACHE_CONTROL,
      },
    });
  } catch (err) {
    console.error(`[cgu_cgv] fetch failed for ${CGU_SOURCE_URL}:`, err);
    return new NextResponse(FALLBACK_HTML, {
      status: 503,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Retry-After": "300",
      },
    });
  }
}
