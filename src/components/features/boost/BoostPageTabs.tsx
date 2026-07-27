"use client";

import { useState, type ReactNode } from "react";

interface BoostPageTabsProps {
  cardsPanel: ReactNode;
  historyPanel: ReactNode;
  historyCount: number;
}

export function BoostPageTabs({ cardsPanel, historyPanel, historyCount }: BoostPageTabsProps): JSX.Element {
  const [activeTab, setActiveTab] = useState<"acheter" | "historique">("acheter");

  return (
    <div className="card overflow-hidden">
      {/* Tabs nav */}
      <div className="border-b border-surface-border overflow-x-auto">
        <div className="flex px-2 md:px-4 min-w-max">
          <button
            type="button"
            onClick={() => setActiveTab("acheter")}
            className={`inline-flex items-center gap-1.5 px-4 py-3 text-[13px] font-medium border-b-2 transition-colors ${
              activeTab === "acheter"
                ? "text-primary font-semibold border-primary"
                : "text-ink-secondary border-transparent hover:text-ink-primary hover:bg-surface-muted/50"
            }`}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>shopping_cart</span>
            Acheter un Boost
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("historique")}
            className={`inline-flex items-center gap-1.5 px-4 py-3 text-[13px] font-medium border-b-2 transition-colors ${
              activeTab === "historique"
                ? "text-primary font-semibold border-primary"
                : "text-ink-secondary border-transparent hover:text-ink-primary hover:bg-surface-muted/50"
            }`}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>history</span>
            Historique &amp; Suivi
            <span className={`min-w-[18px] h-[18px] px-1 text-[10px] font-bold rounded-full flex items-center justify-center ${
              activeTab === "historique" ? "text-primary bg-primary-light" : "text-ink-tertiary bg-surface-muted"
            }`}>
              {historyCount}
            </span>
          </button>
        </div>
      </div>

      {/* Tab content */}
      <div className="p-5 md:p-6">
        {activeTab === "acheter" ? (
          <>
            <p className="text-[12.5px] text-ink-secondary leading-relaxed mb-5 max-w-3xl">
              Sélectionnez le profil à mettre en avant. Votre profil apparaîtra en{" "}
              <strong className="text-ink-primary">tête des résultats</strong> du moteur, avec un badge{" "}
              <strong className="text-ink-primary">Boosté</strong>, pendant 30 jours.
            </p>
            {cardsPanel}
          </>
        ) : (
          historyPanel
        )}
      </div>
    </div>
  );
}
