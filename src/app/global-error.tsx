"use client";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}): JSX.Element {
  return (
    <html lang="fr">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Erreur — vivasky.media</title>
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@600;700&family=Inter:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
          rel="stylesheet"
        />
        <style
          dangerouslySetInnerHTML={{
            __html: `
              body { margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center; font-family: 'Inter', sans-serif; background: #fafafa; color: #242424; -webkit-font-smoothing: antialiased; }
              .box { text-align: center; max-width: 420px; padding: 1rem; }
              .icon-wrap { width: 64px; height: 64px; border-radius: 50%; background: #FEE2E2; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; }
              .icon-wrap .material-symbols-outlined { font-size: 28px; color: #DC2626; }
              h1 { font-family: 'Plus Jakarta Sans', sans-serif; font-size: 20px; font-weight: 600; margin: 0 0 8px; }
              p { font-size: 14px; color: #616161; line-height: 1.6; margin: 0 0 24px; }
              button { display: inline-flex; align-items: center; gap: 8px; padding: 10px 20px; font-size: 13px; font-weight: 600; color: #fff; background: #0078D4; border: none; border-radius: 8px; cursor: pointer; font-family: 'Inter', sans-serif; }
              button:hover { background: #106EBE; }
              button .material-symbols-outlined { font-size: 16px; }
            `,
          }}
        />
      </head>
      <body>
        <div className="box">
          <div className="icon-wrap">
            <span className="material-symbols-outlined">error</span>
          </div>
          <h1>Une erreur critique est survenue</h1>
          <p>
            L&apos;application a rencontré un problème inattendu.
            Réessayez ou revenez plus tard.
          </p>
          <button onClick={reset}>
            <span className="material-symbols-outlined">refresh</span>
            Réessayer
          </button>
        </div>
      </body>
    </html>
  );
}
