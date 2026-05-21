interface SearchResultCardProps {
  slug: string;
  displayName: string;
  bannerUrl: string | null;
  color: string;
  pitch: string;
  sectorName: string;
  gouvernoratName: string;
  rseBadgeStatus: string;
  accentColor: string;
  onClick: () => void;
}

function getInitials(name: string): string {
  if (!name) return "??";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
  return name.trim().substring(0, 2).toUpperCase();
}

export default function SearchResultCard({
  displayName,
  bannerUrl,
  color,
  pitch,
  sectorName,
  gouvernoratName,
  rseBadgeStatus,
  accentColor,
  onClick,
}: SearchResultCardProps): JSX.Element {
  const initials = getInitials(displayName);

  return (
    <button
      type="button"
      onClick={onClick}
      className="bg-white border border-[#E0E0E0] rounded-lg flex flex-col min-h-[260px] hover:shadow-[0_4px_16px_rgba(0,0,0,0.12)] transition-all cursor-pointer group shadow-sm overflow-hidden text-left w-full"
      style={{ ["--accent" as string]: accentColor }}
    >
      {/* Visual area */}
      <div className="h-[107px] bg-[#F5F5F5] p-2 relative flex-shrink-0">
        {bannerUrl ? (
          <img
            alt={displayName}
            className="w-full h-full object-cover rounded-[6px] transition-transform duration-300 group-hover:scale-105"
            src={bannerUrl}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div
              className="w-[40px] h-[40px] rounded-full flex items-center justify-center text-white font-bold text-lg"
              style={{ backgroundColor: color || accentColor }}
            >
              {initials}
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="px-[16px] pt-[14px] pb-[12px] flex-grow flex flex-col">
        <h3
          className="text-[15px] font-bold text-[#242424] line-clamp-1 transition-colors mb-2"
          style={{ color: undefined }}
        >
          <span className="group-hover:text-[var(--accent)]">{displayName}</span>
        </h3>
        <p className="text-[13px] text-[#616161] line-clamp-2 leading-[1.6] flex-grow mb-2.5">
          {pitch || "\u00A0"}
        </p>
        <div>
          <span className="inline-block bg-[#F0F0F0] text-[#616161] text-[11px] font-medium px-2 py-0.5 rounded-[4px] uppercase">
            {sectorName}
          </span>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-[#F0F0F0] px-[16px] flex justify-between items-center mt-auto py-2.5">
        <div className="flex items-center gap-1 text-[#616161] text-[11px]">
          <span className="material-symbols-outlined text-[12px]">location_on</span>
          {gouvernoratName}
        </div>
        {rseBadgeStatus === "validated" && (
          <div className="flex items-center gap-1 bg-[#FEFCE8] border border-[#E8C96A] px-2 py-1 rounded h-[20px]">
            <span className="material-symbols-outlined text-[#C5A059] text-[12px]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
            <span className="text-[10px] font-bold text-[#854D0E]">RSE</span>
          </div>
        )}
      </div>
    </button>
  );
}
