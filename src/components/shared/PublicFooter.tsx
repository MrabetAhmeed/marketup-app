import Link from "next/link";

function copyrightYear(): string {
  const now = new Date().getFullYear();
  return now > 2026 ? `2026-${now}` : "2026";
}

export default function PublicFooter(): JSX.Element {
  return (
    <footer className="w-full py-12 px-8 mt-20 bg-surface-container-low border-t border-outline-variant">
      <div className="max-w-[1280px] mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-10">
          {/* Column 1: Brand */}
          <div>
            <div className="mb-3">
              <span className="text-on-surface font-bold text-lg tracking-tight">MARKET-UP</span>
            </div>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              La référence des marques en Tunisie.
            </p>
          </div>

          {/* Column 2: Platform */}
          <div>
            <h4 className="text-on-surface font-bold text-[11px] uppercase tracking-widest mb-4">Plateformes</h4>
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
              <li><span className="cursor-default">Boost &amp; Sponsoring</span></li>
              <li><span className="cursor-default">Programme RSE</span></li>
            </ul>
          </div>

          {/* Column 4: Legal */}
          <div>
            <h4 className="text-on-surface font-bold text-[11px] uppercase tracking-widest mb-4">L&eacute;gal</h4>
            <ul className="space-y-2 text-xs text-on-surface-variant">
              <li><a href="/cgu_cgv.html" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">Confidentialit&eacute;</a></li>
              <li><a href="/cgu_cgv.html" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">Conditions g&eacute;n&eacute;rales</a></li>
              <li><a href="mailto:manager@vivasky.media" className="hover:text-primary transition-colors">Support</a></li>
            </ul>
          </div>
        </div>

        <div className="pt-6 border-t border-outline-variant flex flex-col md:flex-row justify-between items-center gap-3">
          <p className="text-[11px] text-on-surface-variant">&copy; {copyrightYear()} Vivaskymedia s.&agrave;.r.l. Tous droits r&eacute;serv&eacute;s. D&eacute;velopp&eacute;e par AGGREGAX.</p>
        </div>
      </div>
    </footer>
  );
}
