"use client";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}): JSX.Element {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center space-y-4 max-w-md">
        <div className="w-16 h-16 rounded-full bg-status-rejected-bg flex items-center justify-center mx-auto">
          <span className="material-symbols-outlined text-status-rejected-dot" style={{ fontSize: 28 }}>
            error
          </span>
        </div>
        <h2 className="font-heading font-semibold text-[18px] text-ink-primary">
          Une erreur est survenue
        </h2>
        <p className="text-[14px] text-ink-secondary">
          {error.message || "Impossible de charger cette page. Réessayez dans quelques instants."}
        </p>
        <button
          onClick={reset}
          className="inline-flex items-center gap-2 px-4 py-2 text-[13px] font-semibold text-white bg-primary hover:bg-primary-hover rounded-lg"
        >
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
            refresh
          </span>
          Réessayer
        </button>
      </div>
    </div>
  );
}
