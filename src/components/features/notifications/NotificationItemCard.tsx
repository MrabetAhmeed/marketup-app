"use client";

import { useRouter } from "next/navigation";
import { useFeatureSoonToast } from "@/hooks/useFeatureSoonToast";
import type { NotificationItem } from "@/types/notification";

interface NotificationItemCardProps {
  notification: NotificationItem;
}

export function NotificationItemCard({ notification }: NotificationItemCardProps): JSX.Element {
  const router = useRouter();
  const toast = useFeatureSoonToast();
  const n = notification;

  const handleClick = () => {
    if (n.link) {
      router.push(n.link);
    }
  };

  return (
    <div
      className={`card p-4 flex items-start gap-3 transition-colors cursor-pointer hover:bg-surface-subtle ${
        !n.isRead ? "border-l-[3px] border-l-primary" : ""
      }`}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && handleClick()}
    >
      {/* Icon */}
      <div
        className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
        style={{ backgroundColor: `${n.color}15` }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: 20, color: n.color }}>
          {n.icon}
        </span>
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <h4 className={`text-[13.5px] text-ink-primary leading-snug ${!n.isRead ? "font-semibold" : "font-medium"}`}>
            {n.title}
          </h4>
          <span className="text-[11px] text-ink-tertiary whitespace-nowrap shrink-0">
            {n.relativeTime}
          </span>
        </div>
        {n.body && (
          <p className="text-[12px] text-ink-secondary leading-snug mt-0.5 line-clamp-2">
            {n.body}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 md:opacity-100">
        {!n.isRead && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); toast("FEATURE_COMING_SOON_MARK_READ"); }}
            className="w-7 h-7 rounded flex items-center justify-center text-ink-tertiary hover:text-primary hover:bg-primary-light transition-colors"
            title="Marquer comme lu"
            aria-label="Marquer comme lu"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>done</span>
          </button>
        )}
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); toast("FEATURE_COMING_SOON_DELETE_NOTIFICATION"); }}
          className="w-7 h-7 rounded flex items-center justify-center text-ink-tertiary hover:text-[#B91C1C] hover:bg-[#FEF2F2] transition-colors"
          title="Supprimer"
          aria-label="Supprimer"
        >
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>delete</span>
        </button>
      </div>
    </div>
  );
}
