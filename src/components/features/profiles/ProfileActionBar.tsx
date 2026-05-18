"use client";

import { useFeatureSoonToast } from "@/hooks/useFeatureSoonToast";
import type { ProfileStatus } from "@/types";

interface ProfileActionBarProps {
  status: ProfileStatus;
  isDirty: boolean;
  onReset: () => void;
  /** Soft mutation props (Phase 4 Sprint 2) */
  softDirtyCount?: number;
  saving?: boolean;
  onSoftSave?: () => void;
}

/**
 * Status-driven action bar for profile editors.
 *
 * - SOFT mutations (isPublic, galleryOrder, socials): wired via onSoftSave (Phase 4 Sprint 2)
 * - HARD mutations (pitch, about, submit): stubbed via useFeatureSoonToast (Phase 4 Sprint 3)
 */
export function ProfileActionBar({ status, isDirty, onReset, softDirtyCount = 0, saving = false, onSoftSave }: ProfileActionBarProps): JSX.Element {
  const toast = useFeatureSoonToast();
  const hasSoftChanges = softDirtyCount > 0;

  // ─── pending: disabled with info ───────────────────────────────────────
  if (status === "pending") {
    return (
      <ActionBarShell>
        <div className="flex items-start md:items-center gap-2 text-[12px] text-ink-secondary leading-snug">
          <span className="material-symbols-outlined icon-fill shrink-0 mt-[1px] md:mt-0 text-[#92400E]" style={{ fontSize: 15 }}>
            schedule
          </span>
          <span>
            <strong className="text-[#92400E]">En attente de validation</strong> · réponse admin sous 24-48 h
          </span>
        </div>
        <div className="shrink-0" />
      </ActionBarShell>
    );
  }

  // ─── disabled: reactivate only ─────────────────────────────────────────
  if (status === "disabled") {
    return (
      <ActionBarShell>
        <div className="flex items-start md:items-center gap-2 text-[12px] text-ink-secondary leading-snug">
          <span className="material-symbols-outlined icon-fill shrink-0 mt-[1px] md:mt-0 text-ink-tertiary" style={{ fontSize: 15 }}>
            block
          </span>
          <span>
            <strong className="text-ink-secondary">Profil désactivé</strong> · contactez le support ou réactivez
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
          <button type="button" onClick={() => toast("FEATURE_COMING_SOON_REACTIVATE")} className="inline-flex items-center gap-1.5 px-4 py-[9px] text-[13px] font-semibold text-white bg-primary hover:bg-primary-hover rounded transition-colors">
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>refresh</span>
            Réactiver le profil
          </button>
        </div>
      </ActionBarShell>
    );
  }

  // ─── incomplete: save draft + submit ───────────────────────────────────
  if (status === "incomplete") {
    const anyDirtyInc = isDirty || hasSoftChanges;
    const softDisabledInc = !hasSoftChanges || saving;
    return (
      <ActionBarShell>
        <div className="flex items-start md:items-center gap-2 text-[12px] text-ink-secondary leading-snug">
          {hasSoftChanges ? (
            <>
              <span className="material-symbols-outlined icon-fill shrink-0 mt-[1px] md:mt-0 text-[#D97706]" style={{ fontSize: 15 }}>edit</span>
              <span>
                <strong className="text-[#92400E]">{softDirtyCount} modification{softDirtyCount > 1 ? "s" : ""} en attente</strong>{" "}
                · cliquez Enregistrer pour appliquer
              </span>
            </>
          ) : (
            <>
              <span className="material-symbols-outlined icon-fill shrink-0 mt-[1px] md:mt-0 text-[#475569]" style={{ fontSize: 15 }}>draft</span>
              <span><strong className="text-[#475569]">Brouillon</strong> · complétez les champs puis soumettez</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
          {anyDirtyInc && (
            <button
              type="button"
              disabled={saving}
              onClick={onReset}
              className={`px-4 py-[9px] text-[13px] font-semibold rounded transition-colors ${!saving ? "text-primary hover:bg-primary-light" : "text-[#C8C6C4] cursor-not-allowed"}`}
            >
              Annuler
            </button>
          )}
          {onSoftSave && (
            <button
              type="button"
              disabled={softDisabledInc}
              onClick={onSoftSave}
              className={`inline-flex items-center gap-1.5 px-4 py-[9px] text-[13px] font-semibold rounded transition-colors ${!softDisabledInc ? "text-white bg-primary hover:bg-primary-hover" : "text-[#A8A8A8] bg-[#E0E0E0] cursor-not-allowed"}`}
            >
              {saving ? (
                <span className="material-symbols-outlined animate-spin" style={{ fontSize: 16 }}>progress_activity</span>
              ) : (
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>save</span>
              )}
              {saving ? "Enregistrement…" : "Enregistrer"}
            </button>
          )}
          <button type="button" onClick={() => toast()} className="px-4 py-[9px] text-[13px] font-semibold text-primary hover:bg-primary-light rounded transition-colors">
            Enregistrer brouillon
          </button>
          <button type="button" onClick={() => toast()} className="inline-flex items-center gap-1.5 px-4 py-[9px] text-[13px] font-semibold text-white bg-primary hover:bg-primary-hover rounded transition-colors">
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>send</span>
            Soumettre
          </button>
        </div>
      </ActionBarShell>
    );
  }

  // ─── rejected: resoumettre ─────────────────────────────────────────────
  if (status === "rejected") {
    const anyDirtyRej = isDirty || hasSoftChanges;
    const softDisabledRej = !hasSoftChanges || saving;
    return (
      <ActionBarShell>
        <div className="flex flex-col gap-1.5 text-[12px] text-ink-secondary leading-snug">
          {hasSoftChanges && (
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined icon-fill shrink-0 text-[#D97706]" style={{ fontSize: 15 }}>edit</span>
              <span>
                <strong className="text-[#92400E]">{softDirtyCount} modification{softDirtyCount > 1 ? "s" : ""} directe{softDirtyCount > 1 ? "s" : ""}</strong>{" "}
                · cliquez Enregistrer pour appliquer
              </span>
            </div>
          )}
          {isDirty && (
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined icon-fill shrink-0 text-[#475569]" style={{ fontSize: 15 }}>draft</span>
              <span><strong className="text-[#475569]">Modifications à resoumettre</strong> · revalidation admin requise</span>
            </div>
          )}
          {!hasSoftChanges && !isDirty && (
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined icon-fill shrink-0 text-[#B91C1C]" style={{ fontSize: 15 }}>error</span>
              <span><strong className="text-[#B91C1C]">Profil refusé</strong> · corrigez puis resoumettez</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
          <button
            type="button"
            disabled={!anyDirtyRej || saving}
            onClick={onReset}
            className={`px-4 py-[9px] text-[13px] font-semibold rounded transition-colors ${anyDirtyRej && !saving ? "text-primary hover:bg-primary-light" : "text-[#C8C6C4] cursor-not-allowed"}`}
          >
            Annuler
          </button>
          {/* Soft save — instant, no admin review */}
          {onSoftSave && (
            <button
              type="button"
              disabled={softDisabledRej}
              onClick={onSoftSave}
              className={`inline-flex items-center gap-1.5 px-4 py-[9px] text-[13px] font-semibold rounded transition-colors ${!softDisabledRej ? "text-white bg-primary hover:bg-primary-hover" : "text-[#A8A8A8] bg-[#E0E0E0] cursor-not-allowed"}`}
            >
              {saving ? (
                <span className="material-symbols-outlined animate-spin" style={{ fontSize: 16 }}>progress_activity</span>
              ) : (
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>save</span>
              )}
              {saving ? "Enregistrement…" : "Enregistrer"}
            </button>
          )}
          {/* Hard submit — admin review required (Sprint 3) */}
          <button
            type="button"
            disabled={!isDirty || saving}
            onClick={() => toast()}
            className={`inline-flex items-center gap-1.5 px-4 py-[9px] text-[13px] font-semibold rounded transition-colors ${isDirty && !saving ? "text-white bg-primary hover:bg-primary-hover" : "text-[#A8A8A8] bg-[#E0E0E0] cursor-not-allowed"}`}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>send</span>
            Enregistrer et resoumettre
          </button>
        </div>
      </ActionBarShell>
    );
  }

  // ─── active: standard edit flow ────────────────────────────────────────
  const anyDirty = isDirty || hasSoftChanges;
  const softSaveDisabled = !hasSoftChanges || saving;

  return (
    <ActionBarShell>
      <div className="flex flex-col gap-1.5 text-[12px] text-ink-secondary leading-snug">
        {hasSoftChanges && (
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined icon-fill shrink-0 text-[#D97706]" style={{ fontSize: 15 }}>edit</span>
            <span>
              <strong className="text-[#92400E]">
                {softDirtyCount} modification{softDirtyCount > 1 ? "s" : ""} directe{softDirtyCount > 1 ? "s" : ""}
              </strong>{" "}
              · cliquez Enregistrer pour appliquer
            </span>
          </div>
        )}
        {isDirty && (
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined icon-fill shrink-0 text-[#475569]" style={{ fontSize: 15 }}>draft</span>
            <span><strong className="text-[#475569]">Modifications à soumettre</strong> · revalidation admin requise</span>
          </div>
        )}
        {!hasSoftChanges && !isDirty && (
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined icon-fill shrink-0 text-status-active-fg" style={{ fontSize: 15 }}>check_circle</span>
            <span><strong className="text-status-active-fg">Profil publié</strong> · aucune modification en attente</span>
          </div>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
        <button
          type="button"
          disabled={!anyDirty || saving}
          onClick={onReset}
          className={`px-4 py-[9px] text-[13px] font-semibold rounded transition-colors ${anyDirty && !saving ? "text-primary hover:bg-primary-light" : "text-[#C8C6C4] cursor-not-allowed"}`}
        >
          Annuler
        </button>
        {/* Soft save — instant, no admin review */}
        {onSoftSave && (
          <button
            type="button"
            disabled={softSaveDisabled}
            onClick={onSoftSave}
            className={`inline-flex items-center gap-1.5 px-4 py-[9px] text-[13px] font-semibold rounded transition-colors ${!softSaveDisabled ? "text-white bg-primary hover:bg-primary-hover" : "text-[#A8A8A8] bg-[#E0E0E0] cursor-not-allowed"}`}
          >
            {saving ? (
              <span className="material-symbols-outlined animate-spin" style={{ fontSize: 16 }}>progress_activity</span>
            ) : (
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>save</span>
            )}
            {saving ? "Enregistrement…" : "Enregistrer"}
          </button>
        )}
        {/* Hard submit — admin review required (Sprint 3) */}
        <button
          type="button"
          disabled={!isDirty || saving}
          onClick={() => toast()}
          className={`inline-flex items-center gap-1.5 px-4 py-[9px] text-[13px] font-semibold rounded transition-colors ${isDirty && !saving ? "text-white bg-primary hover:bg-primary-hover" : "text-[#A8A8A8] bg-[#E0E0E0] cursor-not-allowed"}`}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>send</span>
          Soumettre les modifications
        </button>
      </div>
    </ActionBarShell>
  );
}

function ActionBarShell({ children }: { children: React.ReactNode }): JSX.Element {
  return (
    <section className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-4 pt-2 md:pt-0">
      {children}
    </section>
  );
}
