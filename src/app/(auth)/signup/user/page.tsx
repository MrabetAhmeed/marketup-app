"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import AuthErrorBanner from "@/components/shared/AuthErrorBanner";
import AuthLeftPanel from "@/components/shared/AuthLeftPanel";
import PasswordInput from "@/components/shared/PasswordInput";
import { useToast } from "@/components/shared/Toast";
import { getAuthErrorMessage } from "@/lib/auth-error-messages";
import type { ErrorMapEntry } from "@/lib/auth-error-messages";
import { SignupUserSchema } from "@/schemas/auth.schema";
import type { SignupUserInput } from "@/schemas/auth.schema";

export default function SignupUserPage(): JSX.Element {
  const router = useRouter();
  const { showToast } = useToast();
  const [errorEntry, setErrorEntry] = useState<ErrorMapEntry | null>(null);
  const [scrollKey, setScrollKey] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [accountEmail, setAccountEmail] = useState("");
  const [userId, setUserId] = useState("");

  useEffect(() => {
    const uid = sessionStorage.getItem("signupUserId");
    const email = sessionStorage.getItem("signupEmail");
    if (!uid) {
      router.replace("/signup/company");
      return;
    }
    setUserId(uid);
    setAccountEmail(email || "");
  }, [router]);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<SignupUserInput>({
    resolver: zodResolver(SignupUserSchema),
    defaultValues: {
      languages: ["fr"],
    },
  });

  // Keep userId in sync
  useEffect(() => {
    if (userId) setValue("userId", userId);
  }, [userId, setValue]);

  const password = watch("password") || "";
  const passwordConfirm = watch("passwordConfirm") || "";

  const onSubmit = async (data: SignupUserInput) => {
    setErrorEntry(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/v1/auth/signup/user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          acceptedTermsAt: new Date().toISOString(),
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        const code = json.error?.code || "SERVER_ERROR";
        const entry = getAuthErrorMessage(code);
        if (entry.presentation === "toast") {
          showToast(entry.message);
        } else {
          setErrorEntry(entry);
          setScrollKey((k) => k + 1);
        }
        return;
      }
      router.push("/signup/verify");
    } catch {
      showToast(getAuthErrorMessage("NETWORK_ERROR").message);
    } finally {
      setSubmitting(false);
    }
  };

  const [confirmVisible, setConfirmVisible] = useState(false);
  const toggleConfirmVisibility = useCallback(() => setConfirmVisible((v) => !v), []);

  if (!userId) return <div />;

  return (
    <>
      <AuthLeftPanel step={2} completedSteps={[1]} />

      <section className="flex-1 flex flex-col">
        {/* Mobile header */}
        <div className="lg:hidden flex items-center justify-between px-6 py-4 border-b border-[#E0E0E0]">
          <Link href="/onboarding" className="text-xl font-bold tracking-tighter text-[#0078D4] font-headline">MARKET-UP</Link>
          <span className="text-xs text-[#616161]">Étape <span className="font-bold text-[#242424]">2</span> / 3</span>
        </div>
        <div className="lg:hidden px-6 pt-4">
          <div className="h-[3px] bg-[#E0E0E0] rounded-sm overflow-hidden">
            <div className="h-full bg-[#0078D4] transition-[width] duration-300" style={{ width: "66.66%" }} />
          </div>
        </div>

        <div className="flex-1 flex items-start justify-center px-6 md:px-12 py-8 md:py-12 lg:py-16">
          <div className="w-full max-w-2xl">
            <header className="mb-10">
              <span className="inline-block px-2.5 py-1 bg-[#EFF6FC] text-[#0078D4] text-[10px] font-bold uppercase tracking-widest rounded mb-4">Étape 2 sur 3</span>
              <h1 className="text-3xl md:text-[32px] font-semibold text-[#242424] mb-3 tracking-tight">Vos informations</h1>
              <p className="text-[#616161] text-base">Configurez votre accès personnel à la plateforme.</p>
            </header>

            {errorEntry && <AuthErrorBanner entry={errorEntry} scrollKey={scrollKey} />}

            {/* eslint-disable-next-line @typescript-eslint/no-misused-promises */}
            <form onSubmit={handleSubmit(
              (data) => {
                if (process.env.NODE_ENV === "development") {
                  console.log("[signup/user] submitting:", { ...data, password: "[REDACTED]" });
                }
                return onSubmit(data);
              },
              (validationErrors) => {
                if (process.env.NODE_ENV === "development") {
                  console.warn("[signup/user] validation errors:", validationErrors);
                }
              },
            )} className="space-y-6">
              {/* Hidden userId */}
              <input type="hidden" {...register("userId")} />

              {/* Email banner */}
              <div className="flex items-start gap-3 p-4 bg-[#EFF6FC] border border-[#0078D4]/20 rounded-lg">
                <span className="material-symbols-outlined text-[#0078D4] shrink-0 mt-0.5">mail</span>
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-wider text-[#616161] mb-0.5">Email du compte</p>
                  <p className="text-sm font-semibold text-[#242424] truncate">{accountEmail}</p>
                </div>
              </div>

              {/* First + Last name */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label htmlFor="firstName" className="block text-[11px] font-bold uppercase tracking-[0.06em] text-[#616161] mb-1.5 after:content-['*'] after:text-[#D13438] after:ml-1">Prénom</label>
                  <input id="firstName" {...register("firstName")} className="w-full px-3.5 py-2.5 bg-white border border-[#D1D1D1] rounded text-sm text-[#242424] placeholder:text-[#8A8886] focus:border-[#0078D4] focus:outline-none focus:ring-2 focus:ring-[#EFF6FC]" placeholder="Ex : Ahmed" />
                  {errors.firstName && <p className="text-xs text-[#D13438] mt-1">{errors.firstName.message}</p>}
                </div>
                <div>
                  <label htmlFor="lastName" className="block text-[11px] font-bold uppercase tracking-[0.06em] text-[#616161] mb-1.5 after:content-['*'] after:text-[#D13438] after:ml-1">Nom</label>
                  <input id="lastName" {...register("lastName")} className="w-full px-3.5 py-2.5 bg-white border border-[#D1D1D1] rounded text-sm text-[#242424] placeholder:text-[#8A8886] focus:border-[#0078D4] focus:outline-none focus:ring-2 focus:ring-[#EFF6FC]" placeholder="Ex : Mrabet" />
                  {errors.lastName && <p className="text-xs text-[#D13438] mt-1">{errors.lastName.message}</p>}
                </div>
              </div>

              {/* Phone + WhatsApp */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label htmlFor="phone" className="block text-[11px] font-bold uppercase tracking-[0.06em] text-[#616161] mb-1.5 after:content-['*'] after:text-[#D13438] after:ml-1">Téléphone</label>
                  <input id="phone" type="tel" {...register("phone")} className={`w-full px-3.5 py-2.5 bg-white border ${errors.phone ? "border-[#D13438]" : "border-[#D1D1D1]"} rounded text-sm text-[#242424] placeholder:text-[#8A8886] focus:border-[#0078D4] focus:outline-none focus:ring-2 focus:ring-[#EFF6FC]`} placeholder="+216 12 345 678" />
                  {errors.phone ? (
                    <p className="text-xs text-[#D13438] mt-1">{errors.phone.message}</p>
                  ) : (
                    <p className="text-xs text-[#8A8886] mt-1">Sera affiché sur vos profils publics comme téléphone de l&apos;entreprise</p>
                  )}
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor="whatsapp" className="block text-[11px] font-bold uppercase tracking-[0.06em] text-[#616161] after:content-['*'] after:text-[#D13438] after:ml-1">WhatsApp</label>
                    <button
                      type="button"
                      onClick={() => {
                        const phoneVal = watch("phone");
                        if (phoneVal) setValue("whatsapp", phoneVal, { shouldValidate: true });
                      }}
                      className="text-[10px] font-semibold text-[#0078D4] hover:underline"
                    >
                      Même que le téléphone
                    </button>
                  </div>
                  <input id="whatsapp" type="tel" {...register("whatsapp")} className={`w-full px-3.5 py-2.5 bg-white border ${errors.whatsapp ? "border-[#D13438]" : "border-[#D1D1D1]"} rounded text-sm text-[#242424] placeholder:text-[#8A8886] focus:border-[#0078D4] focus:outline-none focus:ring-2 focus:ring-[#EFF6FC]`} placeholder="+216 12 345 678" />
                  {errors.whatsapp ? (
                    <p className="text-xs text-[#D13438] mt-1">{errors.whatsapp.message}</p>
                  ) : (
                    <p className="text-xs text-[#8A8886] mt-1">Numéro WhatsApp Business — peut être identique au téléphone</p>
                  )}
                </div>
              </div>

              {/* Languages */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label htmlFor="primaryLang" className="block text-[11px] font-bold uppercase tracking-[0.06em] text-[#616161] mb-1.5 after:content-['*'] after:text-[#D13438] after:ml-1">Langue principale</label>
                  <select
                    id="primaryLang"
                    defaultValue="fr"
                    className="w-full px-3.5 py-2.5 bg-white border border-[#D1D1D1] rounded text-sm text-[#242424] appearance-none focus:border-[#0078D4] focus:outline-none focus:ring-2 focus:ring-[#EFF6FC]"
                    style={{ backgroundImage: `url("data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23616161' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`, paddingRight: "40px", backgroundPosition: "right 12px center", backgroundRepeat: "no-repeat", backgroundSize: "16px" }}
                  >
                    <option value="fr">Français</option>
                    <option value="en" disabled>English — Bientôt disponible</option>
                    <option value="ar" disabled>العربية — Bientôt disponible</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="secondaryLang" className="block text-[11px] font-bold uppercase tracking-[0.06em] text-[#616161] mb-1.5">Langue secondaire</label>
                  <select
                    id="secondaryLang"
                    defaultValue=""
                    className="w-full px-3.5 py-2.5 bg-white border border-[#D1D1D1] rounded text-sm text-[#242424] appearance-none focus:border-[#0078D4] focus:outline-none focus:ring-2 focus:ring-[#EFF6FC]"
                    style={{ backgroundImage: `url("data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23616161' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`, paddingRight: "40px", backgroundPosition: "right 12px center", backgroundRepeat: "no-repeat", backgroundSize: "16px" }}
                  >
                    <option value="">— Aucune —</option>
                    <option value="fr">Français</option>
                    <option value="en" disabled>English — Bientôt disponible</option>
                    <option value="ar" disabled>العربية — Bientôt disponible</option>
                  </select>
                </div>
              </div>

              {/* Password */}
              <PasswordInput
                id="password"
                name="password"
                label="Mot de passe"
                required
                value={password}
                onChange={(e) => setValue("password", e.target.value, { shouldValidate: true })}
                error={errors.password?.message}
                showStrength
              />

              {/* Confirm password */}
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
                    onClick={toggleConfirmVisibility}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center text-[#616161] hover:text-[#0078D4] rounded transition-colors"
                    aria-label={confirmVisible ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                  >
                    <span className="material-symbols-outlined text-xl">
                      {confirmVisible ? "visibility_off" : "visibility"}
                    </span>
                  </button>
                </div>
                {passwordConfirm && !errors.passwordConfirm && password === passwordConfirm && (
                  <p className="text-xs mt-1.5" style={{ color: "#107C10" }}>✓ Les mots de passe correspondent</p>
                )}
                {errors.passwordConfirm && (
                  <p className="text-xs text-[#D13438] mt-1.5">{errors.passwordConfirm.message}</p>
                )}
              </div>

              {/* CGU */}
              <div className="p-4 bg-[#F5F5F5] border border-[#E0E0E0] rounded-lg">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" required className="mt-0.5 w-[18px] h-[18px] border-[1.5px] border-[#8A8886] rounded-[3px] bg-white appearance-none cursor-pointer shrink-0 checked:bg-[#0078D4] checked:border-[#0078D4] focus:ring-2 focus:ring-[#EFF6FC] focus:outline-none" />
                  <span className="text-sm text-[#242424] leading-snug">
                    J&apos;accepte les{" "}
                    <a href="#" className="text-[#0078D4] font-semibold hover:underline">Conditions Générales d&apos;Utilisation</a>{" "}
                    et la{" "}
                    <a href="#" className="text-[#0078D4] font-semibold hover:underline">Politique de confidentialité</a>{" "}
                    de MARKET-UP.
                  </span>
                </label>
              </div>

              {/* Actions */}
              <div className="pt-6 flex flex-col-reverse sm:flex-row items-center justify-between gap-3 border-t border-[#E0E0E0]">
                <Link href="/signup/company" className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-5 py-3 text-sm font-semibold text-[#0078D4] hover:bg-[#EFF6FC] rounded transition-colors">
                  <span className="material-symbols-outlined text-base">arrow_back</span>
                  Retour
                </Link>
                <button type="submit" disabled={submitting} className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#0078D4] hover:bg-[#106EBE] active:bg-[#005A9E] text-white text-sm font-semibold rounded transition-colors disabled:bg-[#D1D1D1] disabled:cursor-not-allowed">
                  {submitting ? "Envoi..." : "Continuer"}
                  <span className="material-symbols-outlined text-base">arrow_forward</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </section>
    </>
  );
}
