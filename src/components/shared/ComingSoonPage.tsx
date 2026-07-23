"use client";

interface ComingSoonPageProps {
  kind: "brandup" | "traceup" | "linkup";
  displayName: string;
  logoUrl: string | null;
}

const ACCENT: Record<string, string> = {
  brandup: "#0078D4",
  traceup: "#8764B8",
  linkup: "#C5A059",
};

export default function ComingSoonPage({ kind, displayName, logoUrl }: ComingSoonPageProps): JSX.Element {
  const accent = ACCENT[kind] ?? "#0078D4";
  const initials = displayName.trim().substring(0, 2).toUpperCase();

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 py-16">
      {/* Logo or initials fallback */}
      {logoUrl ? (
        <img
          src={logoUrl}
          alt={displayName}
          className="w-20 h-20 rounded-lg object-contain bg-white border border-[#E8E6E4] mb-6"
        />
      ) : (
        <div
          className="w-20 h-20 rounded-lg flex items-center justify-center text-white text-2xl font-bold mb-6"
          style={{ backgroundColor: accent }}
        >
          {initials}
        </div>
      )}

      {/* Company name */}
      <h1 className="font-heading text-xl font-semibold text-ink-primary text-center mb-2">
        {displayName}
      </h1>

      {/* Coming soon badge */}
      <div
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-semibold text-white mb-4"
        style={{ backgroundColor: accent }}
      >
        <span className="material-symbols-outlined text-[16px]">schedule</span>
        Bient&ocirc;t disponible
      </div>

      {/* Subtitle */}
      <p className="text-[14px] text-ink-secondary text-center max-w-sm leading-relaxed">
        Ce profil sera de retour prochainement.
      </p>
    </div>
  );
}
