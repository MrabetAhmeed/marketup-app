// ---------------------------------------------------------------------------
// Payment adapter interface (pattern: StorageAdapter in storage/types.ts)
// Cadrage V1.2 §6: three operations — create, verify, describe.
// ---------------------------------------------------------------------------

export type PaymentType = "boost" | "sponsoring";

export type PaymentAdapterName = "simulated" | "flouci";

export type PaymentEnvironment = "test" | "production";

export type PaymentMethodKind = "card" | "wallet";

/** PSP status, normalized. Mapping to order states happens in order.service.ts. */
export type NormalizedPaymentStatus =
  | "success"
  | "pending"
  | "expired"
  | "failure"
  | "preauth_success"
  | "system_failure";

export interface CreatePaymentParams {
  /** Our order id — sent to the PSP as tracking id */
  orderId: string;
  /** TTC amount (stamp included) in millimes, integer */
  amountMillimes: number;
  successUrl: string;
  failUrl: string;
  webhookUrl: string;
  acceptedMethods: PaymentMethodKind[];
  sessionTimeoutSeconds: number;
}

export interface CreatePaymentResult {
  /** PSP payment id, stored on the order */
  externalId: string;
  /** Where the buyer must be redirected to pay */
  redirectUrl: string;
}

export interface VerifyPaymentResult {
  status: NormalizedPaymentStatus;
  /** Amount actually paid, in millimes (null when the PSP does not report it) */
  amountMillimes: number | null;
  method: PaymentMethodKind | "simulated" | null;
  /** Raw PSP payload, kept for audit */
  raw: unknown;
}

export interface PaymentAdapterDescription {
  name: PaymentAdapterName;
  environment: PaymentEnvironment;
}

export interface PaymentAdapter {
  /** Network or HTTP failures throw — a status is never invented. */
  createPayment(params: CreatePaymentParams): Promise<CreatePaymentResult>;
  /** Network or HTTP failures throw — a status is never invented. */
  verifyPayment(externalId: string): Promise<VerifyPaymentResult>;
  describe(): PaymentAdapterDescription;
}
