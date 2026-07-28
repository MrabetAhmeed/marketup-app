"use client";

import { useState, type ReactNode } from "react";

interface SponsoringPageTabsProps {
  cardsPanel: ReactNode;
  historyPanel: ReactNode;
  historyCount: number;
}

export function SponsoringPageTabs({ cardsPanel, historyPanel, historyCount }: SponsoringPageTabsProps): JSX.Element {
  const [activeTab, setActiveTab] = useState<"campagnes" | "historique">("campagnes");

  return (
    <div className="card overflow-hidden">
      <div className="border-b border-surface-border overflow-x-auto">
        <div className="flex px-2 md:px-4 min-w-max">
          <button
            type="button"
            onClick={() => setActiveTab("campagnes")}
            className={`inline-flex items-center gap-1.5 px-4 py-3 text-[13px] font-medium border-b-2 transition-colors ${
              activeTab === "campagnes"
                ? "text-primary font-semibold border-primary"
                : "text-ink-secondary border-transparent hover:text-ink-primary hover:bg-surface-muted/50"
            }`}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>campaign</span>
            Mes campagnes
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
            Historique
            <span className={`min-w-[18px] h-[18px] px-1 text-[10px] font-bold rounded-full flex items-center justify-center ${
              activeTab === "historique" ? "text-primary bg-primary-light" : "text-ink-tertiary bg-surface-muted"
            }`}>
              {historyCount}
            </span>
          </button>
        </div>
      </div>

      <div className="p-5 md:p-6">
        {activeTab === "campagnes" ? cardsPanel : historyPanel}
      </div>
    </div>
  );
}
