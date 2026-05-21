"use client";

import { Suspense, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { z } from "zod";
import AuthErrorBanner from "@/components/shared/AuthErrorBanner";
import AuthLeftPanel from "@/components/shared/AuthLeftPanel";
import PasswordInput from "@/components/shared/PasswordInput";
import { useToast } from "@/components/shared/Toast";
import { getAuthErrorMessage } from "@/lib/auth-error-messages";
import type { ErrorMapEntry } from "@/lib/auth-error-messages";

// Extended schema with passwordConfirm + refine for this page

const passwordSchema = z
  .string()
  .min(8, "Le mot de passe doit faire au moins 8 caractères.")
  .regex(/[A-Z]/, "Le mot de passe doit contenir au moins une majuscule.")
  .regex(/[0-9]/, "Le mot de passe doit contenir au moins un chiffre.")
  .regex(/[^A-Za-z0-9]/, "Le mot de passe doit contenir au moins un caractère spécial.");

const ResetFormSchema = z
  .object({
    newPassword: passwordSchema,
    passwordConfirm: z.string().min(1, "Veuillez confirmer le mot de passe."),
  })
  .refine((data) => data.newPassword === data.passwordConfirm, {
    message: "Les mots de passe ne correspondent pas.",
    path: ["passwordConfirm"],
  });

type ResetFormInput = z.infer<typeof ResetFormSchema>;

const REQUIREMENTS = [
  { key: "length", label: "Au moins 8 caractères", test: (p: string) => p.length >= 8 },
  { key: "upper", label: "Une lettre majuscule", test: (p: string) => /[A-Z]/.test(p) },
  { key: "number", label: "Un chiffre", test: (p: string) => /[0-9]/.test(p) },
  { key: "special", label: "Un caractère spécial (@, #, $, !...)", test: (p: string) => /[^A-Za-z0-9]/.test(p) },
];

export default function ResetPasswordPage(): JSX.Element {
  return (
    <Suspense>
      <ResetPasswordContent />
    </Suspense>
  );
}

function ResetPasswordContent(): JSX.Element {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [state, setState] = useState<"form" | "success">("form");
  const { showToast } = useToast();
  const [errorEntry, setErrorEntry] = useState<ErrorMapEntry | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);

  const {
    watch,
    setValue,
    handleSubmit,
    register,
    formState: { errors },
  } = useForm<ResetFormInput>({
    resolver: zodResolver(ResetFormSchema),
  });

  const newPassword = watch("newPassword") || "";
  const passwordConfirmVal = watch("passwordConfirm") || "";

  const onSubmit = useCallback(
    async (data: ResetFormInput) => {
      if (!token) return;
      setErrorEntry(null);
      setSubmitting(true);

      if (process.env.NODE_ENV === "development") {
        console.log("[reset] submitting with token present, password: [REDACTED]");
      }

      try {
        const res = await fetch("/api/v1/auth/password/reset", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ resetToken: token, newPassword: data.newPassword }),
        });
        const json = await res.json();
        if (!res.ok) {
          const code = json.error?.code || "SERVER_ERROR";
          const entry = getAuthErrorMessage(code);
          if (entry.presentation === "toast") {
            showToast(entry.message);
          } else {
            setErrorEntry(entry);
          }
          return;
        }
        setState("success");
      } catch {
        showToast(getAuthErrorMessage("NETWORK_ERROR").message);
      } finally {
        setSubmitting(false);
      }
    },
    [token, showToast],
  );

  // Missing token state
  if (!token) {
    return (
      <>
        <AuthLeftPanel />
        <section className="flex-1 flex flex-col">
          <div className="lg:hidden flex items-center justify-between px-6 py-4 border-b border-[#E0E0E0]">
            <Link href="/onboarding" className="text-xl font-bold tracking-tighter text-[#0078D4] font-headline">MARKET-UP</Link>
          </div>
          <div className="flex-1 flex items-center justify-center px-6 md:px-12 py-12 md:py-16">
            <div className="w-full max-w-md text-center">
              <div className="w-16 h-16 rounded-full bg-[#FDE7E9] mx-auto mb-8 flex items-center justify-center">
                <span className="material-symbols-outlined text-[#D13438]" style={{ fontSize: "36px" }}>link_off</span>
              </div>
              <h1 className="text-3xl font-semibold text-[#242424] mb-3 tracking-tight">Lien invalide</h1>
              <p className="text-[#616161] text-base leading-relaxed mb-8">
                Ce lien de réinitialisation est invalide ou a expiré. Demandez un nouveau lien.
              </p>
              <Link href="/forgot" className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#0078D4] hover:bg-[#106EBE] text-white text-sm font-semibold rounded transition-colors">
                Demander un nouveau lien
                <span className="material-symbols-outlined text-base">send</span>
              </Link>
            </div>
          </div>
        </section>
      </>
    );
  }

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
                    Nouveau mot de passe
                  </h1>
                  <p className="text-[#616161] text-base leading-relaxed">
                    Choisissez un mot de passe sécurisé pour votre compte MARKET-UP.
                  </p>
                </header>

                {errorEntry && <AuthErrorBanner entry={errorEntry} />}

                {/* eslint-disable-next-line @typescript-eslint/no-misused-promises */}
                <form onSubmit={handleSubmit(
                  onSubmit,
                  (validationErrors) => {
                    if (process.env.NODE_ENV === "development") {
                      console.warn("[reset] validation errors:", validationErrors);
                    }
                  },
                )} className="space-y-6">
                  {/* New password */}
                  <PasswordInput
                    id="newPassword"
                    name="newPassword"
                    label="Nouveau mot de passe"
                    required
                    value={newPassword}
                    onChange={(e) => setValue("newPassword", e.target.value, { shouldValidate: true })}
                    error={errors.newPassword?.message}
                    showStrength
                  />

                  {/* Confirm */}
                  <div>
                    <label htmlFor="passwordConfirm" className="block text-[11px] font-bold uppercase tracking-[0.06em] text-[#616161] mb-1.5 after:content-['*'] after:text-[#D13438] after:ml-1">Confirmer le mot de passe</label>
                    <div className="relative">
                      <input
                        id="passwordConfirm"
                        type={confirmVisible ? "text" : "password"}
                        className="w-full px-3.5 py-2.5 bg-white border border-[#D1D1D1] rounded text-sm text-[#242424] placeholder:text-[#8A8886] focus:border-[#0078D4] focus:outline-none focus:ring-2 focus:ring-[#EFF6FC] pr-12"
                        placeholder="Ressaisissez le mot de passe"
                        {...register("passwordConfirm")}
                      />
                      <button
                        type="button"
                        onClick={() => setConfirmVisible((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center text-[#616161] hover:text-[#0078D4] rounded transition-colors"
                        aria-label={confirmVisible ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                      >
                        <span className="material-symbols-outlined text-xl">{confirmVisible ? "visibility_off" : "visibility"}</span>
                      </button>
                    </div>
                    {passwordConfirmVal && !errors.passwordConfirm && newPassword === passwordConfirmVal && (
                      <p className="text-xs mt-1.5" style={{ color: "#107C10" }}>✓ Les mots de passe correspondent</p>
                    )}
                    {errors.passwordConfirm && (
                      <p className="text-xs text-[#D13438] mt-1.5">{errors.passwordConfirm.message}</p>
                    )}
                  </div>

                  {/* Requirements checklist */}
                  <div className="bg-[#F5F5F5] border border-[#E0E0E0] rounded-lg p-4">
                    <p className="text-[11px] font-bold uppercase tracking-widest text-[#616161] mb-3">Critères de sécurité</p>
                    <div className="space-y-2">
                      {REQUIREMENTS.map((req) => {
                        const met = newPassword ? req.test(newPassword) : false;
                        return (
                          <div key={req.key} className={`flex items-center gap-2 text-xs ${met ? "text-[#107C10]" : "text-[#616161]"}`}>
                            <span className="material-symbols-outlined" style={{ fontSize: "16px", fontVariationSettings: met ? "'FILL' 1" : "'FILL' 0" }}>
                              {met ? "check_circle" : "radio_button_unchecked"}
                            </span>
                            <span>{req.label}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Submit */}
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#0078D4] hover:bg-[#106EBE] active:bg-[#005A9E] text-white text-sm font-semibold rounded transition-colors disabled:bg-[#D1D1D1] disabled:cursor-not-allowed"
                  >
                    {submitting ? "Enregistrement..." : "Enregistrer le mot de passe"}
                    <span className="material-symbols-outlined text-base">check_circle</span>
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

            {/* STATE 2: Success */}
            {state === "success" && (
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-[#DFF6DD] mx-auto mb-8 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[#107C10]" style={{ fontSize: "36px", fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                </div>

                <header className="mb-8">
                  <h1 className="text-3xl md:text-[32px] font-semibold text-[#242424] mb-3 tracking-tight">
                    Mot de passe modifié
                  </h1>
                  <p className="text-[#616161] text-base leading-relaxed">
                    Votre mot de passe a été mis à jour avec succès. Vous pouvez maintenant vous connecter.
                  </p>
                </header>

                <Link href="/login" className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#0078D4] hover:bg-[#106EBE] text-white text-sm font-semibold rounded transition-colors">
                  Se connecter
                  <span className="material-symbols-outlined text-base">login</span>
                </Link>
              </div>
            )}

          </div>
        </div>
      </section>
    </>
  );
}
