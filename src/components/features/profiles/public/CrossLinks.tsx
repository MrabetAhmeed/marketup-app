import Link from "next/link";

type ProductKey = "brandup" | "traceup" | "linkup";

interface CrossLink {
  key: ProductKey;
  name: string;
  subtitle: string;
  description: string;
  cta: string;
  icon: string;
  color: string;
  textColor: string;
}

const ALL_LINKS: CrossLink[] = [
  {
    key: "brandup",
    name: "BrandUP",
    subtitle: "Nos activités",
    description: "Découvrez le profil institutionnel, les certifications et nos activités.",
    cta: "Découvrir BrandUP",
    icon: "branding_watermark",
    color: "#0078D4",
    textColor: "text-primary",
  },
  {
    key: "traceup",
    name: "TraceUP",
    subtitle: "Vidéos & Médias",
    description: "Explorez les contenus vidéo, les coulisses et les démonstrations techniques.",
    cta: "Découvrir TraceUP",
    icon: "play_circle",
    color: "#8764B8",
    textColor: "text-secondary",
  },
  {
    key: "linkup",
    name: "LinkUP",
    subtitle: "Réseau & Contacts",
    description: "Connectez-vous avec les décideurs et consultez les coordonnées professionnelles.",
    cta: "Découvrir LinkUP",
    icon: "hub",
    color: "#C5A059",
    textColor: "text-[#C5A059]",
  },
];

interface CrossLinksProps {
  current: ProductKey;
  slug: string;
  visibleProfiles: { brandup: boolean; traceup: boolean; linkup: boolean };
}

export default function CrossLinks({ current, slug, visibleProfiles }: CrossLinksProps): JSX.Element {
  const links = ALL_LINKS.filter((l) => l.key !== current && visibleProfiles[l.key]);

  if (links.length === 0) return <></>;

  return (
    <div className="bg-[#0b1120] rounded-xl p-6 sm:p-8 md:p-12 text-white relative overflow-hidden">
      <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 blur-[100px]" />

      <div className="relative z-10 mb-10">
        <h2 className="text-3xl font-bold mb-2 tracking-tight">Découvrez aussi</h2>
        <p className="text-slate-400">Explorez l&apos;écosystème complet de cette entreprise.</p>
      </div>

      <div className={`grid grid-cols-1 ${links.length > 1 ? "md:grid-cols-2" : ""} gap-6 relative z-10`}>
        {links.map((l) => (
          <Link
            key={l.key}
            href={`/${l.key}/${slug}`}
            className="bg-slate-800/60 border border-white/10 rounded-lg p-6 hover:bg-slate-800 transition-colors cursor-pointer group block"
          >
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: l.color }}>
                <span className="material-symbols-outlined text-white">{l.icon}</span>
              </div>
              <div>
                <h3 className="font-bold text-lg">{l.name}</h3>
                <p className="text-[10px] font-bold tracking-widest uppercase opacity-70">{l.subtitle}</p>
              </div>
            </div>
            <p className="text-sm text-slate-300 mb-6 leading-relaxed">{l.description}</p>
            <div className={`flex items-center ${l.textColor} text-sm font-bold gap-2 group-hover:translate-x-2 transition-transform`}>
              {l.cta}
              <span className="material-symbols-outlined">chevron_right</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
