"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useEffect, useCallback } from "react";

type TabKey = "inscriptions" | "modifications" | "profils" | "rse" | "sponsorings";

interface Tab {
  key: TabKey;
  label: string;
  icon: string;
}

const TABS: Tab[] = [
  { key: "inscriptions", label: "Inscriptions", icon: "how_to_reg" },
  { key: "modifications", label: "Modifications comptes", icon: "edit_note" },
  { key: "profils", label: "Profils", icon: "verified" },
  { key: "rse", label: "RSE", icon: "volunteer_activism" },
  { key: "sponsorings", label: "Sponsorings", icon: "campaign" },
];

interface ValidationHubTabsProps {
  activeTab: TabKey;
  counts: Record<TabKey, number>;
}

export function ValidationHubTabs({ activeTab, counts }: ValidationHubTabsProps): JSX.Element {
  const router = useRouter();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollRight(el.scrollWidth - el.scrollLeft - el.clientWidth > 2);
  }, []);

  useEffect(() => {
    checkScroll();
    window.addEventListener("resize", checkScroll);
    return () => window.removeEventListener("resize", checkScroll);
  }, [checkScroll]);

  return (
    <div className="relative">
      <div
        ref={scrollRef}
        onScroll={checkScroll}
        className="flex items-center gap-1 bg-white border border-surface-border rounded-lg p-1 overflow-x-auto"
      >
        {TABS.map((tab) => {
          const active = tab.key === activeTab;
          const count = counts[tab.key];
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => router.push(`/admin/validation?tab=${tab.key}`)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors whitespace-nowrap ${
                active
                  ? "bg-[#5C2D91]/10 text-[#5C2D91]"
                  : "text-ink-secondary hover:bg-surface-muted hover:text-ink-primary"
              }`}
            >
              <span className={`material-symbols-outlined ${active ? "icon-fill" : ""}`} style={{ fontSize: 18 }}>
                {tab.icon}
              </span>
              {tab.label}
              {count > 0 && (
                <span className={`min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-bold flex items-center justify-center ${
                  active ? "bg-[#5C2D91] text-white" : "bg-surface-muted text-ink-secondary"
                }`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>
      {/* Scroll fade indicator — right edge */}
      {canScrollRight && (
        <div className="absolute right-0 top-0 bottom-0 w-8 pointer-events-none rounded-r-lg bg-gradient-to-l from-white to-transparent md:hidden" />
      )}
    </div>
  );
}
