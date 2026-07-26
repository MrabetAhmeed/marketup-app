// ---------------------------------------------------------------------------
// Payment adapter interface (pattern: StorageAdapter in storage/types.ts)
// ---------------------------------------------------------------------------

export type PaymentType = "boost" | "sponsoring";

export interface CheckoutParams {
  companyId: string;
  type: PaymentType;
  profileKind: "brandup" | "traceup" | "linkup";
  priceHT: number;
  vatRate: number;
  idempotencyKey: string;
}

export interface CheckoutResult {
  /** Payment reference (unique per transaction) */
  reference: string;
  /** Resulting status after checkout */
  status: "paid_simulated" | "pending";
  /** ISO timestamp of payment (null if pending redirect to PSP) */
  paidAt: string | null;
  /** Payment method recorded */
  paymentMethod: "simulated" | "card" | "bank_transfer";
}

export type PaymentStatus = "paid" | "paid_simulated" | "pending" | "failed";

export interface PaymentAdapter {
  createCheckout(params: CheckoutParams): Promise<CheckoutResult>;
  verifyPayment(reference: string): Promise<PaymentStatus>;
}
