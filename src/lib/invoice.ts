import { Counter } from "@/models/counter.model";

/**
 * Generate a sequential order number: {YYYY}-{5-digit seq}.
 * Uses atomic $inc + upsert on the Counter collection (zero collision).
 *
 * @param date - Date to derive the year from (defaults to now)
 * @returns e.g. "2026-00001"
 */
export async function generateInvoiceNumber(date: Date = new Date()): Promise<string> {
  const year = date.getFullYear();
  const key = `invoice-${year}`;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const counter = await (Counter as any).findOneAndUpdate(
    { _id: key },
    { $inc: { seq: 1 } },
    { upsert: true, returnDocument: "after" },
  );

  const seq = (counter as unknown as { seq: number }).seq;
  return `${year}-${String(seq).padStart(5, "0")}`;
}
