"use client";

import { signOut } from "next-auth/react";

interface AdminTopbarProps {
  initials: string;
}

export function AdminTopbar({ initials }: AdminTopbarProps): JSX.Element {
  return (
    <header className="h-14 bg-white border-b border-surface-border flex items-center justify-between px-6 shrink-0">
      <div className="flex items-center gap-2 text-[13px] text-ink-secondary">
        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>shield_person</span>
        <span>Espace administration</span>
      </div>
      <div className="flex items-center gap-3">
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
