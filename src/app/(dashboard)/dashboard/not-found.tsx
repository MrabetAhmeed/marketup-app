import Link from "next/link";

export default function DashboardNotFound(): JSX.Element {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 rounded-full bg-[#FFF4E5] flex items-center justify-center mx-auto mb-5">
          <span className="material-symbols-outlined text-[#D97706]" style={{ fontSize: 28 }}>
            search_off
          </span>
        </div>
        <h2 className="font-heading font-semibold text-[18px] text-ink-primary mb-2">
          Page introuvable
        </h2>
        <p className="text-[14px] text-ink-secondary mb-6">
          Cette page du tableau de bord n&apos;existe pas ou a été déplacée.
        </p>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 px-4 py-2 text-[13px] font-semibold text-white bg-primary hover:bg-primary-hover rounded-lg transition-colors"
        >
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>dashboard</span>
          Retour au tableau de bord
        </Link>
      </div>
    </div>
  );
}
