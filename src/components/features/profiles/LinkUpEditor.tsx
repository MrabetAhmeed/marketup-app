"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import QRCode from "qrcode";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { StatusPill } from "@/components/shared/StatusPill";
import { ProfileStatusBlock } from "@/components/shared/ProfileStatusBlock";
import { CopyGroup } from "@/components/shared/CopyGroup";
import { useToast } from "@/components/shared/Toast";
import type { LinkUpEditorData } from "@/types/profile-editor";
import type { MeResponse } from "@/types/dashboard";

const MapPicker = dynamic(() => import("@/components/features/profiles/MapPicker"), { ssr: false });

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
  const [baseUrl, setBaseUrl] = useState("");
  useEffect(() => { setBaseUrl(window.location.origin); }, []);

  // QR canvas
  const qrCanvasRef = useRef<HTMLCanvasElement>(null);
  const linkupUrl = `${baseUrl}/linkup/${company.slug}`;
  useEffect(() => {
    if (!baseUrl || !qrCanvasRef.current) return;
    QRCode.toCanvas(qrCanvasRef.current, linkupUrl, { width: 128, margin: 1 }, (err) => {
      if (err) console.error("QR render error:", err);
    });
  }, [baseUrl, linkupUrl]);

  // Build default values from socials array
  const defaultSocials: FormValues = {};
  for (const platform of LINK_PLATFORMS) {
    const social = profile.data.socials.find((s) => s.platform === platform.id);
    defaultSocials[platform.id] = social?.url ?? "";
  }

  const { register, formState: { dirtyFields, errors }, reset, getValues, setError, clearErrors } = useForm<FormValues>({
    defaultValues: defaultSocials,
  });

  // --- Soft state: isPublic + placeholderMode ---
  const [isPublic, setIsPublic] = useState(profile.isPublic);
  const [placeholderMode, setPlaceholderMode] = useState<string>(profile.placeholderMode ?? "hidden");
  const isPublicDirty = isPublic !== profile.isPublic;
  const placeholderDirty = placeholderMode !== (profile.placeholderMode ?? "hidden");
  const [savingPublic, setSavingPublic] = useState(false);

  async function handleIsPublicSave(): Promise<void> {
    if (!isPublicDirty && !placeholderDirty) return;
    setSavingPublic(true);
    try {
      const patch: Record<string, unknown> = {};
      if (isPublicDirty) patch.isPublic = isPublic;
      if (placeholderDirty) patch.placeholderMode = placeholderMode;
      const res = await fetch(`/api/v1/profiles/${profile.id}/soft`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) { showToast("Erreur, veuillez réessayer"); return; }
      showToast("Visibilité mise à jour");
      router.refresh();
    } catch {
      showToast("Erreur, veuillez réessayer");
    } finally {
      setSavingPublic(false);
    }
  }

  // --- GPS position (live, independent of profile status) ---
  const [gpsCoords, setGpsCoords] = useState<[number, number] | null>(
    profile.gpsPosition ? (profile.gpsPosition.coordinates as [number, number]) : null,
  );
  const [gpsDirty, setGpsDirty] = useState(false);
  const [savingGps, setSavingGps] = useState(false);

  const handleGpsChange = useCallback((coords: [number, number]) => {
    setGpsCoords(coords);
    setGpsDirty(true);
  }, []);

  async function handleGpsSave(): Promise<void> {
    if (!gpsCoords || !gpsDirty) return;
    setSavingGps(true);
    try {
      const res = await fetch("/api/v1/me/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gpsPosition: { type: "Point", coordinates: gpsCoords },
        }),
      });
      if (!res.ok) { showToast("Erreur, veuillez réessayer"); return; }
      showToast("Position enregistrée");
      setGpsDirty(false);
      router.refresh();
    } catch {
      showToast("Erreur, veuillez réessayer");
    } finally {
      setSavingGps(false);
    }
  }

  const hasGps = gpsCoords != null;

  // --- Hard state: socials ---
  const socialsDirtyCount = Object.keys(dirtyFields).length;
  const [saving, setSaving] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const isPending = profile.status === "pending";

  async function handleSocialsSubmit(): Promise<void> {
    const values = getValues();
    const socials = LINK_PLATFORMS.map((p) => ({
      platform: p.id,
      url: values[p.id] ?? "",
    }));

    clearErrors();
    setSaving(true);
    try {
      const res = await fetch(`/api/v1/profiles/${profile.id}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ socials }),
      });

      const json = await res.json();

      if (!res.ok) {
        if (json.error?.code === "ALREADY_PENDING") {
          showToast("Modification en cours de validation. Annulez la soumission actuelle pour modifier à nouveau.");
          return;
        }
        if (json.error?.code === "VALIDATION_FAILED" && json.error.fields) {
          const fields = json.error.fields as Record<string, string[]>;
          for (const [fieldPath, messages] of Object.entries(fields)) {
            if (fieldPath === "socials") {
              const vals = getValues();
              for (const p of LINK_PLATFORMS) {
                if (vals[p.id] && !isValidUrl(vals[p.id]!)) {
                  setError(p.id, { message: messages[0] ?? "URL invalide." });
                }
              }
            }
          }
          return;
        }
        showToast(json.error?.message || "Erreur, veuillez réessayer");
        return;
      }

      const data = json as LinkUpEditorData;
      const newDefaults: FormValues = {};
      for (const platform of LINK_PLATFORMS) {
        const social = data.data.socials.find((s) => s.platform === platform.id);
        newDefaults[platform.id] = social?.url ?? "";
      }
      reset(newDefaults);
      showToast("Soumis en validation administrateur");
      router.refresh();
    } catch {
      showToast("Erreur, veuillez réessayer");
    } finally {
      setSaving(false);
    }
  }

  async function handleCancelPending(): Promise<void> {
    setCancelling(true);
    try {
      const res = await fetch(`/api/v1/profiles/${profile.id}/pending`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const json = await res.json();
        showToast(json.error?.message || "Erreur");
        return;
      }
      showToast("Soumission annulée");
      router.refresh();
    } catch {
      showToast("Erreur, veuillez réessayer");
    } finally {
      setCancelling(false);
    }
  }

  function handleReset(): void {
    reset();
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
        publishedAt={profile.publishedAt}
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

      {/* ═══ PENDING BANNER ═══ */}
      {isPending && (
        <section className="bg-[#FEF3C7] border border-[#FDE68A] rounded-lg px-4 py-3 flex items-start md:items-center gap-3">
          <span className="material-symbols-outlined text-[#D97706] shrink-0 mt-[1px] md:mt-0" style={{ fontSize: 20 }}>schedule</span>
          <div className="min-w-0 flex-1 text-[12.5px] text-[#92400E] leading-snug">
            <strong>Profil en cours de validation par l&apos;administrateur.</strong>{" "}
            {profile.publishedAt
              ? "Le profil reste visible avec vos données actuelles."
              : "Le profil est temporairement masqué publiquement jusqu\u0027à la validation."
            }
          </div>
          <button
            type="button"
            disabled={cancelling}
            onClick={handleCancelPending}
            className="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 text-[12px] font-semibold text-[#92400E] bg-white border border-[#FDE68A] rounded hover:bg-[#FFFBEB] transition-colors disabled:opacity-60"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>undo</span>
            {cancelling ? "Annulation…" : "Annuler la soumission"}
          </button>
        </section>
      )}

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
        <div className="flex items-center gap-2 shrink-0">
          <label className="relative inline-block w-9 h-5">
            <input type="checkbox" className="sr-only peer" checked={isPublic} disabled={isReadOnly} onChange={() => setIsPublic(!isPublic)} />
            <span className="absolute inset-0 cursor-pointer rounded-[10px] bg-[#C8C6C4] transition-colors peer-checked:bg-primary peer-disabled:opacity-60 peer-disabled:cursor-not-allowed" />
            <span className="absolute left-[3px] top-[3px] h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-4" />
          </label>
          {(isPublicDirty || placeholderDirty) && (
            <button type="button" disabled={savingPublic} onClick={handleIsPublicSave}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-[12px] font-semibold text-white bg-primary hover:bg-primary-hover rounded transition-colors disabled:opacity-60">
              {savingPublic ? "…" : "Enregistrer"}
            </button>
          )}
        </div>
      </section>

      {/* ═══ PLACEHOLDER MODE (when toggle OFF) ═══ */}
      {!isPublic && (
        <section className="card p-5 border-l-2 border-[#E8E6E4] ml-4">
          <div className="text-[13px] font-semibold text-ink-primary mb-2">Quand le profil est masqué :</div>
          <div className="flex flex-col gap-2">
            <label className={`flex items-center gap-2 cursor-pointer ${isReadOnly ? "opacity-60 pointer-events-none" : ""}`}>
              <input type="radio" name="placeholderMode" value="hidden" checked={placeholderMode === "hidden"}
                onChange={() => setPlaceholderMode("hidden")} disabled={isReadOnly}
                className="w-4 h-4 text-primary border-[#D1D1D1] focus:ring-primary" />
              <span className="text-[13px] text-ink-primary">Masquer complètement</span>
            </label>
            <label className={`flex items-center gap-2 cursor-pointer ${isReadOnly ? "opacity-60 pointer-events-none" : ""}`}>
              <input type="radio" name="placeholderMode" value="coming_soon" checked={placeholderMode === "coming_soon"}
                onChange={() => setPlaceholderMode("coming_soon")} disabled={isReadOnly}
                className="w-4 h-4 text-primary border-[#D1D1D1] focus:ring-primary" />
              <span className="text-[13px] text-ink-primary">Afficher &laquo;&nbsp;Bient&ocirc;t disponible&nbsp;&raquo;</span>
            </label>
          </div>
          <p className="text-[11px] text-ink-secondary mt-2 leading-snug">
            Les visiteurs de votre lien/QR verront une page d&apos;attente au lieu d&apos;une erreur
          </p>
        </section>
      )}

      {/* ═══ SECTION: POSITION SUR LA CARTE ═══ */}
      <section className="card p-5 md:p-6">
        <div className="flex items-start justify-between mb-4 flex-wrap gap-2">
          <div>
            <h3 className="font-heading font-bold text-[15px] text-ink-primary">Position sur la carte</h3>
            <p className="text-[12px] text-ink-secondary mt-0.5 leading-snug">
              Placez ou déplacez le marqueur pour localiser votre entreprise sur Google Maps
            </p>
          </div>
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#0E7C42] bg-[#E6F4ED] border border-[#B7E1CD] px-2 py-1 rounded shrink-0">
            <span className="material-symbols-outlined" style={{ fontSize: 12 }}>bolt</span>
            Mise à jour instantanée
          </span>
        </div>
        {!hasGps && !gpsDirty && (
          <div className="mb-3 flex items-center gap-2 text-[12px] text-[#B45309] bg-[#FEF3C7] border border-[#FDE68A] rounded px-3 py-2">
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>warning</span>
            Positionnez votre entreprise sur la carte avant de soumettre le profil LinkUP.
          </div>
        )}
        <MapPicker position={gpsCoords} onPositionChange={handleGpsChange} />
        {gpsDirty && gpsCoords && (
          <div className="mt-3 flex items-center justify-end gap-2">
            <span className="text-[12px] text-ink-secondary">
              {gpsCoords[1].toFixed(5)}, {gpsCoords[0].toFixed(5)}
            </span>
            <button
              type="button"
              disabled={savingGps}
              onClick={handleGpsSave}
              className="inline-flex items-center gap-1.5 px-4 py-[9px] text-[13px] font-semibold text-white bg-primary hover:bg-primary-hover rounded transition-colors disabled:opacity-60"
            >
              {savingGps
                ? <span className="material-symbols-outlined animate-spin" style={{ fontSize: 16 }}>progress_activity</span>
                : <span className="material-symbols-outlined" style={{ fontSize: 16 }}>save</span>}
              {savingGps ? "Enregistrement…" : "Enregistrer la position"}
            </button>
          </div>
        )}
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

      {/* ═══ SECTION: RÉSEAUX SOCIAUX (hard change) ═══ */}
      <section className="card p-5 md:p-6">
        <div className="flex items-start justify-between mb-5 flex-wrap gap-2">
          <div>
            <h3 className="font-heading font-bold text-[15px] text-ink-primary">Réseaux sociaux</h3>
            <p className="text-[12px] text-ink-secondary mt-0.5 leading-snug">
              Les modifications nécessitent une validation administrateur · les liens non renseignés ne s&apos;affichent pas
            </p>
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
          <div className="w-[160px] h-[160px] p-4 bg-white border border-surface-border rounded-lg shrink-0 flex items-center justify-center">
            <canvas ref={qrCanvasRef} />
          </div>
          <div className="min-w-0 flex-1 w-full space-y-4">
            <CopyGroup value={linkupUrl} />
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                disabled={!baseUrl}
                onClick={() => {
                  const canvas = qrCanvasRef.current;
                  if (!canvas) return;
                  const dataUrl = canvas.toDataURL("image/png");
                  const a = document.createElement("a");
                  a.href = dataUrl;
                  a.download = `linkup-${company.slug}-qr.png`;
                  a.click();
                }}
                className="inline-flex items-center gap-1.5 px-4 py-[9px] text-[13px] font-semibold text-ink-primary bg-white border border-[#D1D1D1] rounded hover:bg-surface-muted transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>download</span>
                Télécharger QR (PNG)
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ ACTION BAR ═══ */}
      {!isPending && socialsDirtyCount > 0 && (
        <div className="sticky bottom-0 z-30 bg-white border-t border-surface-border px-4 py-3 flex items-center justify-between gap-4 shadow-[0_-2px_8px_rgba(0,0,0,0.04)]">
          <div className="text-[12.5px] text-ink-secondary">
            <span className="font-semibold text-ink-primary">{socialsDirtyCount}</span> lien{socialsDirtyCount > 1 ? "s" : ""} modifié{socialsDirtyCount > 1 ? "s" : ""}
          </div>
          <div className="flex items-center gap-3">
            <button type="button" onClick={handleReset}
              className="inline-flex items-center gap-1.5 px-4 py-[9px] text-[13px] font-semibold text-ink-primary bg-white border border-[#D1D1D1] rounded hover:bg-surface-muted transition-colors">
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>undo</span>
              Annuler
            </button>
            <button type="button" disabled={saving || !hasGps} onClick={handleSocialsSubmit}
              title={!hasGps ? "Positionnez votre entreprise sur la carte avant de soumettre" : undefined}
              className="inline-flex items-center gap-1.5 px-5 py-[9px] text-[13px] font-semibold text-white bg-primary hover:bg-primary-hover rounded transition-colors disabled:opacity-60">
              {saving
                ? <span className="material-symbols-outlined animate-spin" style={{ fontSize: 16 }}>progress_activity</span>
                : <span className="material-symbols-outlined" style={{ fontSize: 16 }}>send</span>}
              {saving ? "Soumission…" : "Soumettre pour validation"}
            </button>
          </div>
        </div>
      )}
      {!isPending && (profile.status === "incomplete" || profile.status === "rejected") && socialsDirtyCount === 0 && (
        <div className="sticky bottom-0 z-30 bg-white border-t border-surface-border px-4 py-3 flex items-center justify-end gap-4 shadow-[0_-2px_8px_rgba(0,0,0,0.04)]">
          <button type="button" disabled={saving || !hasGps} onClick={handleSocialsSubmit}
            title={!hasGps ? "Positionnez votre entreprise sur la carte avant de soumettre" : undefined}
            className="inline-flex items-center gap-1.5 px-5 py-[9px] text-[13px] font-semibold text-white bg-primary hover:bg-primary-hover rounded transition-colors disabled:opacity-60">
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>send</span>
            Soumettre pour validation
          </button>
        </div>
      )}
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
