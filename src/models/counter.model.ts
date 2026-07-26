import { Schema, model, models } from "mongoose";

/**
 * Generic atomic counter collection.
 * Used for invoice number sequences (one doc per year).
 * Pattern: findOneAndUpdate with $inc + upsert (atomic, no race).
 */
const CounterSchema = new Schema(
  {
    _id: { type: String, required: true }, // e.g. "invoice-2026"
    seq: { type: Number, default: 0 },
  },
  { versionKey: false },
);

export const Counter = models.Counter || model("Counter", CounterSchema);
