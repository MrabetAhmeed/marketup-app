import type { PaymentAdapter, CheckoutParams, CheckoutResult, PaymentStatus } from "./types";

/**
 * Simulated payment adapter — instant "paid" without real PSP.
 * Used for monetization flow validation before integrating the real operator.
 */
export class SimulatedPaymentAdapter implements PaymentAdapter {
  async createCheckout(_params: CheckoutParams): Promise<CheckoutResult> {
    const ts = Date.now().toString(36);
    const rand = Math.random().toString(36).slice(2, 8);
    const reference = `SIM-${ts}-${rand}`;

    return {
      reference,
      status: "paid_simulated",
      paidAt: new Date().toISOString(),
      paymentMethod: "simulated",
    };
  }

  async verifyPayment(_reference: string): Promise<PaymentStatus> {
    return "paid_simulated";
  }
}
