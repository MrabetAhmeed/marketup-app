"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/shared/Toast";
import { DeleteAccountModal } from "./DeleteAccountModal";

interface SettingsFormProps {
  companyName: string;
  accountEmail: string;
}

// ---------------------------------------------------------------------------
// Password strength computation (matches mockup JS logic)
// ---------------------------------------------------------------------------

function computeStrength(password: string): { level: number; rules: Record<string, boolean> } {
  const rules = {
    length: password.length >= 8,
    upper: /[A-Z]/.test(password),
    number: /\d/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
  };
  const metCount = Object.values(rules).filter(Boolean).length;
  const level = password.length > 0 ? Math.max(1, metCount) : 0;
  return { level, rules };
}

const STRENGTH_LABELS = ["Force du mot de passe", "Faible", "Moyenne", "Bonne", "Excellente"];
const STRENGTH_COLORS = ["bg-[#E0E0E0]", "bg-[#DC2626]", "bg-[#D97706]", "bg-[#107C10]", "bg-[#107C10]"];

const RULES_CONFIG = [
  { key: "length", label: "Au moins 8 caractères" },
  { key: "upper", label: "Une majuscule" },
  { key: "number", label: "Un chiffre" },
  { key: "special", label: "Un caractère spécial" },
];

export function SettingsForm({ companyName, accountEmail }: SettingsFormProps): JSX.Element {
  const { showToast } = useToast();
  const router = useRouter();
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  // Password form state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [visibleFields, setVisibleFields] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);

  const { level, rules } = computeStrength(newPassword);
  const passwordsMatch = confirmPassword.length > 0 && newPassword === confirmPassword;
  const passwordsMismatch = confirmPassword.length > 0 && newPassword !== confirmPassword;
  const canSubmit = level >= 3 && passwordsMatch && currentPassword.length > 0 && !submitting;

  const toggleVisibility = useCallback((field: string) => {
    setVisibleFields((prev) => ({ ...prev, [field]: !prev[field] }));
  }, []);

  const resetForm = useCallback(() => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setFieldError(null);
  }, []);

  const handleChangePassword = useCallback(async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setFieldError(null);

    try {
      const res = await fetch("/api/v1/me/settings/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmPassword,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        const code = json?.error?.code;
        if (code === "INVALID_CURRENT_PASSWORD") {
          setFieldError("Le mot de passe actuel est incorrect.");
        } else if (code === "SAME_PASSWORD") {
          setFieldError("Le nouveau mot de passe doit être différent de l'ancien.");
        } else if (code === "RATE_LIMITED") {
          showToast("Trop de tentatives. Réessayez plus tard.");
        } else {
          showToast(json?.error?.message || "Une erreur est survenue.");
        }
        return;
      }

      // Success: reset form, show toast
      showToast("Mot de passe modifié avec succès.");
      const savedNewPassword = newPassword;
      resetForm();

      // Silent re-sign to get a fresh JWT (so this device stays logged in)
      // The signIn call goes through the full login() flow (company status check,
      // lastLoginAt update) — this is expected behavior (M2).
      const signInResult = await signIn("credentials", {
        email: accountEmail,
        password: savedNewPassword,
        redirect: false,
      });

      if (!signInResult?.ok) {
        // Edge case: company suspended between password change and re-sign
        // Graceful degradation: redirect to login
        router.push("/login?reason=session_expired");
      }
    } catch {
      showToast("Erreur réseau. Vérifiez votre connexion.");
    } finally {
      setSubmitting(false);
    }
  }, [canSubmit, currentPassword, newPassword, confirmPassword, accountEmail, showToast, resetForm, router]);

  return (
    <div className="max-w-[720px] mx-auto space-y-6">
      {/* ═══ PAGE HEADER ═══ */}
      <section className="flex items-start gap-3">
        <div className="w-11 h-11 rounded-lg bg-primary-light flex items-center justify-center shrink-0">
          <span className="material-symbols-outlined icon-fill text-primary" style={{ fontSize: 24 }}>
            settings
          </span>
        </div>
        <div className="min-w-0">
          <h2 className="font-heading font-bold text-[20px] text-ink-primary leading-tight">
            Paramètres de sécurité
          </h2>
          <p className="text-[12.5px] text-ink-secondary mt-1 leading-snug">
            Gérez votre mot de passe et la suppression de votre compte
          </p>
        </div>
      </section>

      {/* ═══ SECTION: MOT DE PASSE ═══ */}
      <section className="card p-5 md:p-6">
        <div className="mb-5">
          <h3 className="font-heading font-bold text-[15px] text-ink-primary">Mot de passe</h3>
          <p className="text-[12px] text-ink-secondary mt-0.5 leading-snug">
            Choisissez un mot de passe robuste · après modification, vous resterez connecté
            sur cet appareil mais les autres sessions seront déconnectées
          </p>
        </div>

        <div className="space-y-5">
          {/* Current password */}
          <div>
            <label htmlFor="pwd-current" className="field-label">
              Mot de passe actuel <span className="text-[#B91C1C] font-bold ml-0.5">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-ink-tertiary pointer-events-none" style={{ fontSize: 16 }}>
                lock
              </span>
              <input
                id="pwd-current"
                type={visibleFields["current"] ? "text" : "password"}
                autoComplete="current-password"
                placeholder="Saisissez votre mot de passe actuel"
                value={currentPassword}
                onChange={(e) => { setCurrentPassword(e.target.value); setFieldError(null); }}
                className={`field-input pl-9 pr-10 ${fieldError ? "border-[#DC2626]" : ""}`}
              />
              <button
                type="button"
                onClick={() => toggleVisibility("current")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-tertiary hover:text-primary transition-colors"
                aria-label="Afficher / masquer"
              >
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                  {visibleFields["current"] ? "visibility_off" : "visibility"}
                </span>
              </button>
            </div>
            {fieldError && (
              <div className="field-help text-[#DC2626] mt-1">
                <span className="material-symbols-outlined" style={{ fontSize: 13 }}>error</span>
                {fieldError}
              </div>
            )}
          </div>

          {/* New password */}
          <div>
            <label htmlFor="pwd-new" className="field-label">
              Nouveau mot de passe <span className="text-[#B91C1C] font-bold ml-0.5">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-ink-tertiary pointer-events-none" style={{ fontSize: 16 }}>
                key
              </span>
              <input
                id="pwd-new"
                type={visibleFields["new"] ? "text" : "password"}
                autoComplete="new-password"
                placeholder="Nouveau mot de passe"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="field-input pl-9 pr-10"
              />
              <button
                type="button"
                onClick={() => toggleVisibility("new")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-tertiary hover:text-primary transition-colors"
                aria-label="Afficher / masquer"
              >
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                  {visibleFields["new"] ? "visibility_off" : "visibility"}
                </span>
              </button>
            </div>

            {/* Strength meter */}
            <div className="mt-3 space-y-2">
              {/* 4 bars */}
              <div className="flex gap-1">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className={`h-1 flex-1 rounded-full transition-colors ${
                      i <= level ? STRENGTH_COLORS[level] : "bg-[#E0E0E0]"
                    }`}
                  />
                ))}
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-medium text-ink-secondary">
                  {STRENGTH_LABELS[level]}
                </span>
                <span className="text-[11px] text-ink-tertiary">
                  {newPassword.length} caractères
                </span>
              </div>
              {/* Rules */}
              <div className="grid grid-cols-2 gap-1">
                {RULES_CONFIG.map((rule) => {
                  const met = rules[rule.key as keyof typeof rules];
                  return (
                    <div
                      key={rule.key}
                      className={`flex items-center gap-1.5 text-[11px] ${met ? "text-status-active-fg" : "text-ink-tertiary"}`}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                        {met ? "check_circle" : "circle"}
                      </span>
                      <span>{rule.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Confirm password */}
          <div>
            <label htmlFor="pwd-confirm" className="field-label">
              Confirmer le nouveau mot de passe <span className="text-[#B91C1C] font-bold ml-0.5">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-ink-tertiary pointer-events-none" style={{ fontSize: 16 }}>
                key
              </span>
              <input
                id="pwd-confirm"
                type={visibleFields["confirm"] ? "text" : "password"}
                autoComplete="new-password"
                placeholder="Retapez votre nouveau mot de passe"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="field-input pl-9 pr-10"
              />
              <button
                type="button"
                onClick={() => toggleVisibility("confirm")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-tertiary hover:text-primary transition-colors"
                aria-label="Afficher / masquer"
              >
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                  {visibleFields["confirm"] ? "visibility_off" : "visibility"}
                </span>
              </button>
            </div>
            {/* Match indicator */}
            {passwordsMatch && (
              <div className="field-help text-status-active-fg">
                <span className="material-symbols-outlined" style={{ fontSize: 13 }}>check_circle</span>
                Les mots de passe correspondent
              </div>
            )}
            {passwordsMismatch && (
              <div className="field-help text-[#DC2626]">
                <span className="material-symbols-outlined" style={{ fontSize: 13 }}>error</span>
                Les mots de passe ne correspondent pas
              </div>
            )}
          </div>
        </div>

        {/* Action bar */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-4 mt-6 pt-5 border-t border-[#F0F0F0]">
          <div className="text-[11.5px] text-ink-tertiary leading-snug">
            Un email de confirmation vous sera envoyé après changement.
          </div>
          <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
            <button
              type="button"
              className="px-4 py-[9px] text-[13px] font-semibold text-primary hover:bg-primary-light rounded transition-colors"
              onClick={resetForm}
            >
              Annuler
            </button>
            <button
              type="button"
              disabled={!canSubmit}
              onClick={handleChangePassword}
              className="inline-flex items-center gap-1.5 px-4 py-[9px] text-[13px] font-semibold text-white bg-primary hover:bg-primary-hover rounded transition-colors disabled:bg-[#E0E0E0] disabled:text-[#A8A8A8] disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <span className="material-symbols-outlined animate-spin" style={{ fontSize: 16 }}>progress_activity</span>
                  Modification...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>lock_reset</span>
                  Mettre à jour le mot de passe
                </>
              )}
            </button>
          </div>
        </div>
      </section>

      {/* ═══ SECTION: DANGER ZONE ═══ */}
      <section id="delete" className="border border-[#FCA5A5] bg-[#FEF2F2] rounded-lg p-5 md:p-6">
        <div className="flex items-start gap-3 mb-4">
          <span className="material-symbols-outlined icon-fill text-[#DC2626] shrink-0 mt-[2px]" style={{ fontSize: 20 }}>
            warning
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="font-heading font-bold text-[15px] text-[#991B1B] leading-tight">
              Supprimer mon compte
            </h3>
            <p className="text-[12px] text-[#991B1B] mt-0.5 leading-snug">
              Cette action est <strong>définitive et irréversible</strong>
            </p>
          </div>
        </div>

        <div className="bg-white border border-[#FCA5A5] rounded-lg p-4 md:p-5 space-y-4">
          {/* Consequences list */}
          <div>
            <div className="font-heading font-semibold text-[13px] text-ink-primary mb-2">
              En supprimant votre compte, vous allez définitivement perdre :
            </div>
            <ul className="space-y-1.5 text-[12.5px] text-[#424242]">
              {[
                "Vos **3 profils publics** (BrandUP, TraceUP, LinkUP) et leur contenu",
                "Votre **badge RSE validé** et l'historique de vos dons",
                "Vos **campagnes Boost / Sponsoring** actives — aucun remboursement possible",
                "L'historique de **facturation** et les reçus PDF",
                "Les **URL publiques** (/brandup/..., /traceup/..., /linkup/...) — elles renverront 404",
              ].map((text, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="material-symbols-outlined shrink-0 mt-[1px] text-[#DC2626]" style={{ fontSize: 14 }}>
                    close
                  </span>
                  <span dangerouslySetInnerHTML={{ __html: text.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>") }} />
                </li>
              ))}
            </ul>
          </div>

          {/* Alternative tip */}
          <div className="bg-[#FFFBEB] border border-[#FDE68A] rounded px-3 py-2 flex items-start gap-2">
            <span className="material-symbols-outlined icon-fill text-[#D97706] shrink-0 mt-[1px]" style={{ fontSize: 16 }}>
              info
            </span>
            <div className="text-[12px] text-[#92400E] leading-snug">
              <strong>Alternative :</strong> si vous souhaitez juste masquer votre présence
              sans tout effacer, désactivez vos profils individuellement depuis{" "}
              <Link href="/dashboard/brandup" className="font-semibold hover:underline">BrandUP</Link>,{" "}
              <Link href="/dashboard/traceup" className="font-semibold hover:underline">TraceUP</Link>{" "}
              et <Link href="/dashboard/linkup" className="font-semibold hover:underline">LinkUP</Link>.
              Vous pourrez les réactiver plus tard.
            </div>
          </div>

          {/* Delete button */}
          <div className="flex justify-end pt-1">
            <button
              type="button"
              onClick={() => setDeleteModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-[9px] text-[13px] font-semibold text-[#B91C1C] bg-white border border-[#FCA5A5] rounded hover:bg-[#FEF2F2] hover:border-[#DC2626] transition-colors"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>delete_forever</span>
              Supprimer mon compte
            </button>
          </div>
        </div>
      </section>

      {/* Delete modal */}
      <DeleteAccountModal
        open={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        companyName={companyName}
        accountEmail={accountEmail}
      />
    </div>
  );
}
