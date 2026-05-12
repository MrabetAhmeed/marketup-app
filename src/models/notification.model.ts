import { Schema, model, models, Types } from "mongoose";

// NOTE: This model deviates from skill data-models §6 which uses `userId: ObjectId ref User`.
// We use a polymorphic { recipientType, recipientId } pattern instead, because notifications
// target both owners (User) and admins (AdminUser). Resolution to the correct model happens
// in service code (if recipientType === "owner" → User; else → AdminUser). NO refPath used.

const I18nStringSchema = new Schema(
  {
    fr: { type: String, default: "" },
    ar: { type: String, default: "" },
    en: { type: String, default: "" },
  },
  { _id: false },
);

const NotificationSchema = new Schema(
  {
    // Polymorphic recipient — no `ref` option, resolved in service code
    recipientType: {
      type: String,
      enum: ["owner", "admin"],
      required: true,
      index: true,
    },
    recipientId: { type: Types.ObjectId, required: true, index: true },

    kind: { type: String, required: true },
    icon: { type: String, default: null },
    color: { type: String, default: null },
    title: { type: I18nStringSchema, required: true },
    body: { type: I18nStringSchema, required: true },
    actionUrl: { type: String, default: null },
    actionLabel: { type: I18nStringSchema, default: () => ({ fr: "", ar: "", en: "" }) },
    read: { type: Boolean, default: false },
    readAt: { type: Date, default: null },

    // Soft delete (no audit trail — too high volume)
    deletedAt: { type: Date, default: null, index: true },
  },
  { timestamps: true, versionKey: false },
);

// Compound index for bell dropdown queries
NotificationSchema.index({ recipientType: 1, recipientId: 1, read: 1, createdAt: -1 });

// Soft-delete filter
NotificationSchema.pre(/^find/, function (this: { getOptions(): { withDeleted?: boolean }; where(condition: Record<string, unknown>): void }) {
  if (this.getOptions().withDeleted !== true) {
    this.where({ deletedAt: null });
  }
});

export const Notification = models.Notification || model("Notification", NotificationSchema);
