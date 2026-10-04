import { env } from "@/lib/env";
import { FlouciPaymentAdapter } from "./flouci";
import { SimulatedPaymentAdapter } from "./simulated";
import type { PaymentAdapter, PaymentAdapterName } from "./types";

/**
 * Fail-closed selection (cadrage V1.2 V6): the adapter comes from the validated
 * configuration, and an unknown or missing value throws — there is no fallback
 * to the simulator. The error never echoes the configured value.
 */
function createAdapter(name: PaymentAdapterName): PaymentAdapter {
  switch (name) {
    case "simulated":
      return new SimulatedPaymentAdapter({ outcome: env.PAYMENT_SIMULATED_OUTCOME });
    case "flouci": {
      // env.ts guarantees these four when PAYMENT_ADAPTER=flouci; checked again
      // so a partial configuration can never reach the operator.
      const { FLOUCI_PUBLIC_KEY, FLOUCI_PRIVATE_KEY, FLOUCI_BASE_URL, FLOUCI_ENVIRONMENT } = env;
      if (!FLOUCI_PUBLIC_KEY || !FLOUCI_PRIVATE_KEY || !FLOUCI_BASE_URL || !FLOUCI_ENVIRONMENT) {
        throw new Error("PAYMENT_ADAPTER=flouci requires FLOUCI_PUBLIC_KEY, FLOUCI_PRIVATE_KEY, FLOUCI_BASE_URL and FLOUCI_ENVIRONMENT");
      }
      return new FlouciPaymentAdapter({
        publicKey: FLOUCI_PUBLIC_KEY,
        privateKey: FLOUCI_PRIVATE_KEY,
        baseUrl: FLOUCI_BASE_URL,
        environment: FLOUCI_ENVIRONMENT,
      });
    }
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
 * Forbidden combination, checked at server start (F3 G4): production + purchases
 * open + simulator. The simulator confirms every payment without any money
 * moving, so it would hand out services for free. Every other combination is allowed.
 */
export function assertPaymentSetupAllowed(): void {
  if (process.env.NODE_ENV === "production" && env.MONETIZATION_ENABLED && env.PAYMENT_ADAPTER === "simulated") {
    throw new Error(
      "PAYMENT_ADAPTER=simulated is forbidden in production while MONETIZATION_ENABLED is on: the simulator would hand out services for free",
    );
  }
}

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
} from "./types";
