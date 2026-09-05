"use client";

import Link from "next/link";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}): JSX.Element {
  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-muted px-4">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 rounded-full bg-status-rejected-bg flex items-center justify-center mx-auto mb-5">
          <span className="material-symbols-outlined text-status-rejected-dot" style={{ fontSize: 28 }}>
            error
          </span>
        </div>
        <h1 className="font-heading font-semibold text-[20px] text-ink-primary mb-2">
          Une erreur est survenue
        </h1>
        <p className="text-[14px] text-ink-secondary leading-relaxed mb-6">
          {error.message || "Impossible de charger cette page. Réessayez dans quelques instants."}
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-[13px] font-semibold text-white bg-primary hover:bg-primary-hover rounded-lg transition-colors"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>refresh</span>
            Réessayer
          </button>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2.5 text-[13px] font-semibold text-ink-primary bg-white border border-[#D1D1D1] rounded-lg hover:bg-surface-muted transition-colors"
          >
            Accueil
          </Link>
        </div>
      </div>
    </div>
  );
}
