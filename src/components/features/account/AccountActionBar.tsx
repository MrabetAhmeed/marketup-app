"use client";

import { useFeatureSoonToast } from "@/hooks/useFeatureSoonToast";

interface AccountActionBarProps {
  isDirty: boolean;
  dirtyCount: number;
  onReset: () => void;
}

export function AccountActionBar({ isDirty, dirtyCount, onReset }: AccountActionBarProps): JSX.Element {
  const toast = useFeatureSoonToast();

  return (
    <section className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-4 pt-2 md:pt-0">
      <div className="flex items-start md:items-center gap-2 text-[12px] text-ink-secondary leading-snug">
        {isDirty ? (
          <>
            <span
              className="material-symbols-outlined icon-fill shrink-0 mt-[1px] md:mt-0 text-[#D97706]"
              style={{ fontSize: 15 }}
            >
              edit
            </span>
            <span>
              <strong className="text-[#92400E]">
                {dirtyCount} modification{dirtyCount > 1 ? "s" : ""} en attente
              </strong>{" "}
              · cliquez Enregistrer pour soumettre
            </span>
          </>
        ) : (
          <>
            <span
              className="material-symbols-outlined icon-fill shrink-0 mt-[1px] md:mt-0 text-status-active-fg"
              style={{ fontSize: 15 }}
            >
              check_circle
            </span>
            <span>
              <strong className="text-status-active-fg">Compte à jour</strong> ·
              aucune modification en attente · synchronisé avec vos 3 profils
            </span>
          </>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
        <button
          type="button"
          disabled={!isDirty}
          onClick={onReset}
          className={`px-4 py-[9px] text-[13px] font-semibold rounded transition-colors ${
            isDirty
              ? "text-primary hover:bg-primary-light cursor-pointer"
              : "text-[#C8C6C4] cursor-not-allowed"
          }`}
        >
          Annuler
        </button>
        <button
          type="button"
          disabled={!isDirty}
          onClick={() => toast()}
          className={`inline-flex items-center gap-1.5 px-4 py-[9px] text-[13px] font-semibold rounded transition-colors ${
            isDirty
              ? "text-white bg-primary hover:bg-primary-hover cursor-pointer"
              : "text-[#A8A8A8] bg-[#E0E0E0] border border-[#E0E0E0] cursor-not-allowed"
          }`}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>save</span>
          Enregistrer
        </button>
      </div>
    </section>
  );
}
