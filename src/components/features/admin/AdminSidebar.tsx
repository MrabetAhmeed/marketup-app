"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/admin", label: "Vue d'ensemble", icon: "dashboard" },
  { href: "/admin/validation", label: "Validation", icon: "verified" },
  { href: "/admin/entreprises", label: "Entreprises", icon: "business" },
  { href: "/admin/transactions", label: "Transactions", icon: "receipt_long" },
];

export function AdminSidebar(): JSX.Element {
  const pathname = usePathname();

  return (
    <aside className="w-[240px] bg-white border-r border-surface-border h-screen sticky top-0 flex flex-col shrink-0">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-surface-border">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#5C2D91] flex items-center justify-center">
            <span className="material-symbols-outlined text-white" style={{ fontSize: 18 }}>admin_panel_settings</span>
          </div>
          <div>
            <div className="font-heading font-bold text-[14px] text-ink-primary leading-tight">MARKET-UP</div>
            <div className="text-[10px] font-semibold text-[#5C2D91] uppercase tracking-wider">Admin</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 px-3 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const active = item.href === "/admin"
            ? pathname === "/admin"
            : pathname.startsWith(item.href);

          return (
            <Link
              key={item.label}
              href={item.href}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors ${
                active
                  ? "bg-[#5C2D91]/10 text-[#5C2D91]"
                  : "text-ink-secondary hover:bg-surface-muted hover:text-ink-primary"
              }`}
            >
              <span className={`material-symbols-outlined ${active ? "icon-fill" : ""}`} style={{ fontSize: 20 }}>
                {item.icon}
              </span>
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
