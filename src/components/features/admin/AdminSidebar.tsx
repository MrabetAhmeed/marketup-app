"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Sheet, SheetContent } from "@/components/ui/sheet";

const NAV_ITEMS = [
  { href: "/admin", label: "Vue d'ensemble", icon: "dashboard" },
  { href: "/admin/validation", label: "Validation", icon: "verified" },
  { href: "/admin/entreprises", label: "Entreprises", icon: "business" },
  { href: "/admin/transactions", label: "Transactions", icon: "receipt_long" },
];

// ---------------------------------------------------------------------------
// Sidebar content — reused in desktop aside + mobile Sheet
// ---------------------------------------------------------------------------

function SidebarContent({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }): JSX.Element {
  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-surface-border shrink-0">
        <Link href="/admin" className="flex items-center gap-2" onClick={onNavigate}>
          <div className="w-8 h-8 rounded-lg bg-[#5C2D91] flex items-center justify-center">
            <span className="material-symbols-outlined text-white" style={{ fontSize: 18 }}>admin_panel_settings</span>
          </div>
          <div>
            <div className="font-heading font-bold text-[14px] text-ink-primary leading-tight">MARKET-UP</div>
            <div className="text-[10px] font-semibold text-[#5C2D91] uppercase tracking-wider">Admin</div>
          </div>
        </Link>
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
              onClick={onNavigate}
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
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main export: desktop aside + mobile Sheet
// ---------------------------------------------------------------------------

export function AdminSidebar(): JSX.Element {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:flex-col w-[240px] bg-white border-r border-surface-border h-screen sticky top-0 shrink-0">
        <SidebarContent pathname={pathname} />
      </aside>

      {/* Mobile hamburger button */}
      <button
        onClick={() => setOpen(true)}
        className="md:hidden fixed top-0 left-0 z-50 w-14 h-14 flex items-center justify-center"
        aria-label="Ouvrir le menu de navigation"
      >
        <span className="material-symbols-outlined text-ink-primary" style={{ fontSize: 24 }}>menu</span>
      </button>

      {/* Mobile sidebar via Sheet */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="p-0 w-[240px]" showCloseButton={false}>
          <SidebarContent pathname={pathname} onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>
    </>
  );
}
