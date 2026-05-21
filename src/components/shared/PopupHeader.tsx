"use client";

import Link from "next/link";

type ProductKey = "brandup" | "traceup" | "linkup";

interface PopupHeaderProps {
  product: ProductKey;
  companyName: string;
  slug: string;
  onClose: () => void;
}

function getInitials(name: string): string {
  if (!name) return "??";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
  return name.trim().substring(0, 2).toUpperCase();
}

const PRODUCT_COLORS: Record<ProductKey, string> = {
  brandup: "#0078D4",
  traceup: "#8764B8",
  linkup: "#1A1A1A",
};

export default function PopupHeader({ product, companyName, slug, onClose }: PopupHeaderProps): JSX.Element {
  const color = PRODUCT_COLORS[product];
  const initials = getInitials(companyName);

  return (
    <div className="sticky top-0 z-50 bg-white border-b border-outline-variant h-14 flex items-center justify-between px-4 md:px-8">
      <div className="flex items-center gap-3 min-w-0">
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0"
          style={{ backgroundColor: color }}
        >
          {initials}
        </div>
        <span className="text-sm font-semibold text-on-surface truncate">{companyName}</span>
      </div>
      <div className="flex items-center gap-3 flex-shrink-0">
        <Link
          href={`/${product}/${slug}`}
          className="flex items-center gap-1.5 px-2 md:px-3 h-9 rounded-lg text-primary text-xs md:text-sm font-semibold hover:bg-primary/5 transition-colors whitespace-nowrap"
        >
          <span className="hidden md:inline">Voir le profil complet</span>
          <span className="md:hidden">Voir profil</span>
          <span className="material-symbols-outlined text-[16px] md:text-[18px]">arrow_forward</span>
        </Link>
        <div className="hidden sm:block w-px h-5 bg-outline-variant" />
        <button
          type="button"
          onClick={onClose}
          className="w-9 h-9 flex items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container transition-colors"
          aria-label="Fermer"
        >
          <span className="material-symbols-outlined text-xl">close</span>
        </button>
      </div>
    </div>
  );
}
