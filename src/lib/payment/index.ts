import { SimulatedPaymentAdapter } from "./simulated";
import type { PaymentAdapter } from "./types";

function createAdapter(): PaymentAdapter {
  // V1: only simulated adapter. Future PSP adapters switch here.
  const adapterName = process.env.PAYMENT_ADAPTER || "simulated";

  switch (adapterName) {
    case "simulated":
    default:
      return new SimulatedPaymentAdapter();
  }
}

/** Singleton payment adapter instance */
export const payment: PaymentAdapter = createAdapter();

export type { PaymentAdapter, CheckoutParams, CheckoutResult, PaymentStatus, PaymentType } from "./types";
