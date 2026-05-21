import Link from "next/link";

export default function PublicFooter(): JSX.Element {
  return (
    <footer className="w-full py-12 px-8 mt-20 bg-surface-container-low border-t border-outline-variant">
      <div className="max-w-[1280px] mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-10">
          {/* Column 1: Brand */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="material-symbols-outlined text-primary text-[22px]" style={{ fontVariationSettings: "'FILL' 1" }}>hexagon</span>
              <span className="text-on-surface font-bold text-lg tracking-tight">MARKET-UP</span>
            </div>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              L&apos;annuaire professionnel des entreprises tunisiennes.<br />
              <span className="font-medium">vivasky.media</span>
            </p>
          </div>

          {/* Column 2: Platform */}
          <div>
            <h4 className="text-on-surface font-bold text-[11px] uppercase tracking-widest mb-4">Plateforme</h4>
            <ul className="space-y-2 text-xs text-on-surface-variant">
              <li><Link className="hover:text-primary transition-colors" href="/brandup">BrandUP</Link></li>
              <li><Link className="hover:text-primary transition-colors" href="/traceup">TraceUP</Link></li>
              <li><Link className="hover:text-primary transition-colors" href="/linkup">LinkUP</Link></li>
            </ul>
          </div>

          {/* Column 3: Entreprise */}
          <div>
            <h4 className="text-on-surface font-bold text-[11px] uppercase tracking-widest mb-4">Entreprise</h4>
            <ul className="space-y-2 text-xs text-on-surface-variant">
              <li><Link className="hover:text-primary transition-colors" href="/signup/company">Inscrire une entreprise</Link></li>
              <li><span className="cursor-default">Tarifs Boost &amp; Sponsoring</span></li>
              <li><span className="cursor-default">Programme RSE</span></li>
            </ul>
          </div>

          {/* Column 4: Legal */}
          <div>
            <h4 className="text-on-surface font-bold text-[11px] uppercase tracking-widest mb-4">L&eacute;gal</h4>
            <ul className="space-y-2 text-xs text-on-surface-variant">
              <li><span className="cursor-default">Confidentialit&eacute;</span></li>
              <li><span className="cursor-default">Conditions g&eacute;n&eacute;rales</span></li>
              <li><span className="cursor-default">Support</span></li>
            </ul>
          </div>
        </div>

        <div className="pt-6 border-t border-outline-variant flex flex-col md:flex-row justify-between items-center gap-3">
          <p className="text-[11px] text-on-surface-variant">&copy; 2026 MARKET-UP &middot; AGGREGAX SUARL &middot; Tous droits r&eacute;serv&eacute;s</p>
          <p className="text-[11px] text-on-surface-variant">Fait en Tunisie 🇹🇳</p>
        </div>
      </div>
    </footer>
  );
}
