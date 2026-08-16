import Link from "next/link";

export default function SignupSuccessPage(): JSX.Element {
  return (
    <>
      {/* Left panel — custom timeline instead of stepper */}
      <aside className="hidden lg:flex lg:w-[40%] bg-[#005A9E] text-white flex-col justify-between p-12 relative">
        <div>
          <div className="mb-16">
            <Link href="/onboarding" className="text-2xl font-bold tracking-tighter font-headline">MARKET-UP</Link>
          </div>
          <div className="max-w-sm mb-10">
            <h2 className="text-3xl font-semibold leading-tight mb-4 tracking-tight text-white">
              La plateforme digitale des entreprises.
            </h2>
            <p className="text-[#d3e3ff] text-base leading-relaxed">
              BrandUP, TraceUP, LinkUP — un seul compte, trois vitrines.
            </p>
          </div>

          {/* Status timeline */}
          <div className="space-y-5">
            <div className="text-[11px] font-bold uppercase tracking-widest text-[#d3e3ff] mb-1">Prochaines étapes</div>

            {/* Email confirmed (DONE) */}
            <div className="flex items-start gap-4">
              <div className="w-9 h-9 rounded-full bg-[#DFF6DD] flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[#107C10] text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>check</span>
              </div>
              <div className="pt-1">
                <div className="text-sm font-semibold text-white">Email confirmé</div>
                <div className="text-xs text-[#d3e3ff]/80 mt-0.5">Votre adresse est vérifiée</div>
              </div>
            </div>

            {/* Admin validation (IN PROGRESS) */}
            <div className="flex items-start gap-4">
              <div className="w-9 h-9 rounded-full bg-white/15 border border-white/40 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-white text-lg animate-spin" style={{ animationDuration: "3s" }}>sync</span>
              </div>
              <div className="pt-1">
                <div className="text-sm font-semibold text-white">Validation par notre équipe</div>
                <div className="text-xs text-[#d3e3ff]/80 mt-0.5">En cours — 24 à 48h</div>
              </div>
            </div>

            {/* Dashboard access (PENDING) */}
            <div className="flex items-start gap-4 opacity-50">
              <div className="w-9 h-9 rounded-full border border-white/40 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-white text-lg">lock</span>
              </div>
              <div className="pt-1">
                <div className="text-sm font-medium text-white">Accès à votre dashboard</div>
                <div className="text-xs text-white/60 mt-0.5">Dès activation de votre compte</div>
              </div>
            </div>
          </div>
        </div>

        <div className="text-xs text-[#d3e3ff]/70">
          <p>© 2026 MARKET-UP · AGGREGAX SUARL</p>
          <p className="mt-1">Fait en Tunisie 🇹🇳</p>
        </div>
      </aside>

      <section className="flex-1 flex flex-col">
        {/* Mobile header */}
        <div className="lg:hidden flex items-center justify-between px-6 py-4 border-b border-[#E0E0E0]">
          <Link href="/onboarding" className="text-xl font-bold tracking-tighter text-[#0078D4] font-headline">MARKET-UP</Link>
          <span className="inline-block px-2.5 py-1 bg-[#DFF6DD] text-[#107C10] text-[10px] font-bold uppercase tracking-widest rounded">Inscription terminée</span>
        </div>

        <div className="flex-1 flex items-center justify-center px-6 md:px-12 py-12 md:py-16">
          <div className="w-full max-w-lg text-center">
            {/* Success icon */}
            <div className="w-20 h-20 rounded-full bg-[#DFF6DD] mx-auto mb-8 flex items-center justify-center">
              <span className="material-symbols-outlined text-[#107C10]" style={{ fontSize: "44px", fontVariationSettings: "'FILL' 1" }}>check_circle</span>
            </div>

            <header className="mb-8">
              <span className="hidden lg:inline-block px-3 py-1 bg-[#DFF6DD] text-[#107C10] text-[10px] font-bold uppercase tracking-widest rounded mb-4">Inscription terminée</span>
              <h1 className="text-3xl md:text-[32px] font-semibold text-[#242424] mb-4 tracking-tight">
                Votre email est confirmé
              </h1>
              <p className="text-[#616161] text-base leading-relaxed">
                Bienvenue sur MARKET-UP. Votre compte est en attente de validation manuelle par notre équipe pour garantir l&apos;intégrité de la plateforme.
              </p>
            </header>

            {/* Info card */}
            <div className="bg-[#EFF6FC] border border-[#0078D4]/20 rounded-lg p-5 mb-8 text-left">
              <div className="flex items-start gap-3">
                <span className="material-symbols-outlined text-[#0078D4] shrink-0 mt-0.5">schedule</span>
                <div>
                  <p className="text-sm font-bold text-[#242424] mb-1">Validation sous 24 à 48 heures</p>
                  <p className="text-sm text-[#616161] leading-relaxed">
                    Vous recevrez un email de confirmation dès que votre compte sera activé. Vous pourrez alors vous connecter et compléter vos profils BrandUP, TraceUP et LinkUP.
                  </p>
                </div>
              </div>
            </div>

            {/* Mobile timeline */}
            <div className="lg:hidden bg-[#F5F5F5] border border-[#E0E0E0] rounded-lg p-5 mb-8 text-left">
              <div className="text-[11px] font-bold uppercase tracking-widest text-[#616161] mb-3">Prochaines étapes</div>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-[#DFF6DD] flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[#107C10]" style={{ fontSize: "16px", fontVariationSettings: "'FILL' 1" }}>check</span>
                  </div>
                  <div className="text-sm font-medium text-[#242424]">Email confirmé</div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-[#EFF6FC] border border-[#0078D4]/30 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[#0078D4] animate-spin" style={{ fontSize: "16px", animationDuration: "3s" }}>sync</span>
                  </div>
                  <div className="text-sm font-medium text-[#242424]">Validation admin en cours</div>
                </div>
                <div className="flex items-center gap-3 opacity-50">
                  <div className="w-7 h-7 rounded-full border border-[#D1D1D1] flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[#616161]" style={{ fontSize: "16px" }}>lock</span>
                  </div>
                  <div className="text-sm font-medium text-[#242424]">Accès dashboard</div>
                </div>
              </div>
            </div>

            {/* CTA */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/onboarding" className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#0078D4] hover:bg-[#106EBE] text-white text-sm font-semibold rounded transition-colors">
                <span className="material-symbols-outlined text-base">home</span>
                Retour à l&apos;accueil
              </Link>
            </div>

            {/* Support */}
            <p className="mt-10 text-xs text-[#8A8886]">
              Une question ? Contactez-nous à <a href="mailto:manager@vivasky.media" className="text-[#0078D4] font-semibold hover:underline">manager@vivasky.media</a>
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
