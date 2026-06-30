import Link from "next/link";
import { getProfileForAdminReview } from "@/services/admin-profile.service";
import { ProfileReviewActions } from "@/components/features/admin/ProfileReviewActions";
import type { PendingField, GalleryItemAdmin, VideoItemAdmin } from "@/services/admin-profile.service";

interface PageProps {
  params: Promise<{ profileId: string }>;
}

export default async function ProfileReviewPage({ params }: PageProps): Promise<JSX.Element> {
  const { profileId } = await params;
  const profile = await getProfileForAdminReview(profileId, "fr");

  const kindLabel = profile.kind === "brandup" ? "BrandUP" : profile.kind === "traceup" ? "TraceUP" : "LinkUP";
  const kindIcon = profile.kind === "brandup" ? "storefront" : profile.kind === "traceup" ? "play_circle" : "qr_code_2";
  const kindColor = profile.kind === "brandup" ? "#0078D4" : profile.kind === "traceup" ? "#7C3AED" : "#242424";

  const pendingKeys = new Set(profile.pendingFields.map((f) => f.key));
  const pendingMap = new Map(profile.pendingFields.map((f) => [f.key, f]));

  return (
    <div className="max-w-[900px] mx-auto space-y-6">
      {/* Back link */}
      <Link href="/admin/validation/profiles" className="inline-flex items-center gap-1 text-[13px] text-ink-secondary hover:text-ink-primary transition-colors">
        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>arrow_back</span>
        Retour à la liste
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${kindColor}15` }}>
            <span className="material-symbols-outlined" style={{ fontSize: 24, color: kindColor }}>{kindIcon}</span>
          </div>
          <div>
            <h1 className="font-heading font-bold text-[20px] text-ink-primary leading-tight">
              {profile.companyName} — {kindLabel}
            </h1>
            <div className="flex items-center gap-2 mt-1 text-[12px] text-ink-secondary flex-wrap">
              <StatusBadge status={profile.status} />
              <VisibilityBadge isPublic={profile.isPublic} />
              {profile.submittedAt && (
                <span>Soumis le {formatDate(profile.submittedAt)}</span>
              )}
            </div>
          </div>
        </div>
        {profile.status === "pending" && <ProfileReviewActions profileId={profileId} />}
      </div>

      {/* Status banners */}
      <AdminProfileStatusBanner status={profile.status} rejectionReason={profile.rejectionReason} />

      {/* Pending modifications summary */}
      {profile.pendingFields.length > 0 && (
        <section className="bg-[#FFFBEB] border border-[#FDE68A] rounded-lg px-5 py-4">
          <div className="flex items-start gap-2">
            <span className="material-symbols-outlined text-[#D97706] shrink-0 mt-0.5" style={{ fontSize: 18 }}>edit_note</span>
            <div>
              <div className="text-[13px] font-bold text-[#92400E]">
                {profile.pendingFields.length} champ{profile.pendingFields.length > 1 ? "s" : ""} modifié{profile.pendingFields.length > 1 ? "s" : ""}
              </div>
              <div className="text-[12px] text-[#92400E] mt-0.5">
                Les champs modifiés sont marqués avec un badge orange ci-dessous.
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Profile content per kind */}
      {profile.kind === "brandup" && (
        <BrandUpContent
          pitch={profile.pitch}
          about={profile.about}
          gallery={profile.gallery}
          pendingGallery={profile.pendingGallery}
          currentGallery={profile.currentGallery}
          pendingKeys={pendingKeys}
          pendingMap={pendingMap}
        />
      )}
      {profile.kind === "traceup" && (
        <TraceUpContent
          videos={profile.videos}
        />
      )}
      {profile.kind === "linkup" && (
        <LinkUpContent
          socials={profile.socials}
          pendingSocials={profile.pendingSocials}
        />
      )}

      {/* Info */}
      <section className="bg-white border border-surface-border rounded-lg p-5">
        <h3 className="font-heading font-bold text-[14px] text-ink-primary mb-3">Informations</h3>
        <div className="grid grid-cols-2 gap-3 text-[13px]">
          <div>
            <span className="text-ink-tertiary">Email propriétaire</span>
            <div className="font-medium text-ink-primary">{profile.ownerEmail}</div>
          </div>
          <div>
            <span className="text-ink-tertiary">Slug entreprise</span>
            <div className="font-medium text-ink-primary">{profile.companySlug}</div>
          </div>
        </div>
      </section>
    </div>
  );
}

// ---------------------------------------------------------------------------
// BrandUP Content
// ---------------------------------------------------------------------------

function BrandUpContent({
  pitch,
  about,
  gallery,
  pendingGallery,
  currentGallery,
  pendingKeys,
  pendingMap,
}: {
  pitch: string;
  about: string;
  gallery: GalleryItemAdmin[];
  pendingGallery: GalleryItemAdmin[] | null;
  currentGallery: GalleryItemAdmin[] | null;
  pendingKeys: Set<string>;
  pendingMap: Map<string, PendingField>;
}): JSX.Element {
  // Build gallery diff view when gallery change is pending
  // Use currentGallery (pre-edit snapshot) for diff, not gallery (data.gallery which includes Phase 1 uploads)
  const hasGalleryDiff = pendingGallery != null;
  const diffBase = currentGallery ?? gallery;
  const currentIds = new Set(diffBase.map((g) => g.id));
  const pendingIds = new Set((pendingGallery ?? []).map((g) => g.id));

  // All unique images, pending order first then deleted
  const allGalleryImages: Array<GalleryItemAdmin & { diffStatus: "added" | "kept" | "deleted" | "normal" }> = [];
  if (hasGalleryDiff) {
    for (const g of pendingGallery!) {
      const inCurrent = currentIds.has(g.id);
      allGalleryImages.push({ ...g, diffStatus: inCurrent ? "kept" : "added" });
    }
    for (const g of diffBase) {
      if (!pendingIds.has(g.id)) {
        allGalleryImages.push({ ...g, diffStatus: "deleted" });
      }
    }
  } else {
    for (const g of gallery) {
      allGalleryImages.push({ ...g, diffStatus: "normal" });
    }
  }

  return (
    <>
      {/* Présentation */}
      <section className="bg-white border border-surface-border rounded-lg overflow-hidden">
        <div className="px-5 py-4 border-b border-surface-border">
          <h2 className="font-heading font-bold text-[15px] text-ink-primary">Présentation</h2>
        </div>
        <div className="divide-y divide-surface-border">
          <FieldRow label="Description courte (pitch)" value={pitch} fieldKey="pitch" pendingKeys={pendingKeys} pendingMap={pendingMap} />
          <FieldRow label="À propos" value={about} fieldKey="about" pendingKeys={pendingKeys} pendingMap={pendingMap} multiline />
        </div>
      </section>

      {/* Gallery */}
      {allGalleryImages.length > 0 && (
        <section className="bg-white border border-surface-border rounded-lg overflow-hidden">
          <div className="px-5 py-4 border-b border-surface-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="font-heading font-bold text-[15px] text-ink-primary">Galerie</h2>
              {hasGalleryDiff && <ModifiedBadge />}
            </div>
            <span className="text-[11px] font-semibold text-ink-secondary bg-surface-muted border border-surface-border px-2 py-0.5 rounded">
              {hasGalleryDiff ? `${pendingGallery!.length} image${pendingGallery!.length > 1 ? "s" : ""} (proposé)` : `${gallery.length} image${gallery.length > 1 ? "s" : ""}`}
            </span>
          </div>
          <div className="p-5">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {allGalleryImages.map((item, i) => (
                <div key={item.id} className={`border border-surface-border rounded-lg overflow-hidden ${item.diffStatus === "deleted" ? "opacity-50" : ""}`}>
                  <div className="aspect-[4/3] bg-surface-muted relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={item.url} alt={item.caption || `Image ${i + 1}`} className="w-full h-full object-cover" />
                    {item.diffStatus !== "deleted" && (
                      <span className={`absolute top-1.5 left-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded ${
                        i === 0 ? "bg-primary text-white" : "bg-white/90 text-ink-secondary border border-surface-border"
                      }`}>
                        {i === 0 ? "HERO" : `#${i + 1}`}
                      </span>
                    )}
                    {item.diffStatus === "added" && (
                      <span className="absolute top-1.5 right-1.5 text-[8px] font-bold px-1.5 py-0.5 rounded bg-[#16A34A] text-white">
                        NOUVEAU
                      </span>
                    )}
                    {item.diffStatus === "deleted" && (
                      <span className="absolute top-1.5 right-1.5 text-[8px] font-bold px-1.5 py-0.5 rounded bg-[#DC2626] text-white">
                        SUPPRIMÉE
                      </span>
                    )}
                  </div>
                  <div className="p-2 border-t border-surface-border bg-surface-subtle">
                    <p className="text-[11px] font-medium text-ink-primary truncate">{item.caption || "Sans titre"}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// TraceUP Content
// ---------------------------------------------------------------------------

function TraceUpContent({
  videos,
}: {
  videos: VideoItemAdmin[];
}): JSX.Element {
  return (
    <>
      {/* Videos */}
      {videos.length > 0 && (
        <section className="bg-white border border-surface-border rounded-lg overflow-hidden">
          <div className="px-5 py-4 border-b border-surface-border flex items-center justify-between">
            <h2 className="font-heading font-bold text-[15px] text-ink-primary">Vidéos</h2>
            <span className="text-[11px] font-semibold text-ink-secondary bg-surface-muted border border-surface-border px-2 py-0.5 rounded">
              {videos.length} vidéo{videos.length > 1 ? "s" : ""}
            </span>
          </div>
          <div className="p-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {videos.map((v) => (
                <div key={v.id} className="border border-surface-border rounded-lg overflow-hidden">
                  <div className="aspect-video bg-surface-muted relative">
                    {v.thumbnailUrl ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={v.thumbnailUrl} alt={v.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="material-symbols-outlined text-ink-tertiary" style={{ fontSize: 32 }}>play_circle</span>
                      </div>
                    )}
                    <span className="absolute top-1.5 left-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded bg-white/90 text-ink-secondary border border-surface-border">
                      {v.source}
                    </span>
                    <span className="absolute top-1.5 right-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#7C3AED] text-white">
                      {v.category}
                    </span>
                  </div>
                  <div className="p-2 border-t border-surface-border bg-surface-subtle">
                    <p className="text-[11px] font-medium text-ink-primary truncate">{v.title || "Sans titre"}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// LinkUP Content
// ---------------------------------------------------------------------------

function LinkUpContent({
  socials,
  pendingSocials,
}: {
  socials: Array<{ platform: string; url: string | null }>;
  pendingSocials: Array<{ platform: string; url: string | null }> | null;
}): JSX.Element {
  const hasDiff = pendingSocials != null;
  const currentMap = new Map(socials.map((s) => [s.platform, s.url ?? ""]));
  const pendingMap = hasDiff ? new Map(pendingSocials.map((s) => [s.platform, s.url ?? ""])) : null;

  // All platforms (union of current + pending)
  const allPlatforms = Array.from(new Set([
    ...socials.map((s) => s.platform),
    ...(pendingSocials ?? []).map((s) => s.platform),
  ]));

  return (
    <section className="bg-white border border-surface-border rounded-lg overflow-hidden">
      <div className="px-5 py-4 border-b border-surface-border flex items-center gap-2">
        <h2 className="font-heading font-bold text-[15px] text-ink-primary">Réseaux sociaux</h2>
        {hasDiff && <ModifiedBadge />}
      </div>
      <div className="divide-y divide-surface-border">
        {allPlatforms.map((platform) => {
          const current = currentMap.get(platform) ?? "";
          const pending = pendingMap?.get(platform);
          const isModified = hasDiff && pending !== undefined && pending !== current;

          return (
            <div key={platform} className="px-5 py-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[11px] font-bold uppercase tracking-[0.06em] text-ink-secondary capitalize">{platform}</span>
                {isModified && <ModifiedBadge />}
              </div>
              {isModified ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="p-3 bg-surface-muted rounded border border-surface-border">
                    <div className="text-[10px] font-semibold text-ink-tertiary mb-1">ACTUEL</div>
                    <div className="text-[13px] text-ink-secondary truncate">{current || "(vide)"}</div>
                  </div>
                  <div className="p-3 bg-[#F0FDF4] rounded border border-[#86EFAC]">
                    <div className="text-[10px] font-semibold text-[#166534] mb-1">PROPOSÉ</div>
                    <div className="text-[13px] text-ink-primary truncate">{pending || "(vide)"}</div>
                  </div>
                </div>
              ) : (
                <div className="text-[13px] text-ink-primary truncate">
                  {(hasDiff ? (pending ?? current) : current) || "Non renseigné"}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Shared Components
// ---------------------------------------------------------------------------

function FieldRow({
  label,
  value,
  fieldKey,
  pendingKeys,
  pendingMap,
  multiline,
}: {
  label: string;
  value: string;
  fieldKey: string;
  pendingKeys: Set<string>;
  pendingMap: Map<string, PendingField>;
  multiline?: boolean;
}): JSX.Element {
  const isModified = pendingKeys.has(fieldKey);
  const pending = pendingMap.get(fieldKey);

  return (
    <div className="px-5 py-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[11px] font-bold uppercase tracking-[0.06em] text-ink-secondary">{label}</span>
        {isModified && <ModifiedBadge currentValue={pending?.currentValue} />}
      </div>
      {isModified ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="p-3 bg-surface-muted rounded border border-surface-border">
            <div className="text-[10px] font-semibold text-ink-tertiary mb-1">ACTUEL</div>
            <div className={`text-[13px] text-ink-secondary leading-relaxed ${multiline ? "whitespace-pre-wrap" : ""}`}>
              {pending?.currentValue || "(vide)"}
            </div>
          </div>
          <div className="p-3 bg-[#F0FDF4] rounded border border-[#86EFAC]">
            <div className="text-[10px] font-semibold text-[#166534] mb-1">PROPOSÉ</div>
            <div className={`text-[13px] text-ink-primary leading-relaxed ${multiline ? "whitespace-pre-wrap" : ""}`}>
              {pending?.newValue || "(vide)"}
            </div>
          </div>
        </div>
      ) : (
        <div className={`text-[13px] text-ink-primary leading-relaxed ${multiline ? "whitespace-pre-wrap" : ""}`}>
          {value || "(vide)"}
        </div>
      )}
    </div>
  );
}

function ModifiedBadge({ currentValue }: { currentValue?: string }): JSX.Element {
  return (
    <span
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A] cursor-help"
      title={currentValue ? `Ancienne valeur : ${currentValue}` : "Champ modifié"}
    >
      <span className="material-symbols-outlined" style={{ fontSize: 12 }}>edit</span>
      MODIFIÉ
    </span>
  );
}

function AdminProfileStatusBanner({ status, rejectionReason }: { status: string; rejectionReason: string | null }): JSX.Element | null {
  if (status === "active") {
    return (
      <section className="bg-[#F0FDF4] border border-[#86EFAC] rounded-lg px-5 py-4">
        <div className="flex items-start gap-2">
          <span className="material-symbols-outlined text-[#16A34A] shrink-0 mt-0.5" style={{ fontSize: 18 }}>check_circle</span>
          <div className="text-[13px] text-[#166534] font-medium">Ce profil est validé et visible publiquement.</div>
        </div>
      </section>
    );
  }
  if (status === "rejected") {
    return (
      <section className="bg-[#FEF2F2] border border-[#FCA5A5] rounded-lg px-5 py-4">
        <div className="flex items-start gap-2">
          <span className="material-symbols-outlined text-[#B91C1C] shrink-0 mt-0.5" style={{ fontSize: 18 }}>cancel</span>
          <div>
            <div className="text-[13px] text-[#7F1D1D] font-medium">Ce profil a été refusé.</div>
            {rejectionReason && (
              <div className="text-[12px] text-[#991B1B] leading-relaxed whitespace-pre-wrap mt-1">{rejectionReason}</div>
            )}
          </div>
        </div>
      </section>
    );
  }
  if (status === "incomplete") {
    return (
      <section className="bg-surface-muted border border-surface-border rounded-lg px-5 py-4">
        <div className="flex items-start gap-2">
          <span className="material-symbols-outlined text-ink-tertiary shrink-0 mt-0.5" style={{ fontSize: 18 }}>info</span>
          <div className="text-[13px] text-ink-secondary font-medium">Ce profil n&apos;a pas encore été rempli par l&apos;utilisateur.</div>
        </div>
      </section>
    );
  }
  if (status === "disabled" || status === "suspended") {
    return (
      <section className="bg-surface-muted border border-surface-border rounded-lg px-5 py-4">
        <div className="flex items-start gap-2">
          <span className="material-symbols-outlined text-ink-tertiary shrink-0 mt-0.5" style={{ fontSize: 18 }}>block</span>
          <div className="text-[13px] text-ink-secondary font-medium">Ce profil est désactivé.</div>
        </div>
      </section>
    );
  }
  // pending — no banner needed (actions shown instead)
  return null;
}

function StatusBadge({ status }: { status: string }): JSX.Element {
  const config = status === "pending"
    ? { bg: "bg-[#FEF3C7]", text: "text-[#92400E]", label: "En attente" }
    : status === "active"
      ? { bg: "bg-[#F0FDF4]", text: "text-[#16A34A]", label: "Validé" }
      : status === "rejected"
        ? { bg: "bg-[#FEF2F2]", text: "text-[#B91C1C]", label: "Refusé" }
        : status === "incomplete"
          ? { bg: "bg-surface-muted", text: "text-ink-secondary", label: "Incomplet" }
          : { bg: "bg-surface-muted", text: "text-ink-secondary", label: status };

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${config.bg} ${config.text}`}>
      {config.label}
    </span>
  );
}

function VisibilityBadge({ isPublic }: { isPublic: boolean }): JSX.Element {
  return (
    <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold ${
      isPublic ? "bg-[#F0FDF4] text-[#16A34A]" : "bg-surface-muted text-ink-secondary"
    }`}>
      <span className="material-symbols-outlined" style={{ fontSize: 11 }}>{isPublic ? "visibility" : "visibility_off"}</span>
      {isPublic ? "Public" : "Masqué"}
    </span>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}
