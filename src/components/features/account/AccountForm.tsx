"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import QRCode from "qrcode";
import { ObfuscatedEmail } from "@/components/shared/ObfuscatedEmail";
import { StatusPill } from "@/components/shared/StatusPill";
import { FieldBadge } from "@/components/shared/FieldBadge";
import { CopyGroup } from "@/components/shared/CopyGroup";
import { useToast } from "@/components/shared/Toast";
import type { MeResponse } from "@/types/dashboard";
import { LogoUploadZone } from "./LogoUploadZone";
import { BannerUploadZone } from "./BannerUploadZone";
import { AccountActionBar } from "./AccountActionBar";

interface AccountFormValues {
  firstName: string;
  lastName: string;
  displayName: string;
  gouvernorat: string;
  contactEmail: string;
  phone: string;
  whatsapp: string;
  ville: string;
  postalCode: string;
  address: string;
}

/** All editable fields go through pendingUpdates (validation admin) */
const ALL_FIELD_KEYS = [
  "firstName", "lastName",
  "displayName", "gouvernorat", "ville", "postalCode", "address",
  "contactEmail", "phone", "whatsapp",
] as const;

interface GouvernoratOption {
  slug: string;
  name: string;
}

interface AccountFormProps {
  me: MeResponse;
  gouvernorats: GouvernoratOption[];
}

export function AccountForm({ me, gouvernorats }: AccountFormProps): JSX.Element {
  const { company } = me;
  const [baseUrl, setBaseUrl] = useState("");
  useEffect(() => { setBaseUrl(window.location.origin); }, []);

  // QR code for LinkUP profile
  const qrCanvasRef = useRef<HTMLCanvasElement>(null);
  const linkupUrl = `${baseUrl}/linkup/${company.slug}`;
  useEffect(() => {
    if (!baseUrl || !qrCanvasRef.current) return;
    QRCode.toCanvas(qrCanvasRef.current, linkupUrl, { width: 104, margin: 1 }, (err) => {
      if (err) console.error("QR render error:", err);
    });
  }, [baseUrl, linkupUrl]);
  const router = useRouter();
  const { showToast } = useToast();
  const [saving, setSaving] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);

  const { register, handleSubmit, formState: { isDirty, dirtyFields, errors }, reset, setError } = useForm<AccountFormValues>({
    defaultValues: {
      firstName: me.company.gerantFirstName,
      lastName: me.company.gerantLastName,
      displayName: company.displayName,
      gouvernorat: company.gouvernorat.slug,
      contactEmail: company.contactEmail,
      phone: company.phone ?? "",
      whatsapp: company.whatsapp ?? "",
      ville: company.ville,
      postalCode: company.postalCode ?? "",
      address: company.address ?? "",
    },
  });

  const dirtyCount = Object.keys(dirtyFields).length;

  // Detect pending fields from MeResponse
  const pendingFields = me.company.pendingUpdates as { fields?: Array<{ key: string; currentValue: unknown; newValue: unknown }> } | null;

  const pendingDisplayName = (() => {
    if (!pendingFields?.fields) return null;
    const f = pendingFields.fields.find((x) => x.key === "data.displayName");
    if (!f) return null;
    const cv = f.currentValue as { fr: string };
    const nv = f.newValue as { fr: string };
    return { current: cv.fr, next: nv.fr };
  })();

  const pendingGouvernorat = (() => {
    if (!pendingFields?.fields) return null;
    const f = pendingFields.fields.find((x) => x.key === "liveData.gouvernorat");
    if (!f) return null;
    const currentName = gouvernorats.find((g) => g.slug === f.currentValue)?.name ?? String(f.currentValue);
    const nextName = gouvernorats.find((g) => g.slug === f.newValue)?.name ?? String(f.newValue);
    return { current: currentName, next: nextName };
  })();

  const pendingVille = (() => {
    if (!pendingFields?.fields) return null;
    const f = pendingFields.fields.find((x) => x.key === "liveData.ville");
    if (!f) return null;
    return { current: String(f.currentValue ?? ""), next: String(f.newValue ?? "") };
  })();

  const pendingAddress = (() => {
    if (!pendingFields?.fields) return null;
    const f = pendingFields.fields.find((x) => x.key === "liveData.address");
    if (!f) return null;
    return { current: String(f.currentValue ?? ""), next: String(f.newValue ?? "") };
  })();

  const pendingLogoUrl = pendingFields?.fields?.find((x) => x.key === "data.logoUrl")?.newValue as string | undefined ?? null;
  const pendingBannerUrl = pendingFields?.fields?.find((x) => x.key === "data.bannerUrl")?.newValue as string | undefined ?? null;

  // Helper for simple string pending fields
  const pendingSimple = (key: string): { current: string; next: string } | null => {
    if (!pendingFields?.fields) return null;
    const f = pendingFields.fields.find((x) => x.key === key);
    if (!f) return null;
    return { current: String(f.currentValue ?? ""), next: String(f.newValue ?? "") };
  };
  const pendingGerantFirst = pendingSimple("liveData.gerantFirstName");
  const pendingGerantLast = pendingSimple("liveData.gerantLastName");
  const pendingContactEmail = pendingSimple("liveData.contactEmail");
  const pendingPhone = pendingSimple("liveData.phone");
  const pendingWhatsapp = pendingSimple("liveData.whatsapp");
  const pendingPostalCode = pendingSimple("liveData.postalCode");
  const pendingDocUrl = pendingFields?.fields?.find((x) => x.key === "identityDocumentUrl")?.newValue as string | undefined ?? null;

  async function onSubmit(values: AccountFormValues): Promise<void> {
    // Build patch with only dirty fields (all go through pendingUpdates)
    const patch: Record<string, string> = {};
    for (const key of ALL_FIELD_KEYS) {
      if (dirtyFields[key]) {
        patch[key] = values[key];
      }
    }

    if (Object.keys(patch).length === 0) return;

    setSaving(true);
    try {
      const res = await fetch("/api/v1/me/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });

      const json = await res.json();

      if (!res.ok) {
        // Zod field-level errors → inline under each field
        if (json.error?.code === "VALIDATION_FAILED" && json.error.fields) {
          const fields = json.error.fields as Record<string, string[]>;
          for (const [field, messages] of Object.entries(fields)) {
            if ((ALL_FIELD_KEYS as readonly string[]).includes(field)) {
              setError(field as keyof AccountFormValues, { message: messages[0] });
            }
          }
          return;
        }
        // Generic server error → toast
        showToast("Erreur, veuillez réessayer");
        return;
      }

      // Success — reset form with updated values from response
      const meData = json as MeResponse;
      reset({
        firstName: meData.company.gerantFirstName,
        lastName: meData.company.gerantLastName,
        displayName: meData.company.displayName,
        gouvernorat: meData.company.gouvernorat.slug,
        contactEmail: meData.company.contactEmail,
        phone: meData.company.phone ?? "",
        whatsapp: meData.company.whatsapp ?? "",
        ville: meData.company.ville,
        postalCode: meData.company.postalCode ?? "",
        address: meData.company.address ?? "",
      });
      showToast("Modification soumise · en attente de validation admin");
      router.refresh();
    } catch {
      showToast("Erreur, veuillez réessayer");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-[1120px] mx-auto space-y-6">
      {/* ═══ PAGE HEADER ═══ */}
      <section className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-11 h-11 rounded-lg bg-primary-light flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined icon-fill text-primary" style={{ fontSize: 24 }}>
              business
            </span>
          </div>
          <div className="min-w-0">
            <h2 className="font-heading font-bold text-[20px] text-ink-primary leading-tight">
              Compte entreprise
            </h2>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <StatusPill kind="active">Compte actif</StatusPill>
              <span className="text-[11px] text-ink-tertiary">
                Créé le {formatShortDate(company.registeredAt)}
                {company.validatedAt && ` · Validé le ${formatShortDate(company.validatedAt)}`}
              </span>
            </div>
            <div className="flex items-center gap-1.5 mt-1.5 text-[11.5px] text-ink-tertiary">
              <span className="material-symbols-outlined text-status-active-fg" style={{ fontSize: 14 }}>
                check_circle
              </span>
              <span>Vos 3 profils publics sont alimentés depuis les données de ce compte</span>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ CASCADE RULES BANNER ═══ */}
      <section className="bg-primary-light border border-[#C7DDF1] rounded-lg px-4 py-3 flex items-start md:items-center gap-3">
        <span className="material-symbols-outlined text-primary shrink-0 mt-[1px] md:mt-0" style={{ fontSize: 20 }}>
          info
        </span>
        <div className="min-w-0 flex-1 text-[12.5px] text-ink-primary leading-snug">
          Toute modification des informations de l&apos;entreprise nécessite une <strong>validation admin (24 h)</strong>.
          Vos profils publics conservent les informations actuelles jusqu&apos;à validation.
        </div>
      </section>

      {/* ═══ REJECTION BANNER ═══ */}
      {me.company.lastPendingRejection && (
        <section className="bg-[#FEF2F2] border border-[#FCA5A5] rounded-lg px-4 py-3 flex items-start gap-3">
          <span className="material-symbols-outlined icon-fill text-[#DC2626] shrink-0 mt-[1px]" style={{ fontSize: 20 }}>
            error
          </span>
          <div className="min-w-0 flex-1 text-[12.5px] text-ink-primary leading-snug">
            <strong className="text-[#991B1B]">Modifications refusées</strong>{" "}
            le {new Date(me.company.lastPendingRejection.rejectedAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}{" "}
            — <strong>Motif :</strong> {me.company.lastPendingRejection.note}
          </div>
        </section>
      )}

      {/* ═══ SECTION: IDENTITÉ ═══ */}
      <section className="card p-5 md:p-6">
        <div className="mb-5">
          <h3 className="font-heading font-bold text-[15px] text-ink-primary">
            Identité de l&apos;entreprise
          </h3>
          <p className="text-[12px] text-ink-secondary mt-0.5 leading-snug">
            Informations affichées sur vos 3 profils publics · certaines modifications requièrent une validation admin
          </p>
        </div>

        <div className="space-y-5">
          {/* Logo */}
          <div>
            <label className="field-label flex items-center gap-2 flex-wrap">
              Logo de l&apos;entreprise <span className="text-[#B91C1C] font-bold ml-0.5">*</span>
              <FieldBadge kind="validation" />
            </label>
            <LogoUploadZone initials={company.avatarInitials} logoUrl={company.logoUrl} pendingLogoUrl={pendingLogoUrl} />
          </div>

          {/* Banner */}
          <div>
            <label className="field-label flex items-center gap-2 flex-wrap">
              Bannière <span className="text-ink-tertiary font-normal normal-case tracking-normal ml-1">(optionnel)</span>
              <FieldBadge kind="validation" />
            </label>
            <BannerUploadZone bannerUrl={company.bannerUrl} pendingBannerUrl={pendingBannerUrl} />
          </div>

          {/* Display name */}
          <div>
            <label htmlFor="acc-name" className="field-label flex items-center gap-2 flex-wrap">
              Nom de l&apos;entreprise <span className="text-[#B91C1C] font-bold ml-0.5">*</span>
              <FieldBadge kind="validation" />
            </label>
            <input
              id="acc-name"
              type="text"
              className={`field-input ${errors.displayName ? "border-[#B91C1C]" : ""}`}
              {...register("displayName")}
            />
            {errors.displayName ? (
              <p className="text-[12px] text-[#B91C1C] mt-1">{errors.displayName.message}</p>
            ) : pendingDisplayName ? (
              <div className="mt-1.5 px-3 py-2 bg-[#FEF3C7] border border-[#FDE68A] rounded text-[12px] text-[#92400E] flex items-start gap-2">
                <span className="material-symbols-outlined shrink-0 mt-[1px]" style={{ fontSize: 14 }}>schedule</span>
                <span>
                  Modification en attente de validation : <strong>{pendingDisplayName.current}</strong> → <strong>{pendingDisplayName.next}</strong>
                </span>
              </div>
            ) : (
              <div className="field-help">
                <span className="material-symbols-outlined" style={{ fontSize: 13 }}>info</span>
                Affiché en header de vos 3 profils publics · la modification nécessite une validation admin
              </div>
            )}
          </div>

          {/* Type B2B/B2C (locked) */}
          <div>
            <label className="field-label flex items-center gap-2 flex-wrap">
              Type d&apos;activité
              <FieldBadge kind="locked" label="Défini à l'inscription" />
            </label>
            <div className="flex gap-3">
              <div
                className={`flex-1 py-2.5 px-4 rounded text-center ${
                  company.type === "B2B"
                    ? "bg-primary-light border border-primary"
                    : "bg-surface-muted border border-surface-border opacity-60"
                }`}
              >
                <div className={`font-heading font-bold text-[13px] ${company.type === "B2B" ? "text-primary" : "text-ink-secondary"}`}>
                  B2B
                </div>
                <div className="text-[10px] text-ink-secondary">Business-to-Business</div>
              </div>
              <div
                className={`flex-1 py-2.5 px-4 rounded text-center ${
                  company.type === "B2C"
                    ? "bg-primary-light border border-primary"
                    : "bg-surface-muted border border-surface-border opacity-60"
                }`}
              >
                <div className={`font-heading font-semibold text-[13px] ${company.type === "B2C" ? "text-primary" : "text-ink-secondary"}`}>
                  B2C
                </div>
                <div className="text-[10px] text-ink-tertiary">Business-to-Consumer</div>
              </div>
            </div>
            <div className="field-help">
              <span className="material-symbols-outlined" style={{ fontSize: 13 }}>info</span>
              Défini à l&apos;inscription — non modifiable
            </div>
          </div>

          {/* Sector (locked at registration) */}
          <div>
            <label htmlFor="acc-sector" className="field-label flex items-center gap-2 flex-wrap">
              Secteur d&apos;activité
              <FieldBadge kind="locked" label="Défini à l'inscription — non modifiable" />
            </label>
            <input
              id="acc-sector"
              type="text"
              readOnly
              value={company.sector.name}
              className="field-input bg-surface-muted"
            />
          </div>

          {/* Legal ID + Document (locked) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="field-label flex items-center gap-2 flex-wrap">
                Identifiant légal
                <FieldBadge kind="locked" />
              </label>
              <div className="relative">
                <input
                  type="text"
                  readOnly
                  value={company.legalId}
                  className="field-input pr-24"
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2">
                  <FieldBadge kind="verified" label="Vérifié" />
                </span>
              </div>
              <div className="field-help">
                <span className="material-symbols-outlined" style={{ fontSize: 13 }}>info</span>
                RNE ou équivalent légal officiel · Non modifiable après validation
              </div>
            </div>
            <div>
              <label className="field-label flex items-center gap-2 flex-wrap">
                Document légal
                <FieldBadge kind="validation" />
              </label>
              {/* Current document */}
              {company.identityDocumentUrl && (
                <div className="flex items-center gap-3 px-3 py-2.5 bg-surface-muted border border-surface-border rounded-lg mb-2">
                  <span className="inline-flex items-center justify-center w-9 h-9 rounded bg-white border border-surface-border">
                    <span className="material-symbols-outlined text-primary" style={{ fontSize: 18 }}>
                      description
                    </span>
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-semibold text-ink-primary truncate">Document actuel</div>
                  </div>
                  <a href={company.identityDocumentUrl} target="_blank" rel="noopener noreferrer" className="text-ink-secondary hover:text-primary">
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>open_in_new</span>
                  </a>
                </div>
              )}
              {/* Pending document */}
              {pendingDocUrl && (
                <div className="mt-1.5 px-3 py-2 bg-[#FEF3C7] border border-[#FDE68A] rounded text-[12px] text-[#92400E] flex items-start gap-2 mb-2">
                  <span className="material-symbols-outlined shrink-0 mt-[1px]" style={{ fontSize: 14 }}>schedule</span>
                  <span>
                    Nouveau document en attente de validation ·{" "}
                    <a href={pendingDocUrl} target="_blank" rel="noopener noreferrer" className="text-[#92400E] underline font-semibold">
                      Voir le document proposé
                    </a>
                  </span>
                </div>
              )}
              {/* Upload replacement */}
              {!pendingDocUrl && (
                <div className="mt-1">
                  <label className={`inline-flex items-center gap-1.5 px-3 py-[7px] text-[12px] font-semibold bg-white border border-[#C7DDF1] rounded transition-colors ${uploadingDoc ? "text-ink-tertiary opacity-60 cursor-not-allowed" : "text-primary cursor-pointer hover:bg-primary-light"}`}>
                    <span className="material-symbols-outlined" style={{ fontSize: 14 }}>{uploadingDoc ? "hourglass_top" : "upload_file"}</span>
                    {uploadingDoc ? "Téléversement en cours…" : "Remplacer le document"}
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      className="hidden"
                      disabled={uploadingDoc}
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        if (file.size > 2 * 1024 * 1024) {
                          showToast("Fichier trop volumineux (2 Mo maximum)");
                          return;
                        }
                        setUploadingDoc(true);
                        const fd = new FormData();
                        fd.append("file", file);
                        try {
                          const res = await fetch("/api/v1/me/legal-document", { method: "POST", body: fd });
                          const json = await res.json();
                          if (!res.ok) { showToast(json.error?.message || "Erreur d'upload"); return; }
                          // Submit the URL to pendingUpdates via the account PATCH
                          const patchRes = await fetch("/api/v1/me/account", {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ identityDocumentUrl: json.url }),
                          });
                          if (patchRes.ok) {
                            showToast("Document soumis · en attente de validation admin");
                            router.refresh();
                          } else {
                            showToast("Erreur lors de la soumission");
                          }
                        } catch { showToast("Erreur, veuillez réessayer"); } finally { setUploadingDoc(false); }
                        e.target.value = "";
                      }}
                    />
                  </label>
                  <div className="field-help mt-1">
                    <span className="material-symbols-outlined" style={{ fontSize: 13 }}>info</span>
                    PDF, JPG ou PNG · 2 Mo max · La modification nécessite une validation admin
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ═══ SECTION: IDENTITÉ GÉRANT ═══ */}
      <section className="card p-5 md:p-6">
        <div className="flex items-start justify-between mb-5 flex-wrap gap-2">
          <div>
            <h3 className="font-heading font-bold text-[15px] text-ink-primary">
              Identité gérant
            </h3>
            <p className="text-[12px] text-ink-secondary mt-0.5 leading-snug">
              Vos coordonnées personnelles · soumises à validation admin
            </p>
          </div>
          <FieldBadge kind="validation" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Prénom */}
          <div>
            <label htmlFor="acc-firstname" className="field-label">
              Prénom <span className="text-[#B91C1C] font-bold ml-0.5">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-ink-tertiary pointer-events-none" style={{ fontSize: 16 }}>
                person
              </span>
              <input
                id="acc-firstname"
                type="text"
                className={`field-input pl-9 ${errors.firstName ? "border-[#B91C1C]" : ""}`}
                {...register("firstName", { required: "Le prénom est obligatoire." })}
              />
            </div>
            {errors.firstName ? (
              <p className="text-[12px] text-[#B91C1C] mt-1">{errors.firstName.message}</p>
            ) : pendingGerantFirst ? (
              <div className="mt-1.5 px-3 py-2 bg-[#FEF3C7] border border-[#FDE68A] rounded text-[12px] text-[#92400E] flex items-start gap-2">
                <span className="material-symbols-outlined shrink-0 mt-[1px]" style={{ fontSize: 14 }}>schedule</span>
                <span>
                  Modification en attente de validation : <strong>{pendingGerantFirst.current}</strong> → <strong>{pendingGerantFirst.next}</strong>
                </span>
              </div>
            ) : (
              <div className="field-help">
                <span className="material-symbols-outlined" style={{ fontSize: 13 }}>info</span>
                La modification nécessite une validation admin
              </div>
            )}
          </div>

          {/* Nom */}
          <div>
            <label htmlFor="acc-lastname" className="field-label">
              Nom <span className="text-[#B91C1C] font-bold ml-0.5">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-ink-tertiary pointer-events-none" style={{ fontSize: 16 }}>
                badge
              </span>
              <input
                id="acc-lastname"
                type="text"
                className={`field-input pl-9 ${errors.lastName ? "border-[#B91C1C]" : ""}`}
                {...register("lastName", { required: "Le nom est obligatoire." })}
              />
            </div>
            {errors.lastName ? (
              <p className="text-[12px] text-[#B91C1C] mt-1">{errors.lastName.message}</p>
            ) : pendingGerantLast ? (
              <div className="mt-1.5 px-3 py-2 bg-[#FEF3C7] border border-[#FDE68A] rounded text-[12px] text-[#92400E] flex items-start gap-2">
                <span className="material-symbols-outlined shrink-0 mt-[1px]" style={{ fontSize: 14 }}>schedule</span>
                <span>
                  Modification en attente de validation : <strong>{pendingGerantLast.current}</strong> → <strong>{pendingGerantLast.next}</strong>
                </span>
              </div>
            ) : (
              <div className="field-help">
                <span className="material-symbols-outlined" style={{ fontSize: 13 }}>info</span>
                La modification nécessite une validation admin
              </div>
            )}
          </div>
        </div>

        {/* Info message: gerant name changed → suggest updating legal doc */}
        {(dirtyFields.firstName || dirtyFields.lastName) && (
          <div className="mt-4 px-3 py-2.5 bg-[#EFF6FC] border border-[#C7DDF1] rounded flex items-start gap-2 text-[12px] text-ink-primary leading-snug">
            <span className="material-symbols-outlined text-primary shrink-0 mt-[1px]" style={{ fontSize: 16 }}>info</span>
            <span>
              En cas de changement de gérant, pensez à mettre à jour votre <strong>document légal</strong> depuis
              la section correspondante.
            </span>
          </div>
        )}
      </section>

      {/* ═══ SECTION: CONTACT & LOCALISATION ═══ */}
      <section className="card p-5 md:p-6">
        <div className="flex items-start justify-between mb-5 flex-wrap gap-2">
          <div>
            <h3 className="font-heading font-bold text-[15px] text-ink-primary">
              Contact &amp; localisation
            </h3>
            <p className="text-[12px] text-ink-secondary mt-0.5 leading-snug">
              Coordonnées affichées sur vos profils · toute modification soumise à validation admin
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Account email (locked) */}
          <div className="md:col-span-2">
            <label className="field-label flex items-center gap-2 flex-wrap">
              Email de compte (connexion)
              <FieldBadge kind="locked" />
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-ink-tertiary pointer-events-none" style={{ fontSize: 16 }}>
                mail
              </span>
              <input type="email" readOnly value={company.accountEmail} className="field-input pl-9" />
            </div>
            <div className="field-help">
              <span className="material-symbols-outlined" style={{ fontSize: 13 }}>info</span>
              Identifiant de connexion · non modifiable ·{" "}
              <ObfuscatedEmail className="text-primary hover:underline font-medium" />{" "}
              si besoin
            </div>
          </div>

          {/* Contact email (validation-gated) */}
          <div>
            <label htmlFor="acc-email-contact" className="field-label flex items-center gap-2 flex-wrap">
              Email de contact public <span className="text-[#B91C1C] font-bold ml-0.5">*</span>
              <FieldBadge kind="validation" />
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-ink-tertiary pointer-events-none" style={{ fontSize: 16 }}>
                alternate_email
              </span>
              <input id="acc-email-contact" type="email" className={`field-input pl-9 ${errors.contactEmail ? "border-[#B91C1C]" : ""}`} {...register("contactEmail")} />
            </div>
            {errors.contactEmail ? (
              <p className="text-[12px] text-[#B91C1C] mt-1">{errors.contactEmail.message}</p>
            ) : pendingContactEmail ? (
              <div className="mt-1.5 px-3 py-2 bg-[#FEF3C7] border border-[#FDE68A] rounded text-[12px] text-[#92400E] flex items-start gap-2">
                <span className="material-symbols-outlined shrink-0 mt-[1px]" style={{ fontSize: 14 }}>schedule</span>
                <span>
                  Modification en attente de validation : <strong>{pendingContactEmail.current}</strong> → <strong>{pendingContactEmail.next}</strong>
                </span>
              </div>
            ) : (
              <div className="field-help">
                <span className="material-symbols-outlined" style={{ fontSize: 13 }}>info</span>
                La modification nécessite une validation admin
              </div>
            )}
          </div>

          {/* Phone (validation-gated) */}
          <div>
            <label htmlFor="acc-phone" className="field-label flex items-center gap-2 flex-wrap">
              Téléphone <span className="text-[#B91C1C] font-bold ml-0.5">*</span>
              <FieldBadge kind="validation" />
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-ink-tertiary pointer-events-none" style={{ fontSize: 16 }}>
                call
              </span>
              <input id="acc-phone" type="tel" inputMode="tel" autoComplete="tel" className={`field-input pl-9 ${errors.phone ? "border-[#B91C1C]" : ""}`} {...register("phone")} />
            </div>
            {errors.phone ? (
              <p className="text-[12px] text-[#B91C1C] mt-1">{errors.phone.message}</p>
            ) : pendingPhone ? (
              <div className="mt-1.5 px-3 py-2 bg-[#FEF3C7] border border-[#FDE68A] rounded text-[12px] text-[#92400E] flex items-start gap-2">
                <span className="material-symbols-outlined shrink-0 mt-[1px]" style={{ fontSize: 14 }}>schedule</span>
                <span>
                  Modification en attente de validation : <strong>{pendingPhone.current}</strong> → <strong>{pendingPhone.next}</strong>
                </span>
              </div>
            ) : (
              <div className="field-help">
                <span className="material-symbols-outlined" style={{ fontSize: 13 }}>info</span>
                La modification nécessite une validation admin
              </div>
            )}
          </div>

          {/* WhatsApp (validation-gated) */}
          <div>
            <label htmlFor="acc-whatsapp" className="field-label flex items-center gap-2 flex-wrap">
              WhatsApp <span className="text-[#B91C1C] font-bold ml-0.5">*</span>
              <FieldBadge kind="validation" />
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined icon-fill text-status-active-fg pointer-events-none" style={{ fontSize: 16 }}>
                chat
              </span>
              <input id="acc-whatsapp" type="tel" inputMode="tel" autoComplete="tel" className={`field-input pl-9 ${errors.whatsapp ? "border-[#B91C1C]" : ""}`} {...register("whatsapp")} />
            </div>
            {errors.whatsapp ? (
              <p className="text-[12px] text-[#B91C1C] mt-1">{errors.whatsapp.message}</p>
            ) : pendingWhatsapp ? (
              <div className="mt-1.5 px-3 py-2 bg-[#FEF3C7] border border-[#FDE68A] rounded text-[12px] text-[#92400E] flex items-start gap-2">
                <span className="material-symbols-outlined shrink-0 mt-[1px]" style={{ fontSize: 14 }}>schedule</span>
                <span>
                  Modification en attente de validation : <strong>{pendingWhatsapp.current}</strong> → <strong>{pendingWhatsapp.next}</strong>
                </span>
              </div>
            ) : (
              <div className="field-help">
                <span className="material-symbols-outlined" style={{ fontSize: 13 }}>info</span>
                La modification nécessite une validation admin
              </div>
            )}
          </div>

          {/* Country (locked) */}
          <div>
            <label className="field-label flex items-center gap-2 flex-wrap">
              Pays
              <FieldBadge kind="locked" label="V1 Tunisie uniquement" />
            </label>
            <input type="text" readOnly value="🇹🇳 Tunisie" className="field-input" />
          </div>

          {/* Gouvernorat (hard change) */}
          <div>
            <label htmlFor="acc-gov" className="field-label flex items-center gap-2 flex-wrap">
              Gouvernorat <span className="text-[#B91C1C] font-bold ml-0.5">*</span>
              <FieldBadge kind="validation" />
            </label>
            <select
              id="acc-gov"
              className={`field-input ${errors.gouvernorat ? "border-[#B91C1C]" : ""}`}
              {...register("gouvernorat")}
            >
              {gouvernorats.map((g) => (
                <option key={g.slug} value={g.slug}>{g.name}</option>
              ))}
            </select>
            {errors.gouvernorat ? (
              <p className="text-[12px] text-[#B91C1C] mt-1">{errors.gouvernorat.message}</p>
            ) : pendingGouvernorat ? (
              <div className="mt-1.5 px-3 py-2 bg-[#FEF3C7] border border-[#FDE68A] rounded text-[12px] text-[#92400E] flex items-start gap-2">
                <span className="material-symbols-outlined shrink-0 mt-[1px]" style={{ fontSize: 14 }}>schedule</span>
                <span>
                  Modification en attente de validation : <strong>{pendingGouvernorat.current}</strong> → <strong>{pendingGouvernorat.next}</strong>
                </span>
              </div>
            ) : (
              <div className="field-help">
                <span className="material-symbols-outlined" style={{ fontSize: 13 }}>info</span>
                La modification nécessite une validation admin
              </div>
            )}
          </div>

          {/* Ville (hard change) */}
          <div>
            <label htmlFor="acc-city" className="field-label flex items-center gap-2 flex-wrap">
              Ville <span className="text-[#B91C1C] font-bold ml-0.5">*</span>
              <FieldBadge kind="validation" />
            </label>
            <input id="acc-city" type="text" className={`field-input ${errors.ville ? "border-[#B91C1C]" : ""}`} {...register("ville")} />
            {errors.ville ? (
              <p className="text-[12px] text-[#B91C1C] mt-1">{errors.ville.message}</p>
            ) : pendingVille ? (
              <div className="mt-1.5 px-3 py-2 bg-[#FEF3C7] border border-[#FDE68A] rounded text-[12px] text-[#92400E] flex items-start gap-2">
                <span className="material-symbols-outlined shrink-0 mt-[1px]" style={{ fontSize: 14 }}>schedule</span>
                <span>
                  Modification en attente de validation : <strong>{pendingVille.current}</strong> → <strong>{pendingVille.next}</strong>
                </span>
              </div>
            ) : (
              <div className="field-help">
                <span className="material-symbols-outlined" style={{ fontSize: 13 }}>info</span>
                La modification nécessite une validation admin
              </div>
            )}
          </div>

          {/* Code postal (hard change) */}
          <div>
            <label htmlFor="acc-postalcode" className="field-label flex items-center gap-2 flex-wrap">
              Code postal <span className="text-[#B91C1C] font-bold ml-0.5">*</span>
              <FieldBadge kind="validation" />
            </label>
            <input id="acc-postalcode" type="text" inputMode="numeric" autoComplete="postal-code" className={`field-input ${errors.postalCode ? "border-[#B91C1C]" : ""}`} {...register("postalCode")} placeholder="4000" />
            {errors.postalCode ? (
              <p className="text-[12px] text-[#B91C1C] mt-1">{errors.postalCode.message}</p>
            ) : pendingPostalCode ? (
              <div className="mt-1.5 px-3 py-2 bg-[#FEF3C7] border border-[#FDE68A] rounded text-[12px] text-[#92400E] flex items-start gap-2">
                <span className="material-symbols-outlined shrink-0 mt-[1px]" style={{ fontSize: 14 }}>schedule</span>
                <span>
                  Modification en attente de validation : <strong>{pendingPostalCode.current}</strong> → <strong>{pendingPostalCode.next}</strong>
                </span>
              </div>
            ) : (
              <div className="field-help">
                <span className="material-symbols-outlined" style={{ fontSize: 13 }}>info</span>
                La modification nécessite une validation admin
              </div>
            )}
          </div>

          {/* Address (hard change) */}
          <div className="md:col-span-2">
            <label htmlFor="acc-address" className="field-label flex items-center gap-2 flex-wrap">
              Adresse <span className="text-[#B91C1C] font-bold ml-0.5">*</span>
              <FieldBadge kind="validation" />
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-ink-tertiary pointer-events-none" style={{ fontSize: 16 }}>
                location_on
              </span>
              <input id="acc-address" type="text" className={`field-input pl-9 ${errors.address ? "border-[#B91C1C]" : ""}`} {...register("address", { required: "L'adresse est obligatoire." })} />
            </div>
            {errors.address ? (
              <p className="text-[12px] text-[#B91C1C] mt-1">{errors.address.message}</p>
            ) : pendingAddress ? (
              <div className="mt-1.5 px-3 py-2 bg-[#FEF3C7] border border-[#FDE68A] rounded text-[12px] text-[#92400E] flex items-start gap-2">
                <span className="material-symbols-outlined shrink-0 mt-[1px]" style={{ fontSize: 14 }}>schedule</span>
                <span>
                  Modification en attente de validation : <strong>{pendingAddress.current || "(vide)"}</strong> → <strong>{pendingAddress.next || "(vide)"}</strong>
                </span>
              </div>
            ) : (
              <div className="field-help">
                <span className="material-symbols-outlined" style={{ fontSize: 13 }}>info</span>
                La modification nécessite une validation admin
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ═══ SECTION: LANGUES — masquée V1 (données conservées) ═══ */}

      {/* ═══ SECTION: PARTAGE PROFILS ═══ */}
      <section className="card p-5 md:p-6">
        <div className="mb-5">
          <h3 className="font-heading font-bold text-[15px] text-ink-primary">
            Partage de mes profils
          </h3>
          <p className="text-[12px] text-ink-secondary mt-0.5 leading-snug">
            Les URLs publiques de vos 3 profils · copiez-les pour les partager sur vos supports
          </p>
        </div>

        <div className="space-y-4">
          {/* BrandUP URL */}
          <div>
            <label className="field-label flex items-center gap-2">
              <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-primary-light shrink-0">
                <span className="material-symbols-outlined text-primary" style={{ fontSize: 13 }}>storefront</span>
              </span>
              Profil BrandUP
            </label>
            <CopyGroup value={`${baseUrl}/brandup/${company.slug}`} />
          </div>

          {/* TraceUP URL */}
          <div>
            <label className="field-label flex items-center gap-2">
              <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-primary-light shrink-0">
                <span className="material-symbols-outlined text-primary" style={{ fontSize: 13 }}>play_circle</span>
              </span>
              Profil TraceUP
            </label>
            <CopyGroup value={`${baseUrl}/traceup/${company.slug}`} />
          </div>

          {/* LinkUP URL + QR placeholder */}
          <div className="pt-4 border-t border-[#F0F0F0]">
            <label className="field-label flex items-center gap-2 mb-3">
              <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-primary-light shrink-0">
                <span className="material-symbols-outlined text-primary" style={{ fontSize: 13 }}>qr_code_2</span>
              </span>
              Profil LinkUP
            </label>
            <div className="flex flex-col sm:flex-row items-start gap-4">
              <div className="w-[120px] h-[120px] p-2 bg-white border border-surface-border rounded-lg shrink-0 flex items-center justify-center">
                {baseUrl ? (
                  <canvas ref={qrCanvasRef} />
                ) : (
                  <span className="material-symbols-outlined text-ink-tertiary" style={{ fontSize: 48 }}>qr_code_2</span>
                )}
              </div>
              <div className="min-w-0 flex-1 w-full">
                <div className="mb-3">
                  <CopyGroup value={`${baseUrl}/linkup/${company.slug}`} />
                </div>
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
                  <Link
                    href="/dashboard/linkup"
                    className="inline-flex items-center gap-1.5 px-4 py-[9px] text-[13px] font-semibold text-primary hover:bg-primary-light rounded transition-colors"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>tune</span>
                    Plus d&apos;options sur LinkUP
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ ACTION BAR ═══ */}
      <AccountActionBar isDirty={isDirty} dirtyCount={dirtyCount} saving={saving} onReset={() => reset()} onSave={handleSubmit(onSubmit)} />

      {/* ═══ DANGER ZONE ═══ */}
      <section className="border border-[#FCA5A5] bg-[#FEF2F2] rounded-lg p-5 md:p-6 mt-8">
        <div className="flex items-start gap-3 mb-4">
          <span className="material-symbols-outlined icon-fill text-[#DC2626] shrink-0 mt-[2px]" style={{ fontSize: 20 }}>
            warning
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="font-heading font-bold text-[14px] text-[#991B1B] leading-tight">
              Zone de danger
            </h3>
            <p className="text-[12px] text-[#991B1B] mt-0.5 leading-snug">
              Actions irréversibles · réfléchissez avant d&apos;agir
            </p>
          </div>
        </div>

        <div className="bg-white border border-[#FCA5A5] rounded-lg p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="min-w-0">
            <div className="font-heading font-semibold text-[13.5px] text-ink-primary mb-0.5">
              Supprimer mon compte et mes profils
            </div>
            <div className="text-[12px] text-ink-secondary leading-snug">
              Votre compte, vos 3 profils publics et toutes vos données seront définitivement effacés.
              La suppression se gère depuis les{" "}
              <Link href="/dashboard/settings#delete" className="text-[#B91C1C] hover:underline font-semibold">
                Paramètres
              </Link>.
            </div>
          </div>
          <Link
            href="/dashboard/settings#delete"
            className="inline-flex items-center gap-1.5 px-4 py-[9px] text-[13px] font-semibold text-[#B91C1C] bg-white border border-[#FCA5A5] rounded hover:bg-[#FEF2F2] hover:border-[#DC2626] transition-colors shrink-0"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>arrow_forward</span>
            Accéder à la suppression
          </Link>
        </div>
      </section>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatShortDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
