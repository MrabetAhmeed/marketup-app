"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/admin", label: "Vue d'ensemble", icon: "dashboard" },
  { href: "/admin/validation/profiles", label: "Validation profils", icon: "verified" },
  { href: "/admin/validation/comptes", label: "Validation comptes", icon: "how_to_reg" },
  { href: "/admin/validation/rse", label: "Validation RSE", icon: "volunteer_activism" },
  { href: "#", label: "Entreprises", icon: "business", disabled: true },
  { href: "#", label: "Transactions", icon: "receipt_long", disabled: true },
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
            : pathname.startsWith(item.href) && item.href !== "#";

          return (
            <Link
              key={item.label}
              href={item.disabled ? "#" : item.href}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors ${
                item.disabled
                  ? "text-ink-tertiary cursor-not-allowed opacity-50"
                  : active
                    ? "bg-[#5C2D91]/10 text-[#5C2D91]"
                    : "text-ink-secondary hover:bg-surface-muted hover:text-ink-primary"
              }`}
              onClick={(e) => item.disabled && e.preventDefault()}
            >
              <span className={`material-symbols-outlined ${active ? "icon-fill" : ""}`} style={{ fontSize: 20 }}>
                {item.icon}
              </span>
              {item.label}
              {item.disabled && (
                <span className="ml-auto text-[9px] font-bold text-ink-tertiary bg-surface-muted px-1.5 py-0.5 rounded">V1.1</span>
              )}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
