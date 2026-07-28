"use client";

import { signOut } from "next-auth/react";
import { AdminNotificationBell } from "./AdminNotificationBell";

interface AdminTopbarProps {
  initials: string;
  pendingCounts: { profiles: number; companies: number; companyUpdates: number; rse: number };
}

export function AdminTopbar({ initials, pendingCounts }: AdminTopbarProps): JSX.Element {
  return (
    <header className="h-14 bg-white border-b border-surface-border flex items-center justify-between px-4 md:px-6 shrink-0">
      <div className="flex items-center gap-2 text-[13px] text-ink-secondary pl-14 md:pl-0">
        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>shield_person</span>
        <span className="hidden sm:inline">Espace administration</span>
      </div>
      <div className="flex items-center gap-3">
        <AdminNotificationBell counts={pendingCounts} />
        <div className="w-8 h-8 rounded-full bg-[#5C2D91] flex items-center justify-center text-white text-[12px] font-bold">
          {initials}
        </div>
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="text-[12px] text-ink-secondary hover:text-ink-primary transition-colors"
        >
          Déconnexion
        </button>
      </div>
    </header>
  );
}
