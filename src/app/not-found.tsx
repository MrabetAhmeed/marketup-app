import Link from "next/link";

export default function NotFoundPage(): JSX.Element {
  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-muted px-4">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 rounded-full bg-[#FFF4E5] flex items-center justify-center mx-auto mb-5">
          <span className="material-symbols-outlined text-[#D97706]" style={{ fontSize: 28 }}>
            search_off
          </span>
        </div>
        <h1 className="font-heading font-semibold text-[20px] text-ink-primary mb-2">
          Page introuvable
        </h1>
        <p className="text-[14px] text-ink-secondary leading-relaxed mb-6">
          Cette page n&apos;existe pas ou n&apos;est plus disponible.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 text-[13px] font-semibold text-white bg-primary hover:bg-primary-hover rounded-lg transition-colors"
        >
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>home</span>
          Retour à l&apos;accueil
        </Link>
      </div>
    </div>
  );
}
