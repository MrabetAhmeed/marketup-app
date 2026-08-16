"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import AuthLeftPanel from "@/components/shared/AuthLeftPanel";
import { ObfuscatedEmail } from "@/components/shared/ObfuscatedEmail";

export default function ValidationEmailPage(): JSX.Element {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!email) return;
      setSubmitting(true);

      try {
        await fetch("/api/v1/auth/email/resend-validation", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });
      } catch {
        // Silent — anti-enumeration
      }

      setSubmitted(true);
      setSubmitting(false);
    },
    [email],
  );

  return (
    <>
      <AuthLeftPanel />

      <section className="flex-1 flex flex-col">
        {/* Mobile header */}
        <div className="lg:hidden flex items-center justify-between px-6 py-4 border-b border-[#E0E0E0]">
          <Link href="/onboarding" className="text-xl font-bold tracking-tighter text-[#0078D4] font-headline">MARKET-UP</Link>
          <Link href="/signup/verify" className="text-xs text-[#0078D4] font-semibold flex items-center gap-1">
            <span className="material-symbols-outlined text-base">arrow_back</span>
            Retour
          </Link>
        </div>

        <div className="flex-1 flex items-center justify-center px-6 md:px-12 py-12 md:py-16">
          <div className="w-full max-w-md">
            {/* Icon */}
            <div className="w-16 h-16 rounded-lg bg-[#EFF6FC] mb-8 flex items-center justify-center">
              <span className="material-symbols-outlined text-[#0078D4]" style={{ fontSize: "36px", fontVariationSettings: "'FILL' 1" }}>forward_to_inbox</span>
            </div>

            <header className="mb-8">
              <h1 className="text-3xl md:text-[32px] font-semibold text-[#242424] mb-3 tracking-tight">
                Renvoyer un code de validation
              </h1>
              <p className="text-[#616161] text-base leading-relaxed">
                {submitted
                  ? "Si une inscription est en cours pour cet email, un nouveau code a été envoyé."
                  : "Saisissez l'adresse email de votre compte. Nous vous enverrons un nouveau code à 6 chiffres pour finaliser votre inscription."}
              </p>
            </header>

            {!submitted ? (
              <form onSubmit={handleSubmit} className="space-y-6">
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
                  {submitting ? "Envoi..." : "Envoyer un nouveau code"}
                  <span className="material-symbols-outlined text-base">send</span>
                </button>
              </form>
            ) : (
              <div className="bg-[#DFF6DD] border border-[#107C10]/20 rounded-lg p-4 mb-6">
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-[#107C10] shrink-0 mt-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                  <p className="text-sm text-[#242424]">
                    Si une inscription est en cours pour cet email, un nouveau code a été envoyé.
                  </p>
                </div>
              </div>
            )}

            {/* Help info */}
            <div className="mt-8 flex items-start gap-3 p-4 bg-[#F5F5F5] border border-[#E0E0E0] rounded-lg">
              <span className="material-symbols-outlined text-[#616161] shrink-0 mt-0.5">info</span>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[#616161] mb-1">Vous ne recevez pas l&apos;email ?</p>
                <p className="text-xs text-[#616161] leading-relaxed">
                  Vérifiez votre dossier spam. Si le problème persiste, contactez notre support à <ObfuscatedEmail className="text-[#0078D4] font-semibold hover:underline" />.
                </p>
              </div>
            </div>

            {/* Back (desktop) */}
            <div className="mt-10 pt-6 border-t border-[#E0E0E0] text-center hidden lg:block">
              <Link href="/signup/verify" className="inline-flex items-center justify-center gap-1.5 px-5 py-3 text-sm font-semibold text-[#0078D4] hover:bg-[#EFF6FC] rounded transition-colors">
                <span className="material-symbols-outlined text-base">arrow_back</span>
                Retour à la validation
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
