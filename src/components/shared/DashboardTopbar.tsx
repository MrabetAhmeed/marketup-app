"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { signOut } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { MeResponse, NotificationPreview } from "@/types/dashboard";

interface DashboardTopbarProps {
  me: MeResponse;
  notifications: NotificationPreview[];
  title?: string;
  subtitle?: string;
}

// ---------------------------------------------------------------------------
// Notification icon variant colors
// ---------------------------------------------------------------------------

const ICON_VARIANT_CLASSES: Record<string, string> = {
  primary: "bg-primary-light text-primary",
  success: "bg-status-active-bg text-[#16A34A]",
  warning: "bg-status-pending-bg text-[#D97706]",
  danger: "bg-status-rejected-bg text-status-rejected-dot",
  rse: "bg-status-gold-bg text-[#C5A059] border border-status-gold-border",
};

// ---------------------------------------------------------------------------
// Relative time helper
// ---------------------------------------------------------------------------

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "À l'instant";
  if (minutes < 60) return `Il y a ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Il y a ${hours} h`;
  const days = Math.floor(hours / 24);
  return `Il y a ${days} j`;
}

// ---------------------------------------------------------------------------
// Topbar
// ---------------------------------------------------------------------------

export function DashboardTopbar({ me, notifications, title, subtitle }: DashboardTopbarProps): JSX.Element {
  const router = useRouter();
  const [bellOpen, setBellOpen] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);
  const avatarRef = useRef<HTMLDivElement>(null);
  const [localNotifs, setLocalNotifs] = useState(notifications);
  const [localUnread, setLocalUnread] = useState(me.stats.unreadNotifications);

  // Sync when props change (RSC re-render)
  useEffect(() => { setLocalNotifs(notifications); }, [notifications]);
  useEffect(() => { setLocalUnread(me.stats.unreadNotifications); }, [me.stats.unreadNotifications]);

  const handleNotifClick = useCallback((n: NotificationPreview) => {
    setBellOpen(false);
    if (n.read) return;
    // Optimistic update
    setLocalNotifs((prev) => prev.map((x) => x.id === n.id ? { ...x, read: true } : x));
    setLocalUnread((c) => Math.max(0, c - 1));
    // Fire-and-forget PATCH + refresh RSC cache
    fetch(`/api/v1/me/notifications/${n.id}/read`, { method: "PATCH" })
      .then(() => router.refresh())
      .catch(() => { /* silent */ });
  }, [router]);

  // Close dropdowns on outside click or Escape
  useEffect(() => {
    function handleClick(e: MouseEvent): void {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) setBellOpen(false);
      if (avatarRef.current && !avatarRef.current.contains(e.target as Node)) setAvatarOpen(false);
    }
    function handleKey(e: KeyboardEvent): void {
      if (e.key === "Escape") {
        setBellOpen(false);
        setAvatarOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, []);

  const unread = localUnread;
  const isRejected = me.company.status === "rejected";

  return (
    <header className="sticky top-0 z-30 h-14 bg-white border-b border-surface-border flex items-center justify-between px-4 md:px-6 gap-4">
      {/* Left: title area */}
      <div className="min-w-0 pl-10 md:pl-0 flex items-center gap-3">
        <div className="min-w-0">
        <h1 className="font-heading text-[16px] font-bold text-ink-primary truncate">
          {title ?? "Tableau de bord"}
        </h1>
        {subtitle && (
          <p className="hidden md:block text-[12px] text-ink-secondary truncate">{subtitle}</p>
        )}
        {!subtitle && (
          <p className="hidden md:block text-[12px] text-ink-secondary truncate">
            Bienvenue, {me.company.displayName}
          </p>
        )}
        </div>
      </div>

      {/* Right: home + bell + avatar */}
      <div className="flex items-center gap-1 shrink-0">
        {/* Home link */}
        <Link
          href="/"
          className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-surface-muted transition-colors"
          title="Accueil"
        >
          <span className="material-symbols-outlined text-ink-secondary" style={{ fontSize: 20 }}>home</span>
        </Link>
        {/* Notification bell — hidden for rejected users */}
        {!isRejected && (
        <div ref={bellRef} className="relative">
          <button
            onClick={() => {
              setBellOpen(!bellOpen);
              setAvatarOpen(false);
            }}
            className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-surface-muted relative"
            aria-haspopup="true"
            aria-expanded={bellOpen}
          >
            <span className="material-symbols-outlined text-ink-secondary" style={{ fontSize: 20 }}>
              notifications
            </span>
            {unread > 0 && (
              <span className="absolute top-1.5 right-1.5 min-w-[16px] h-[16px] px-1 rounded-full bg-status-rejected-dot text-white text-[9px] font-bold flex items-center justify-center ring-2 ring-white">
                {unread}
              </span>
            )}
          </button>

          {bellOpen && (
            <div className="max-md:fixed max-md:left-4 max-md:right-4 max-md:top-[57px] max-md:w-auto md:absolute md:right-0 md:top-full md:mt-1 md:w-[340px] md:max-w-[calc(100vw-24px)] bg-white rounded-xl shadow-modal border border-surface-border overflow-hidden z-50">
              <div className="px-4 py-3 flex items-center justify-between">
                <span className="font-heading font-semibold text-[13px] text-ink-primary">
                  Notifications
                </span>
                {unread > 0 && (
                  <span className="text-[11px] text-ink-secondary">
                    <span className="text-status-rejected-dot font-semibold">{unread}</span> non lue
                    {unread > 1 ? "s" : ""}
                  </span>
                )}
              </div>

              <div className="max-h-[320px] overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="px-4 py-6 text-center text-[12px] text-ink-tertiary">
                    Aucune nouvelle notification
                  </div>
                ) : (
                  localNotifs.map((n) => (
                    <Link
                      key={n.id}
                      href={n.href}
                      onClick={() => handleNotifClick(n)}
                      className="flex items-start gap-3 px-4 py-3 hover:bg-surface-subtle border-t border-surface-border"
                    >
                      {!n.read && (
                        <span className="w-2 h-2 rounded-full bg-primary shrink-0 mt-2" />
                      )}
                      {n.read && <span className="w-2 shrink-0" />}
                      <div
                        className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${ICON_VARIANT_CLASSES[n.iconVariant] ?? ICON_VARIANT_CLASSES.primary}`}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                          {n.icon}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p
                          className={`text-[12px] leading-tight ${!n.read ? "font-semibold text-ink-primary" : "text-ink-secondary"}`}
                        >
                          {n.title}
                        </p>
                        <p className="text-[11px] text-ink-tertiary mt-0.5 truncate">{n.body}</p>
                        <p className="text-[10px] text-ink-tertiary mt-1">{relativeTime(n.createdAt)}</p>
                      </div>
                    </Link>
                  ))
                )}
              </div>

              <Link
                href="/dashboard/notifications"
                onClick={() => setBellOpen(false)}
                className="flex items-center justify-center gap-1.5 px-4 py-2.5 text-[12px] font-semibold text-primary hover:bg-primary-light border-t border-surface-border rounded-b-xl"
              >
                Voir toutes les notifications
                <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                  arrow_forward
                </span>
              </Link>
            </div>
          )}
        </div>
        )}

        {/* Avatar dropdown */}
        <div ref={avatarRef} className="relative">
          <button
            onClick={() => {
              setAvatarOpen(!avatarOpen);
              setBellOpen(false);
            }}
            className="flex items-center gap-1 pl-1 pr-2 py-1 rounded-lg hover:bg-surface-muted ml-1"
            aria-haspopup="true"
            aria-expanded={avatarOpen}
          >
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
              <span className="text-white font-heading font-bold text-[12px]">
                {me.company.avatarInitials}
              </span>
            </div>
            <span
              className="material-symbols-outlined text-ink-tertiary hidden md:inline"
              style={{ fontSize: 18 }}
            >
              expand_more
            </span>
          </button>

          {avatarOpen && (
            <div className="max-md:fixed max-md:right-4 max-md:top-[57px] max-md:w-[calc(100vw-2rem)] max-md:max-w-[300px] md:absolute md:right-0 md:top-full md:mt-1 md:w-[300px] md:max-w-[calc(100vw-24px)] bg-white rounded-xl shadow-modal border border-surface-border overflow-hidden z-50">
              {/* Identity block */}
              <div className="px-4 py-3 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center shrink-0">
                  <span className="text-white font-heading font-bold text-[13px]">
                    {me.company.avatarInitials}
                  </span>
                </div>
                <div className="min-w-0">
                  <div className="font-heading font-semibold text-[13px] text-ink-primary truncate">
                    {me.company.displayName}
                  </div>
                  <div className="text-[11px] text-ink-secondary truncate">
                    {me.company.type} · {me.company.gouvernorat.name} · {me.company.gerantFirstName}{" "}
                    {me.company.gerantLastName}
                  </div>
                </div>
              </div>

              {/* Profile links — hidden for rejected users */}
              {!isRejected && (
              <>
              <div className="px-2 py-1">
                <div className="px-2 py-1.5 text-[9px] font-bold tracking-[0.15em] uppercase text-ink-tertiary">
                  Mes profils publics
                </div>
                {(
                  [
                    { kind: "brandup", icon: "storefront", label: "BrandUP" },
                    { kind: "traceup", icon: "play_circle", label: "TraceUP" },
                    { kind: "linkup", icon: "qr_code_2", label: "LinkUP" },
                  ] as const
                ).map((p) => (
                  <Link
                    key={p.kind}
                    href={`/${p.kind}/${me.company.slug}`}
                    target="_blank"
                    rel="noopener"
                    onClick={() => setAvatarOpen(false)}
                    className="flex items-center gap-3 px-2 py-2 rounded-lg text-[13px] text-ink-secondary hover:bg-surface-subtle"
                  >
                    <span className="material-symbols-outlined text-ink-tertiary" style={{ fontSize: 18 }}>
                      {p.icon}
                    </span>
                    <span className="flex-1">{p.label}</span>
                    <span className="material-symbols-outlined text-ink-tertiary" style={{ fontSize: 14 }}>
                      open_in_new
                    </span>
                  </Link>
                ))}
              </div>

              <div className="mx-2 border-t border-surface-border my-1" />
              </>
              )}

              {/* Settings + logout */}
              <div className="px-2 py-1 pb-2">
                {!isRejected && (
                <Link
                  href="/dashboard/settings"
                  onClick={() => setAvatarOpen(false)}
                  className="flex items-center gap-3 px-2 py-2 rounded-lg text-[13px] text-ink-secondary hover:bg-surface-subtle"
                >
                  <span className="material-symbols-outlined text-ink-tertiary" style={{ fontSize: 18 }}>
                    settings
                  </span>
                  Paramètres
                </Link>
                )}
                <button
                  onClick={() => {
                    setAvatarOpen(false);
                    signOut({ callbackUrl: "/login" });
                  }}
                  className="flex items-center gap-3 px-2 py-2 rounded-lg text-[13px] text-[#B91C1C] hover:bg-status-rejected-bg w-full text-left"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                    logout
                  </span>
                  Se déconnecter
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
