"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import type { SponsoringCardData } from "@/services/sponsoring.service";

interface SponsoringCardsProps {
  data: SponsoringCardData[];
}

const KIND_LABEL: Record<string, string> = {
  brandup: "BrandUP",
  traceup: "TraceUP",
  linkup: "LinkUP",
};

const KIND_ACCENT: Record<string, string> = {
  brandup: "#0078D4",
  traceup: "#8764B8",
  linkup: "#C5A059",
};

function daysRemaining(to: string): number {
  const diff = new Date(to).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / 86_400_000));
}

function ctr(impressions: number, clicks: number): string {
  if (impressions === 0) return "0,0";
  return ((clicks / impressions) * 100).toFixed(1).replace(".", ",");
}

// ---------------------------------------------------------------------------
// CheckoutSponsoringModal — payment confirmation with recap
// ---------------------------------------------------------------------------

function CheckoutSponsoringModal({
  open,
  onClose,
  profileKind,
  onConfirm,
  loading,
  error,
}: {
  open: boolean;
  onClose: () => void;
  profileKind: string;
  onConfirm: () => void;
  loading: boolean;
  error: string | null;
}): JSX.Element {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[440px] p-0 gap-0 overflow-hidden" showCloseButton={false}>
        <div className="flex items-start gap-3 px-5 py-4 border-b border-surface-border">
          <div className="w-10 h-10 rounded-lg bg-primary-light flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-primary" style={{ fontSize: 22 }}>campaign</span>
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-heading font-bold text-[15px] text-ink-primary leading-tight">
              Lancer la campagne {KIND_LABEL[profileKind] || profileKind} ?
            </h3>
            <p className="text-[12px] text-ink-secondary mt-0.5 leading-snug">
              Récapitulatif de votre commande
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-ink-secondary hover:bg-surface-muted transition-colors shrink-0 -mr-1 -mt-0.5 disabled:opacity-60"
            aria-label="Fermer"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>close</span>
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Recap table */}
          <div className="bg-surface-subtle rounded-lg border border-surface-border divide-y divide-surface-border">
            <div className="flex justify-between px-4 py-2.5">
              <span className="text-[13px] text-ink-secondary">Montant HT</span>
              <span className="text-[13px] font-semibold text-ink-primary">100 DT</span>
            </div>
            <div className="flex justify-between px-4 py-2.5">
              <span className="text-[13px] text-ink-secondary">TVA (19 %)</span>
              <span className="text-[13px] font-semibold text-ink-primary">19 DT</span>
            </div>
            <div className="flex justify-between px-4 py-2.5 bg-white rounded-b-lg">
              <span className="text-[13px] font-bold text-ink-primary">Total TTC</span>
              <span className="text-[15px] font-bold text-ink-primary">119 DT</span>
            </div>
          </div>

          {/* Details */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-[12.5px] text-ink-secondary">
              <span className="material-symbols-outlined" style={{ fontSize: 15 }}>schedule</span>
              Durée : <strong className="text-ink-primary">7 jours</strong>
            </div>
            <div className="flex items-center gap-2 text-[12.5px] text-ink-secondary">
              <span className="material-symbols-outlined" style={{ fontSize: 15 }}>search</span>
              Moteur : <strong className="text-ink-primary">{KIND_LABEL[profileKind] || profileKind}</strong>
            </div>
          </div>

          {/* Warning */}
          <div className="bg-[#FFF7ED] border border-[#FDBA74] rounded p-3">
            <div className="flex items-start gap-2">
              <span className="material-symbols-outlined text-[#C2410C] shrink-0 mt-0.5" style={{ fontSize: 16 }}>warning</span>
              <p className="text-[12px] text-[#9A3412] leading-snug font-medium">
                Campagne non annulable après paiement. La bannière sera diffusée pendant 7 jours à compter du paiement.
              </p>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-[#FEF2F2] border border-[#FCA5A5] rounded p-3">
              <p className="text-[12px] text-[#991B1B]">{error}</p>
            </div>
          )}
        </div>

        <div className="px-5 py-4 bg-surface-subtle border-t border-surface-border flex items-center justify-end gap-2 rounded-b-xl">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-4 py-[9px] text-[13px] font-semibold text-ink-primary bg-white border border-[#D1D1D1] rounded hover:bg-surface-muted transition-colors disabled:opacity-60"
          >
            Annuler
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={onConfirm}
            className="inline-flex items-center gap-1.5 px-4 py-[9px] text-[13px] font-semibold text-white bg-primary hover:bg-primary-hover rounded transition-colors disabled:opacity-60"
          >
            {loading ? (
              <>
                <span className="material-symbols-outlined animate-spin" style={{ fontSize: 16 }}>progress_activity</span>
                Paiement...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>payments</span>
                Payer 119 DT TTC
              </>
            )}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// BannerInput — M4: upload (default) or paste URL, with preview
// ---------------------------------------------------------------------------

type BannerMode = "upload" | "url";

function BannerInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (url: string) => void;
}): JSX.Element {
  const [mode, setMode] = useState<BannerMode>("upload");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [urlInput, setUrlInput] = useState("");
  const [urlValid, setUrlValid] = useState<boolean | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Client-side validation
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) {
      setUploadError("Format non accepté (JPG, PNG, WebP uniquement).");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setUploadError("Fichier trop volumineux (5 Mo maximum).");
      return;
    }

    setUploadError(null);
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/v1/uploads/image", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) {
        setUploadError(json.error?.message || "Erreur lors de l'upload.");
        return;
      }
      onChange(json.url as string);
    } catch {
      setUploadError("Erreur réseau, veuillez réessayer.");
    } finally {
      setUploading(false);
    }
  }, [onChange]);

  const handleUrlBlur = useCallback(() => {
    if (!urlInput.trim()) {
      setUrlValid(null);
      onChange("");
      return;
    }
    if (!urlInput.startsWith("https://")) {
      setUrlValid(false);
      onChange("");
      return;
    }
    // Test if image loads
    const img = new Image();
    img.onload = () => { setUrlValid(true); onChange(urlInput); };
    img.onerror = () => { setUrlValid(false); onChange(""); };
    img.src = urlInput;
  }, [urlInput, onChange]);

  const switchMode = useCallback((m: BannerMode) => {
    setMode(m);
    setUploadError(null);
    setUrlInput("");
    setUrlValid(null);
    onChange("");
    if (fileRef.current) fileRef.current.value = "";
  }, [onChange]);

  return (
    <div className="space-y-2">
      <label className="text-[11px] font-medium text-ink-secondary block">Bannière</label>

      {/* Mode tabs */}
      <div className="flex rounded-lg border border-[#D1D1D1] overflow-hidden">
        <button
          type="button"
          onClick={() => switchMode("upload")}
          className={`flex-1 text-[11px] font-semibold py-1.5 transition-colors ${mode === "upload" ? "bg-primary text-white" : "bg-white text-ink-secondary hover:bg-surface-muted"}`}
        >
          Téléverser une image
        </button>
        <button
          type="button"
          onClick={() => switchMode("url")}
          className={`flex-1 text-[11px] font-semibold py-1.5 transition-colors border-l border-[#D1D1D1] ${mode === "url" ? "bg-primary text-white" : "bg-white text-ink-secondary hover:bg-surface-muted"}`}
        >
          Coller un lien
        </button>
      </div>

      {mode === "upload" && (
        <>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={handleFileChange}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="w-full py-4 border-2 border-dashed border-[#C8C6C4] hover:border-primary hover:bg-primary-light/30 rounded-lg transition-colors flex flex-col items-center gap-1.5 text-ink-secondary hover:text-primary disabled:opacity-50"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 24 }}>
              {uploading ? "progress_activity" : value ? "check_circle" : "cloud_upload"}
            </span>
            {uploading ? (
              <span className="text-[11px] font-semibold">Upload en cours...</span>
            ) : value ? (
              <span className="text-[11px] font-semibold text-status-active-fg">Image uploadée — cliquer pour changer</span>
            ) : (
              <>
                <span className="text-[11px] font-semibold">Choisir une image</span>
                <span className="text-[10px] text-ink-tertiary">JPG / PNG / WebP · max 5 Mo</span>
              </>
            )}
          </button>
          {uploadError && <p className="text-[10px] text-red-600">{uploadError}</p>}
        </>
      )}

      {mode === "url" && (
        <>
          <input
            type="url"
            value={urlInput}
            onChange={(e) => { setUrlInput(e.target.value); setUrlValid(null); }}
            onBlur={handleUrlBlur}
            placeholder="https://cdn.example.com/banner.jpg"
            className="w-full text-[12px] px-3 py-2 border border-[#D1D1D1] rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
          />
          {urlValid === false && (
            <p className="text-[10px] text-red-600">
              Image inaccessible ou lien invalide. Le lien doit commencer par https://.
            </p>
          )}
        </>
      )}

      {/* Preview */}
      {value && (
        <div className="border border-surface-border rounded-lg overflow-hidden">
          <img
            src={value}
            alt="Aperçu bannière"
            className="w-full h-auto"
            style={{ aspectRatio: "6/1", objectFit: "cover" }}
          />
        </div>
      )}

      <p className="text-[10px] text-ink-tertiary">Recommandé : 1200×200 px</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SponsoringCards — main component
// ---------------------------------------------------------------------------

interface CheckoutTarget { id: string; profileKind: string }

export function SponsoringCards({ data }: SponsoringCardsProps): JSX.Element {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [showForm, setShowForm] = useState<string | null>(null);
  const [formBannerUrl, setFormBannerUrl] = useState("");
  const [formLinkUrl, setFormLinkUrl] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [checkoutTarget, setCheckoutTarget] = useState<CheckoutTarget | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  async function handleRequest(profileKind: string): Promise<void> {
    setFormError(null);
    if (!formLinkUrl.startsWith("https://")) {
      setFormError("Le lien doit commencer par https://");
      return;
    }
    if (!formBannerUrl) {
      setFormError("Veuillez fournir une bannière.");
      return;
    }
    if (!formBannerUrl.startsWith("https://")) {
      setFormError("L'URL de la bannière doit commencer par https://");
      return;
    }
    setLoading(profileKind);
    try {
      const res = await fetch("/api/v1/me/sponsoring/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileKind, bannerUrl: formBannerUrl, linkUrl: formLinkUrl }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setFormError(err?.error?.message || "Erreur lors de la soumission.");
        return;
      }
      setShowForm(null);
      setFormBannerUrl("");
      setFormLinkUrl("");
      router.refresh();
    } finally {
      setLoading(null);
    }
  }

  async function handleCancel(sponsoringId: string): Promise<void> {
    if (!confirm("Annuler cette demande de sponsoring ?")) return;
    setLoading(sponsoringId);
    try {
      await fetch(`/api/v1/me/sponsoring/${sponsoringId}/cancel`, { method: "POST" });
      router.refresh();
    } finally {
      setLoading(null);
    }
  }

  async function handleCheckoutConfirm(): Promise<void> {
    if (!checkoutTarget) return;
    setCheckoutLoading(true);
    setCheckoutError(null);
    try {
      const res = await fetch("/api/v1/me/sponsoring/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sponsoringId: checkoutTarget.id,
          idempotencyKey: `spn-${checkoutTarget.id}-${Date.now()}`,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setCheckoutError(err?.error?.message || "Erreur lors du paiement.");
        return;
      }
      setCheckoutTarget(null);
      router.refresh();
    } finally {
      setCheckoutLoading(false);
    }
  }

  return (
    <>
      <div className="space-y-4">
        <p className="text-[12.5px] text-ink-secondary leading-relaxed max-w-3xl">
          Affichez votre bannière en <strong className="text-ink-primary">tête des résultats</strong> du moteur de recherche.
          Tarif : <strong className="text-ink-primary">100 DT HT (119 DT TTC)</strong> pour <strong>7 jours</strong>.{" "}
          <span className="text-ink-tertiary">Les campagnes sponsorisées sont vérifiées par notre équipe avant publication.</span>
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {data.map((card) => {
            const accent = KIND_ACCENT[card.profileKind] || "#0078D4";
            const label = KIND_LABEL[card.profileKind] || card.profileKind;
            const isFormOpen = showForm === card.profileKind;
            const canRequest = card.profileExists && card.profileStatus === "active" && card.isPublic && !card.current;

            return (
              <div key={card.profileKind} className="card p-4 space-y-3">
                {/* Header */}
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: accent }} />
                  <span className="text-[13px] font-semibold text-ink-primary">{label}</span>
                  {!card.profileExists && (
                    <span className="text-[10px] text-ink-tertiary bg-surface-muted px-1.5 py-0.5 rounded">Non créé</span>
                  )}
                </div>

                {/* Current state */}
                {card.current && card.current.status === "pending" && (
                  <div className="space-y-2">
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                      En attente de vérification
                    </span>
                    <img src={card.current.bannerUrl} alt="Bannière" className="w-full h-16 object-cover rounded" />
                    <button
                      onClick={() => handleCancel(card.current!.id)}
                      disabled={loading === card.current.id}
                      className="w-full text-[12px] py-1.5 border border-[#D1D1D1] rounded-lg text-ink-secondary hover:bg-surface-muted transition-colors disabled:opacity-50"
                    >
                      Annuler la demande
                    </button>
                  </div>
                )}

                {card.current && card.current.status === "confirmed" && (
                  <div className="space-y-2">
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      Validée — en attente de paiement
                    </span>
                    {card.current.confirmedAt && (
                      <p className="text-[11px] text-ink-tertiary">
                        Validée le {new Date(card.current.confirmedAt).toLocaleDateString("fr-TN")}
                      </p>
                    )}
                    <img src={card.current.bannerUrl} alt="Bannière" className="w-full h-16 object-cover rounded" />
                    <button
                      onClick={() => setCheckoutTarget({ id: card.current!.id, profileKind: card.profileKind })}
                      disabled={loading === card.current.id}
                      className="w-full text-[12px] py-2 bg-primary text-white font-semibold rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                    >
                      Payer 119 DT TTC
                    </button>
                    <p className="text-[10px] text-ink-tertiary text-center">
                      Campagne non annulable après paiement.
                    </p>
                    <button
                      onClick={() => handleCancel(card.current!.id)}
                      disabled={loading === card.current.id}
                      className="w-full text-[11px] py-1 text-ink-tertiary hover:text-ink-secondary transition-colors disabled:opacity-50"
                    >
                      Annuler
                    </button>
                  </div>
                )}

                {card.current && card.current.status === "active" && card.current.from && card.current.to && (
                  <div className="space-y-2">
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-status-active-fg bg-status-active-bg border border-status-active-border px-2 py-0.5 rounded">
                      <span className="w-1.5 h-1.5 rounded-full bg-status-active-dot" />
                      En cours — {daysRemaining(card.current.to)} j restants
                    </span>
                    <img src={card.current.bannerUrl} alt="Bannière" className="w-full h-16 object-cover rounded" />
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div>
                        <p className="text-[16px] font-bold text-ink-primary">{card.current.impressions}</p>
                        <p className="text-[10px] text-ink-tertiary">Impressions</p>
                      </div>
                      <div>
                        <p className="text-[16px] font-bold text-ink-primary">{card.current.clicks}</p>
                        <p className="text-[10px] text-ink-tertiary">Clics</p>
                      </div>
                      <div>
                        <p className="text-[16px] font-bold text-ink-primary">{ctr(card.current.impressions, card.current.clicks)} %</p>
                        <p className="text-[10px] text-ink-tertiary">CTR</p>
                      </div>
                    </div>
                    <p className="text-[11px] text-ink-tertiary text-center">
                      {new Date(card.current.from).toLocaleDateString("fr-TN")} — {new Date(card.current.to).toLocaleDateString("fr-TN")}
                    </p>
                  </div>
                )}

                {/* No current — show CTA or form */}
                {!card.current && !isFormOpen && (
                  <button
                    onClick={() => {
                      setShowForm(card.profileKind);
                      setFormBannerUrl("");
                      setFormLinkUrl("");
                      setFormError(null);
                    }}
                    disabled={!canRequest}
                    className="w-full text-[12px] py-2 bg-primary text-white font-semibold rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {canRequest ? "Demander une campagne" : "Profil non éligible"}
                  </button>
                )}

                {!card.current && isFormOpen && (
                  <div className="space-y-3 border-t border-surface-border pt-3">
                    {/* M4: BannerInput (upload or URL) */}
                    <BannerInput value={formBannerUrl} onChange={setFormBannerUrl} />

                    <div>
                      <label className="text-[11px] font-medium text-ink-secondary block mb-1">Lien de redirection (https://)</label>
                      <input
                        type="url"
                        value={formLinkUrl}
                        onChange={(e) => setFormLinkUrl(e.target.value)}
                        placeholder="https://www.votre-site.com"
                        className="w-full text-[12px] px-3 py-2 border border-[#D1D1D1] rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                      />
                    </div>
                    {formError && (
                      <p className="text-[11px] text-red-600">{formError}</p>
                    )}
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleRequest(card.profileKind)}
                        disabled={loading === card.profileKind}
                        className="flex-1 text-[12px] py-2 bg-primary text-white font-semibold rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                      >
                        {loading === card.profileKind ? "Envoi..." : "Soumettre"}
                      </button>
                      <button
                        onClick={() => setShowForm(null)}
                        className="text-[12px] px-3 py-2 border border-[#D1D1D1] rounded-lg text-ink-secondary hover:bg-surface-muted transition-colors"
                      >
                        Annuler
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* M2: Checkout confirmation modal */}
      <CheckoutSponsoringModal
        open={!!checkoutTarget}
        onClose={() => { if (!checkoutLoading) { setCheckoutTarget(null); setCheckoutError(null); } }}
        profileKind={checkoutTarget?.profileKind || ""}
        onConfirm={handleCheckoutConfirm}
        loading={checkoutLoading}
        error={checkoutError}
      />
    </>
  );
}
