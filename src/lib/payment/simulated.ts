import type {
  CreatePaymentParams,
  CreatePaymentResult,
  PaymentAdapter,
  PaymentAdapterDescription,
  VerifyPaymentResult,
} from "./types";

export type SimulatedOutcome = "success" | "failure";

// SIM-<outcome>-<amount in millimes>-<random>
const SIMULATED_ID = /^SIM-(success|failure)-(\d+)-[a-z0-9]+$/;

/**
 * Simulated payment adapter — no real PSP, no state.
 *
 * The payment id encodes the outcome and the amount, so verifyPayment answers
 * without any storage and survives a server restart. The redirect URL is our
 * own return link: the two-step flow can be exercised end to end locally.
 * The outcome is chosen at construction (PAYMENT_SIMULATED_OUTCOME), "success"
 * by default, "failure" to exercise the error path.
 */
export class SimulatedPaymentAdapter implements PaymentAdapter {
  private readonly outcome: SimulatedOutcome;

  constructor(options: { outcome?: SimulatedOutcome } = {}) {
    this.outcome = options.outcome ?? "success";
  }

  async createPayment(params: CreatePaymentParams): Promise<CreatePaymentResult> {
    if (!Number.isInteger(params.amountMillimes) || params.amountMillimes <= 0) {
      throw new Error("amountMillimes must be a positive integer");
    }

    const random = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
    const externalId = `SIM-${this.outcome}-${params.amountMillimes}-${random}`;

    const redirectUrl = new URL(this.outcome === "success" ? params.successUrl : params.failUrl);
    redirectUrl.searchParams.set("payment_id", externalId);
    return { externalId, redirectUrl: redirectUrl.toString() };
  }

  async verifyPayment(externalId: string): Promise<VerifyPaymentResult> {
    const match = SIMULATED_ID.exec(externalId);
    if (!match) {
      throw new Error("Unknown simulated payment");
    }
    const status = match[1] === "success" ? "success" : "failure";
    return {
      status,
      amountMillimes: Number(match[2]),
      method: "simulated",
      raw: { adapter: "simulated", externalId, status },
    };
  }

  describe(): PaymentAdapterDescription {
    return { name: "simulated", environment: "test" };
  }
}
