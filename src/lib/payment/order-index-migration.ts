import {
  LEGACY_IDEMPOTENCY_INDEX_NAME,
  PAYMENT_COLLECTIONS,
  TRANSACTIONS_COLLECTION,
  TRANSACTION_INDEXES,
} from "@/models/transaction.indexes";
import type { TransactionIndexSpec } from "@/models/transaction.indexes";
import type { Db } from "mongodb";

// ---------------------------------------------------------------------------
// Migration of the `transactions` indexes (cadrage V1.2 F2, D12–D19).
//
// The only code that builds these indexes on a real database: the Transaction
// model has autoIndex off. Dry-run by default, replayable, and verified against
// TRANSACTION_INDEXES after applying.
// ---------------------------------------------------------------------------

export interface IndexSummary {
  name: string;
  key: Record<string, unknown>;
  unique: boolean;
  sparse: boolean;
  partialFilterExpression: Record<string, unknown> | null;
}

export interface OrderIndexMigrationResult {
  dbName: string;
  /** True when the run wrote to the database. */
  applied: boolean;
  /** Set when the migration refused to run; nothing was written. */
  refusal: string | null;
  collectionsToCreate: string[];
  indexesToDrop: string[];
  indexesToCreate: string[];
  indexesBefore: IndexSummary[];
  indexesAfter: IndexSummary[];
  /** Differences between the final index list and TRANSACTION_INDEXES. */
  mismatches: string[];
  exitCode: 0 | 1;
}

export interface OrderIndexMigrationOptions {
  apply: boolean;
  log?: (line: string) => void;
}

const DEFAULT_ID_INDEX = "_id_";

/** Key-order independent serialization, to compare index definitions. */
function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value !== null && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b));
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stable(v)}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function summarize(raw: Record<string, unknown>): IndexSummary {
  return {
    name: String(raw.name),
    key: raw.key as Record<string, unknown>,
    unique: raw.unique === true,
    sparse: raw.sparse === true,
    partialFilterExpression: (raw.partialFilterExpression as Record<string, unknown> | undefined) ?? null,
  };
}

function expectedSummary(spec: TransactionIndexSpec): IndexSummary {
  return {
    name: spec.name,
    key: spec.key,
    unique: spec.unique === true,
    sparse: false,
    partialFilterExpression: spec.partialFilterExpression ?? null,
  };
}

/** Index key order matters to MongoDB, so keys are compared in order. */
function sameDefinition(a: IndexSummary, b: IndexSummary): boolean {
  return (
    JSON.stringify(a.key) === JSON.stringify(b.key) &&
    a.unique === b.unique &&
    a.sparse === b.sparse &&
    stable(a.partialFilterExpression) === stable(b.partialFilterExpression)
  );
}

function describeIndex(index: IndexSummary): string {
  const flags = [
    index.unique ? "unique" : null,
    index.sparse ? "sparse" : null,
    index.partialFilterExpression ? `partial ${JSON.stringify(index.partialFilterExpression)}` : null,
  ].filter(Boolean);
  return `${index.name} ${JSON.stringify(index.key)}${flags.length > 0 ? ` [${flags.join(", ")}]` : ""}`;
}

async function listCollectionNames(db: Db): Promise<Set<string>> {
  const collections = await db.listCollections({}, { nameOnly: true }).toArray();
  return new Set(collections.map((c) => c.name));
}

async function listTransactionIndexes(db: Db, exists: boolean): Promise<IndexSummary[]> {
  if (!exists) return [];
  const raw = await db.collection(TRANSACTIONS_COLLECTION).indexes();
  return raw.filter((i) => i.name !== DEFAULT_ID_INDEX).map((i) => summarize(i as Record<string, unknown>));
}

function compareToExpected(actual: IndexSummary[]): string[] {
  const mismatches: string[] = [];
  const byName = new Map(actual.map((i) => [i.name, i]));

  for (const spec of TRANSACTION_INDEXES) {
    const expected = expectedSummary(spec);
    const found = byName.get(spec.name);
    if (!found) {
      mismatches.push(`index manquant : ${describeIndex(expected)}`);
    } else if (!sameDefinition(found, expected)) {
      mismatches.push(`index différent : attendu ${describeIndex(expected)}, trouvé ${describeIndex(found)}`);
    }
  }

  const expectedNames = new Set(TRANSACTION_INDEXES.map((s) => s.name));
  for (const index of actual) {
    if (!expectedNames.has(index.name)) {
      mismatches.push(`index inattendu : ${describeIndex(index)}`);
    }
  }
  return mismatches;
}

export async function migrateOrderIndexes(
  db: Db,
  { apply, log = () => undefined }: OrderIndexMigrationOptions,
): Promise<OrderIndexMigrationResult> {
  const dbName = db.databaseName;
  log(`Base visée : ${dbName}`);
  log(`Mode : ${apply ? "APPLICATION (--apply)" : "simulation — aucune écriture"}`);
  log("Rappel : à jouer drapeau de monétisation éteint (MONETIZATION_ENABLED), avant le déploiement.");

  const collectionNames = await listCollectionNames(db);
  const transactionsExist = collectionNames.has(TRANSACTIONS_COLLECTION);
  const indexesBefore = await listTransactionIndexes(db, transactionsExist);

  const result: OrderIndexMigrationResult = {
    dbName,
    applied: false,
    refusal: null,
    collectionsToCreate: PAYMENT_COLLECTIONS.filter((name) => !collectionNames.has(name)),
    indexesToDrop: [],
    indexesToCreate: [],
    indexesBefore,
    indexesAfter: indexesBefore,
    mismatches: [],
    exitCode: 0,
  };

  log(`Index actuels de ${TRANSACTIONS_COLLECTION} (${indexesBefore.length}) :`);
  for (const index of indexesBefore) log(`  - ${describeIndex(index)}`);

  const refuse = (reason: string): OrderIndexMigrationResult => {
    log(`REFUS : ${reason}`);
    log("Aucune écriture effectuée.");
    return { ...result, refusal: reason, exitCode: 1 };
  };

  // --- Guards: checked before any write, in both modes ---
  if (transactionsExist) {
    const orders = db.collection(TRANSACTIONS_COLLECTION);

    const pendingCount = await orders.countDocuments({ status: "pending" });
    if (pendingCount > 0) {
      return refuse(`${pendingCount} commande(s) en attente dans ${TRANSACTIONS_COLLECTION}. La migration ne se joue que sans commande en attente.`);
    }

    const duplicateKeys = await orders
      .aggregate<{ _id: { key: string }; count: number }>([
        { $match: { idempotencyKey: { $type: "string" } } },
        { $group: { _id: { companyId: "$companyId", key: "$idempotencyKey" }, count: { $sum: 1 } } },
        { $match: { count: { $gt: 1 } } },
        { $limit: 5 },
      ])
      .toArray();
    if (duplicateKeys.length > 0) {
      const sample = duplicateKeys.map((d) => `"${d._id.key}" (x${d.count})`).join(", ");
      return refuse(`clés d'idempotence en double pour une même entreprise, l'index unique ne peut pas être construit : ${sample}.`);
    }
  }

  // --- Plan ---
  const expectedByName = new Map(TRANSACTION_INDEXES.map((s) => [s.name, expectedSummary(s)]));
  const legacy = indexesBefore.find((i) => i.name === LEGACY_IDEMPOTENCY_INDEX_NAME);
  if (legacy) result.indexesToDrop.push(legacy.name);

  const blocking: string[] = [];
  for (const index of indexesBefore) {
    if (index.name === LEGACY_IDEMPOTENCY_INDEX_NAME) continue;
    const expected = expectedByName.get(index.name);
    if (!expected) {
      blocking.push(`index inattendu : ${describeIndex(index)}`);
    } else if (!sameDefinition(index, expected)) {
      blocking.push(`index différent : attendu ${describeIndex(expected)}, trouvé ${describeIndex(index)}`);
    }
  }
  if (blocking.length > 0) {
    return refuse(`la liste d'index actuelle contient des écarts que la migration ne corrige pas : ${blocking.join(" ; ")}.`);
  }

  const presentNames = new Set(indexesBefore.map((i) => i.name));
  result.indexesToCreate = TRANSACTION_INDEXES.filter((s) => !presentNames.has(s.name)).map((s) => s.name);

  const nothingToDo =
    result.collectionsToCreate.length === 0 && result.indexesToDrop.length === 0 && result.indexesToCreate.length === 0;

  if (nothingToDo) {
    log("Rien à faire : les collections existent et les index sont conformes.");
    return result;
  }

  log("Plan :");
  for (const name of result.collectionsToCreate) log(`  - créer la collection ${name}`);
  for (const name of result.indexesToDrop) log(`  - supprimer l'ancien index ${name}`);
  for (const name of result.indexesToCreate) log(`  - créer l'index ${describeIndex(expectedByName.get(name)!)}`);

  if (!apply) {
    log("Simulation terminée : aucune écriture. Relancer avec --apply pour appliquer.");
    return result;
  }

  // --- Apply ---
  for (const name of result.collectionsToCreate) {
    await db.createCollection(name);
    log(`Collection créée : ${name}`);
  }

  const orders = db.collection(TRANSACTIONS_COLLECTION);
  for (const name of result.indexesToDrop) {
    await orders.dropIndex(name);
    log(`Index supprimé : ${name}`);
  }
  for (const spec of TRANSACTION_INDEXES) {
    if (!result.indexesToCreate.includes(spec.name)) continue;
    const { key, ...options } = spec;
    await orders.createIndex(key, options);
    log(`Index créé : ${spec.name}`);
  }
  result.applied = true;

  // --- Verify against the real index list ---
  result.indexesAfter = await listTransactionIndexes(db, true);
  log(`Index de ${TRANSACTIONS_COLLECTION} après migration (${result.indexesAfter.length}) :`);
  for (const index of result.indexesAfter) log(`  - ${describeIndex(index)}`);

  result.mismatches = compareToExpected(result.indexesAfter);
  if (result.mismatches.length > 0) {
    log("ÉCHEC : la liste finale ne correspond pas à la liste attendue.");
    for (const mismatch of result.mismatches) log(`  - ${mismatch}`);
    result.exitCode = 1;
    return result;
  }

  log("Migration appliquée : liste des index conforme.");
  return result;
}
