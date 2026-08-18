interface ProfileHeroProps {
  logoUrl: string | null;
  displayName: string;
  legalId: string;
  sectorName: string;
  type: string;
  phone: string | null;
  whatsapp: string | null;
  email: string;
  address: string | null;
  gouvernoratName: string;
  ville: string;
  rseBadgeStatus: string;
}

export default function ProfileHero({
  logoUrl,
  displayName,
  legalId,
  sectorName,
  type,
  phone,
  whatsapp,
  email,
  address,
  gouvernoratName,
  ville,
  rseBadgeStatus,
}: ProfileHeroProps): JSX.Element {
  const fullAddress = [address, ville, gouvernoratName, "Tunisie"].filter(Boolean).join(", ");

  return (
    <>
      <section className="grid grid-cols-1 md:grid-cols-12 gap-12 items-start mb-12">
        {/* Logo */}
        <div className="md:col-span-4 lg:col-span-3">
          <div className="aspect-square bg-surface-container rounded-2xl overflow-hidden p-8 flex items-center justify-center">
            {logoUrl ? (
              <img src={logoUrl} alt={`${displayName} — Logo`} className="w-full h-full object-contain" />
            ) : (
              <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center text-white text-3xl font-bold">
                {displayName.substring(0, 2).toUpperCase()}
              </div>
            )}
          </div>
        </div>

        {/* Info */}
        <div className="md:col-span-8 lg:col-span-9 space-y-6 min-w-0">
          <div className="space-y-2">
            {/* RSE badge — ESG icon + label */}
            {rseBadgeStatus === "validated" && (
              <div className="flex flex-wrap gap-2 mb-4">
                <div className="inline-flex items-center gap-2 bg-[#F0F4FF] border border-[#C5CCE8] px-3 py-1.5 rounded shadow-sm">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/badges/esg-icon.svg" alt="ESG" className="w-5 h-5" />
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#1A2B8C]">Engagement Social Attest&eacute;</span>
                </div>
              </div>
            )}

            {/* Name */}
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-on-surface break-words">{displayName}</h1>

            {/* Badges */}
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span className="inline-flex items-center gap-1 bg-[#EFF6FC] border border-primary/20 text-primary text-[11px] font-semibold px-2 py-1 rounded">
                <span className="material-symbols-outlined text-[13px]" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
                RNE &middot; {legalId}
              </span>
              <span className="text-[11px] font-bold text-primary uppercase tracking-wider">{sectorName}</span>
              <span className="text-outline">&middot;</span>
              <span className="inline-flex items-center text-[11px] font-semibold bg-surface-container-low border border-outline-variant text-on-surface px-2 py-0.5 rounded">
                {type}
              </span>
            </div>
          </div>

          {/* Contact */}
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row flex-wrap gap-6 items-start md:items-center min-w-0">
              {phone && (
                <div className="flex items-center space-x-3 text-on-surface min-w-0">
                  <span className="material-symbols-outlined text-primary text-[20px] shrink-0">call</span>
                  <span className="text-sm font-medium">{phone}</span>
                </div>
              )}
              {whatsapp && (
                <div className="flex items-center space-x-3 text-on-surface min-w-0">
                  <span className="material-symbols-outlined text-primary text-[20px] shrink-0">chat</span>
                  <span className="text-sm font-medium">{whatsapp}</span>
                </div>
              )}
              {email && (
                <div className="flex items-center space-x-3 text-on-surface min-w-0">
                  <span className="material-symbols-outlined text-primary text-[20px] shrink-0">mail</span>
                  <span className="text-sm font-medium break-all">{email}</span>
                </div>
              )}
            </div>
            {fullAddress && (
              <div className="w-full flex items-center space-x-3 text-on-surface min-w-0">
                <span className="material-symbols-outlined text-primary text-[20px] shrink-0">location_on</span>
                <span className="text-sm font-medium break-words min-w-0">{fullAddress}</span>
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
