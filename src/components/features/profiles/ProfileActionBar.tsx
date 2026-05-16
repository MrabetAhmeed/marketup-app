"use client";

import { useFeatureSoonToast } from "@/hooks/useFeatureSoonToast";
import type { ProfileStatus } from "@/types";

interface ProfileActionBarProps {
  status: ProfileStatus;
  isDirty: boolean;
  onReset: () => void;
}

/**
 * Status-driven action bar for profile editors.
 * All submit actions are stubbed via useFeatureSoonToast() for Phase 3.
 *
 * Mutation tracking is conceptual only (comments) — real soft/hard
 * distinction activates in Phase 4 when mutations are live.
 */
export function ProfileActionBar({ status, isDirty, onReset }: ProfileActionBarProps): JSX.Element {
  const toast = useFeatureSoonToast();

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
    return (
      <ActionBarShell>
        <div className="flex items-start md:items-center gap-2 text-[12px] text-ink-secondary leading-snug">
          <span className="material-symbols-outlined icon-fill shrink-0 mt-[1px] md:mt-0 text-[#475569]" style={{ fontSize: 15 }}>
            draft
          </span>
          <span>
            <strong className="text-[#475569]">Brouillon</strong> · complétez les champs puis soumettez
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
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
    return (
      <ActionBarShell>
        <div className="flex items-start md:items-center gap-2 text-[12px] text-ink-secondary leading-snug">
          {isDirty ? (
            <>
              <span className="material-symbols-outlined icon-fill shrink-0 mt-[1px] md:mt-0 text-[#475569]" style={{ fontSize: 15 }}>draft</span>
              <span><strong className="text-[#475569]">Modifications non soumises</strong> · soumettez pour publication</span>
            </>
          ) : (
            <>
              <span className="material-symbols-outlined icon-fill shrink-0 mt-[1px] md:mt-0 text-[#B91C1C]" style={{ fontSize: 15 }}>error</span>
              <span><strong className="text-[#B91C1C]">Profil refusé</strong> · corrigez puis resoumettez</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
          <button
            type="button"
            disabled={!isDirty}
            onClick={onReset}
            className={`px-4 py-[9px] text-[13px] font-semibold rounded transition-colors ${isDirty ? "text-primary hover:bg-primary-light" : "text-[#C8C6C4] cursor-not-allowed"}`}
          >
            Annuler
          </button>
          <button
            type="button"
            disabled={!isDirty}
            onClick={() => toast()}
            className={`inline-flex items-center gap-1.5 px-4 py-[9px] text-[13px] font-semibold rounded transition-colors ${isDirty ? "text-white bg-primary hover:bg-primary-hover" : "text-[#A8A8A8] bg-[#E0E0E0] cursor-not-allowed"}`}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>send</span>
            Enregistrer et resoumettre
          </button>
        </div>
      </ActionBarShell>
    );
  }

  // ─── active: standard edit flow ────────────────────────────────────────
  return (
    <ActionBarShell>
      <div className="flex items-start md:items-center gap-2 text-[12px] text-ink-secondary leading-snug">
        {isDirty ? (
          <>
            <span className="material-symbols-outlined icon-fill shrink-0 mt-[1px] md:mt-0 text-[#475569]" style={{ fontSize: 15 }}>draft</span>
            <span><strong className="text-[#475569]">Modifications non soumises</strong> · les changements nécessitent une revalidation admin</span>
          </>
        ) : (
          <>
            <span className="material-symbols-outlined icon-fill shrink-0 mt-[1px] md:mt-0 text-status-active-fg" style={{ fontSize: 15 }}>check_circle</span>
            <span><strong className="text-status-active-fg">Profil publié</strong> · les modifications nécessitent une revalidation admin</span>
          </>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
        <button
          type="button"
          disabled={!isDirty}
          onClick={onReset}
          className={`px-4 py-[9px] text-[13px] font-semibold rounded transition-colors ${isDirty ? "text-primary hover:bg-primary-light" : "text-[#C8C6C4] cursor-not-allowed"}`}
        >
          Annuler
        </button>
        <button
          type="button"
          disabled={!isDirty}
          onClick={() => toast()}
          className={`inline-flex items-center gap-1.5 px-4 py-[9px] text-[13px] font-semibold rounded transition-colors ${isDirty ? "text-white bg-primary hover:bg-primary-hover" : "text-[#A8A8A8] bg-[#E0E0E0] cursor-not-allowed"}`}
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
