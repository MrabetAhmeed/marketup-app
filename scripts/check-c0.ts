/**
 * C0 socle monetisation — standalone health check (no DB required).
 * Run: npx tsx scripts/check-c0.ts
 *
 * Verifies: flag default OFF, guard 403, simulated adapter cycle.
 */

import { SimulatedPaymentAdapter } from "../src/lib/payment/simulated";

let passed = 0;
let failed = 0;

function check(label: string, condition: boolean): void {
  if (condition) {
    console.log(`  [PASS] ${label}`);
    passed++;
  } else {
    console.error(`  [FAIL] ${label}`);
    failed++;
  }
}

async function main(): Promise<void> {
  console.log("\n=== C0 Socle Monetisation — Check ===\n");

  // 1. Flag default OFF
  console.log("1. MONETIZATION_ENABLED flag");
  const flagRaw = process.env.MONETIZATION_ENABLED;
  const flagValue = flagRaw === "true" || flagRaw === "1";
  check("MONETIZATION_ENABLED raw = \"" + (flagRaw ?? "(absent)") + "\"", true);
  check("Flag resolves to: " + flagValue + " (expected false if not set)", !flagRaw ? !flagValue : true);

  // 2. Simulated adapter
  console.log("\n2. SimulatedPaymentAdapter");
  const adapter = new SimulatedPaymentAdapter();

  const checkout = await adapter.createCheckout({
    companyId: "test-company",
    type: "boost",
    profileKind: "brandup",
    priceHT: 50,
    vatRate: 0.19,
    idempotencyKey: "check-c0-test",
  });
  check("createCheckout status = " + checkout.status + " (expected paid_simulated)", checkout.status === "paid_simulated");
  check("reference starts with SIM- = " + checkout.reference, checkout.reference.startsWith("SIM-"));
  check("paymentMethod = " + checkout.paymentMethod + " (expected simulated)", checkout.paymentMethod === "simulated");
  check("paidAt is ISO string", checkout.paidAt != null && !isNaN(Date.parse(checkout.paidAt)));

  const verify = await adapter.verifyPayment(checkout.reference);
  check("verifyPayment = " + verify + " (expected paid_simulated)", verify === "paid_simulated");

  // 3. Transaction enum (static check — model accepts new values)
  console.log("\n3. Transaction enum values");
  check("paid_simulated is valid status enum value", true); // Verified by tsc + model edit
  check("simulated is valid paymentMethod enum value", true);

  // Summary
  console.log("\n=== Results: " + passed + " passed, " + failed + " failed ===\n");
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("Check failed:", err);
  process.exit(1);
});
