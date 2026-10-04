import type {
  CheckoutParams,
  CheckoutResult,
  CreatePaymentParams,
  CreatePaymentResult,
  NormalizedPaymentStatus,
  PaymentAdapter,
  PaymentAdapterDescription,
  VerifyPaymentResult,
} from "./types";

export type SimulatedOutcome = "success" | "failure";

interface SimulatedPayment {
  amountMillimes: number;
  status: NormalizedPaymentStatus;
}

function newReference(): string {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 8);
  return `SIM-${ts}-${rand}`;
}

/**
 * Simulated payment adapter — no real PSP.
 *
 * createPayment returns an internal redirect URL (our own success or fail link)
 * so the two-step flow can be exercised without Flouci. The outcome is chosen
 * at construction: "success" by default, "failure" to exercise the error path.
 */
export class SimulatedPaymentAdapter implements PaymentAdapter {
  private readonly outcome: SimulatedOutcome;
  private readonly payments = new Map<string, SimulatedPayment>();

  constructor(options: { outcome?: SimulatedOutcome } = {}) {
    this.outcome = options.outcome ?? "success";
  }

  async createPayment(params: CreatePaymentParams): Promise<CreatePaymentResult> {
    if (!Number.isInteger(params.amountMillimes) || params.amountMillimes <= 0) {
      throw new Error("amountMillimes must be a positive integer");
    }

    const externalId = newReference();
    const status: NormalizedPaymentStatus = this.outcome === "success" ? "success" : "failure";
    this.payments.set(externalId, { amountMillimes: params.amountMillimes, status });

    const redirectUrl = new URL(status === "success" ? params.successUrl : params.failUrl);
    redirectUrl.searchParams.set("payment_id", externalId);
    return { externalId, redirectUrl: redirectUrl.toString() };
  }

  async verifyPayment(externalId: string): Promise<VerifyPaymentResult> {
    const payment = this.payments.get(externalId);
    if (!payment) {
      throw new Error("Unknown simulated payment");
    }
    return {
      status: payment.status,
      amountMillimes: payment.amountMillimes,
      method: "simulated",
      raw: { adapter: "simulated", externalId, status: payment.status },
    };
  }

  describe(): PaymentAdapterDescription {
    return { name: "simulated", environment: "test" };
  }

  /**
   * One-step checkout used by the current purchase flow — instant "paid",
   * unchanged behaviour. Removed when F3 switches to the two-step flow.
   */
  async createCheckout(_params: CheckoutParams): Promise<CheckoutResult> {
    return {
      reference: newReference(),
      status: "paid_simulated",
      paidAt: new Date().toISOString(),
      paymentMethod: "simulated",
    };
  }
}
