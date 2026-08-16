"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { NotificationsPageData, NotificationFilter } from "@/types/notification";
import { NotificationItemCard } from "./NotificationItemCard";

const FILTERS: { id: NotificationFilter; label: string }[] = [
  { id: "all", label: "Toutes" },
  { id: "unread", label: "Non lues" },
  { id: "profile", label: "Profils" },
  { id: "rse", label: "RSE" },
  { id: "boost", label: "Boost" },
  { id: "sponsoring", label: "Sponsoring" },
  { id: "security", label: "Sécurité" },
];

interface NotificationsPageClientProps {
  data: NotificationsPageData;
  initialFilter: NotificationFilter;
}

const PAGE_SIZE = 10;

export function NotificationsPageClient({ data, initialFilter }: NotificationsPageClientProps): JSX.Element {
  const router = useRouter();
  const [filter, setFilter] = useState<NotificationFilter>(initialFilter);
  const [page, setPage] = useState(1);
  const [items, setItems] = useState(data.items);
  const [unreadCount, setUnreadCount] = useState(data.unreadCount);
  const [markingAll, setMarkingAll] = useState(false);

  // Client-side filter
  const filtered = filter === "all"
    ? items
    : filter === "unread"
      ? items.filter((n) => !n.isRead)
      : items.filter((n) => {
          const kindCategory = getKindCategory(n.kind);
          return kindCategory === filter;
        });

  // Client-side pagination
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleFilterChange = (f: NotificationFilter) => {
    setFilter(f);
    setPage(1);
  };

  const handleMarkAllRead = useCallback(async () => {
    setMarkingAll(true);
    // Optimistic
    setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
    try {
      await fetch("/api/v1/me/notifications/read-all", { method: "PATCH" });
      router.refresh(); // Invalidate RSC cache (layout badge + dropdown)
    } catch {
      // Silent — optimistic already applied
    } finally {
      setMarkingAll(false);
    }
  }, [router]);

  const handleMarkRead = useCallback(async (id: string) => {
    // Optimistic
    setItems((prev) => prev.map((n) => n.id === id ? { ...n, isRead: true } : n));
    setUnreadCount((c) => Math.max(0, c - 1));
    try {
      await fetch(`/api/v1/me/notifications/${id}/read`, { method: "PATCH" });
      router.refresh(); // Invalidate RSC cache (layout badge + dropdown)
    } catch {
      // Silent
    }
  }, [router]);

  const handleDelete = useCallback(async (id: string) => {
    const wasUnread = items.find((n) => n.id === id && !n.isRead);
    // Optimistic
    setItems((prev) => prev.filter((n) => n.id !== id));
    if (wasUnread) setUnreadCount((c) => Math.max(0, c - 1));
    try {
      await fetch(`/api/v1/me/notifications/${id}`, { method: "DELETE" });
      router.refresh(); // Invalidate RSC cache (layout badge + dropdown)
    } catch {
      // Silent
    }
  }, [items, router]);

  return (
    <div className="max-w-[900px] mx-auto space-y-6">
      {/* Page header */}
      <section className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-11 h-11 rounded-lg bg-primary-light flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-primary" style={{ fontSize: 24 }}>notifications</span>
          </div>
          <div className="min-w-0">
            <h2 className="font-heading font-bold text-[20px] text-ink-primary leading-tight">
              Notifications
            </h2>
            <p className="text-[12.5px] text-ink-secondary mt-0.5">
              {items.length} notification{items.length > 1 ? "s" : ""} · {unreadCount} non lue{unreadCount > 1 ? "s" : ""}
            </p>
          </div>
        </div>
        {unreadCount > 0 && (
          <button
            type="button"
            disabled={markingAll}
            onClick={handleMarkAllRead}
            className="inline-flex items-center gap-1.5 px-4 py-[9px] text-[13px] font-semibold text-primary hover:bg-primary-light rounded transition-colors shrink-0 disabled:opacity-50"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>done_all</span>
            Tout marquer comme lu
          </button>
        )}
      </section>

      {/* Filter pills */}
      <div className="flex gap-2 flex-wrap">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => handleFilterChange(f.id)}
            className={`px-3 py-1.5 text-[12px] font-semibold rounded transition-colors ${
              filter === f.id
                ? "bg-primary text-white"
                : "bg-white border border-surface-border text-ink-secondary hover:bg-surface-muted"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Notification list */}
      {filtered.length === 0 ? (
        <div className="card p-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-surface-muted mb-4">
            <span className="material-symbols-outlined text-ink-tertiary" style={{ fontSize: 32 }}>notifications_off</span>
          </div>
          <h3 className="font-heading font-bold text-[15px] text-ink-primary mb-1">
            Aucune notification
          </h3>
          <p className="text-[12.5px] text-ink-secondary">
            {filter === "unread" ? "Toutes vos notifications ont été lues" : "Aucune notification dans cette catégorie"}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {paginated.map((notif) => (
            <NotificationItemCard
              key={notif.id}
              notification={notif}
              onMarkRead={handleMarkRead}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <button
            type="button"
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
            className="w-8 h-8 rounded flex items-center justify-center text-ink-secondary hover:bg-surface-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Page précédente"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>chevron_left</span>
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPage(p)}
              className={`w-8 h-8 rounded text-[13px] font-semibold transition-colors ${
                p === page ? "bg-primary text-white" : "text-ink-secondary hover:bg-surface-muted"
              }`}
              aria-label={`Page ${p}`}
              aria-current={p === page ? "page" : undefined}
            >
              {p}
            </button>
          ))}
          <button
            type="button"
            disabled={page === totalPages}
            onClick={() => setPage(page + 1)}
            className="w-8 h-8 rounded flex items-center justify-center text-ink-secondary hover:bg-surface-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Page suivante"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>chevron_right</span>
          </button>
          <span className="text-[11px] text-ink-tertiary ml-2">
            {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} sur {filtered.length}
          </span>
        </div>
      )}
    </div>
  );
}

// Map notification kind to filter category
function getKindCategory(kind: string): NotificationFilter {
  if (kind.startsWith("boost")) return "boost";
  if (kind.startsWith("sponsoring")) return "sponsoring";
  if (kind.startsWith("rse") || kind === "rse_validated") return "rse";
  if (kind.startsWith("profile")) return "profile";
  if (kind.startsWith("security")) return "security";
  return "all";
}
