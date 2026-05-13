"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import AuthLeftPanel from "@/components/shared/AuthLeftPanel";

export default function ForgotPasswordPage(): JSX.Element {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"form" | "confirmation">("form");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!email) return;
      setSubmitting(true);

      try {
        await fetch("/api/v1/auth/password/forgot", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });
      } catch {
        // Silent — anti-enumeration
      }

      setState("confirmation");
      setSubmitting(false);
    },
    [email],
  );

  const handleResend = useCallback(() => {
    setState("form");
  }, []);

  return (
    <>
      <AuthLeftPanel />

      <section className="flex-1 flex flex-col">
        {/* Mobile header */}
        <div className="lg:hidden flex items-center justify-between px-6 py-4 border-b border-[#E0E0E0]">
          <Link href="/onboarding" className="text-xl font-bold tracking-tighter text-[#0078D4] font-headline">MARKET-UP</Link>
          <Link href="/login" className="text-xs text-[#0078D4] font-semibold flex items-center gap-1">
            <span className="material-symbols-outlined text-base">arrow_back</span>
            Connexion
          </Link>
        </div>

        <div className="flex-1 flex items-center justify-center px-6 md:px-12 py-12 md:py-16">
          <div className="w-full max-w-md">

            {/* STATE 1: Form */}
            {state === "form" && (
              <div>
                <header className="mb-8">
                  <h1 className="text-3xl md:text-[32px] font-semibold text-[#242424] mb-3 tracking-tight">
                    Mot de passe oublié
                  </h1>
                  <p className="text-[#616161] text-base leading-relaxed">
                    Saisissez votre adresse email et nous vous enverrons un lien sécurisé pour réinitialiser votre mot de passe.
                  </p>
                </header>

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <label htmlFor="email" className="block text-[11px] font-bold uppercase tracking-[0.06em] text-[#616161] mb-1.5 after:content-['*'] after:text-[#D13438] after:ml-1">Email professionnel</label>
                    <input
                      id="email"
                      type="email"
                      required
                      autoFocus
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white border border-[#D1D1D1] rounded text-sm text-[#242424] placeholder:text-[#8A8886] focus:border-[#0078D4] focus:outline-none focus:ring-2 focus:ring-[#EFF6FC]"
                      placeholder="contact@votre-entreprise.tn"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#0078D4] hover:bg-[#106EBE] active:bg-[#005A9E] text-white text-sm font-semibold rounded transition-colors disabled:bg-[#D1D1D1] disabled:cursor-not-allowed"
                  >
                    {submitting ? "Envoi..." : "Envoyer le lien de réinitialisation"}
                    <span className="material-symbols-outlined text-base">send</span>
                  </button>
                </form>

                <div className="mt-8 pt-6 border-t border-[#E0E0E0] text-center">
                  <Link href="/login" className="inline-flex items-center justify-center gap-1.5 px-5 py-3 text-sm font-semibold text-[#0078D4] hover:bg-[#EFF6FC] rounded transition-colors">
                    <span className="material-symbols-outlined text-base">arrow_back</span>
                    Retour à la connexion
                  </Link>
                </div>
              </div>
            )}

            {/* STATE 2: Confirmation */}
            {state === "confirmation" && (
              <div>
                {/* Icon */}
                <div className="w-16 h-16 rounded-full bg-[#DFF6DD] mb-8 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[#107C10]" style={{ fontSize: "36px", fontVariationSettings: "'FILL' 1" }}>mark_email_read</span>
                </div>

                <header className="mb-8">
                  <h1 className="text-3xl md:text-[32px] font-semibold text-[#242424] mb-3 tracking-tight">
                    Email envoyé
                  </h1>
                  <p className="text-[#616161] text-base leading-relaxed">
                    Un email contenant le lien de réinitialisation a été envoyé à{" "}
                    <strong className="text-[#242424] font-semibold">{email}</strong>.
                    Cliquez sur le lien pour créer un nouveau mot de passe.
                  </p>
                </header>

                {/* Info card — 1h validity */}
                <div className="bg-[#EFF6FC] border border-[#0078D4]/20 rounded-lg p-4 mb-6">
                  <div className="flex items-start gap-3">
                    <span className="material-symbols-outlined text-[#0078D4] shrink-0 mt-0.5">schedule</span>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-[#616161] mb-1">Lien valable 1 heure</p>
                      <p className="text-xs text-[#616161] leading-relaxed">
                        Passé ce délai, vous devrez refaire une demande.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Help */}
                <div className="bg-[#F5F5F5] border border-[#E0E0E0] rounded-lg p-4 mb-8">
                  <div className="flex items-start gap-3">
                    <span className="material-symbols-outlined text-[#616161] shrink-0 mt-0.5">info</span>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-[#616161] mb-1">Vous ne recevez rien ?</p>
                      <p className="text-xs text-[#616161] leading-relaxed mb-2">
                        Vérifiez votre dossier spam. Si le problème persiste, contactez <a href="mailto:support@marketup.tn" className="text-[#0078D4] font-semibold hover:underline">support@marketup.tn</a>.
                      </p>
                      <button type="button" onClick={handleResend} className="text-xs font-semibold text-[#0078D4] hover:underline mt-1">
                        Renvoyer le lien
                      </button>
                    </div>
                  </div>
                </div>

                <div className="text-center">
                  <Link href="/login" className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#0078D4] hover:bg-[#106EBE] text-white text-sm font-semibold rounded transition-colors">
                    <span className="material-symbols-outlined text-base">arrow_back</span>
                    Retour à la connexion
                  </Link>
                </div>
              </div>
            )}

          </div>
        </div>
      </section>
    </>
  );
}
