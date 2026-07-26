"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { StatusPill } from "@/components/shared/StatusPill";
import { ProfileStatusBlock } from "@/components/shared/ProfileStatusBlock";
import { useToast } from "@/components/shared/Toast";
import type { BrandUpEditorData, GalleryItem } from "@/types/profile-editor";
import type { MeResponse } from "@/types/dashboard";
import { ProfileActionBar } from "./ProfileActionBar";
import { AddGalleryImageModal } from "./AddGalleryImageModal";
import { GalleryDeleteConfirm } from "./GalleryDeleteConfirm";

// SCOPE_DECISION: 9 gallery slots max (mockup shows 10 — reduced per owner directive)
const MAX_GALLERY = 9;

interface BrandUpEditorProps {
  profile: BrandUpEditorData;
  company: MeResponse["company"];
}

interface FormValues {
  pitch: string;
  about: string;
}

export function BrandUpEditor({ profile, company }: BrandUpEditorProps): JSX.Element {
  const router = useRouter();
  const { showToast } = useToast();
  const isReadOnly = profile.status === "pending" || profile.status === "disabled";

  const { register, handleSubmit, formState: { isDirty, errors }, reset, setError, getValues } = useForm<FormValues>({
    defaultValues: {
      pitch: profile.data.pitch,
      about: profile.data.about,
    },
  });

  // --- Soft state: isPublic + placeholderMode ---
  const [isPublic, setIsPublic] = useState(profile.isPublic);
  const [placeholderMode, setPlaceholderMode] = useState<string>(profile.placeholderMode ?? "hidden");
  const isPublicDirty = isPublic !== profile.isPublic;
  const placeholderDirty = placeholderMode !== (profile.placeholderMode ?? "hidden");

  // --- Gallery state (now part of HARD submit) ---
  const [galleryOrder, setGalleryOrder] = useState<GalleryItem[]>(profile.data.gallery);
  const [pendingAdds, setPendingAdds] = useState<GalleryItem[]>([]);
  const [pendingDeletes, setPendingDeletes] = useState<string[]>([]);

  // Combined gallery: initial (minus deletes) + pending adds, in order
  const combinedGallery = [
    ...galleryOrder.filter((g) => !pendingDeletes.includes(g.id)),
    ...pendingAdds,
  ];

  // Dirty tracking — gallery is now HARD (part of submit)
  const initialOrderIds = profile.data.gallery.map((g) => g.id).join(",");
  const currentOrderIds = galleryOrder.filter((g) => !pendingDeletes.includes(g.id)).map((g) => g.id).join(",");
  const galleryOrderDirty = currentOrderIds !== initialOrderIds;
  const hasGalleryChanges = pendingAdds.length > 0 || pendingDeletes.length > 0 || galleryOrderDirty;

  // Soft dirty = isPublic toggle + placeholderMode
  const softDirtyCount = (isPublicDirty ? 1 : 0) + (placeholderDirty ? 1 : 0);
  // Hard dirty = form fields (pitch/about) OR gallery changes
  const hardDirty = isDirty || hasGalleryChanges;
  const [saving, setSaving] = useState(false);

  const moveGalleryItem = useCallback((fromIdx: number, toIdx: number) => {
    // Reorder operates on combined gallery — update both galleryOrder and pendingAdds
    const combined = [
      ...galleryOrder.filter((g) => !pendingDeletes.includes(g.id)),
      ...pendingAdds,
    ];
    const moved = [...combined];
    const [item] = moved.splice(fromIdx, 1);
    moved.splice(toIdx, 0, item!);

    // Split back: existing items go to galleryOrder, pending stay in pendingAdds
    const existingIds = new Set(profile.data.gallery.map((g) => g.id));
    const newOrder: GalleryItem[] = [];
    const newPending: GalleryItem[] = [];
    for (const g of moved) {
      if (existingIds.has(g.id)) {
        newOrder.push(g);
      } else {
        newPending.push(g);
      }
    }
    setGalleryOrder(newOrder);
    setPendingAdds(newPending);
  }, [galleryOrder, pendingAdds, pendingDeletes, profile.data.gallery]);

  function handleGalleryAdd(item: GalleryItem): void {
    setPendingAdds((prev) => [...prev, item]);
  }

  function handleGalleryDelete(imageId: string): void {
    // If it's a pending add, just remove it from pendingAdds
    if (pendingAdds.some((g) => g.id === imageId)) {
      setPendingAdds((prev) => prev.filter((g) => g.id !== imageId));
      return;
    }
    // Otherwise mark for deletion
    setPendingDeletes((prev) => [...prev, imageId]);
  }

  // --- Soft save: isPublic + placeholderMode ---
  async function handleSoftSave(): Promise<void> {
    if (!isPublicDirty && !placeholderDirty) return;
    setSaving(true);
    try {
      const patch: Record<string, unknown> = {};
      if (isPublicDirty) patch.isPublic = isPublic;
      if (placeholderDirty) patch.placeholderMode = placeholderMode;
      const res = await fetch(`/api/v1/profiles/${profile.id}/soft`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const softJson = await res.json();
      if (!res.ok) {
        showToast(softJson.error?.message || "Erreur lors de la sauvegarde");
        return;
      }
      if (softJson.isPublic !== undefined) setIsPublic(softJson.isPublic);
      if (softJson.placeholderMode !== undefined) setPlaceholderMode(softJson.placeholderMode);
      showToast("Visibilité mise à jour");
      router.refresh();
    } catch {
      showToast("Erreur, veuillez réessayer");
    } finally {
      setSaving(false);
    }
  }

  // --- Hard submit: pitch + about + gallery snapshot ---
  const [submitting, setSubmitting] = useState(false);

  async function handleHardSubmit(): Promise<void> {
    const values = getValues();
    setSubmitting(true);
    try {
      // Phase 1: Upload new gallery images to get real URLs/IDs
      const tempToReal = new Map<string, string>();
      for (const add of pendingAdds) {
        const res = await fetch(`/api/v1/profiles/${profile.id}/gallery`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: add.url, title: add.caption }),
        });
        if (!res.ok) {
          showToast("Erreur lors de l'ajout d'une image");
          return;
        }
        const json = await res.json();
        tempToReal.set(add.id, json.id as string);
      }

      // Phase 2: Build gallery snapshot with real IDs
      const gallerySnapshot = combinedGallery.map((g, idx) => ({
        id: tempToReal.get(g.id) ?? g.id,
        url: g.url,
        caption: g.caption,
        order: idx,
      }));

      // Phase 3: Submit all as hard change
      // Send original gallery (pre-edit state) so server can compute accurate diff
      const originalGallery = profile.data.gallery.map((g, idx) => ({
        id: g.id,
        url: g.url,
        caption: g.caption,
        order: g.order ?? idx,
      }));
      const res = await fetch(`/api/v1/profiles/${profile.id}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pitch: values.pitch,
          about: values.about,
          gallery: gallerySnapshot,
          currentGallery: originalGallery,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        if (json.error?.code === "VALIDATION_FAILED" && json.error.fields) {
          const fields = json.error.fields as Record<string, string[]>;
          for (const [field, messages] of Object.entries(fields)) {
            if (field === "pitch" || field === "about") {
              setError(field, { message: messages[0] });
            }
          }
          return;
        }
        showToast(json.error?.message || "Erreur, veuillez réessayer");
        return;
      }
      showToast("Profil soumis pour validation");
      reset({ pitch: values.pitch, about: values.about });
      setPendingAdds([]);
      setPendingDeletes([]);
      router.refresh();
    } catch {
      showToast("Erreur, veuillez réessayer");
    } finally {
      setSubmitting(false);
    }
  }

  // --- Cancel pending submission ---
  const [cancelling, setCancelling] = useState(false);

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
    setIsPublic(profile.isPublic);
    setPlaceholderMode(profile.placeholderMode ?? "hidden");
    setGalleryOrder(profile.data.gallery);
    setPendingAdds([]);
    setPendingDeletes([]);
  }

  // When pending, show the diff view with tags
  const isPending = profile.status === "pending";
  const hasPendingGalleryDiff = isPending && profile.pendingGallery != null;

  // Build gallery diff state for pending mode
  type ImageDiffStatus = "added" | "kept" | "deleted" | "normal";
  const galleryDiffMap = new Map<string, ImageDiffStatus>();
  let pendingViewGallery: GalleryItem[] = combinedGallery;

  if (hasPendingGalleryDiff) {
    const currentIds = new Set((profile.currentGallery ?? []).map((g) => g.id));
    const pendingIds = new Set((profile.pendingGallery ?? []).map((g) => g.id));

    // All unique images (current + pending)
    const allMap = new Map<string, GalleryItem>();
    for (const g of profile.currentGallery ?? []) allMap.set(g.id, g);
    for (const g of profile.pendingGallery ?? []) allMap.set(g.id, g);

    // Order: pending gallery order first, then deleted items at the end
    const ordered: GalleryItem[] = [];
    for (const g of profile.pendingGallery ?? []) ordered.push(g);
    for (const g of profile.currentGallery ?? []) {
      if (!pendingIds.has(g.id)) ordered.push(g); // deleted items
    }
    pendingViewGallery = ordered;

    for (const g of ordered) {
      const inCurrent = currentIds.has(g.id);
      const inPending = pendingIds.has(g.id);
      if (!inCurrent && inPending) galleryDiffMap.set(g.id, "added");
      else if (inCurrent && !inPending) galleryDiffMap.set(g.id, "deleted");
      else galleryDiffMap.set(g.id, "kept");
    }
  }

  const gallery = hasPendingGalleryDiff ? pendingViewGallery : combinedGallery;
  const filledSlots = hasPendingGalleryDiff ? (profile.pendingGallery ?? []).length : combinedGallery.length;
  const emptySlots = MAX_GALLERY - filledSlots;

  return (
    <div className="max-w-[1120px] mx-auto space-y-6">
      {/* ═══ PAGE HEADER ═══ */}
      <section className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-11 h-11 rounded-lg bg-primary-light flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-primary" style={{ fontSize: 24 }}>
              storefront
            </span>
          </div>
          <div className="min-w-0">
            <h2 className="font-heading font-bold text-[20px] text-ink-primary leading-tight">
              Profil BrandUP
            </h2>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <StatusPill kind={profile.status} />
              {profile.submittedAt && (
                <span className="text-[11px] text-ink-tertiary">
                  Soumis le {formatDate(profile.submittedAt)}
                  {profile.rejectedAt && ` · Refusé le ${formatDate(profile.rejectedAt)}`}
                  {profile.publishedAt && !profile.rejectedAt && ` · Publié le ${formatDate(profile.publishedAt)}`}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href={`/brandup/${company.slug}`}
            target="_blank"
            className="inline-flex items-center gap-1.5 px-4 py-[9px] text-[13px] font-semibold text-ink-primary bg-white border border-[#D1D1D1] rounded hover:bg-surface-muted transition-colors"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>open_in_new</span>
            Aperçu public
          </Link>
          <Link
            href="/dashboard/boost"
            className="inline-flex items-center gap-1.5 px-4 py-[9px] text-[13px] font-semibold text-white bg-primary hover:bg-primary-hover rounded transition-colors"
          >
            <span className="material-symbols-outlined icon-fill" style={{ fontSize: 14 }}>bolt</span>
            Booster ce profil
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
          Cette page ne gère que votre <strong>vitrine BrandUP</strong> (pitch, à propos, galerie).
          <span className="text-ink-secondary"> Les informations générales (nom, logo, téléphone, email) se modifient depuis la page Compte.</span>
        </div>
        <Link href="/dashboard/account" className="shrink-0 inline-flex items-center gap-1 text-[12px] font-semibold text-primary hover:underline whitespace-nowrap">
          Gérer depuis Compte
          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>arrow_forward</span>
        </Link>
      </section>

      {/* ═══ VISIBILITY TOGGLE ═══ */}
      <section className="card p-5 flex items-center gap-4">
        <div className="w-10 h-10 rounded-lg bg-primary-light flex items-center justify-center shrink-0">
          <span className="material-symbols-outlined text-primary" style={{ fontSize: 20 }}>visibility</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-heading font-semibold text-[14px] text-ink-primary leading-tight">
            Profil public visible
          </div>
          <div className="text-[12px] text-ink-secondary mt-0.5 leading-snug">
            Quand activé, votre profil apparaît dans les résultats du moteur BrandUP.
            {/* SOFT_MUTATION: toggle isPublic */}
          </div>
        </div>
        <label className="relative inline-block w-9 h-5 shrink-0">
          <input
            type="checkbox"
            className="sr-only peer"
            checked={isPublic}
            disabled={isReadOnly || profile.status !== "active"}
            onChange={() => setIsPublic(!isPublic)}
          />
          <span className="absolute inset-0 cursor-pointer rounded-[10px] bg-[#C8C6C4] transition-colors peer-checked:bg-primary peer-disabled:opacity-60 peer-disabled:cursor-not-allowed" />
          <span className="absolute left-[3px] top-[3px] h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-4" />
        </label>
      </section>

      {/* ═══ PLACEHOLDER MODE (when toggle OFF) ═══ */}
      {!isPublic && (
        <section className="card p-5 border-l-2 border-[#E8E6E4] ml-4">
          <div className="text-[13px] font-semibold text-ink-primary mb-2">Quand le profil est masqué :</div>
          <div className="flex flex-col gap-2">
            <label className={`flex items-center gap-2 cursor-pointer ${(isReadOnly || profile.status !== "active") ? "opacity-60 pointer-events-none" : ""}`}>
              <input type="radio" name="placeholderMode" value="hidden" checked={placeholderMode === "hidden"}
                onChange={() => setPlaceholderMode("hidden")} disabled={isReadOnly || profile.status !== "active"}
                className="w-4 h-4 text-primary border-[#D1D1D1] focus:ring-primary" />
              <span className="text-[13px] text-ink-primary">Masquer complètement</span>
            </label>
            <label className={`flex items-center gap-2 cursor-pointer ${(isReadOnly || profile.status !== "active") ? "opacity-60 pointer-events-none" : ""}`}>
              <input type="radio" name="placeholderMode" value="coming_soon" checked={placeholderMode === "coming_soon"}
                onChange={() => setPlaceholderMode("coming_soon")} disabled={isReadOnly || profile.status !== "active"}
                className="w-4 h-4 text-primary border-[#D1D1D1] focus:ring-primary" />
              <span className="text-[13px] text-ink-primary">Afficher &laquo;&nbsp;Bient&ocirc;t disponible&nbsp;&raquo;</span>
            </label>
          </div>
          <p className="text-[11px] text-ink-secondary mt-2 leading-snug">
            Les visiteurs de votre lien/QR verront une page d&apos;attente au lieu d&apos;une erreur
          </p>
        </section>
      )}

      {/* ═══ SECTION: PRÉSENTATION ═══ */}
      <section className="card p-5 md:p-6">
        <div className="mb-5">
          <h3 className="font-heading font-bold text-[15px] text-ink-primary">Présentation</h3>
          <p className="text-[12px] text-ink-secondary mt-0.5">
            Texte de présentation affiché sur votre vitrine BrandUP
          </p>
        </div>

        <div className="space-y-5">
          {/* Pitch — HARD_MUTATION */}
          <div>
            <label htmlFor="bu-pitch" className="field-label">
              Description courte (pitch) <span className="text-[#B91C1C] font-bold ml-0.5">*</span>
            </label>
            <input
              id="bu-pitch"
              type="text"
              maxLength={280}
              readOnly={isReadOnly}
              className={`field-input ${errors.pitch ? "border-[#B91C1C]" : ""}`}
              {...register("pitch")}
            />
            {errors.pitch ? (
              <p className="text-[12px] text-[#B91C1C] mt-1">{errors.pitch.message}</p>
            ) : (
              <div className="field-help">
                <span className="material-symbols-outlined" style={{ fontSize: 13 }}>info</span>
                Phrase affichée en header de votre profil · 280 caractères max
              </div>
            )}
          </div>

          {/* About — HARD_MUTATION */}
          <div>
            <label htmlFor="bu-about" className="field-label">
              À propos <span className="text-[#B91C1C] font-bold ml-0.5">*</span>
            </label>
            <textarea
              id="bu-about"
              rows={6}
              maxLength={1000}
              readOnly={isReadOnly}
              className={`field-input resize-y min-h-[120px] ${errors.about ? "border-[#B91C1C]" : ""}`}
              {...register("about")}
            />
            {errors.about ? (
              <p className="text-[12px] text-[#B91C1C] mt-1">{errors.about.message}</p>
            ) : (
              <div className="field-help">
                <span className="material-symbols-outlined" style={{ fontSize: 13 }}>info</span>
                Texte complet affiché sur votre profil · 1000 caractères max
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ═══ SECTION: GALERIE ═══ */}
      <section className="card p-5 md:p-6">
        <div className="flex items-start justify-between mb-5 flex-wrap gap-2">
          <div>
            <h3 className="font-heading font-bold text-[15px] text-ink-primary">
              Galerie &amp; catalogue de production
            </h3>
            <p className="text-[12px] text-ink-secondary mt-0.5 leading-snug">
              Organisez jusqu&apos;à {MAX_GALLERY} images. L&apos;image <strong>#1</strong> est mise en avant (HERO).
            </p>
          </div>
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-ink-secondary bg-surface-muted border border-surface-border px-2.5 py-1 rounded shrink-0">
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>photo_library</span>
            {filledSlots} / {MAX_GALLERY} images
          </span>
        </div>

        {/* Gallery grid */}
        <GalleryGrid
          gallery={gallery}
          pendingAddIds={new Set(pendingAdds.map((g) => g.id))}
          diffMap={galleryDiffMap}
          emptySlots={emptySlots}
          isReadOnly={isReadOnly}
          onMoveUp={(i) => moveGalleryItem(i, i - 1)}
          onMoveDown={(i) => moveGalleryItem(i, i + 1)}
          onAdd={handleGalleryAdd}
          onDelete={handleGalleryDelete}
        />

        <div className="mt-4 flex items-start gap-2 text-[11px] text-ink-tertiary leading-snug">
          <span className="material-symbols-outlined shrink-0 mt-[1px]" style={{ fontSize: 14 }}>info</span>
          <span>
            Formats acceptés : JPG, PNG · 5 Mo max par image · Résolution minimum recommandée : 800 × 600 px.
          </span>
        </div>
      </section>

      {/* ═══ SECTION: RACCOURCIS VISIBILITÉ ═══ */}
      <BoostSponsoringCards status={profile.status} boosted={profile.boosted} sponsoring={profile.sponsoring} />

      {/* ═══ RESUBMISSION WARNING (rejected state) ═══ */}
      {profile.status === "rejected" && isDirty && (
        <section className="bg-[#FFFBEB] border border-[#FDE68A] rounded-lg px-4 py-3 flex items-start gap-3" role="status">
          <span className="material-symbols-outlined icon-fill text-[#D97706] shrink-0 mt-[1px]" style={{ fontSize: 20 }}>info</span>
          <div className="min-w-0 flex-1 text-[12.5px] text-[#92400E] leading-snug">
            <strong>En resoumettant ces modifications</strong>, votre profil BrandUP{" "}
            {profile.publishedAt
              ? <>restera <strong>visible</strong> avec vos données validées pendant la période de validation (24-48 h).</>
              : <>sera <strong>invisible</strong> sur le moteur MARKET-UP pendant la période de validation (24-48 h).</>
            }
          </div>
        </section>
      )}

      {/* ═══ ACTION BAR ═══ */}
      <ProfileActionBar
        status={profile.status}
        isDirty={hardDirty}
        onReset={handleReset}
        softDirtyCount={softDirtyCount}
        saving={saving}
        onSoftSave={(isPublicDirty || placeholderDirty) ? handleSoftSave : undefined}
        submitting={submitting}
        onHardSubmit={handleSubmit(handleHardSubmit)}
        singleSubmit
        onCancelPending={handleCancelPending}
        cancellingPending={cancelling}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Boost & Sponsoring cards (state-driven)
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Gallery Grid sub-component
// ---------------------------------------------------------------------------

function GalleryGrid({
  gallery,
  pendingAddIds,
  diffMap,
  emptySlots,
  isReadOnly,
  onMoveUp,
  onMoveDown,
  onAdd,
  onDelete,
}: {
  gallery: BrandUpEditorData["data"]["gallery"];
  pendingAddIds: Set<string>;
  diffMap: Map<string, "added" | "kept" | "deleted" | "normal">;
  emptySlots: number;
  isReadOnly: boolean;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
  onAdd: (item: GalleryItem) => void;
  onDelete: (imageId: string) => void;
}): JSX.Element {
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; caption: string } | null>(null);

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {gallery.map((item, i) => {
          const diffStatus = diffMap.get(item.id);
          const isDeleted = diffStatus === "deleted";
          return (
          <div key={item.id} className={`bg-white border border-surface-border rounded-lg overflow-hidden flex flex-col group/slot ${isDeleted ? "opacity-50" : ""}`}>
            {/* Image preview with delete overlay */}
            <div className="aspect-[4/3] bg-gradient-to-br from-primary/10 to-ink-tertiary/20 relative flex items-center justify-center">
              {item.url ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={item.url} alt={item.caption || `Image ${i + 1}`} className="w-full h-full object-cover" />
              ) : (
                <span className="material-symbols-outlined text-white" style={{ fontSize: 28 }}>image</span>
              )}
              {/* HERO / position badge (not for deleted items) */}
              {!isDeleted && (
                <span className={`absolute top-1.5 left-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded ${
                  i === 0 ? "bg-primary text-white" : "bg-white/90 text-ink-secondary border border-surface-border"
                }`}>
                  {i === 0 ? "★ HERO" : `#${i + 1}`}
                </span>
              )}
              {/* Diff badges for pending mode */}
              {diffStatus === "added" && (
                <span className="absolute top-1.5 right-1.5 text-[8px] font-bold px-1.5 py-0.5 rounded bg-[#16A34A] text-white">
                  NOUVEAU
                </span>
              )}
              {diffStatus === "deleted" && (
                <span className="absolute top-1.5 right-1.5 text-[8px] font-bold px-1.5 py-0.5 rounded bg-[#DC2626] text-white">
                  SUPPRIMÉE
                </span>
              )}
              {/* New badge for pending adds (edit mode, not pending diff mode) */}
              {!diffStatus && pendingAddIds.has(item.id) && (
                <span className="absolute bottom-1.5 left-1.5 text-[8px] font-bold px-1.5 py-0.5 rounded bg-[#D97706] text-white">
                  Nouveau
                </span>
              )}
              {/* Delete button (hover on desktop, always on mobile) */}
              {!isReadOnly && (
                <button
                  type="button"
                  onClick={() => setDeleteTarget({ id: item.id, caption: item.caption })}
                  className="absolute top-1.5 right-1.5 w-7 h-7 rounded bg-[#DC2626] text-white flex items-center justify-center opacity-100 md:opacity-0 group-hover/slot:opacity-100 transition-opacity"
                  aria-label="Supprimer"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>delete</span>
                </button>
              )}
            </div>

            {/* Caption (static display) + reorder buttons */}
            <div className="p-2 border-t border-surface-border bg-surface-subtle flex flex-col gap-1.5">
              <p
                className="text-[11px] font-medium text-ink-primary truncate"
                title={item.caption || "Sans titre"}
              >
                {item.caption || "Sans titre"}
              </p>
              {/* Reorder buttons */}
              {!isReadOnly && (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={i === 0}
                    onClick={() => onMoveUp(i)}
                    className="w-6 h-6 rounded flex items-center justify-center text-ink-secondary hover:text-primary hover:bg-primary-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:text-ink-secondary disabled:hover:bg-transparent"
                    aria-label="Monter"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>arrow_upward</span>
                  </button>
                  <button
                    type="button"
                    disabled={i === gallery.length - 1}
                    onClick={() => onMoveDown(i)}
                    className="w-6 h-6 rounded flex items-center justify-center text-ink-secondary hover:text-primary hover:bg-primary-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:text-ink-secondary disabled:hover:bg-transparent"
                    aria-label="Descendre"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>arrow_downward</span>
                  </button>
                </div>
              )}
            </div>
          </div>
          );
        })}

        {/* Empty slot → opens AddGalleryImageModal */}
        {!isReadOnly && emptySlots > 0 && (
          <button
            type="button"
            onClick={() => setAddModalOpen(true)}
            className="aspect-[4/3.5] bg-white border-2 border-dashed border-[#C8C6C4] hover:border-primary hover:bg-primary-light/30 transition-colors rounded-lg flex flex-col items-center justify-center gap-2 text-ink-secondary hover:text-primary group"
          >
            <span className="material-symbols-outlined group-hover:scale-110 transition-transform" style={{ fontSize: 28 }}>
              add_photo_alternate
            </span>
            <span className="text-[12px] font-semibold">Ajouter</span>
            <span className="text-[10px] text-ink-tertiary group-hover:text-primary">
              {emptySlots} slot{emptySlots > 1 ? "s" : ""} restant{emptySlots > 1 ? "s" : ""}
            </span>
          </button>
        )}
      </div>

      {/* Modals */}
      <AddGalleryImageModal open={addModalOpen} onClose={() => setAddModalOpen(false)} onAdd={onAdd} />
      <GalleryDeleteConfirm
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        caption={deleteTarget?.caption ?? ""}
        onConfirm={() => { if (deleteTarget) { onDelete(deleteTarget.id); setDeleteTarget(null); } }}
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// Boost & Sponsoring cards (state-driven)
// ---------------------------------------------------------------------------

function BoostSponsoringCards({
  status,
  boosted,
  sponsoring,
}: {
  status: string;
  boosted: boolean;
  sponsoring: boolean;
}): JSX.Element {
  const isBlocked = status !== "active";

  const blockMessage = status === "rejected"
    ? "Un profil refusé ne peut pas être mis en avant. Corrigez les points signalés et resoumettez-le."
    : status === "pending"
      ? "Un profil en attente de validation ne peut pas être mis en avant."
      : "Un profil désactivé ne peut pas être mis en avant.";

  const blockBorder = status === "rejected" ? "border-[#FCA5A5]" : status === "pending" ? "border-[#FDE68A]" : "border-surface-border";
  const blockBg = status === "rejected" ? "bg-[#FEF2F2]" : status === "pending" ? "bg-[#FFFBEB]" : "bg-surface-muted";
  const blockTextColor = status === "rejected" ? "text-[#7F1D1D]" : status === "pending" ? "text-[#92400E]" : "text-ink-secondary";
  const blockIconColor = status === "rejected" ? "text-[#B91C1C]" : status === "pending" ? "text-[#D97706]" : "text-ink-tertiary";

  return (
    <section>
      <div className="flex items-end justify-between mb-4">
        <div>
          <h2 className="font-heading font-semibold text-[13px] text-ink-primary uppercase tracking-wider">
            Raccourcis visibilité
          </h2>
          <p className="text-[12px] text-ink-secondary mt-0.5">
            Accédez rapidement aux outils de mise en avant de votre profil BrandUP
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Boost card */}
        <div className="card p-5 flex flex-col">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${boosted ? "bg-primary-light" : "bg-surface-muted"}`}>
                <span className={`material-symbols-outlined icon-fill ${boosted ? "text-primary" : "text-ink-secondary"}`} style={{ fontSize: 22 }}>bolt</span>
              </div>
              <div className="min-w-0">
                <h3 className="font-heading font-bold text-[14px] text-ink-primary leading-tight">Boost</h3>
                {boosted && <StatusPill kind="active">Actif</StatusPill>}
                {!boosted && !isBlocked && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-ink-secondary bg-surface-muted border border-surface-border px-1.5 py-0.5 rounded mt-1">
                    <span className="w-1.5 h-1.5 bg-ink-tertiary rounded-full" />Inactif
                  </span>
                )}
              </div>
            </div>
          </div>

          {isBlocked ? (
            <div className={`${blockBg} border ${blockBorder} rounded p-3 mb-4 flex-1`}>
              <div className="flex items-start gap-2">
                <span className={`material-symbols-outlined icon-fill ${blockIconColor} shrink-0 mt-[1px]`} style={{ fontSize: 16 }}>info</span>
                <div className={`text-[12px] ${blockTextColor} leading-relaxed`}>
                  {blockMessage}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-[12px] text-ink-secondary leading-relaxed mb-4 flex-1">
              Mettez en avant votre profil BrandUP pendant 30 jours.
            </p>
          )}

          <div className="flex items-center gap-2 pt-3 border-t border-[#F0F0F0] mt-auto">
            <Link href="/dashboard/boost" className="inline-flex items-center gap-1.5 px-4 py-[9px] text-[13px] font-semibold text-ink-primary bg-white border border-[#D1D1D1] rounded hover:bg-surface-muted transition-colors">
              {isBlocked ? "Voir" : "Voir détails"}
            </Link>
            {!isBlocked && (
              <Link href="/dashboard/boost" className="inline-flex items-center gap-1.5 px-4 py-[9px] text-[13px] font-semibold text-white bg-primary hover:bg-primary-hover rounded transition-colors">
                <span className="material-symbols-outlined icon-fill" style={{ fontSize: 14 }}>bolt</span>
                {boosted ? "Renouveler" : "Booster"}
              </Link>
            )}
          </div>
        </div>

        {/* Sponsoring card */}
        <div className="card p-5 flex flex-col">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${sponsoring ? "bg-primary-light" : "bg-surface-muted"}`}>
                <span className={`material-symbols-outlined ${sponsoring ? "text-primary" : "text-ink-secondary"}`} style={{ fontSize: 22 }}>campaign</span>
              </div>
              <div className="min-w-0">
                <h3 className="font-heading font-bold text-[14px] text-ink-primary leading-tight">Sponsoring</h3>
                {sponsoring && <StatusPill kind="active">Actif</StatusPill>}
                {!sponsoring && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-ink-secondary bg-surface-muted border border-surface-border px-1.5 py-0.5 rounded mt-1">
                    <span className="w-1.5 h-1.5 bg-ink-tertiary rounded-full" />
                    {isBlocked ? "Indisponible" : "Inactif"}
                  </span>
                )}
              </div>
            </div>
          </div>

          {isBlocked ? (
            <div className={`${blockBg} border ${blockBorder} rounded p-3 mb-4 flex-1`}>
              <div className="flex items-start gap-2">
                <span className={`material-symbols-outlined icon-fill ${blockIconColor} shrink-0 mt-[1px]`} style={{ fontSize: 16 }}>info</span>
                <div className={`text-[12px] ${blockTextColor} leading-relaxed`}>
                  {blockMessage}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-[12px] text-ink-secondary leading-relaxed mb-4 flex-1">
              Bannière sponsorisée dans les résultats du moteur BrandUP.
            </p>
          )}

          <div className="flex items-center gap-2 pt-3 border-t border-[#F0F0F0] mt-auto">
            <Link href="/dashboard/sponsoring" className="inline-flex items-center gap-1.5 px-4 py-[9px] text-[13px] font-semibold text-ink-primary bg-white border border-[#D1D1D1] rounded hover:bg-surface-muted transition-colors">
              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>visibility</span>
              Voir
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}
