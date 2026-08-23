"use client";

import { useState, useMemo, useRef, useEffect } from "react";

export interface SectorPickerItem {
  slug: string;
  name: string;
  description: string;
  group: string;
  groupOrder: number;
  order: number;
}

interface SectorPickerModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (slug: string, name: string) => void;
  sectors: SectorPickerItem[];
  title?: string;
  /** When true, show a "Tous les secteurs" entry at the top to clear the filter. Default false (signup). */
  showAllOption?: boolean;
}

export function SectorPickerModal({
  open,
  onClose,
  onSelect,
  sectors,
  title = "Choisir un secteur",
  showAllOption = false,
}: SectorPickerModalProps): JSX.Element | null {
  const [search, setSearch] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus search on open
  useEffect(() => {
    if (open) {
      setSearch("");
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  // Filter sectors by search
  const filtered = useMemo(() => {
    if (!search.trim()) return sectors;
    const q = search.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return sectors.filter(
      (s) =>
        s.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(q) ||
        s.description.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(q) ||
        s.group.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(q),
    );
  }, [sectors, search]);

  // Group sectors by group name (preserving order)
  const grouped = useMemo(() => {
    const map = new Map<string, SectorPickerItem[]>();
    for (const s of filtered) {
      const key = s.group || "Autre";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    }
    return Array.from(map.entries());
  }, [filtered]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Dialog */}
      <div className="relative w-full max-w-lg mx-4 md:mx-0 bg-white rounded-xl shadow-lg max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 pt-5 pb-3 border-b border-surface-border shrink-0">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-heading font-bold text-[17px] text-ink-primary">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-ink-tertiary hover:bg-surface-muted transition-colors"
              aria-label="Fermer"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>close</span>
            </button>
          </div>
          {/* Search */}
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-ink-tertiary" style={{ fontSize: 18 }}>
              search
            </span>
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un secteur…"
              className="w-full pl-9 pr-3 py-2 text-[13px] border border-surface-border rounded-lg bg-surface-subtle focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>
        </div>

        {/* Scrollable list */}
        <div className="flex-1 overflow-y-auto px-5 py-3">
          {/* "Tous les secteurs" — always visible, outside filtered groups */}
          {showAllOption && (
            <>
              <button
                type="button"
                onClick={() => {
                  onSelect("", "");
                  onClose();
                }}
                className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-surface-subtle transition-colors flex items-center gap-3 text-[13px] font-semibold text-ink-secondary"
              >
                <span className="material-symbols-outlined text-ink-tertiary" style={{ fontSize: 18 }}>clear_all</span>
                Tous les secteurs
              </button>
              <div className="border-b border-surface-border my-2" />
            </>
          )}
          {grouped.length === 0 ? (
            <div className="py-8 text-center text-[13px] text-ink-tertiary">
              Aucun secteur correspondant
            </div>
          ) : (
            grouped.map(([groupName, items]) => (
              <div key={groupName} className="mb-4 last:mb-0">
                {/* Group header — NOT clickable */}
                <div className="px-1 py-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-ink-tertiary">
                  {groupName}
                </div>
                {/* Items */}
                {items.map((s, idx) => (
                  <button
                    key={s.slug}
                    type="button"
                    onClick={() => {
                      onSelect(s.slug, s.name);
                      onClose();
                    }}
                    className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-surface-subtle transition-colors flex items-start gap-3"
                  >
                    <span className="text-[13px] font-semibold text-ink-tertiary w-5 shrink-0 text-right mt-px">
                      {idx + 1}.
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] font-semibold text-ink-primary leading-snug">
                        {s.name}
                      </div>
                      {s.description && (
                        <div className="text-[11.5px] text-ink-secondary leading-snug mt-0.5">
                          {s.description}
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
