import { PENDING_BOOST_INDEX_NAME, PENDING_SPONSORING_INDEX_NAME } from "@/models/transaction.indexes";

const DUPLICATE_KEY_CODE = 11000;
const WRITE_CONFLICT_CODE = 112;

/**
 * True when the database refused the insert of an order because another order
 * for the same service is pending (unique partial indexes on pending orders, F2).
 *
 * Two shapes, both meaning "someone else is already buying this":
 *   - duplicate key on one of the two pending-order indexes: the other order is committed;
 *   - write conflict: the other order is being written by a concurrent transaction.
 *
 * Only meaningful around the order insert itself — a write conflict raised by
 * another statement is not a pending-order conflict.
 */
export function isPendingOrderConflict(err: unknown): boolean {
  if (typeof err !== "object" || err === null) return false;
  const { code, message } = err as { code?: unknown; message?: unknown };
  if (code === WRITE_CONFLICT_CODE) return true;
  if (code !== DUPLICATE_KEY_CODE || typeof message !== "string") return false;
  return message.includes(PENDING_BOOST_INDEX_NAME) || message.includes(PENDING_SPONSORING_INDEX_NAME);
}
