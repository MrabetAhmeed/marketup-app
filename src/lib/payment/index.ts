import { env } from "@/lib/env";
import { SimulatedPaymentAdapter } from "./simulated";
import type { CheckoutParams, CheckoutResult, PaymentAdapter, PaymentAdapterName } from "./types";

/**
 * Fail-closed selection (cadrage V1.2 V6): the adapter comes from the validated
 * configuration, and an unknown or missing value throws — there is no fallback
 * to the simulator. The error never echoes the configured value.
 */
function createAdapter(name: PaymentAdapterName): PaymentAdapter {
  switch (name) {
    case "simulated":
      return new SimulatedPaymentAdapter();
    case "flouci":
      // The Flouci adapter is written in F3; until then selecting it must not start.
      throw new Error("PAYMENT_ADAPTER=flouci is not available yet (Flouci adapter lands in sprint F3)");
    default: {
      const unreachable: never = name;
      void unreachable;
      throw new Error("PAYMENT_ADAPTER is missing or invalid");
    }
  }
}

let adapter: PaymentAdapter | null = null;

/**
 * Singleton payment adapter. Selected on first use rather than at module import,
 * so modules that merely import a payment-aware service do not select an adapter.
 * src/instrumentation.ts calls it at server start, which is where an invalid
 * setup must fail (V6).
 */
export function getPaymentAdapter(): PaymentAdapter {
  adapter ??= createAdapter(env.PAYMENT_ADAPTER);
  return adapter;
}

/**
 * One-step checkout used by the current purchase flow (boost, sponsoring).
 * Only the simulator can settle instantly; F3 replaces this with the two-step flow.
 */
export const payment = {
  createCheckout(params: CheckoutParams): Promise<CheckoutResult> {
    const current = getPaymentAdapter();
    if (!(current instanceof SimulatedPaymentAdapter)) {
      throw new Error("One-step checkout requires the simulated payment adapter");
    }
    return current.createCheckout(params);
  },
};

export type {
  PaymentAdapter,
  PaymentAdapterDescription,
  PaymentAdapterName,
  PaymentEnvironment,
  PaymentMethodKind,
  PaymentType,
  NormalizedPaymentStatus,
  CreatePaymentParams,
  CreatePaymentResult,
  VerifyPaymentResult,
  CheckoutParams,
  CheckoutResult,
} from "./types";
