"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import AuthLeftPanel from "@/components/shared/AuthLeftPanel";
import OtpInput from "@/components/shared/OtpInput";
import { useToast } from "@/components/shared/Toast";
import { getAuthErrorMessage } from "@/lib/auth-error-messages";

export default function SignupVerifyPage(): JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [userId, setUserId] = useState("");
  const [accountEmail, setAccountEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const { showToast } = useToast();
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [resendEnabled, setResendEnabled] = useState(false);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load userId from query param (login redirect) or sessionStorage (fresh signup)
  useEffect(() => {
    const queryUserId = searchParams.get("userId");
    const storedUserId = sessionStorage.getItem("signupUserId");
    const storedEmail = sessionStorage.getItem("signupEmail");
    const uid = queryUserId || storedUserId;

    if (!uid) {
      router.replace("/signup/company");
      return;
    }
    setUserId(uid);
    setAccountEmail(storedEmail || "");
  }, [searchParams, router]);

  // Countdown timer
  useEffect(() => {
    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          if (countdownRef.current) clearInterval(countdownRef.current);
          setResendEnabled(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (otpCode.length !== 6 || !/^\d{6}$/.test(otpCode)) return;

      setError("");
      setSubmitting(true);
      try {
        const res = await fetch("/api/v1/auth/signup/verify-otp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, otpCode }),
        });
        const json = await res.json();
        if (!res.ok) {
          const code = json.error?.code || "SERVER_ERROR";
          const entry = getAuthErrorMessage(code);
          setError(entry.message);
          return;
        }
        // Clear signup state
        sessionStorage.removeItem("signupUserId");
        sessionStorage.removeItem("signupEmail");
        router.push("/signup/success");
      } catch {
        showToast(getAuthErrorMessage("NETWORK_ERROR").message);
      } finally {
        setSubmitting(false);
      }
    },
    [otpCode, userId, router, showToast],
  );

  const handleResend = useCallback(async () => {
    if (!resendEnabled || !accountEmail) return;
    setResendEnabled(false);
    setCountdown(60);
    setError("");

    // Restart countdown
    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          if (countdownRef.current) clearInterval(countdownRef.current);
          setResendEnabled(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    try {
      await fetch("/api/v1/auth/email/resend-validation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: accountEmail }),
      });
    } catch {
      // Silent — best-effort
    }
  }, [resendEnabled, accountEmail]);

  const isComplete = otpCode.length === 6 && /^\d{6}$/.test(otpCode);

  if (!userId) return <div />;

  return (
    <>
      <AuthLeftPanel step={3} completedSteps={[1, 2]} />

      <section className="flex-1 flex flex-col">
        {/* Mobile header */}
        <div className="lg:hidden flex items-center justify-between px-6 py-4 border-b border-[#E0E0E0]">
          <Link href="/onboarding" className="text-xl font-bold tracking-tighter text-[#0078D4] font-headline">MARKET-UP</Link>
          <span className="text-xs text-[#616161]">Étape <span className="font-bold text-[#242424]">3</span> / 3</span>
        </div>
        <div className="lg:hidden px-6 pt-4">
          <div className="h-[3px] bg-[#E0E0E0] rounded-sm overflow-hidden">
            <div className="h-full bg-[#0078D4]" style={{ width: "100%" }} />
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center px-6 md:px-12 py-12 md:py-16">
          <div className="w-full max-w-md text-center">
            {/* Icon */}
            <div className="w-16 h-16 rounded-lg bg-[#EFF6FC] mx-auto mb-8 flex items-center justify-center">
              <span className="material-symbols-outlined text-[#0078D4]" style={{ fontSize: "36px", fontVariationSettings: "'FILL' 1" }}>mark_email_read</span>
            </div>

            <header className="mb-10">
              <span className="inline-block px-2.5 py-1 bg-[#EFF6FC] text-[#0078D4] text-[10px] font-bold uppercase tracking-widest rounded mb-4">Étape 3 sur 3</span>
              <h1 className="text-3xl md:text-[32px] font-semibold text-[#242424] mb-3 tracking-tight">Vérifiez votre email</h1>
              <p className="text-[#616161] text-base leading-relaxed">
                Nous venons d&apos;envoyer un code à 6 chiffres à{" "}
                <strong className="text-[#242424] font-semibold">{accountEmail || "votre adresse"}</strong>.
                Saisissez-le pour activer votre compte.
              </p>
            </header>

            <form onSubmit={handleSubmit} noValidate>
              <OtpInput
                value={otpCode}
                onChange={setOtpCode}
                error={error}
                disabled={submitting}
              />

              {/* Submit */}
              <button
                type="submit"
                disabled={!isComplete || submitting}
                className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#0078D4] text-white text-sm font-semibold rounded transition-colors mb-6 hover:bg-[#106EBE] active:bg-[#005A9E] disabled:bg-[#D1D1D1] disabled:cursor-not-allowed"
              >
                {submitting ? "Vérification..." : "Valider mon compte"}
                <span className="material-symbols-outlined text-base">check_circle</span>
              </button>

              {/* Resend */}
              <div className="text-sm text-[#616161]">
                <span>Vous n&apos;avez pas reçu le code ?</span>
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={!resendEnabled}
                  className="text-[#0078D4] font-semibold hover:underline ml-1 disabled:text-[#8A8886] disabled:cursor-not-allowed disabled:no-underline"
                >
                  {resendEnabled ? "Renvoyer le code" : `Renvoyer dans ${countdown} s`}
                </button>
              </div>
            </form>

            {/* Back */}
            <div className="mt-10 pt-6 border-t border-[#E0E0E0]">
              <Link href="/signup/user" className="inline-flex items-center justify-center gap-1.5 px-5 py-3 text-sm font-semibold text-[#0078D4] hover:bg-[#EFF6FC] rounded transition-colors">
                <span className="material-symbols-outlined text-base">arrow_back</span>
                Retour à l&apos;étape précédente
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
