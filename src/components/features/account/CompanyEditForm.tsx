"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { useToast } from "@/components/shared/Toast";

interface CompanyEditData {
  id: string;
  status: string;
  displayName: string;
  type: string;
  legalId: string;
  vatNumber: string | null;
  accountEmail: string;
  contactEmail: string;
  phone: string | null;
  whatsapp: string | null;
  sectorId: string;
  gouvernorat: string;
  ville: string;
  address: string | null;
  identityDocumentUrl: string | null;
  rejectedReason: string | null;
  rejectedAt: string | null;
}

interface FormValues {
  displayName: string;
  contactEmail: string;
  phone: string;
  whatsapp: string;
  ville: string;
  address: string;
}

export function CompanyEditForm({ company }: { company: CompanyEditData }): JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();
  const showRejectionBanner = searchParams.get("reason") === "rejected";
  const { showToast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [docUrl, setDocUrl] = useState(company.identityDocumentUrl);
  const [docUploading, setDocUploading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    defaultValues: {
      displayName: company.displayName,
      contactEmail: company.contactEmail,
      phone: company.phone ?? "",
      whatsapp: company.whatsapp ?? "",
      ville: company.ville,
      address: company.address ?? "",
    },
  });

  async function handleDocUpload(file: File): Promise<void> {
    setDocUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/v1/public/signup-document", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) {
        showToast(json.error?.message || "Erreur upload document");
        return;
      }
      setDocUrl(json.url as string);
      showToast("Document mis à jour");
    } catch {
      showToast("Erreur, veuillez réessayer");
    } finally {
      setDocUploading(false);
    }
  }

  async function onSubmit(values: FormValues): Promise<void> {
    setSubmitting(true);
    try {
      const res = await fetch("/api/v1/me/account/resubmit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: values.displayName,
          contactEmail: values.contactEmail || undefined,
          phone: values.phone || undefined,
          whatsapp: values.whatsapp || undefined,
          sectorId: company.sectorId,
          gouvernorat: company.gouvernorat,
          ville: values.ville,
          address: values.address || null,
          identityDocumentUrl: docUrl,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        showToast(json.error?.message || "Erreur lors de la soumission");
        return;
      }
      showToast("Compte re-soumis pour validation");
      router.push("/dashboard");
      router.refresh();
    } catch {
      showToast("Erreur, veuillez réessayer");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-[800px] mx-auto space-y-6">
      {/* Header */}
      <div>
        <h2 className="font-heading font-bold text-[20px] text-ink-primary">
          {company.status === "rejected" ? "Corriger et resoumettre" : "Modifier les informations"}
        </h2>
        <p className="text-[13px] text-ink-secondary mt-1">
          {company.status === "rejected"
            ? "Corrigez les informations ci-dessous puis cliquez Re-soumettre."
            : "Modifiez les informations de votre entreprise."}
        </p>
      </div>

      {/* Rejection banner */}
      {showRejectionBanner && company.rejectedReason && (
        <div className="bg-[#FEF2F2] border border-[#FCA5A5] rounded-lg px-4 py-3">
          <div className="flex items-start gap-2">
            <span className="material-symbols-outlined icon-fill text-[#DC2626] shrink-0 mt-[1px]" style={{ fontSize: 18 }}>error</span>
            <div className="text-[13px] text-[#991B1B] leading-snug">
              <strong>Motif du refus :</strong> {company.rejectedReason}
              {company.rejectedAt && (
                <span className="block mt-1 text-[12px] text-[#B91C1C]">
                  Refusé le {new Date(company.rejectedAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Editable fields */}
        <section className="bg-white border border-surface-border rounded-lg p-5 space-y-4">
          <h3 className="font-heading font-bold text-[15px] text-ink-primary">Informations modifiables</h3>

          <div>
            <label htmlFor="ed-name" className="field-label">Nom de l&apos;entreprise <span className="text-[#B91C1C]">*</span></label>
            <input id="ed-name" type="text" className={`field-input ${errors.displayName ? "border-[#B91C1C]" : ""}`} {...register("displayName", { required: "Obligatoire" })} />
            {errors.displayName && <p className="text-[12px] text-[#B91C1C] mt-1">{errors.displayName.message}</p>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="ed-email" className="field-label">Email de contact</label>
              <input id="ed-email" type="email" className="field-input" {...register("contactEmail")} />
            </div>
            <div>
              <label htmlFor="ed-phone" className="field-label">Téléphone</label>
              <input id="ed-phone" type="text" inputMode="tel" className="field-input" {...register("phone")} />
            </div>
            <div>
              <label htmlFor="ed-whatsapp" className="field-label">WhatsApp</label>
              <input id="ed-whatsapp" type="text" inputMode="tel" className="field-input" {...register("whatsapp")} />
            </div>
            <div>
              <label htmlFor="ed-ville" className="field-label">Ville <span className="text-[#B91C1C]">*</span></label>
              <input id="ed-ville" type="text" className={`field-input ${errors.ville ? "border-[#B91C1C]" : ""}`} {...register("ville", { required: "Obligatoire" })} />
            </div>
          </div>

          <div>
            <label htmlFor="ed-address" className="field-label">Adresse</label>
            <input id="ed-address" type="text" className="field-input" {...register("address")} />
          </div>
        </section>

        {/* Read-only fields */}
        <section className="bg-white border border-surface-border rounded-lg p-5 space-y-4">
          <h3 className="font-heading font-bold text-[15px] text-ink-primary">Informations non modifiables</h3>
          <p className="text-[12px] text-ink-secondary">Ces champs sont définis à l&apos;inscription et ne peuvent pas être modifiés. Contactez support@vivasky.media si nécessaire.</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="field-label">Type d&apos;activité</label>
              <input type="text" readOnly value={company.type} className="field-input bg-surface-muted" />
            </div>
            <div>
              <label className="field-label">Identifiant légal (RNE)</label>
              <input type="text" readOnly value={company.legalId} className="field-input bg-surface-muted" />
            </div>
            <div>
              <label className="field-label">Matricule fiscal</label>
              <input type="text" readOnly value={company.vatNumber ?? "Non renseigné"} className="field-input bg-surface-muted" />
            </div>
            <div>
              <label className="field-label">Email de compte (connexion)</label>
              <input type="text" readOnly value={company.accountEmail} className="field-input bg-surface-muted" />
            </div>
          </div>
        </section>

        {/* Document upload */}
        <section className="bg-white border border-surface-border rounded-lg p-5 space-y-3">
          <h3 className="font-heading font-bold text-[15px] text-ink-primary">Document légal</h3>
          <div className={`flex items-center gap-3.5 px-4 py-3.5 border border-dashed rounded-lg ${docUrl ? "bg-[#F0FDF4] border-[#86EFAC]" : "bg-surface-muted border-[#D1D1D1]"}`}>
            <span className="material-symbols-outlined text-primary" style={{ fontSize: 22 }}>{docUrl ? "check_circle" : "description"}</span>
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-semibold text-ink-primary">{docUrl ? "Document uploadé" : "Aucun document"}</div>
            </div>
            <label className={`inline-flex items-center gap-1.5 px-3 py-1.5 border border-[#D1D1D1] rounded bg-white text-[12px] font-semibold ${docUploading ? "cursor-wait opacity-60" : "cursor-pointer hover:bg-surface-muted"}`}>
              {docUploading ? "Upload…" : docUrl ? "Remplacer" : "Choisir un fichier"}
              <input type="file" accept="application/pdf,image/jpeg,image/png,image/webp" className="sr-only" disabled={docUploading} onChange={(e) => { const f = e.target.files?.[0]; if (f) handleDocUpload(f); }} />
            </label>
          </div>
        </section>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          {company.status === "rejected" && (
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-1.5 px-5 py-[10px] text-[13px] font-semibold text-white bg-primary hover:bg-primary-hover rounded transition-colors disabled:opacity-60"
            >
              {submitting ? (
                <span className="material-symbols-outlined animate-spin" style={{ fontSize: 16 }}>progress_activity</span>
              ) : (
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>send</span>
              )}
              {submitting ? "Re-soumission…" : "Re-soumettre à validation"}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
