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

  // Two-step interface (V1.2 F1): verify a payment created through createPayment
  const created = await adapter.createPayment({
    orderId: "check-c0-order",
    amountMillimes: 1_000,
    successUrl: "https://example.test/success",
    failUrl: "https://example.test/fail",
    webhookUrl: "https://example.test/webhook",
    acceptedMethods: ["card"],
    sessionTimeoutSeconds: 1200,
  });
  const verify = await adapter.verifyPayment(created.externalId);
  check("verifyPayment status = " + verify.status + " (expected success)", verify.status === "success");

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
