"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { StatusPill } from "@/components/shared/StatusPill";
import { ProfileStatusBlock } from "@/components/shared/ProfileStatusBlock";
import { useToast } from "@/components/shared/Toast";
import { ProfileActionBar } from "./ProfileActionBar";
import { AddVideoModal } from "./AddVideoModal";
import { useFeatureSoonToast } from "@/hooks/useFeatureSoonToast";
import type { TraceUpEditorData, VideoItem } from "@/types/profile-editor";
import type { MeResponse } from "@/types/dashboard";

type VideoCategory = "actualite" | "offres" | "astuces" | "emplois";

const TABS: { id: VideoCategory; label: string }[] = [
  { id: "actualite", label: "Actualité" },
  { id: "offres", label: "Offres" },
  { id: "astuces", label: "Astuces" },
  { id: "emplois", label: "Emplois" },
];

interface TraceUpEditorProps {
  profile: TraceUpEditorData;
  company: MeResponse["company"];
}

interface FormValues {
  channelName: string;
  channelDescription: string;
}

export function TraceUpEditor({ profile, company }: TraceUpEditorProps): JSX.Element {
  const router = useRouter();
  const { showToast } = useToast();
  // Per CLAUDE.md §6.10: videos are direct CRUD, only metadata is pending-gated
  const isMetadataReadOnly = profile.status === "pending" || profile.status === "disabled";

  const [activeTab, setActiveTab] = useState<VideoCategory>("actualite");
  const [addVideoOpen, setAddVideoOpen] = useState(false);

  const { register, handleSubmit, formState: { isDirty, errors }, reset, setError, getValues } = useForm<FormValues>({
    defaultValues: {
      channelName: profile.data.channelName,
      channelDescription: profile.data.channelDescription,
    },
  });

  // --- Soft state: isPublic ---
  const [isPublic, setIsPublic] = useState(profile.isPublic);
  const isPublicDirty = isPublic !== profile.isPublic;
  const softDirtyCount = isPublicDirty ? 1 : 0;
  const [saving, setSaving] = useState(false);

  async function handleSoftSave(): Promise<void> {
    if (!isPublicDirty) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/v1/profiles/${profile.id}/soft`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublic }),
      });
      const json = await res.json();

      if (!res.ok) {
        if (json.error?.code === "VALIDATION_FAILED") {
          showToast(json.error.message || "Erreur de validation");
        } else {
          showToast("Erreur, veuillez réessayer");
        }
        return;
      }
      const data = json as TraceUpEditorData;
      setIsPublic(data.isPublic);
      showToast("Modifications enregistrées");
      router.refresh();
    } catch {
      showToast("Erreur, veuillez réessayer");
    } finally {
      setSaving(false);
    }
  }

  // --- Hard submit ---
  const [submitting, setSubmitting] = useState(false);

  async function handleHardSubmit(): Promise<void> {
    const values = getValues();
    setSubmitting(true);
    try {
      const res = await fetch(`/api/v1/profiles/${profile.id}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelName: values.channelName, channelDescription: values.channelDescription }),
      });
      const json = await res.json();
      if (!res.ok) {
        if (json.error?.code === "VALIDATION_FAILED" && json.error.fields) {
          const fields = json.error.fields as Record<string, string[]>;
          for (const [field, messages] of Object.entries(fields)) {
            if (field === "channelName" || field === "channelDescription") {
              setError(field, { message: messages[0] });
            }
          }
          return;
        }
        showToast(json.error?.message || "Erreur, veuillez réessayer");
        return;
      }
      showToast("Profil soumis pour validation");
      reset({ channelName: values.channelName, channelDescription: values.channelDescription });
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

  // Group videos by category
  const videosByCategory: Record<VideoCategory, VideoItem[]> = {
    actualite: [],
    offres: [],
    astuces: [],
    emplois: [],
  };
  for (const v of profile.data.videos) {
    videosByCategory[v.category].push(v);
  }

  const currentVideos = videosByCategory[activeTab];

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
      />

      {/* ═══ CONTEXT BANNER ═══ */}
      <section className="bg-primary-light border border-[#C7DDF1] rounded-lg px-4 py-3 flex items-start md:items-center gap-3">
        <span className="material-symbols-outlined text-primary shrink-0 mt-[1px] md:mt-0" style={{ fontSize: 20 }}>info</span>
        <div className="min-w-0 flex-1 text-[12.5px] text-ink-primary leading-snug">
          L&apos;ajout et la suppression de <strong>vidéos</strong> sont instantanés (pas de validation admin).
          <span className="text-ink-secondary"> Seul le nom et la description de chaîne nécessitent une validation.</span>
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
        <label className="relative inline-block w-9 h-5 shrink-0">
          <input type="checkbox" className="sr-only peer" checked={isPublic} disabled={profile.status !== "active"} onChange={() => setIsPublic(!isPublic)} />
          <span className="absolute inset-0 cursor-pointer rounded-[10px] bg-[#C8C6C4] transition-colors peer-checked:bg-primary peer-disabled:opacity-60 peer-disabled:cursor-not-allowed" />
          <span className="absolute left-[3px] top-[3px] h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-4" />
        </label>
      </section>

      {/* ═══ SECTION: VIDÉOS ═══ */}
      <section className="card overflow-hidden">
        {/* Section header */}
        <div className="px-5 md:px-6 pt-5 md:pt-6 pb-4 flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h3 className="font-heading font-bold text-[15px] text-ink-primary">Vidéos</h3>
            <p className="text-[12px] text-ink-secondary mt-0.5 leading-snug">
              Organisez vos vidéos en 4 catégories — l&apos;ajout et la suppression sont instantanés
            </p>
          </div>
          <button
            type="button"
            onClick={() => setAddVideoOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-[9px] text-[13px] font-semibold text-white bg-primary hover:bg-primary-hover rounded transition-colors shrink-0"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>add</span>
            Ajouter une vidéo
          </button>
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
              <button
                type="button"
                onClick={() => setAddVideoOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-[9px] text-[13px] font-semibold text-white bg-primary hover:bg-primary-hover rounded transition-colors"
              >
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>add</span>
                Ajouter votre première vidéo {TABS.find((t) => t.id === activeTab)?.label}
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {currentVideos.map((video) => (
                <VideoCard key={video.id} video={video} />
              ))}
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="px-5 md:px-6 py-3 bg-surface-subtle border-t border-surface-border flex items-start gap-2 text-[11px] text-ink-tertiary leading-snug">
          <span className="material-symbols-outlined shrink-0 mt-[1px]" style={{ fontSize: 14 }}>info</span>
          <span>
            Plateformes acceptées : <strong>YouTube</strong> · <strong>Dailymotion</strong> · <strong>Vimeo</strong> (URLs publiques).
            L&apos;ajout/suppression ne déclenche pas de revalidation admin.
          </span>
        </div>
      </section>

      {/* ═══ SECTION: CHANNEL METADATA (HARD_MUTATION — admin gated) ═══ */}
      <section className="card p-5 md:p-6">
        <div className="mb-5">
          <h3 className="font-heading font-bold text-[15px] text-ink-primary">Métadonnées de chaîne</h3>
          <p className="text-[12px] text-ink-secondary mt-0.5 leading-snug">
            Nom et description affichés en header de votre profil TraceUP · validation admin requise
          </p>
        </div>
        <div className="space-y-5">
          <div>
            <label htmlFor="tu-channel-name" className="field-label">
              Nom de la chaîne <span className="text-[#B91C1C] font-bold ml-0.5">*</span>
            </label>
            <input
              id="tu-channel-name"
              type="text"
              maxLength={80}
              readOnly={isMetadataReadOnly}
              className={`field-input ${errors.channelName ? "border-[#B91C1C]" : ""}`}
              {...register("channelName")}
            />
            {errors.channelName && (
              <p className="text-[12px] text-[#B91C1C] mt-1">{errors.channelName.message}</p>
            )}
          </div>
          <div>
            <label htmlFor="tu-channel-desc" className="field-label">
              Description de la chaîne <span className="text-[#B91C1C] font-bold ml-0.5">*</span>
            </label>
            <textarea
              id="tu-channel-desc"
              rows={4}
              maxLength={500}
              readOnly={isMetadataReadOnly}
              className={`field-input resize-y min-h-[96px] ${errors.channelDescription ? "border-[#B91C1C]" : ""}`}
              {...register("channelDescription")}
            />
            {errors.channelDescription && (
              <p className="text-[12px] text-[#B91C1C] mt-1">{errors.channelDescription.message}</p>
            )}
          </div>
        </div>
      </section>

      {/* ═══ ACTION BAR ═══ */}
      <ProfileActionBar
        status={profile.status}
        isDirty={isDirty}
        onReset={handleReset}
        softDirtyCount={softDirtyCount}
        saving={saving}
        onSoftSave={handleSoftSave}
        submitting={submitting}
        onHardSubmit={handleSubmit(handleHardSubmit)}
      />

      {/* ═══ ADD VIDEO MODAL ═══ */}
      <AddVideoModal
        open={addVideoOpen}
        onClose={() => setAddVideoOpen(false)}
        defaultCategory={activeTab}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Video card sub-component
// ---------------------------------------------------------------------------

function VideoCard({ video }: { video: VideoItem }): JSX.Element {
  const toast = useFeatureSoonToast();

  return (
    <div className="bg-white border border-surface-border rounded-lg p-3 flex flex-col md:flex-row items-start md:items-center gap-3 md:gap-4">
      {/* Thumbnail */}
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

      {/* Info */}
      <div className="min-w-0 flex-1">
        <h4 className="font-heading font-bold text-[14px] text-ink-primary leading-snug mb-1 truncate">
          {video.title}
        </h4>
        {video.description && (
          <p className="text-[12.5px] text-ink-secondary leading-snug line-clamp-2 mb-2">
            {video.description}
          </p>
        )}
        <div className="flex items-center gap-3 text-[11px] text-ink-tertiary">
          {video.publishedAt && (
            <span className="inline-flex items-center gap-1">
              <span className="material-symbols-outlined" style={{ fontSize: 13 }}>calendar_today</span>
              Ajoutée le {formatDate(video.publishedAt)}
            </span>
          )}
          {video.videoUrl && (
            <span className="inline-flex items-center gap-1">
              <span className="material-symbols-outlined" style={{ fontSize: 13 }}>link</span>
              {truncateUrl(video.videoUrl)}
            </span>
          )}
        </div>
      </div>

      {/* Delete button */}
      <button
        type="button"
        onClick={() => toast()}
        className="inline-flex items-center gap-1.5 px-3 py-[7px] text-[13px] font-semibold text-[#B91C1C] hover:bg-[#FEF2F2] rounded transition-colors self-start md:self-center shrink-0"
        aria-label="Supprimer la vidéo"
      >
        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>delete</span>
        <span className="hidden md:inline">Supprimer</span>
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

function truncateUrl(url: string): string {
  try {
    const u = new URL(url);
    const path = u.pathname + u.search;
    const display = u.host + (path.length > 20 ? path.slice(0, 20) + "…" : path);
    return display;
  } catch {
    return url.length > 30 ? url.slice(0, 30) + "…" : url;
  }
}
