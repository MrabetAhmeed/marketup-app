"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { StatusPill } from "@/components/shared/StatusPill";
import { ProfileStatusBlock } from "@/components/shared/ProfileStatusBlock";
import { useToast } from "@/components/shared/Toast";
import type { TraceUpEditorData, VideoItem } from "@/types/profile-editor";
import type { MeResponse } from "@/types/dashboard";
import { AddVideoModal } from "./AddVideoModal";
import { VideoDeleteConfirm } from "./VideoDeleteConfirm";

type VideoCategory = "actualite" | "offres" | "astuces" | "emplois";

const TABS: { id: VideoCategory; label: string }[] = [
  { id: "actualite", label: "Actualités" },
  { id: "offres", label: "Offres" },
  { id: "astuces", label: "Astuces" },
  { id: "emplois", label: "Emplois" },
];

interface TraceUpEditorProps {
  profile: TraceUpEditorData;
  company: MeResponse["company"];
}

export function TraceUpEditor({ profile, company }: TraceUpEditorProps): JSX.Element {
  const router = useRouter();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<VideoCategory>("actualite");
  const [addVideoOpen, setAddVideoOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);

  const isPending = profile.status === "pending";
  const isRejected = profile.status === "rejected";
  const isDisabled = profile.status === "disabled";

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

  // --- Cancel pending ---
  const [cancelling, setCancelling] = useState(false);

  async function handleCancelPending(): Promise<void> {
    setCancelling(true);
    try {
      const res = await fetch(`/api/v1/profiles/${profile.id}/pending`, { method: "DELETE" });
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

  // --- Re-submit from rejected ---
  const [submitting, setSubmitting] = useState(false);

  async function handleResubmit(): Promise<void> {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/v1/profiles/${profile.id}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const json = await res.json();
      if (!res.ok) {
        showToast(json.error?.message || "Erreur");
        return;
      }
      showToast("Soumis en validation administrateur");
      router.refresh();
    } catch {
      showToast("Erreur, veuillez réessayer");
    } finally {
      setSubmitting(false);
    }
  }

  // --- Remove video from pending ---
  const [removingPendingId, setRemovingPendingId] = useState<string | null>(null);

  async function handleRemoveFromPending(videoId: string): Promise<void> {
    setRemovingPendingId(videoId);
    try {
      const res = await fetch(`/api/v1/profiles/${profile.id}/videos/${videoId}/pending`, { method: "DELETE" });
      if (!res.ok) {
        const json = await res.json();
        showToast(json.error?.message || "Erreur");
        return;
      }
      showToast("Vidéo retirée de la soumission");
      router.refresh();
    } catch {
      showToast("Erreur, veuillez réessayer");
    } finally {
      setRemovingPendingId(null);
    }
  }

  // Published videos (data.videos)
  const videosByCategory: Record<VideoCategory, VideoItem[]> = {
    actualite: [], offres: [], astuces: [], emplois: [],
  };
  for (const v of profile.data.videos) {
    videosByCategory[v.category].push(v);
  }
  const currentVideos = videosByCategory[activeTab];

  // Pending videos (only the NEW ones not in data.videos)
  const dataVideoIds = new Set(profile.data.videos.map((v) => v.id));
  const pendingNewVideos = (profile.pendingVideos ?? []).filter((v) => !dataVideoIds.has(v.id));

  return (
    <div className="max-w-[1120px] mx-auto space-y-6">
      {/* ═══ PAGE HEADER ═══ */}
      <section className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-11 h-11 rounded-lg bg-primary-light flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-primary" style={{ fontSize: 24 }}>play_circle</span>
          </div>
          <div className="min-w-0">
            <h2 className="font-heading font-bold text-[20px] text-ink-primary leading-tight">Profil TraceUP</h2>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <StatusPill kind={profile.status} />
              {profile.submittedAt && (
                <span className="text-[11px] text-ink-tertiary">Soumis le {formatDate(profile.submittedAt)}</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link href={`/traceup/${company.slug}`} target="_blank" className="inline-flex items-center gap-1.5 px-4 py-[9px] text-[13px] font-semibold text-ink-primary bg-white border border-[#D1D1D1] rounded hover:bg-surface-muted transition-colors">
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

      {/* ═══ PENDING BANNER ═══ */}
      {isPending && (
        <section className="bg-[#FEF3C7] border border-[#FDE68A] rounded-lg px-4 py-3 flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <span className="material-symbols-outlined text-[#D97706] shrink-0 mt-[1px] sm:mt-0" style={{ fontSize: 20 }}>schedule</span>
            <div className="min-w-0 flex-1 text-[12.5px] text-[#92400E] leading-snug">
              <strong>Profil en cours de validation par l&apos;administrateur.</strong>{" "}
              {profile.publishedAt
                ? "Le profil reste visible avec vos vidéos publiées."
                : "Le profil est temporairement masqué publiquement."
              }{" "}Les suppressions de vidéos publiées sont bloquées.
            </div>
          </div>
          <button
            type="button"
            disabled={cancelling}
            onClick={handleCancelPending}
            className="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 text-[12px] font-semibold text-[#92400E] bg-white border border-[#FDE68A] rounded hover:bg-[#FFFBEB] transition-colors disabled:opacity-60 self-end sm:self-center"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>undo</span>
            {cancelling ? "Annulation…" : "Annuler"}
          </button>
        </section>
      )}

      {/* ═══ CONTEXT BANNER ═══ */}
      <section className="bg-primary-light border border-[#C7DDF1] rounded-lg px-4 py-3 flex items-start md:items-center gap-3">
        <span className="material-symbols-outlined text-primary shrink-0 mt-[1px] md:mt-0" style={{ fontSize: 20 }}>info</span>
        <div className="min-w-0 flex-1 text-[12.5px] text-ink-primary leading-snug">
          L&apos;ajout de vidéos nécessite une <strong>validation administrateur</strong>.
          <span className="text-ink-secondary"> La suppression de vidéos publiées est instantanée.</span>
        </div>
      </section>

      {/* ═══ VISIBILITY TOGGLE ═══ */}
      <section className="card p-5 flex items-center gap-4">
        <div className="w-10 h-10 rounded-lg bg-primary-light flex items-center justify-center shrink-0">
          <span className="material-symbols-outlined text-primary" style={{ fontSize: 20 }}>visibility</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-heading font-semibold text-[14px] text-ink-primary leading-tight">Profil public visible</div>
          <div className="text-[12px] text-ink-secondary mt-0.5">Quand activé, votre profil apparaît dans le moteur TraceUP.</div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <label className="relative inline-block w-9 h-5">
            <input type="checkbox" className="sr-only peer" checked={isPublic} disabled={isPending || isDisabled} onChange={() => setIsPublic(!isPublic)} />
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
            <label className={`flex items-center gap-2 cursor-pointer ${(isPending || isDisabled) ? "opacity-60 pointer-events-none" : ""}`}>
              <input type="radio" name="placeholderMode" value="hidden" checked={placeholderMode === "hidden"}
                onChange={() => setPlaceholderMode("hidden")} disabled={isPending || isDisabled}
                className="w-4 h-4 text-primary border-[#D1D1D1] focus:ring-primary" />
              <span className="text-[13px] text-ink-primary">Masquer complètement</span>
            </label>
            <label className={`flex items-center gap-2 cursor-pointer ${(isPending || isDisabled) ? "opacity-60 pointer-events-none" : ""}`}>
              <input type="radio" name="placeholderMode" value="coming_soon" checked={placeholderMode === "coming_soon"}
                onChange={() => setPlaceholderMode("coming_soon")} disabled={isPending || isDisabled}
                className="w-4 h-4 text-primary border-[#D1D1D1] focus:ring-primary" />
              <span className="text-[13px] text-ink-primary">Afficher &laquo;&nbsp;Bient&ocirc;t disponible&nbsp;&raquo;</span>
            </label>
          </div>
          <p className="text-[11px] text-ink-secondary mt-2 leading-snug">
            Les visiteurs de votre lien/QR verront une page d&apos;attente au lieu d&apos;une erreur
          </p>
        </section>
      )}

      {/* ═══ SECTION: PENDING VIDEOS ═══ */}
      {pendingNewVideos.length > 0 && (
        <section className="card overflow-hidden border-[#FDE68A]">
          <div className="px-5 md:px-6 pt-5 md:pt-6 pb-4 flex items-start justify-between gap-3 flex-wrap bg-[#FFFBEB]">
            <div>
              <h3 className="font-heading font-bold text-[15px] text-[#92400E]">
                Vidéos en attente d&apos;ajout
                <span className="ml-2 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold bg-[#FDE68A] text-[#92400E]">
                  {pendingNewVideos.length}
                </span>
              </h3>
              <p className="text-[12px] text-[#92400E]/70 mt-0.5 leading-snug">
                {isPending ? "En cours de validation administrateur" : isRejected ? "Refusées — corrigez et re-soumettez" : "Seront soumises pour validation"}
              </p>
            </div>
          </div>
          <div className="p-5 md:p-6 space-y-3">
            {pendingNewVideos.map((video) => (
              <PendingVideoCard
                key={video.id}
                video={video}
                removing={removingPendingId === video.id}
                onRemove={() => handleRemoveFromPending(video.id)}
              />
            ))}
          </div>
        </section>
      )}

      {/* ═══ SECTION: PUBLISHED VIDEOS ═══ */}
      <section className="card overflow-hidden">
        <div className="px-5 md:px-6 pt-5 md:pt-6 pb-4 flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h3 className="font-heading font-bold text-[15px] text-ink-primary">Vidéos publiées</h3>
            <p className="text-[12px] text-ink-secondary mt-0.5 leading-snug">
              Organisez vos vidéos en 4 catégories
            </p>
          </div>
          {!isDisabled && (
            <button
              type="button"
              onClick={() => setAddVideoOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-[9px] text-[13px] font-semibold text-white bg-primary hover:bg-primary-hover rounded transition-colors shrink-0"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>add</span>
              Ajouter une vidéo
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="border-b border-surface-border overflow-x-auto">
          <div className="flex px-2 md:px-4 min-w-max">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2.5 text-[13px] font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? "border-primary text-primary"
                    : "border-transparent text-ink-secondary hover:text-ink-primary hover:border-ink-tertiary"
                }`}
              >
                {tab.label}{" "}
                <span className={`inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold ml-1 ${
                  activeTab === tab.id ? "bg-primary text-white" : "bg-surface-muted text-ink-secondary"
                }`}>
                  {videosByCategory[tab.id].length}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Tab panel */}
        <div className="p-5 md:p-6">
          {currentVideos.length === 0 ? (
            <div className="py-10 md:py-16 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-surface-muted mb-4">
                <span className="material-symbols-outlined text-ink-tertiary" style={{ fontSize: 32 }}>play_circle</span>
              </div>
              <h4 className="font-heading font-bold text-[15px] text-ink-primary mb-1">
                Aucune vidéo dans cette catégorie
              </h4>
              <p className="text-[12.5px] text-ink-secondary max-w-md mx-auto mb-5 leading-relaxed">
                Partagez des contenus vidéo liés à votre expertise. Vos clients apprécieront.
              </p>
              {!isDisabled && (
                <button
                  type="button"
                  onClick={() => setAddVideoOpen(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-[9px] text-[13px] font-semibold text-white bg-primary hover:bg-primary-hover rounded transition-colors"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>add</span>
                  Ajouter votre première vidéo {TABS.find((t) => t.id === activeTab)?.label}
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {currentVideos.map((video) => (
                <VideoCard
                  key={video.id}
                  video={video}
                  deleteDisabled={isPending}
                  onDelete={() => setDeleteTarget({ id: video.id, title: video.title })}
                />
              ))}
            </div>
          )}
        </div>

        <div className="px-5 md:px-6 py-3 bg-surface-subtle border-t border-surface-border flex items-start gap-2 text-[11px] text-ink-tertiary leading-snug">
          <span className="material-symbols-outlined shrink-0 mt-[1px]" style={{ fontSize: 14 }}>info</span>
          <span>
            Plateformes acceptées : <strong>YouTube</strong> · <strong>Dailymotion</strong> · <strong>Vimeo</strong> (URLs publiques).
          </span>
        </div>
      </section>

      {/* ═══ RE-SUBMIT BAR (rejected with pending videos) ═══ */}
      {isRejected && pendingNewVideos.length > 0 && (
        <div className="sticky bottom-0 z-30 bg-white border-t border-surface-border px-4 py-3 flex items-center justify-end gap-4 shadow-[0_-2px_8px_rgba(0,0,0,0.04)]">
          <button type="button" disabled={submitting} onClick={handleResubmit}
            className="inline-flex items-center gap-1.5 px-5 py-[9px] text-[13px] font-semibold text-white bg-primary hover:bg-primary-hover rounded transition-colors disabled:opacity-60">
            {submitting
              ? <span className="material-symbols-outlined animate-spin" style={{ fontSize: 16 }}>progress_activity</span>
              : <span className="material-symbols-outlined" style={{ fontSize: 16 }}>send</span>}
            {submitting ? "Soumission…" : "Soumettre pour validation"}
          </button>
        </div>
      )}

      {/* ═══ MODALS ═══ */}
      <AddVideoModal
        open={addVideoOpen}
        onClose={() => setAddVideoOpen(false)}
        profileId={profile.id}
        defaultCategory={activeTab}
      />
      <VideoDeleteConfirm
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        profileId={profile.id}
        videoId={deleteTarget?.id ?? ""}
        title={deleteTarget?.title ?? ""}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Video card (published)
// ---------------------------------------------------------------------------

function VideoCard({ video, deleteDisabled, onDelete }: { video: VideoItem; deleteDisabled: boolean; onDelete: () => void }): JSX.Element {
  return (
    <div className="bg-white border border-surface-border rounded-lg p-3 flex flex-col md:flex-row items-start md:items-center gap-3 md:gap-4">
      <div className="w-full md:w-[160px] aspect-video bg-surface-muted rounded overflow-hidden relative shrink-0 flex items-center justify-center">
        {video.thumbnailUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={video.thumbnailUrl} alt={video.title} className="w-full h-full object-cover" />
        ) : (
          <span className="material-symbols-outlined text-ink-tertiary" style={{ fontSize: 32 }}>play_circle</span>
        )}
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 hover:opacity-100 transition-opacity">
          <span className="material-symbols-outlined icon-fill text-white" style={{ fontSize: 36 }}>play_circle</span>
        </div>
      </div>
      <div className="min-w-0 flex-1">
        <h4 className="font-heading font-bold text-[14px] text-ink-primary leading-snug mb-1 truncate">{video.title}</h4>
        {video.description && (
          <p className="text-[12.5px] text-ink-secondary leading-snug line-clamp-2 mb-2">{video.description}</p>
        )}
        <div className="flex items-center gap-3 text-[11px] text-ink-tertiary">
          {video.publishedAt && (
            <span className="inline-flex items-center gap-1">
              <span className="material-symbols-outlined" style={{ fontSize: 13 }}>calendar_today</span>
              Ajoutée le {formatDate(video.publishedAt)}
            </span>
          )}
        </div>
      </div>
      <button
        type="button"
        onClick={onDelete}
        disabled={deleteDisabled}
        title={deleteDisabled ? "Annulez la soumission en cours pour supprimer" : "Supprimer la vidéo"}
        className="inline-flex items-center gap-1.5 px-3 py-[7px] text-[13px] font-semibold text-[#B91C1C] hover:bg-[#FEF2F2] rounded transition-colors self-start md:self-center shrink-0 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
        aria-label="Supprimer la vidéo"
      >
        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>delete</span>
        <span className="hidden md:inline">Supprimer</span>
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pending video card
// ---------------------------------------------------------------------------

function PendingVideoCard({ video, removing, onRemove }: { video: VideoItem; removing: boolean; onRemove: () => void }): JSX.Element {
  return (
    <div className="bg-white border border-[#FDE68A] rounded-lg p-3 flex flex-col md:flex-row items-start md:items-center gap-3 md:gap-4">
      <div className="w-full md:w-[160px] aspect-video bg-surface-muted rounded overflow-hidden relative shrink-0 flex items-center justify-center">
        {video.thumbnailUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={video.thumbnailUrl} alt={video.title} className="w-full h-full object-cover" />
        ) : (
          <span className="material-symbols-outlined text-ink-tertiary" style={{ fontSize: 32 }}>play_circle</span>
        )}
        <span className="absolute top-1.5 right-1.5 text-[8px] font-bold px-1.5 py-0.5 rounded bg-[#D97706] text-white">
          EN ATTENTE
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <h4 className="font-heading font-bold text-[14px] text-ink-primary leading-snug mb-1 truncate">{video.title}</h4>
        {video.description && (
          <p className="text-[12.5px] text-ink-secondary leading-snug line-clamp-2 mb-2">{video.description}</p>
        )}
      </div>
      <button
        type="button"
        onClick={onRemove}
        disabled={removing}
        className="inline-flex items-center gap-1.5 px-3 py-[7px] text-[13px] font-semibold text-[#92400E] hover:bg-[#FEF3C7] rounded transition-colors self-start md:self-center shrink-0 disabled:opacity-60"
      >
        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>close</span>
        <span className="hidden md:inline">{removing ? "Retrait…" : "Retirer"}</span>
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}
