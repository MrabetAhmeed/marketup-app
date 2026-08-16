import { Transaction } from "@/models/transaction.model";
import { computeTTC } from "@/lib/pricing";
import { connectDb } from "@/lib/db";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TransactionOwnerDTO {
  id: string;
  type: "boost" | "sponsoring";
  profileKind: "brandup" | "traceup" | "linkup" | null;
  priceHT: number;
  vatAmount: number;
  fiscalStampDT: number;
  priceTTC: number;
  currency: string;
  status: "pending" | "paid" | "refunded" | "failed";
  paymentMethod: string | null;
  invoiceNumber: string | null;
  paidAt: string | null;
  createdAt: string;
}

export interface TransactionAdminDTO {
  id: string;
  companyId: string;
  companyDisplayName: string;
  type: "boost" | "sponsoring";
  profileKind: "brandup" | "traceup" | "linkup" | null;
  priceHT: number;
  vatAmount: number;
  fiscalStampDT: number;
  priceTTC: number;
  currency: string;
  status: "pending" | "paid" | "paid_simulated" | "refunded" | "failed";
  paymentMethod: string | null;
  paymentReference: string | null;
  invoiceNumber: string | null;
  paidAt: string | null;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Owner: list company transactions
// ---------------------------------------------------------------------------

export async function getOwnerTransactions(companyId: string): Promise<TransactionOwnerDTO[]> {
  await connectDb();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const docs = await (Transaction as any).find({ companyId })
    .sort({ paidAt: -1, createdAt: -1 })
    .lean();

  return (docs as Record<string, unknown>[]).map((t) => {
    const stamp = (t.fiscalStampDT as number) ?? 0;
    const { vatAmount, priceTTC } = computeTTC(t.priceHT as number, t.vatRate as number, stamp);
    // D12: paid_simulated → "paid" for owner
    let ownerStatus = t.status as string;
    if (ownerStatus === "paid_simulated") ownerStatus = "paid";

    return {
      id: String(t._id),
      type: t.type as TransactionOwnerDTO["type"],
      profileKind: (t.profileKind ?? null) as TransactionOwnerDTO["profileKind"],
      priceHT: t.priceHT as number,
      vatAmount,
      fiscalStampDT: stamp,
      priceTTC,
      currency: (t.currency as string) || "DT",
      status: ownerStatus as TransactionOwnerDTO["status"],
      paymentMethod: (t.paymentMethod as string) ?? null,
      invoiceNumber: (t.invoiceNumber as string) ?? null,
      paidAt: t.paidAt ? (t.paidAt as Date).toISOString() : null,
      createdAt: (t.createdAt as Date).toISOString(),
    };
  });
}

// ---------------------------------------------------------------------------
// Admin: list all transactions (with company displayName)
// ---------------------------------------------------------------------------

interface AdminTransactionsFilter {
  status?: string;
  type?: string;
}

export async function getAdminTransactions(
  filter: AdminTransactionsFilter = {},
): Promise<TransactionAdminDTO[]> {
  await connectDb();

  const query: Record<string, unknown> = {};
  if (filter.status) query.status = filter.status;
  if (filter.type) query.type = filter.type;

  const docs = await Transaction.aggregate([
    { $match: { deletedAt: null, ...query } },
    { $sort: { paidAt: -1, createdAt: -1 } },
    {
      $lookup: {
        from: "companies",
        localField: "companyId",
        foreignField: "_id",
        as: "_company",
      },
    },
    { $unwind: { path: "$_company", preserveNullAndEmptyArrays: true } },
    {
      $project: {
        _id: 1,
        companyId: 1,
        "companyDisplayName": { $ifNull: ["$_company.data.displayName.fr", "—"] },
        type: 1,
        profileKind: 1,
        priceHT: 1,
        vatRate: 1,
        fiscalStampDT: 1,
        currency: 1,
        status: 1,
        paymentMethod: 1,
        paymentReference: 1,
        invoiceNumber: 1,
        paidAt: 1,
        createdAt: 1,
      },
    },
  ]);

  return docs.map((t) => {
    const stamp = (t.fiscalStampDT as number) ?? 0;
    const { vatAmount, priceTTC } = computeTTC(t.priceHT as number, t.vatRate as number, stamp);
    return {
      id: String(t._id),
      companyId: String(t.companyId),
      companyDisplayName: t.companyDisplayName as string,
      type: t.type as TransactionAdminDTO["type"],
      profileKind: (t.profileKind ?? null) as TransactionAdminDTO["profileKind"],
      priceHT: t.priceHT as number,
      vatAmount,
      fiscalStampDT: stamp,
      priceTTC,
      currency: (t.currency as string) || "DT",
      status: t.status as TransactionAdminDTO["status"],
      paymentMethod: (t.paymentMethod as string) ?? null,
      paymentReference: (t.paymentReference as string) ?? null,
      invoiceNumber: (t.invoiceNumber as string) ?? null,
      paidAt: t.paidAt ? new Date(t.paidAt as string).toISOString() : null,
      createdAt: new Date(t.createdAt as string).toISOString(),
    };
  });
}
