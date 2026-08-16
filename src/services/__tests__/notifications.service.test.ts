/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from "vitest";
import mongoose from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import { Notification } from "@/models/notification.model";

vi.mock("@/lib/db", () => ({
  connectDb: vi.fn().mockResolvedValue(undefined),
}));

const NotificationModel = Notification as any;

let replSet: MongoMemoryReplSet;

beforeAll(async () => {
  replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  await mongoose.connect(replSet.getUri());
}, 30_000);

afterAll(async () => {
  await mongoose.disconnect();
  await replSet.stop();
}, 15_000);

afterEach(async () => {
  await NotificationModel.deleteMany({});
});

const OWNER_A = new mongoose.Types.ObjectId().toString();
const OWNER_B = new mongoose.Types.ObjectId().toString();

async function createNotif(overrides: Record<string, unknown> = {}): Promise<any> {
  return NotificationModel.create({
    recipientType: "owner",
    recipientId: OWNER_A,
    kind: "profile_validated",
    title: { fr: "Test", ar: "", en: "" },
    body: { fr: "Body", ar: "", en: "" },
    read: false,
    ...overrides,
  });
}

describe("notifications.service", () => {
  // === markAllNotificationsRead ===

  it("markAllRead marks all unread for the owner", async () => {
    const { markAllNotificationsRead } = await import("@/services/notifications.service");
    await createNotif();
    await createNotif();
    await createNotif({ read: true, readAt: new Date() });

    const count = await markAllNotificationsRead(OWNER_A);
    expect(count).toBe(2);

    const remaining = await NotificationModel.countDocuments({ recipientId: OWNER_A, read: false });
    expect(remaining).toBe(0);
  });

  it("markAllRead does not touch other owners", async () => {
    const { markAllNotificationsRead } = await import("@/services/notifications.service");
    await createNotif({ recipientId: OWNER_B });
    await createNotif();

    await markAllNotificationsRead(OWNER_A);

    const bUnread = await NotificationModel.countDocuments({ recipientId: OWNER_B, read: false });
    expect(bUnread).toBe(1);
  });

  // === markNotificationRead ===

  it("markOneRead marks a specific notification", async () => {
    const { markNotificationRead } = await import("@/services/notifications.service");
    const n = await createNotif();

    await markNotificationRead(OWNER_A, n._id.toString());

    const reloaded = await NotificationModel.findById(n._id);
    expect(reloaded.read).toBe(true);
    expect(reloaded.readAt).toBeTruthy();
  });

  it("markOneRead rejects cross-tenant access", async () => {
    const { markNotificationRead } = await import("@/services/notifications.service");
    const n = await createNotif();

    await expect(markNotificationRead(OWNER_B, n._id.toString())).rejects.toThrow("Accès interdit");
  });

  it("markOneRead rejects unknown id", async () => {
    const { markNotificationRead } = await import("@/services/notifications.service");
    const fakeId = new mongoose.Types.ObjectId().toString();

    await expect(markNotificationRead(OWNER_A, fakeId)).rejects.toThrow();
  });

  // === deleteNotification ===

  it("deleteNotification soft-deletes", async () => {
    const { deleteNotification } = await import("@/services/notifications.service");
    const n = await createNotif();

    await deleteNotification(OWNER_A, n._id.toString());

    // Default find filters out deleted
    const found = await NotificationModel.findById(n._id);
    expect(found).toBeNull();

    // But with withDeleted it's still there
    const raw = await NotificationModel.findById(n._id).setOptions({ withDeleted: true });
    expect(raw).toBeTruthy();
    expect(raw.deletedAt).toBeTruthy();
  });

  it("deleteNotification rejects cross-tenant", async () => {
    const { deleteNotification } = await import("@/services/notifications.service");
    const n = await createNotif();

    await expect(deleteNotification(OWNER_B, n._id.toString())).rejects.toThrow("Accès interdit");
  });

  it("deleteNotification rejects unknown id", async () => {
    const { deleteNotification } = await import("@/services/notifications.service");
    const fakeId = new mongoose.Types.ObjectId().toString();

    await expect(deleteNotification(OWNER_A, fakeId)).rejects.toThrow();
  });

  it("deleted notification disappears from unread count", async () => {
    const { deleteNotification, getNotificationsForUser } = await import("@/services/notifications.service");
    await createNotif();
    const n2 = await createNotif();

    // Before: 2 unread
    let data = await getNotificationsForUser(OWNER_A);
    expect(data.unreadCount).toBe(2);

    // Delete one
    await deleteNotification(OWNER_A, n2._id.toString());

    // After: 1 unread
    data = await getNotificationsForUser(OWNER_A);
    expect(data.unreadCount).toBe(1);
    expect(data.items).toHaveLength(1);
  });
});
