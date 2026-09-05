import Link from "next/link";

export default function AdminNotFound(): JSX.Element {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 rounded-full bg-[#F3E8FF] flex items-center justify-center mx-auto mb-5">
          <span className="material-symbols-outlined text-[#5C2D91]" style={{ fontSize: 28 }}>
            search_off
          </span>
        </div>
        <h2 className="font-heading font-semibold text-[18px] text-ink-primary mb-2">
          Page d&apos;administration introuvable
        </h2>
        <p className="text-[14px] text-ink-secondary mb-6">
          Cette page n&apos;existe pas ou a été déplacée.
        </p>
        <Link
          href="/admin"
          className="inline-flex items-center gap-2 px-4 py-2 text-[13px] font-semibold text-white bg-[#5C2D91] hover:bg-[#4A2377] rounded-lg transition-colors"
        >
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>dashboard</span>
          Retour au tableau de bord
        </Link>
      </div>
    </div>
  );
}
