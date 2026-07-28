"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";

interface AdminNotificationBellProps {
  counts: { profiles: number; companies: number; companyUpdates: number; rse: number };
}

export function AdminNotificationBell({ counts }: AdminNotificationBellProps): JSX.Element {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const total = counts.profiles + counts.companies + counts.companyUpdates + counts.rse;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent): void {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative w-9 h-9 rounded-lg flex items-center justify-center text-ink-secondary hover:bg-surface-muted transition-colors"
      >
        <span className="material-symbols-outlined" style={{ fontSize: 22 }}>notifications</span>
        {total > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[#DC2626] text-white text-[10px] font-bold flex items-center justify-center">
            {total > 99 ? "99+" : total}
          </span>
        )}
      </button>

      {open && (
        <div className="max-md:fixed max-md:left-4 max-md:right-4 max-md:top-[57px] max-md:w-auto max-md:max-w-none md:absolute md:right-0 md:top-full md:mt-1 md:w-[calc(100vw-2rem)] md:max-w-[300px] bg-white border border-surface-border rounded-lg shadow-lg z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-surface-border">
            <h3 className="font-heading font-bold text-[13px] text-ink-primary">En attente de validation</h3>
          </div>
          <div className="py-1">
            <Link
              href="/admin/validation?tab=profils"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 hover:bg-surface-muted transition-colors"
            >
              <span className="material-symbols-outlined text-[#5C2D91]" style={{ fontSize: 20 }}>verified</span>
              <span className="flex-1 text-[13px] text-ink-primary">{counts.profiles} profil{counts.profiles !== 1 ? "s" : ""}</span>
              {counts.profiles > 0 && <span className="w-2 h-2 rounded-full bg-[#DC2626]" />}
            </Link>
            <Link
              href="/admin/validation?tab=inscriptions"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 hover:bg-surface-muted transition-colors"
            >
              <span className="material-symbols-outlined text-[#D97706]" style={{ fontSize: 20 }}>how_to_reg</span>
              <span className="flex-1 text-[13px] text-ink-primary">{counts.companies} inscription{counts.companies !== 1 ? "s" : ""}</span>
              {counts.companies > 0 && <span className="w-2 h-2 rounded-full bg-[#DC2626]" />}
            </Link>
            <Link
              href="/admin/validation?tab=modifications"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 hover:bg-surface-muted transition-colors"
            >
              <span className="material-symbols-outlined text-[#D97706]" style={{ fontSize: 20 }}>edit_note</span>
              <span className="flex-1 text-[13px] text-ink-primary">{counts.companyUpdates} modification{counts.companyUpdates !== 1 ? "s" : ""}</span>
              {counts.companyUpdates > 0 && <span className="w-2 h-2 rounded-full bg-[#DC2626]" />}
            </Link>
            <Link
              href="/admin/validation?tab=rse"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 hover:bg-surface-muted transition-colors"
            >
              <span className="material-symbols-outlined text-[#C5A059]" style={{ fontSize: 20 }}>volunteer_activism</span>
              <span className="flex-1 text-[13px] text-ink-primary">{counts.rse} reçu{counts.rse !== 1 ? "s" : ""} RSE</span>
              {counts.rse > 0 && <span className="w-2 h-2 rounded-full bg-[#DC2626]" />}
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
