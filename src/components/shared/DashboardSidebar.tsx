"use client";

import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import Link from "next/link";
import { useState } from "react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { StatusDot } from "@/components/shared/StatusDot";
import type { MeResponse } from "@/types/dashboard";
import type { ProfileStatus } from "@/types";

interface DashboardSidebarProps {
  me: MeResponse;
}

// ---------------------------------------------------------------------------
// Navigation structure
// ---------------------------------------------------------------------------

interface NavItem {
  label: string;
  icon: string;
  href: string;
  dot?: ProfileStatus | null;
  badge?: string | null;
  badgeColor?: "green" | "red";
}

interface NavSection {
  label: string;
  items: NavItem[];
}

function buildNavSections(me: MeResponse): NavSection[] {
  const { profiles, stats } = me;

  const boostBadge =
    stats.activeBoosts > 0 ? `${stats.activeBoosts} ACTIF${stats.activeBoosts > 1 ? "S" : ""}` : null;

  const rseBadge = me.rse.badgeStatus === "validated" ? "VALIDÉ" : null;

  return [
    {
      label: "Entreprise",
      items: [
        { label: "Vue d'ensemble", icon: "dashboard", href: "/dashboard" },
        { label: "Compte", icon: "business", href: "/dashboard/account" },
      ],
    },
    {
      label: "Mes profils",
      items: [
        {
          label: "BrandUP",
          icon: "storefront",
          href: "/dashboard/brandup",
          dot: profiles.brandup?.status ?? null,
        },
        {
          label: "TraceUP",
          icon: "play_circle",
          href: "/dashboard/traceup",
          dot: profiles.traceup?.status ?? null,
        },
        {
          label: "LinkUP",
          icon: "qr_code_2",
          href: "/dashboard/linkup",
          dot: profiles.linkup?.status ?? null,
        },
      ],
    },
    {
      label: "Visibilité",
      items: [
        {
          label: "Boost",
          icon: "trending_up",
          href: "/dashboard/boost",
          badge: boostBadge,
          badgeColor: "green" as const,
        },
        {
          label: "Sponsoring",
          icon: "campaign",
          href: "/dashboard/sponsoring",
          dot: stats.activeSponsorings > 0 ? ("active" as ProfileStatus) : null,
        },
      ],
    },
    {
      label: "Engagement",
      items: [
        {
          label: "Badge RSE",
          icon: "volunteer_activism",
          href: "/dashboard/rse",
          badge: rseBadge,
          badgeColor: "green" as const,
        },
      ],
    },
    {
      label: "Administration",
      items: [
        { label: "Facturation", icon: "receipt_long", href: "/dashboard/billing" },
        {
          label: "Notifications",
          icon: "notifications",
          href: "/dashboard/notifications",
          badge: stats.unreadNotifications > 0 ? String(stats.unreadNotifications) : null,
          badgeColor: "red" as const,
        },
        { label: "Paramètres", icon: "settings", href: "/dashboard/settings" },
      ],
    },
  ];
}

// ---------------------------------------------------------------------------
// Sidebar content (reused in desktop aside + mobile Sheet)
// ---------------------------------------------------------------------------

function buildRejectedNavSections(): NavSection[] {
  return [
    {
      label: "Entreprise",
      items: [
        {
          label: "Compte",
          icon: "business",
          href: "/dashboard/account/edit?reason=rejected",
        },
      ],
    },
  ];
}

function SidebarContent({
  me,
  pathname,
  onNavigate,
}: {
  me: MeResponse;
  pathname: string;
  onNavigate?: () => void;
}): JSX.Element {
  const sections =
    me.company.status === "rejected"
      ? buildRejectedNavSections()
      : buildNavSections(me);

  function isActive(href: string): boolean {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  }

  return (
    <div className="flex flex-col h-full">
      {/* Logo header */}
      <Link
        href={me.company.status === "rejected" ? "/dashboard/account/edit?reason=rejected" : "/dashboard"}
        className="flex items-center gap-2.5 h-14 px-5 py-4 border-b border-surface-border hover:bg-surface-subtle shrink-0"
        onClick={onNavigate}
      >
        <span className="material-symbols-outlined icon-fill text-primary" style={{ fontSize: 22 }}>
          hexagon
        </span>
        <div>
          <div className="font-heading font-bold text-[15px] text-ink-primary tracking-tight leading-none">
            MARKET-UP
          </div>
          <div className="text-[10px] text-ink-tertiary tracking-wide">vivasky.media</div>
        </div>
      </Link>

      {/* Nav sections */}
      <nav className="flex-1 overflow-y-auto py-2">
        {sections.map((section) => (
          <div key={section.label}>
            <div className="px-5 pt-4 pb-1.5 text-[9px] font-bold tracking-[0.15em] uppercase text-ink-tertiary">
              {section.label}
            </div>
            {section.items.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  className={`flex items-center gap-3 px-5 py-2 text-[13px] font-medium border-l-[3px] transition-colors ${
                    active
                      ? "bg-primary-light border-l-primary text-primary font-semibold"
                      : "border-l-transparent text-ink-secondary hover:bg-surface-subtle"
                  }`}
                >
                  <span
                    className={`material-symbols-outlined shrink-0 ${active ? "text-primary" : "text-ink-tertiary"}`}
                    style={{ fontSize: 18 }}
                  >
                    {item.icon}
                  </span>
                  <span className="flex-1 truncate">{item.label}</span>
                  {item.dot != null && <StatusDot status={item.dot} />}
                  {item.badge != null && (
                    <span
                      className={`text-[9px] font-bold tracking-wider px-1.5 py-[2px] rounded ${
                        item.badgeColor === "red"
                          ? "min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-status-rejected-dot text-white"
                          : "text-status-active-fg bg-status-active-bg border border-status-active-border"
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Company footer */}
      <div className="shrink-0 border-t border-surface-border">
        <div className="px-4 py-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-[#374151] flex items-center justify-center shrink-0">
            <span className="text-white font-heading font-bold text-[13px]">
              {me.company.avatarInitials}
            </span>
          </div>
          <div className="min-w-0">
            <div className="text-[12px] font-semibold text-ink-primary truncate">
              {me.company.displayName}
            </div>
            <div className="text-[10px] text-ink-tertiary truncate">
              {me.company.type} · {me.company.gouvernorat.name}
            </div>
          </div>
        </div>

        {/* User strip */}
        <div className="px-4 py-2.5 border-t border-surface-border flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-full bg-surface-muted border border-surface-border flex items-center justify-center shrink-0">
            <span className="text-ink-secondary text-[10px] font-semibold">
              {me.user.avatarInitials}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-medium text-[#424242] truncate">
              {me.user.firstName} {me.user.lastName}
            </div>
            <div className="text-[9px] text-ink-tertiary">Propriétaire</div>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="w-7 h-7 flex items-center justify-center rounded text-ink-tertiary hover:text-ink-primary hover:bg-surface-muted"
            title="Se déconnecter"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
              logout
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main export: desktop aside + mobile Sheet
// ---------------------------------------------------------------------------

export function DashboardSidebar({ me }: DashboardSidebarProps): JSX.Element {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:flex-col md:fixed md:inset-y-0 md:left-0 md:w-60 bg-white border-r border-surface-border z-40">
        <SidebarContent me={me} pathname={pathname} />
      </aside>

      {/* Mobile hamburger button */}
      <button
        onClick={() => setOpen(true)}
        className="md:hidden fixed top-0 left-0 z-50 w-14 h-14 flex items-center justify-center"
        aria-label="Ouvrir le menu de navigation"
      >
        <span className="material-symbols-outlined text-ink-primary" style={{ fontSize: 24 }}>
          menu
        </span>
      </button>

      {/* Mobile sidebar via Sheet */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="p-0 w-60" showCloseButton={false}>
          <SidebarContent me={me} pathname={pathname} onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>
    </>
  );
}
