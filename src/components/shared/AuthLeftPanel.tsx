"use client";

import Link from "next/link";

interface AuthLeftPanelProps {
  step?: 1 | 2 | 3;
  completedSteps?: number[];
  showTimeline?: boolean;
}

const STEPS = [
  { label: "Entreprise", etape: "Étape 1" },
  { label: "Utilisateur", etape: "Étape 2" },
  { label: "Vérification", etape: "Étape 3" },
];

export default function AuthLeftPanel({ step, completedSteps = [] }: AuthLeftPanelProps): JSX.Element {
  return (
    <aside className="hidden lg:flex lg:w-[40%] bg-[#005A9E] text-white flex-col justify-between p-12 relative">
      <div>
        {/* Logo */}
        <div className="mb-16">
          <Link href="/onboarding" className="text-2xl font-bold tracking-tighter font-headline">
            MARKET-UP
          </Link>
        </div>

        {/* Tagline */}
        <div className="max-w-sm mb-16">
          <h2 className="text-3xl font-semibold leading-tight mb-4 tracking-tight text-white">
            La référence des entreprises en Tunisie.
          </h2>
          <p className="text-[#d3e3ff] text-base leading-relaxed">
            BrandUP, TraceUP, LinkUP — un seul compte, trois vitrines.
          </p>
        </div>

        {/* Stepper (only shown when step is provided) */}
        {step && (
          <nav aria-label="Étapes d'inscription" className="space-y-5">
            {STEPS.map((s, i) => {
              const stepNum = i + 1;
              const isActive = stepNum === step;
              const isCompleted = completedSteps.includes(stepNum);

              return (
                <div key={stepNum} className={`flex items-center gap-4 ${!isActive && !isCompleted ? "opacity-50" : isCompleted ? "opacity-70" : ""}`}>
                  {isCompleted ? (
                    <div className="w-9 h-9 rounded-full bg-[#d3e3ff] text-[#005A9E] flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>check</span>
                    </div>
                  ) : isActive ? (
                    <div className="w-10 h-10 rounded-full bg-white text-[#005A9E] flex items-center justify-center text-sm font-bold shrink-0">
                      {stepNum}
                    </div>
                  ) : (
                    <div className="w-9 h-9 rounded-full border border-white/40 flex items-center justify-center text-sm font-semibold text-white shrink-0">
                      {stepNum}
                    </div>
                  )}
                  <div>
                    <div className={`text-[11px] uppercase tracking-widest ${isActive ? "font-bold text-[#d3e3ff]" : "font-medium text-white/70"}`}>
                      {s.etape}
                    </div>
                    <div className={isActive ? "text-base font-semibold text-white" : "text-sm font-medium text-white"}>
                      {s.label}
                    </div>
                  </div>
                </div>
              );
            })}
          </nav>
        )}
      </div>

      {/* Footer */}
      <div className="text-xs text-[#d3e3ff]/70">
        <p>© 2026 Vivaskymedia s.à.r.l. Tous droits réservés. Développée par AGGREGAX.</p>
      </div>
    </aside>
  );
}
