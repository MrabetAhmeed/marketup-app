/* eslint-disable @typescript-eslint/no-explicit-any */
import { connectDb } from "@/lib/db";
import { pickLocale } from "@/lib/i18n";
import { formatRelativeTime } from "@/lib/relative-time";
import { Notification } from "@/models/notification.model";
import type { SupportedLang } from "@/lib/i18n";
import type { NotificationItem, NotificationFilter, NotificationsPageData } from "@/types/notification";

const NotificationModel = Notification as any;

// Kind → filter category mapping
const KIND_TO_FILTER: Record<string, NotificationFilter> = {
  boost_expiring: "boost",
  boost_started: "boost",
  boost_paid: "boost",
  sponsoring_started: "sponsoring",
  sponsoring_metrics: "sponsoring",
  sponsoring_paid: "sponsoring",
  sponsoring_request_submitted: "sponsoring",
  sponsoring_validated: "sponsoring",
  sponsoring_rejected: "sponsoring",
  rse_receipt_submitted: "rse",
  rse_receipt_validated: "rse",
  rse_validated: "rse",
  profile_submitted: "profile",
  profile_validated: "profile",
  profile_rejected: "profile",
  security_new_device: "security",
};

// Color name → hex mapping (from seed convention)
const COLOR_MAP: Record<string, string> = {
  primary: "#0078D4",
  success: "#107C10",
  danger: "#DC2626",
  warning: "#D97706",
  gold: "#C5A059",
};

export async function getNotificationsForUser(
  userId: string,
  options: {
    filter?: NotificationFilter;
    page?: number;
    pageSize?: number;
    lang?: SupportedLang;
  } = {},
): Promise<NotificationsPageData> {
  await connectDb();

  const { filter = "all", page = 1, pageSize = 10, lang = "fr" } = options;

  // Build query
  // Explicit deletedAt: null — countDocuments does not trigger pre-find hooks
  const baseQuery: Record<string, unknown> = {
    recipientType: "owner",
    recipientId: userId,
    deletedAt: null,
  };

  if (filter === "unread") {
    baseQuery.read = false;
  } else if (filter !== "all") {
    // Get all kinds that map to this filter
    const matchingKinds = Object.entries(KIND_TO_FILTER)
      .filter(([, f]) => f === filter)
      .map(([kind]) => kind);
    if (matchingKinds.length > 0) {
      baseQuery.kind = { $in: matchingKinds };
    }
  }

  const [total, unreadCount, docs] = await Promise.all([
    NotificationModel.countDocuments(baseQuery),
    NotificationModel.countDocuments({
      recipientType: "owner",
      recipientId: userId,
      read: false,
      deletedAt: null,
    }),
    NotificationModel.find(baseQuery)
      .sort({ createdAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .lean(),
  ]);

  const items: NotificationItem[] = (docs as any[]).map((n) => ({
    id: n._id.toString(),
    kind: n.kind,
    title: pickLocale(n.title, lang),
    body: pickLocale(n.body, lang),
    icon: n.icon ?? "notifications",
    color: COLOR_MAP[n.color] ?? n.color ?? "#0078D4",
    link: n.actionUrl ?? null,
    isRead: n.read ?? false,
    createdAt: new Date(n.createdAt).toISOString(),
    relativeTime: formatRelativeTime(new Date(n.createdAt)),
  }));

  return {
    items,
    total,
    unreadCount,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

// ---------------------------------------------------------------------------
// createNotification — generic helper for owner + admin notifs (C1/C2)
// ---------------------------------------------------------------------------

export interface CreateNotificationParams {
  recipientType: "owner" | "admin";
  recipientId: string;
  kind: string;
  icon?: string;
  color?: string;
  title: { fr: string; ar?: string; en?: string };
  body: { fr: string; ar?: string; en?: string };
  actionUrl?: string;
  actionLabel?: { fr: string; ar?: string; en?: string };
}

// ---------------------------------------------------------------------------
// markAllRead — mark all unread notifications as read for a given owner
// ---------------------------------------------------------------------------

export async function markAllNotificationsRead(userId: string): Promise<number> {
  await connectDb();
  const result = await NotificationModel.updateMany(
    { recipientType: "owner", recipientId: userId, read: false },
    { $set: { read: true, readAt: new Date() } },
  );
  return result.modifiedCount ?? 0;
}

// ---------------------------------------------------------------------------
// markOneRead — mark a single notification as read (cross-tenant guarded)
// ---------------------------------------------------------------------------

export async function markNotificationRead(
  userId: string,
  notificationId: string,
): Promise<void> {
  await connectDb();
  const notif = await NotificationModel.findById(notificationId);
  if (!notif) {
    const { NotFoundError } = await import("@/lib/api-error");
    throw new NotFoundError("Notification");
  }
  if (notif.recipientType !== "owner" || String(notif.recipientId) !== userId) {
    const { AuthError } = await import("@/lib/api-error");
    throw new AuthError("FORBIDDEN", "Accès interdit.", 403);
  }
  if (!notif.read) {
    notif.read = true;
    notif.readAt = new Date();
    await notif.save();
  }
}

// ---------------------------------------------------------------------------
// deleteNotification — soft-delete a single notification (cross-tenant guarded)
// ---------------------------------------------------------------------------

export async function deleteNotification(
  userId: string,
  notificationId: string,
): Promise<void> {
  await connectDb();
  const notif = await NotificationModel.findById(notificationId);
  if (!notif) {
    const { NotFoundError } = await import("@/lib/api-error");
    throw new NotFoundError("Notification");
  }
  if (notif.recipientType !== "owner" || String(notif.recipientId) !== userId) {
    const { AuthError } = await import("@/lib/api-error");
    throw new AuthError("FORBIDDEN", "Accès interdit.", 403);
  }
  notif.deletedAt = new Date();
  await notif.save();
}

// ---------------------------------------------------------------------------
// createNotification — generic helper for owner + admin notifs (C1/C2)
// ---------------------------------------------------------------------------

export async function createNotification(params: CreateNotificationParams): Promise<void> {
  await connectDb();
  await NotificationModel.create({
    recipientType: params.recipientType,
    recipientId: params.recipientId,
    kind: params.kind,
    icon: params.icon ?? "notifications",
    color: params.color ?? "primary",
    title: { fr: params.title.fr, ar: params.title.ar ?? "", en: params.title.en ?? "" },
    body: { fr: params.body.fr, ar: params.body.ar ?? "", en: params.body.en ?? "" },
    actionUrl: params.actionUrl ?? null,
    actionLabel: params.actionLabel
      ? { fr: params.actionLabel.fr, ar: params.actionLabel.ar ?? "", en: params.actionLabel.en ?? "" }
      : { fr: "", ar: "", en: "" },
    read: false,
  });
}
