"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { StatusPill } from "@/components/shared/StatusPill";
import { ProfileStatusBlock } from "@/components/shared/ProfileStatusBlock";
import { CopyGroup } from "@/components/shared/CopyGroup";
import { useToast } from "@/components/shared/Toast";
import { ProfileActionBar } from "./ProfileActionBar";
import type { LinkUpEditorData } from "@/types/profile-editor";
import type { MeResponse } from "@/types/dashboard";

const LINK_PLATFORMS = [
  { id: "website", label: "Site web", icon: "language", placeholder: "https://www.votre-site.tn" },
  { id: "linkedin", label: "LinkedIn", icon: "work", placeholder: "https://linkedin.com/company/..." },
  { id: "facebook", label: "Facebook", icon: "public", placeholder: "https://facebook.com/votre-page" },
  { id: "instagram", label: "Instagram", icon: "photo_camera", placeholder: "https://instagram.com/..." },
  { id: "youtube", label: "YouTube", icon: "smart_display", placeholder: "https://youtube.com/@votre-chaine" },
] as const;

interface LinkUpEditorProps {
  profile: LinkUpEditorData;
  company: MeResponse["company"];
}

type FormValues = Record<string, string>;

export function LinkUpEditor({ profile, company }: LinkUpEditorProps): JSX.Element {
  const router = useRouter();
  const { showToast } = useToast();
  const isReadOnly = profile.status === "pending" || profile.status === "disabled";
  const baseUrl = "https://vivasky.media";

  // Build default values from socials array
  const defaultSocials: FormValues = {};
  for (const platform of LINK_PLATFORMS) {
    const social = profile.data.socials.find((s) => s.platform === platform.id);
    defaultSocials[platform.id] = social?.url ?? "";
  }

  const { register, formState: { dirtyFields, errors }, reset, getValues, setError, clearErrors } = useForm<FormValues>({
    defaultValues: defaultSocials,
  });

  // --- Soft state: isPublic ---
  const [isPublic, setIsPublic] = useState(profile.isPublic);
  const isPublicDirty = isPublic !== profile.isPublic;

  // socials isDirty is tracked by the form (all 5 platform inputs are form fields)
  const socialsDirtyCount = Object.keys(dirtyFields).length;
  const softDirtyCount = (isPublicDirty ? 1 : 0) + (socialsDirtyCount > 0 ? 1 : 0);
  const [saving, setSaving] = useState(false);

  async function handleSoftSave(): Promise<void> {
    const patch: Record<string, unknown> = {};
    if (isPublicDirty) patch.isPublic = isPublic;

    // Build socials array from dirty form fields
    if (socialsDirtyCount > 0) {
      const values = getValues();
      const socials = LINK_PLATFORMS.map((p) => ({
        platform: p.id,
        url: values[p.id] ?? "",
      }));
      patch.socials = socials;
    }

    if (Object.keys(patch).length === 0) return;

    clearErrors();
    setSaving(true);
    try {
      const res = await fetch(`/api/v1/profiles/${profile.id}/soft`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });

      const json = await res.json();

      if (!res.ok) {
        if (json.error?.code === "VALIDATION_FAILED" && json.error.fields) {
          const fields = json.error.fields as Record<string, string[]>;
          let hasInlineError = false;

          for (const [fieldPath, messages] of Object.entries(fields)) {
            // Zod flatten() collapses nested array errors to "socials"
            // Mark all dirty social inputs that have invalid URLs
            if (fieldPath === "socials") {
              const values = getValues();
              for (const p of LINK_PLATFORMS) {
                if (dirtyFields[p.id] && values[p.id] && !isValidUrl(values[p.id]!)) {
                  setError(p.id, { message: messages[0] ?? "URL invalide." });
                  hasInlineError = true;
                }
              }
              if (!hasInlineError) {
                // Fallback: show on first dirty social
                const firstDirty = LINK_PLATFORMS.find((p) => dirtyFields[p.id]);
                if (firstDirty) {
                  setError(firstDirty.id, { message: messages[0] ?? "URL invalide." });
                  hasInlineError = true;
                }
              }
            }
            // Direct field match (isPublic, etc.)
            const directPlatform = LINK_PLATFORMS.find((p) => p.id === fieldPath);
            if (directPlatform) {
              setError(directPlatform.id, { message: messages[0] });
              hasInlineError = true;
            }
          }
          if (!hasInlineError) {
            showToast("Erreur de validation, vérifiez vos liens");
          }
          return;
        }
        showToast("Erreur, veuillez réessayer");
        return;
      }

      const data = json as LinkUpEditorData;
      setIsPublic(data.isPublic);
      // Reset form with new socials values
      const newDefaults: FormValues = {};
      for (const platform of LINK_PLATFORMS) {
        const social = data.data.socials.find((s) => s.platform === platform.id);
        newDefaults[platform.id] = social?.url ?? "";
      }
      reset(newDefaults);
      showToast("Modifications enregistrées");
      router.refresh();
    } catch {
      showToast("Erreur, veuillez réessayer");
    } finally {
      setSaving(false);
    }
  }

  // --- Hard submit (LinkUP: empty body, just status transition) ---
  const [submitting, setSubmitting] = useState(false);

  async function handleHardSubmit(): Promise<void> {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/v1/profiles/${profile.id}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const json = await res.json();
      if (!res.ok) {
        showToast(json.error?.message || "Erreur, veuillez réessayer");
        return;
      }
      showToast("Profil soumis pour validation");
      router.refresh();
    } catch {
      showToast("Erreur, veuillez réessayer");
    } finally {
      setSubmitting(false);
    }
  }

  function handleReset(): void {
    reset();
    setIsPublic(profile.isPublic);
  }

  const filledCount = LINK_PLATFORMS.filter(
    (p) => (defaultSocials[p.id] ?? "").length > 0
  ).length;

  return (
    <div className="max-w-[1120px] mx-auto space-y-6">
      {/* ═══ PAGE HEADER ═══ */}
      <section className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-11 h-11 rounded-lg bg-primary-light flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-primary" style={{ fontSize: 24 }}>qr_code_2</span>
          </div>
          <div className="min-w-0">
            <h2 className="font-heading font-bold text-[20px] text-ink-primary leading-tight">Profil LinkUP</h2>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <StatusPill kind={profile.status} />
              {profile.publishedAt && profile.status === "active" && (
                <span className="text-[11px] text-ink-tertiary">Publié le {formatDate(profile.publishedAt)}</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link href={`/linkup/${company.slug}`} target="_blank" className="inline-flex items-center gap-1.5 px-4 py-[9px] text-[13px] font-semibold text-ink-primary bg-white border border-[#D1D1D1] rounded hover:bg-surface-muted transition-colors">
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>open_in_new</span>
            Aperçu public
          </Link>
          <Link href="/dashboard/boost" className="inline-flex items-center gap-1.5 px-4 py-[9px] text-[13px] font-semibold text-white bg-primary hover:bg-primary-hover rounded transition-colors">
            <span className="material-symbols-outlined icon-fill" style={{ fontSize: 14 }}>bolt</span>
            Booster
          </Link>
        </div>
      </section>

      {/* ═══ STATUS BLOCK ═══ */}
      <ProfileStatusBlock
        status={profile.status}
        rejectionReason={profile.rejectionReason}
        submittedAt={profile.submittedAt}
        rejectedAt={profile.rejectedAt}
      />

      {/* ═══ CONTEXT BANNER ═══ */}
      <section className="bg-primary-light border border-[#C7DDF1] rounded-lg px-4 py-3 flex items-start md:items-center gap-3">
        <span className="material-symbols-outlined text-primary shrink-0 mt-[1px] md:mt-0" style={{ fontSize: 20 }}>info</span>
        <div className="min-w-0 flex-1 text-[12.5px] text-ink-primary leading-snug">
          Les liens <strong>téléphone, email et WhatsApp</strong> sont repris depuis votre page Compte.
          <span className="text-ink-secondary"> Modifiez-les là-bas pour les mettre à jour sur LinkUP.</span>
        </div>
        <Link href="/dashboard/account" className="shrink-0 inline-flex items-center gap-1 text-[12px] font-semibold text-primary hover:underline whitespace-nowrap">
          Modifier dans Compte
          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>arrow_forward</span>
        </Link>
      </section>

      {/* ═══ VISIBILITY TOGGLE ═══ */}
      <section className="card p-5 flex items-center gap-4">
        <div className="w-10 h-10 rounded-lg bg-primary-light flex items-center justify-center shrink-0">
          <span className="material-symbols-outlined text-primary" style={{ fontSize: 20 }}>visibility</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-heading font-semibold text-[14px] text-ink-primary leading-tight">Profil public visible</div>
          <div className="text-[12px] text-ink-secondary mt-0.5 leading-snug">
            Quand activé, votre profil apparaît dans les résultats du moteur LinkUP.
          </div>
        </div>
        <label className="relative inline-block w-9 h-5 shrink-0">
          <input type="checkbox" className="sr-only peer" checked={isPublic} disabled={isReadOnly || profile.status !== "active"} onChange={() => setIsPublic(!isPublic)} />
          <span className="absolute inset-0 cursor-pointer rounded-[10px] bg-[#C8C6C4] transition-colors peer-checked:bg-primary peer-disabled:opacity-60 peer-disabled:cursor-not-allowed" />
          <span className="absolute left-[3px] top-[3px] h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-4" />
        </label>
      </section>

      {/* ═══ SECTION: LIENS AUTOMATIQUES ═══ */}
      <section className="card p-5 md:p-6">
        <div className="mb-5">
          <h3 className="font-heading font-bold text-[15px] text-ink-primary">Liens automatiques</h3>
          <p className="text-[12px] text-ink-secondary mt-0.5 leading-snug">
            Générés par MARKET-UP à partir de vos profils BrandUP et TraceUP — non modifiables
          </p>
        </div>
        <div className="space-y-4">
          <div>
            <label className="field-label flex items-center gap-2">
              <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-primary-light shrink-0">
                <span className="material-symbols-outlined text-primary" style={{ fontSize: 14 }}>storefront</span>
              </span>
              Profil BrandUP
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-ink-secondary bg-surface-muted border border-surface-border px-1.5 py-0.5 rounded normal-case tracking-normal">
                <span className="material-symbols-outlined" style={{ fontSize: 11 }}>lock</span>Auto
              </span>
            </label>
            <CopyGroup value={`${baseUrl}/brandup/${company.slug}`} />
          </div>
          <div>
            <label className="field-label flex items-center gap-2">
              <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-primary-light shrink-0">
                <span className="material-symbols-outlined text-primary" style={{ fontSize: 14 }}>play_circle</span>
              </span>
              Profil TraceUP
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-ink-secondary bg-surface-muted border border-surface-border px-1.5 py-0.5 rounded normal-case tracking-normal">
                <span className="material-symbols-outlined" style={{ fontSize: 11 }}>lock</span>Auto
              </span>
            </label>
            <CopyGroup value={`${baseUrl}/traceup/${company.slug}`} />
          </div>
        </div>
      </section>

      {/* ═══ SECTION: LIENS OBLIGATOIRES ═══ */}
      <section className="card p-5 md:p-6">
        <div className="flex items-start justify-between mb-5 flex-wrap gap-2">
          <div>
            <h3 className="font-heading font-bold text-[15px] text-ink-primary">Liens obligatoires</h3>
            <p className="text-[12px] text-ink-secondary mt-0.5 leading-snug">Indispensables pour publier votre profil LinkUP</p>
          </div>
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-status-active-fg bg-status-active-bg border border-status-active-border px-2 py-1 rounded shrink-0">
            <span className="material-symbols-outlined icon-fill" style={{ fontSize: 12 }}>check_circle</span>
            Tous renseignés
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="field-label flex items-center gap-2">
              <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-status-active-bg border border-status-active-border shrink-0">
                <span className="material-symbols-outlined icon-fill text-status-active-fg" style={{ fontSize: 13 }}>chat</span>
              </span>
              WhatsApp <span className="text-[#B91C1C] font-bold ml-0.5">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-ink-tertiary pointer-events-none" style={{ fontSize: 16 }}>chat</span>
              <input type="url" readOnly value={profile.data.contactCard.whatsapp ?? ""} className="field-input pl-9" />
            </div>
          </div>
          <div>
            <label className="field-label flex items-center gap-2">
              <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-status-active-bg border border-status-active-border shrink-0">
                <span className="material-symbols-outlined icon-fill text-status-active-fg" style={{ fontSize: 13 }}>location_on</span>
              </span>
              Position GPS (Google Maps) <span className="text-[#B91C1C] font-bold ml-0.5">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-ink-tertiary pointer-events-none" style={{ fontSize: 16 }}>location_on</span>
              <input type="url" readOnly value={profile.data.contactCard.gpsUrl ?? ""} className="field-input pl-9" />
            </div>
          </div>
        </div>
      </section>

      {/* ═══ SECTION: LIENS OPTIONNELS ═══ */}
      <section className="card p-5 md:p-6">
        <div className="flex items-start justify-between mb-5 flex-wrap gap-2">
          <div>
            <h3 className="font-heading font-bold text-[15px] text-ink-primary">Liens optionnels</h3>
            <p className="text-[12px] text-ink-secondary mt-0.5 leading-snug">Les liens non renseignés ne s&apos;affichent pas sur votre profil public</p>
          </div>
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-ink-secondary bg-surface-muted border border-surface-border px-2 py-1 rounded shrink-0">
            <span className="material-symbols-outlined" style={{ fontSize: 12 }}>link</span>
            {filledCount} / {LINK_PLATFORMS.length} renseignés
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {LINK_PLATFORMS.map((platform) => (
            <div key={platform.id}>
              <label htmlFor={`lnk-${platform.id}`} className="field-label flex items-center gap-2">
                <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-surface-muted shrink-0">
                  <span className="material-symbols-outlined text-ink-secondary" style={{ fontSize: 13 }}>{platform.icon}</span>
                </span>
                {platform.label} <span className="text-ink-tertiary font-normal normal-case tracking-normal ml-1">(optionnel)</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-ink-tertiary pointer-events-none" style={{ fontSize: 16 }}>{platform.icon}</span>
                <input
                  id={`lnk-${platform.id}`}
                  type="url"
                  readOnly={isReadOnly}
                  placeholder={platform.placeholder}
                  className={`field-input pl-9 ${errors[platform.id] ? "border-[#B91C1C]" : ""}`}
                  {...register(platform.id)}
                />
              </div>
              {errors[platform.id] && (
                <p className="text-[12px] text-[#B91C1C] mt-1">{errors[platform.id]?.message}</p>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ═══ SECTION: QR CODE ═══ */}
      <section className="card p-5 md:p-6">
        <div className="mb-5">
          <h3 className="font-heading font-bold text-[15px] text-ink-primary">QR Code LinkUP</h3>
          <p className="text-[12px] text-ink-secondary mt-0.5 leading-snug">
            Partagez votre carte de contact en un scan · le QR pointe vers votre profil public
          </p>
        </div>
        <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
          {/* QR placeholder — TODO Phase 4: real QR generation */}
          <div className="w-[160px] h-[160px] p-4 bg-white border border-surface-border rounded-lg shrink-0 flex items-center justify-center">
            <span className="material-symbols-outlined text-ink-tertiary" style={{ fontSize: 64 }}>qr_code_2</span>
          </div>
          <div className="min-w-0 flex-1 w-full space-y-4">
            <CopyGroup value={`${baseUrl}/linkup/${company.slug}`} />
            <div className="flex items-center gap-2 flex-wrap">
              <button type="button" disabled className="inline-flex items-center gap-1.5 px-4 py-[9px] text-[13px] font-semibold text-ink-primary bg-white border border-[#D1D1D1] rounded opacity-60 cursor-not-allowed">
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>download</span>
                Télécharger QR (PNG)
              </button>
              <button type="button" disabled className="inline-flex items-center gap-1.5 px-4 py-[9px] text-[13px] font-semibold text-primary hover:bg-primary-light rounded transition-colors opacity-60 cursor-not-allowed">
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>refresh</span>
                Régénérer URL courte
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ ACTION BAR ═══ */}
      <ProfileActionBar
        status={profile.status}
        isDirty={profile.status === "incomplete" || profile.status === "rejected"}
        onReset={handleReset}
        softDirtyCount={softDirtyCount}
        saving={saving}
        onSoftSave={handleSoftSave}
        submitting={submitting}
        onHardSubmit={handleHardSubmit}
      />
    </div>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

function isValidUrl(value: string): boolean {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}
