"use client";

import { useState, useCallback } from "react";
import { signIn, getSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AuthErrorBanner from "@/components/shared/AuthErrorBanner";
import AuthLeftPanel from "@/components/shared/AuthLeftPanel";
import { useToast } from "@/components/shared/Toast";
import { getAuthErrorMessage } from "@/lib/auth-error-messages";
import type { ErrorMapEntry } from "@/lib/auth-error-messages";

interface ParsedError {
  code: string;
  message: string;
  status: number;
  details?: { userId?: string; accountEmail?: string; status?: string };
}

export default function LoginPage(): JSX.Element {
  const router = useRouter();
  const { showToast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [errorEntry, setErrorEntry] = useState<ErrorMapEntry | null>(null);
  const [hasError, setHasError] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setErrorEntry(null);
      setHasError(false);
      setSubmitting(true);

      if (process.env.NODE_ENV === "development") {
        console.log("[login] submitting:", { email, password: "[REDACTED]" });
      }

      try {
        const result = await signIn("credentials", {
          email,
          password,
          redirect: false,
        });

        if (result?.error) {
          try {
            const parsed: ParsedError = JSON.parse(result.error);

            // EMAIL_NOT_VERIFIED: auto-resend + redirect
            if (parsed.code === "EMAIL_NOT_VERIFIED" && parsed.details?.userId) {
              try {
                await fetch("/api/v1/auth/email/resend-validation", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ email }),
                });
              } catch {
                // Best-effort
              }
              const entry = getAuthErrorMessage("EMAIL_NOT_VERIFIED");
              showToast(entry.message);
              router.push(`/signup/verify?userId=${parsed.details.userId}`);
              return;
            }

            // Dedicated company status errors
            const entry = getAuthErrorMessage(parsed.code);

            if (entry.presentation === "toast") {
              showToast(entry.message);
            } else {
              setErrorEntry(entry);
              setHasError(true);
            }
          } catch {
            const entry = getAuthErrorMessage("INVALID_CREDENTIALS");
            setErrorEntry(entry);
            setHasError(true);
          }
        } else if (result?.ok) {
          // Role-based redirect
          const session = await getSession();
          if (session?.user?.role === "SUPER_ADMIN") {
            router.push("/admin");
          } else {
            router.push("/dashboard");
          }
        }
      } catch {
        const entry = getAuthErrorMessage("NETWORK_ERROR");
        showToast(entry.message);
      } finally {
        setSubmitting(false);
      }
    },
    [email, password, router, showToast],
  );

  return (
    <>
      <AuthLeftPanel />

      <section className="flex-1 flex flex-col">
        {/* Mobile header */}
        <div className="lg:hidden flex items-center justify-between px-6 py-4 border-b border-[#E0E0E0]">
          <Link href="/onboarding" className="text-xl font-bold tracking-tighter text-[#0078D4] font-headline">MARKET-UP</Link>
          <Link href="/signup/company" className="text-xs text-[#0078D4] font-semibold">S&apos;inscrire</Link>
        </div>

        <div className="flex-1 flex items-center justify-center px-6 md:px-12 py-12 md:py-16">
          <div className="w-full max-w-md">
            <header className="mb-8">
              <h1 className="text-3xl md:text-[32px] font-semibold text-[#242424] mb-3 tracking-tight">
                Connexion
              </h1>
              <p className="text-[#616161] text-base">
                Accédez à votre tableau de bord entreprise.
              </p>
            </header>

            {/* Error banner */}
            {errorEntry && errorEntry.presentation === "banner" && (
              <AuthErrorBanner entry={errorEntry} />
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-[11px] font-bold uppercase tracking-[0.06em] text-[#616161] mb-1.5 after:content-['*'] after:text-[#D13438] after:ml-1">Email professionnel</label>
                <input
                  id="email"
                  type="email"
                  required
                  autoFocus
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`w-full px-3.5 py-2.5 bg-white border rounded text-sm text-[#242424] placeholder:text-[#8A8886] focus:border-[#0078D4] focus:outline-none focus:ring-2 focus:ring-[#EFF6FC] ${hasError ? "border-[#D13438]" : "border-[#D1D1D1]"}`}
                  placeholder="contact@votre-entreprise.tn"
                />
              </div>

              {/* Password */}
              <div>
                <label htmlFor="password" className="block text-[11px] font-bold uppercase tracking-[0.06em] text-[#616161] mb-1.5 after:content-['*'] after:text-[#D13438] after:ml-1">Mot de passe</label>
                <div className="relative">
                  <input
                    id="password"
                    type={passwordVisible ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={`w-full px-3.5 py-2.5 bg-white border rounded text-sm text-[#242424] placeholder:text-[#8A8886] focus:border-[#0078D4] focus:outline-none focus:ring-2 focus:ring-[#EFF6FC] pr-12 ${hasError ? "border-[#D13438]" : "border-[#D1D1D1]"}`}
                    placeholder="Votre mot de passe"
                  />
                  <button
                    type="button"
                    onClick={() => setPasswordVisible((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center text-[#616161] hover:text-[#0078D4] rounded transition-colors"
                    aria-label={passwordVisible ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                  >
                    <span className="material-symbols-outlined text-xl">{passwordVisible ? "visibility_off" : "visibility"}</span>
                  </button>
                </div>
              </div>

              {/* Remember + Forgot */}
              <div className="flex items-center justify-between flex-wrap gap-3">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-[18px] h-[18px] border-[1.5px] border-[#8A8886] rounded-[3px] bg-white appearance-none cursor-pointer shrink-0 checked:bg-[#0078D4] checked:border-[#0078D4] focus:ring-2 focus:ring-[#EFF6FC] focus:outline-none"
                  />
                  <span className="text-sm text-[#242424]">Se souvenir de moi</span>
                </label>
                <Link href="/forgot" className="text-sm font-semibold text-[#0078D4] hover:underline">
                  Mot de passe oublié ?
                </Link>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#0078D4] hover:bg-[#106EBE] active:bg-[#005A9E] text-white text-sm font-semibold rounded transition-colors disabled:bg-[#D1D1D1] disabled:cursor-not-allowed"
              >
                {submitting ? "Connexion..." : "Se connecter"}
                <span className="material-symbols-outlined text-base">login</span>
              </button>
            </form>

            {/* Divider */}
            <div className="flex items-center gap-4 my-8">
              <hr className="flex-1 border-t border-[#E0E0E0]" />
              <span className="text-xs text-[#8A8886] uppercase tracking-wider font-semibold">ou</span>
              <hr className="flex-1 border-t border-[#E0E0E0]" />
            </div>

            {/* Signup CTA */}
            <Link
              href="/signup/company"
              className="flex items-center justify-center gap-2 w-full text-center py-3 border border-[#0078D4] text-[#0078D4] rounded font-semibold hover:bg-[#EFF6FC] transition-colors"
            >
              <span className="material-symbols-outlined text-base">person_add</span>
              Créer un compte entreprise
            </Link>

            {/* Help */}
            <p className="mt-8 text-center text-xs text-[#8A8886]">
              Problème de connexion ? Contactez <a href="mailto:support@marketup.tn" className="text-[#0078D4] font-semibold hover:underline">support@marketup.tn</a>
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
