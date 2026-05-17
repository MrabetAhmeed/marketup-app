"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { StatusPill } from "@/components/shared/StatusPill";
import { FieldBadge } from "@/components/shared/FieldBadge";
import { CopyGroup } from "@/components/shared/CopyGroup";
import { LangChip } from "@/components/shared/LangChip";
import { useToast } from "@/components/shared/Toast";
import type { MeResponse } from "@/types/dashboard";
import { LogoUploadZone } from "./LogoUploadZone";
import { BannerUploadZone } from "./BannerUploadZone";
import { AccountActionBar } from "./AccountActionBar";

interface AccountFormValues {
  displayName: string;
  contactEmail: string;
  phone: string;
  whatsapp: string;
  ville: string;
  address: string;
}

/** The 5 LIVE fields that the PATCH endpoint accepts */
const LIVE_KEYS = ["contactEmail", "phone", "whatsapp", "ville", "address"] as const;

interface AccountFormProps {
  me: MeResponse;
}

export function AccountForm({ me }: AccountFormProps): JSX.Element {
  const { company } = me;
  const baseUrl = "https://vivasky.media";
  const router = useRouter();
  const { showToast } = useToast();
  const [saving, setSaving] = useState(false);

  const { register, handleSubmit, formState: { isDirty, dirtyFields, errors }, reset, setError } = useForm<AccountFormValues>({
    defaultValues: {
      displayName: company.displayName,
      contactEmail: company.contactEmail,
      phone: company.phone ?? "",
      whatsapp: company.whatsapp ?? "",
      ville: company.ville,
      address: company.address ?? "",
    },
  });

  const dirtyCount = Object.keys(dirtyFields).length;

  async function onSubmit(values: AccountFormValues): Promise<void> {
    // Build patch with only dirty LIVE fields
    const patch: Record<string, string> = {};
    for (const key of LIVE_KEYS) {
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
            if (LIVE_KEYS.includes(field as typeof LIVE_KEYS[number])) {
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
        displayName: meData.company.displayName,
        contactEmail: meData.company.contactEmail,
        phone: meData.company.phone ?? "",
        whatsapp: meData.company.whatsapp ?? "",
        ville: meData.company.ville,
        address: meData.company.address ?? "",
      });
      showToast("Modifications enregistrées");
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
          Les informations ci-dessous alimentent vos <strong>3 profils publics</strong>.
          La modification du <strong>logo</strong> ou du <strong>nom d&apos;entreprise</strong>{" "}
          nécessite une validation admin (24-48 h). Les autres champs (contact,
          localisation, langues) sont mis à jour <strong>instantanément</strong>.
        </div>
      </section>

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
            <LogoUploadZone initials={company.avatarInitials} logoUrl={company.logoUrl} />
          </div>

          {/* Banner */}
          <div>
            <label className="field-label flex items-center gap-2 flex-wrap">
              Bannière <span className="text-ink-tertiary font-normal normal-case tracking-normal ml-1">(optionnel)</span>
              <FieldBadge kind="validation" />
            </label>
            <BannerUploadZone bannerUrl={company.bannerUrl} />
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
              className="field-input"
              {...register("displayName")}
            />
            <div className="field-help">
              <span className="material-symbols-outlined" style={{ fontSize: 13 }}>info</span>
              Affiché en header de vos 3 profils publics · 3 à 80 caractères
            </div>
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
              Pour changer de type, contactez le support à
              <a href="mailto:support@vivasky.media" className="text-primary hover:underline font-medium ml-1">
                support@vivasky.media
              </a>
            </div>
          </div>

          {/* Sector (live) */}
          <div>
            <label htmlFor="acc-sector" className="field-label flex items-center gap-2 flex-wrap">
              Secteur d&apos;activité <span className="text-[#B91C1C] font-bold ml-0.5">*</span>
              <FieldBadge kind="live" />
            </label>
            <input
              id="acc-sector"
              type="text"
              readOnly
              value={company.sector.name}
              className="field-input"
            />
            <div className="field-help">
              <span className="material-symbols-outlined" style={{ fontSize: 13 }}>info</span>
              Impacte votre classement dans les moteurs de recherche
            </div>
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
                <FieldBadge kind="locked" />
              </label>
              <div className="flex items-center gap-3 px-3 py-2.5 bg-surface-muted border border-surface-border rounded-lg">
                <span className="inline-flex items-center justify-center w-9 h-9 rounded bg-white border border-surface-border">
                  <span className="material-symbols-outlined text-primary" style={{ fontSize: 18 }}>
                    description
                  </span>
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-semibold text-ink-primary truncate">
                    document-legal.pdf
                  </div>
                  <div className="text-[11px] text-ink-secondary">
                    Téléversé à l&apos;inscription
                  </div>
                </div>
                <span className="material-symbols-outlined text-ink-secondary" style={{ fontSize: 18 }}>
                  open_in_new
                </span>
              </div>
              <div className="field-help">
                <span className="material-symbols-outlined" style={{ fontSize: 13 }}>info</span>
                Document fourni à l&apos;inscription
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ SECTION: CONTACT & LOCALISATION ═══ */}
      <section className="card p-5 md:p-6">
        <div className="flex items-start justify-between mb-5 flex-wrap gap-2">
          <div>
            <h3 className="font-heading font-bold text-[15px] text-ink-primary">
              Contact &amp; localisation
            </h3>
            <p className="text-[12px] text-ink-secondary mt-0.5 leading-snug">
              Coordonnées affichées sur vos profils · mises à jour instantanément
            </p>
          </div>
          <FieldBadge kind="live" label="Tous en direct" />
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
              Identifiant de connexion · non modifiable ·
              <a href="mailto:support@vivasky.media" className="text-primary hover:underline font-medium mx-1">
                support@vivasky.media
              </a>
              si besoin
            </div>
          </div>

          {/* Contact email (live) */}
          <div>
            <label htmlFor="acc-email-contact" className="field-label">
              Email de contact public <span className="text-[#B91C1C] font-bold ml-0.5">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-ink-tertiary pointer-events-none" style={{ fontSize: 16 }}>
                alternate_email
              </span>
              <input id="acc-email-contact" type="email" className={`field-input pl-9 ${errors.contactEmail ? "border-[#B91C1C]" : ""}`} {...register("contactEmail")} />
            </div>
            {errors.contactEmail ? (
              <p className="text-[12px] text-[#B91C1C] mt-1">{errors.contactEmail.message}</p>
            ) : (
              <div className="field-help">
                <span className="material-symbols-outlined" style={{ fontSize: 13 }}>info</span>
                Affiché sur vos profils publics — peut différer de l&apos;email de compte
              </div>
            )}
          </div>

          {/* Phone (live) */}
          <div>
            <label htmlFor="acc-phone" className="field-label">
              Téléphone <span className="text-[#B91C1C] font-bold ml-0.5">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-ink-tertiary pointer-events-none" style={{ fontSize: 16 }}>
                call
              </span>
              <input id="acc-phone" type="text" inputMode="tel" className={`field-input pl-9 ${errors.phone ? "border-[#B91C1C]" : ""}`} {...register("phone")} />
            </div>
            {errors.phone ? (
              <p className="text-[12px] text-[#B91C1C] mt-1">{errors.phone.message}</p>
            ) : (
              <div className="field-help">
                <span className="material-symbols-outlined" style={{ fontSize: 13 }}>info</span>
                Ligne fixe ou standard · Affiché sur vos 3 profils publics
              </div>
            )}
          </div>

          {/* WhatsApp (live) */}
          <div>
            <label htmlFor="acc-whatsapp" className="field-label">
              WhatsApp <span className="text-[#B91C1C] font-bold ml-0.5">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined icon-fill text-status-active-fg pointer-events-none" style={{ fontSize: 16 }}>
                chat
              </span>
              <input id="acc-whatsapp" type="text" inputMode="tel" className={`field-input pl-9 ${errors.whatsapp ? "border-[#B91C1C]" : ""}`} {...register("whatsapp")} />
            </div>
            {errors.whatsapp ? (
              <p className="text-[12px] text-[#B91C1C] mt-1">{errors.whatsapp.message}</p>
            ) : (
              <div className="field-help">
                <span className="material-symbols-outlined" style={{ fontSize: 13 }}>info</span>
                Numéro WhatsApp business · peut être identique au téléphone
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

          {/* Gouvernorat (live) */}
          <div>
            <label htmlFor="acc-gov" className="field-label">
              Gouvernorat <span className="text-[#B91C1C] font-bold ml-0.5">*</span>
            </label>
            <input
              id="acc-gov"
              type="text"
              readOnly
              value={company.gouvernorat.name}
              className="field-input"
            />
          </div>

          {/* Ville (live) */}
          <div>
            <label htmlFor="acc-city" className="field-label">
              Ville <span className="text-[#B91C1C] font-bold ml-0.5">*</span>
            </label>
            <input id="acc-city" type="text" className={`field-input ${errors.ville ? "border-[#B91C1C]" : ""}`} {...register("ville")} />
            {errors.ville && (
              <p className="text-[12px] text-[#B91C1C] mt-1">{errors.ville.message}</p>
            )}
          </div>

          {/* Address (live, optional) */}
          <div className="md:col-span-2">
            <label htmlFor="acc-address" className="field-label">
              Adresse <span className="text-ink-tertiary font-normal normal-case tracking-normal ml-1">(optionnel)</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-ink-tertiary pointer-events-none" style={{ fontSize: 16 }}>
                location_on
              </span>
              <input id="acc-address" type="text" className={`field-input pl-9 ${errors.address ? "border-[#B91C1C]" : ""}`} {...register("address")} />
            </div>
            {errors.address && (
              <p className="text-[12px] text-[#B91C1C] mt-1">{errors.address.message}</p>
            )}
          </div>
        </div>
      </section>

      {/* ═══ SECTION: LANGUES ═══ */}
      <section className="card p-5 md:p-6">
        <div className="flex items-start justify-between mb-5 flex-wrap gap-2">
          <div>
            <h3 className="font-heading font-bold text-[15px] text-ink-primary">Langues</h3>
            <p className="text-[12px] text-ink-secondary mt-0.5 leading-snug">
              Langues parlées par votre équipe — aide les visiteurs à vous contacter
            </p>
          </div>
          <FieldBadge kind="live" />
        </div>

        <div>
          <label className="field-label">
            Langues parlées par votre équipe <span className="text-[#B91C1C] font-bold ml-0.5">*</span>
          </label>
          <div className="flex flex-wrap gap-2">
            <LangChip value="fr" label="Français" checked={true} />
            <LangChip value="ar" label="العربية" checked={false} disabled comingSoon />
            <LangChip value="en" label="English" checked={false} disabled comingSoon />
          </div>
          <div className="field-help mt-1">
            <span className="material-symbols-outlined" style={{ fontSize: 13 }}>info</span>
            V1 : français uniquement · Arabe et anglais disponibles dans une prochaine version
          </div>
        </div>
      </section>

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
              {/* QR placeholder — TODO Phase 4: real QR generation */}
              <div className="w-[120px] h-[120px] p-2.5 bg-white border border-surface-border rounded-lg shrink-0 flex items-center justify-center">
                <span className="material-symbols-outlined text-ink-tertiary" style={{ fontSize: 48 }}>
                  qr_code_2
                </span>
              </div>
              <div className="min-w-0 flex-1 w-full">
                <div className="mb-3">
                  <CopyGroup value={`${baseUrl}/linkup/${company.slug}`} />
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    disabled
                    className="inline-flex items-center gap-1.5 px-4 py-[9px] text-[13px] font-semibold text-ink-primary bg-white border border-[#D1D1D1] rounded opacity-60 cursor-not-allowed"
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
