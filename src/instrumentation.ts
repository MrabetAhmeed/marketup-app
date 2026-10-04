/**
 * Server start hook (Next.js instrumentation, enabled by
 * `experimental.instrumentationHook` in next.config.mjs).
 *
 * Validates the configuration and selects the payment adapter when the server
 * starts, so an invalid payment setup refuses to boot instead of failing on the
 * first purchase (cadrage V1.2 V6). Node runtime only: the edge runtime
 * (middleware) never loads the payment module.
 *
 * Next 14 only logs a failing register() and keeps serving 500s, so the
 * process exits explicitly: a refused start must be visible to the host.
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  try {
    const { getPaymentAdapter } = await import("@/lib/payment");
    const { name, environment } = getPaymentAdapter().describe();
    console.info(`[payment] adapter=${name} environment=${environment}`);
  } catch (err) {
    // Messages name the variable, never its value (env.ts, payment/index.ts).
    const reason = err instanceof Error ? err.message : "unknown error";
    console.error(`[startup] refused: ${reason}`);
    process.exit(1);
  }
}
