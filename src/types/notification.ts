export interface NotificationItem {
  id: string;
  kind: string;
  title: string;
  body: string;
  icon: string;
  color: string;
  link: string | null;
  isRead: boolean;
  createdAt: string;
  relativeTime: string;
}

export type NotificationFilter = "all" | "unread" | "rse" | "boost" | "sponsoring" | "security" | "profile";

export interface NotificationsPageData {
  items: NotificationItem[];
  total: number;
  unreadCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
