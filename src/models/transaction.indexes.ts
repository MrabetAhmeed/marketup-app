// ---------------------------------------------------------------------------
// Indexes of the `transactions` collection (cadrage V1.2 F2, D8–D12).
//
// Single declaration, used twice:
//   - transaction.model.ts registers them on the schema (tests build them with
//     syncIndexes; the application never builds them — autoIndex is off);
//   - the migration (src/lib/payment/order-index-migration.ts) creates them on
//     real databases and checks the result against this list.
//
// No mongoose import here: the migration must be able to read this list
// without compiling a model.
// ---------------------------------------------------------------------------

export const TRANSACTIONS_COLLECTION = "transactions";

/** Collections the payment flow writes to inside a transaction. */
export const PAYMENT_COLLECTIONS = ["transactions", "boosts", "sponsorings"] as const;

export interface TransactionIndexSpec {
  name: string;
  key: Record<string, 1 | -1>;
  unique?: boolean;
  partialFilterExpression?: Record<string, unknown>;
}

/**
 * Pre-F2 index on the idempotency key (sparse, not unique). Replaced by a unique
 * index per company: the migration drops the old one explicitly.
 */
export const LEGACY_IDEMPOTENCY_INDEX_NAME = "idempotencyKey_1";

export const PENDING_BOOST_INDEX_NAME = "pending_boost_unique";
export const PENDING_SPONSORING_INDEX_NAME = "pending_sponsoring_unique";

export const TRANSACTION_INDEXES: readonly TransactionIndexSpec[] = [
  { name: "companyId_1", key: { companyId: 1 } },
  { name: "deletedAt_1", key: { deletedAt: 1 } },
  { name: "companyId_1_paidAt_-1", key: { companyId: 1, paidAt: -1 } },
  // Unique per company, matching the idempotency lookup of the checkout services.
  // Demo orders carry a null key: only string keys are indexed, so they never collide.
  {
    name: "company_idempotencyKey_unique",
    key: { companyId: 1, idempotencyKey: 1 },
    unique: true,
    partialFilterExpression: { idempotencyKey: { $type: "string" } },
  },
  // One pending boost order per company and profile.
  {
    name: PENDING_BOOST_INDEX_NAME,
    key: { companyId: 1, type: 1, profileKind: 1 },
    unique: true,
    partialFilterExpression: { status: "pending", type: "boost" },
  },
  // One pending sponsoring order per company and campaign (refId).
  {
    name: PENDING_SPONSORING_INDEX_NAME,
    key: { companyId: 1, refId: 1 },
    unique: true,
    partialFilterExpression: { status: "pending", type: "sponsoring" },
  },
];
