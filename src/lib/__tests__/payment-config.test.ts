import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ---------------------------------------------------------------------------
// Cadrage V1.2 F1 — payment configuration is validated at startup, fails closed,
// and never echoes a variable's value.
// ---------------------------------------------------------------------------

const BASE_ENV: Record<string, string> = {
  MONGODB_URI: "mongodb://localhost/test",
  NEXTAUTH_SECRET: "test-secret",
  NEXTAUTH_URL: "http://localhost:3000",
  PAYMENT_ADAPTER: "simulated",
};

const FLOUCI_ENV: Record<string, string> = {
  ...BASE_ENV,
  PAYMENT_ADAPTER: "flouci",
  NEXTAUTH_URL: "https://vivasky.media",
  FLOUCI_PUBLIC_KEY: "pk-value-that-must-not-leak",
  FLOUCI_PRIVATE_KEY: "sk-value-that-must-not-leak",
  FLOUCI_BASE_URL: "https://flouci.example.test/api",
  FLOUCI_ENVIRONMENT: "test",
  PAYMENT_WEBHOOK_SECRET: "w".repeat(32),
  PAYMENT_SWEEP_SECRET: "s".repeat(32),
};

const PAYMENT_VARS = [
  "PAYMENT_ADAPTER",
  "PAYMENT_ACCEPTED_METHODS",
  "PAYMENT_SESSION_TIMEOUT_SECONDS",
  "PAYMENT_SIMULATED_OUTCOME",
  "PAYMENT_WEBHOOK_SECRET",
  "PAYMENT_SWEEP_SECRET",
  "FLOUCI_PUBLIC_KEY",
  "FLOUCI_PRIVATE_KEY",
  "FLOUCI_BASE_URL",
  "FLOUCI_ENVIRONMENT",
];

function stubEnv(vars: Record<string, string>): void {
  // Start from a known state: every payment variable absent unless provided.
  for (const name of PAYMENT_VARS) vi.stubEnv(name, undefined);
  for (const [name, value] of Object.entries(vars)) vi.stubEnv(name, value);
}

/** Loads env.ts with the stubbed environment; returns the logged validation output. */
async function loadEnv(vars: Record<string, string>): Promise<{ error: unknown; logged: string }> {
  stubEnv(vars);
  const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
  let error: unknown = null;
  try {
    await import("@/lib/env");
  } catch (err) {
    error = err;
  }
  const logged = JSON.stringify(spy.mock.calls);
  spy.mockRestore();
  return { error, logged };
}

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.doUnmock("@/lib/env");
});

describe("env — PAYMENT_ADAPTER", () => {
  it("accepts simulated and applies payment defaults", async () => {
    stubEnv(BASE_ENV);
    const { env } = await import("@/lib/env");
    expect(env.PAYMENT_ADAPTER).toBe("simulated");
    expect(env.PAYMENT_ACCEPTED_METHODS).toEqual(["card"]);
    expect(env.PAYMENT_SESSION_TIMEOUT_SECONDS).toBe(1200);
  });

  it("refuses to load when PAYMENT_ADAPTER is absent", async () => {
    const vars = { ...BASE_ENV };
    delete vars.PAYMENT_ADAPTER;
    const { error, logged } = await loadEnv(vars);
    expect(error).toBeInstanceOf(Error);
    expect(logged).toContain("PAYMENT_ADAPTER");
  });

  it("refuses an unknown adapter without echoing its value", async () => {
    const { error, logged } = await loadEnv({ ...BASE_ENV, PAYMENT_ADAPTER: "stripe-unknown-value" });
    expect(error).toBeInstanceOf(Error);
    expect(logged).toContain("PAYMENT_ADAPTER");
    expect(logged).not.toContain("stripe-unknown-value");
  });

  it("refuses an unknown accepted method", async () => {
    const { error, logged } = await loadEnv({ ...BASE_ENV, PAYMENT_ACCEPTED_METHODS: "card,cash" });
    expect(error).toBeInstanceOf(Error);
    expect(logged).toContain("PAYMENT_ACCEPTED_METHODS");
  });

  it("does not require Flouci variables with the simulator", async () => {
    const { error } = await loadEnv(BASE_ENV);
    expect(error).toBeNull();
  });
});

describe("env — flouci rules", () => {
  it("accepts a complete flouci configuration", async () => {
    const { error } = await loadEnv(FLOUCI_ENV);
    expect(error).toBeNull();
  });

  it.each([
    "FLOUCI_PUBLIC_KEY",
    "FLOUCI_PRIVATE_KEY",
    "FLOUCI_BASE_URL",
    "FLOUCI_ENVIRONMENT",
    "PAYMENT_WEBHOOK_SECRET",
    "PAYMENT_SWEEP_SECRET",
  ])("refuses to load when %s is missing, naming it", async (name) => {
    const vars = { ...FLOUCI_ENV };
    delete vars[name];
    const { error, logged } = await loadEnv(vars);
    expect(error).toBeInstanceOf(Error);
    expect(logged).toContain(name);
    expect(logged).not.toContain("sk-value-that-must-not-leak");
  });

  it("treats an empty key as missing, not as a usable empty string", async () => {
    const { error, logged } = await loadEnv({ ...FLOUCI_ENV, FLOUCI_PRIVATE_KEY: "" });
    expect(error).toBeInstanceOf(Error);
    expect(logged).toContain("FLOUCI_PRIVATE_KEY");
  });

  it.each([
    ["the local default", "http://localhost:3000"],
    ["plain http", "http://vivasky.media"],
    ["https on localhost", "https://localhost:3000"],
  ])("refuses NEXTAUTH_URL set to %s", async (_label, url) => {
    const { error, logged } = await loadEnv({ ...FLOUCI_ENV, NEXTAUTH_URL: url });
    expect(error).toBeInstanceOf(Error);
    expect(logged).toContain("NEXTAUTH_URL");
  });

  it("refuses a non-https FLOUCI_BASE_URL", async () => {
    const { error, logged } = await loadEnv({ ...FLOUCI_ENV, FLOUCI_BASE_URL: "http://flouci.example.test/api" });
    expect(error).toBeInstanceOf(Error);
    expect(logged).toContain("FLOUCI_BASE_URL");
  });

  it("refuses a short route secret without echoing it", async () => {
    const { error, logged } = await loadEnv({ ...FLOUCI_ENV, PAYMENT_WEBHOOK_SECRET: "short-secret-value" });
    expect(error).toBeInstanceOf(Error);
    expect(logged).toContain("PAYMENT_WEBHOOK_SECRET");
    expect(logged).not.toContain("short-secret-value");
  });
});

describe("payment adapter selection", () => {
  it("selects the simulator and describes it", async () => {
    vi.doMock("@/lib/env", () => ({ env: { PAYMENT_ADAPTER: "simulated" } }));
    const { getPaymentAdapter } = await import("@/lib/payment");
    expect(getPaymentAdapter().describe()).toEqual({ name: "simulated", environment: "test" });
  });

  it("fails closed when the adapter is missing — no fallback to the simulator", async () => {
    vi.doMock("@/lib/env", () => ({ env: {} }));
    const { getPaymentAdapter } = await import("@/lib/payment");
    expect(() => getPaymentAdapter()).toThrow("PAYMENT_ADAPTER is missing or invalid");
  });

  it("selects flouci and describes its declared environment (F3)", async () => {
    vi.doMock("@/lib/env", () => ({
      env: {
        PAYMENT_ADAPTER: "flouci",
        FLOUCI_PUBLIC_KEY: "pk",
        FLOUCI_PRIVATE_KEY: "sk",
        FLOUCI_BASE_URL: "https://developers.flouci.com",
        FLOUCI_ENVIRONMENT: "production",
      },
    }));
    const { getPaymentAdapter } = await import("@/lib/payment");
    expect(getPaymentAdapter().describe()).toEqual({ name: "flouci", environment: "production" });
  });

  it("refuses flouci with an incomplete configuration, without echoing any value", async () => {
    vi.doMock("@/lib/env", () => ({
      env: { PAYMENT_ADAPTER: "flouci", FLOUCI_PUBLIC_KEY: "pk-value-that-must-not-leak" },
    }));
    const { getPaymentAdapter } = await import("@/lib/payment");
    let message = "";
    try {
      getPaymentAdapter();
    } catch (err) {
      message = String(err);
    }
    expect(message).toContain("FLOUCI_PRIVATE_KEY");
    expect(message).not.toContain("pk-value-that-must-not-leak");
  });

  it("gives the simulator the configured outcome (PAYMENT_SIMULATED_OUTCOME)", async () => {
    vi.doMock("@/lib/env", () => ({ env: { PAYMENT_ADAPTER: "simulated", PAYMENT_SIMULATED_OUTCOME: "failure" } }));
    const { getPaymentAdapter } = await import("@/lib/payment");
    const { externalId } = await getPaymentAdapter().createPayment({
      orderId: "o", amountMillimes: 1000, successUrl: "https://app.test/ok", failUrl: "https://app.test/ko",
      webhookUrl: "https://app.test/hook", acceptedMethods: ["card"], sessionTimeoutSeconds: 1200,
    });
    expect((await getPaymentAdapter().verifyPayment(externalId)).status).toBe("failure");
  });
});

describe("PAYMENT_SIMULATED_OUTCOME", () => {
  it("defaults to success", async () => {
    const { error } = await loadEnv(BASE_ENV);
    expect(error).toBeNull();
    const { env } = await import("@/lib/env");
    expect(env.PAYMENT_SIMULATED_OUTCOME).toBe("success");
  });

  it("accepts failure", async () => {
    const { error } = await loadEnv({ ...BASE_ENV, PAYMENT_SIMULATED_OUTCOME: "failure" });
    expect(error).toBeNull();
    const { env } = await import("@/lib/env");
    expect(env.PAYMENT_SIMULATED_OUTCOME).toBe("failure");
  });

  it("rejects anything else, naming the variable", async () => {
    const { error, logged } = await loadEnv({ ...BASE_ENV, PAYMENT_SIMULATED_OUTCOME: "maybe" });
    expect(error).toBeInstanceOf(Error);
    expect(logged).toContain("PAYMENT_SIMULATED_OUTCOME");
  });
});

// ---------------------------------------------------------------------------
// F3 G4 — production + purchases open + simulator must refuse to start
// ---------------------------------------------------------------------------

describe("forbidden start combination (G4)", () => {
  async function setup(nodeEnv: string, flag: boolean, adapterName: string): Promise<() => void> {
    vi.stubEnv("NODE_ENV", nodeEnv);
    vi.doMock("@/lib/env", () => ({ env: { PAYMENT_ADAPTER: adapterName, MONETIZATION_ENABLED: flag } }));
    const { assertPaymentSetupAllowed } = await import("@/lib/payment");
    return assertPaymentSetupAllowed;
  }

  it("refuses production + flag on + simulator, with an explicit message", async () => {
    const assert = await setup("production", true, "simulated");
    expect(() => assert()).toThrow("PAYMENT_ADAPTER=simulated is forbidden in production while MONETIZATION_ENABLED is on");
  });

  it.each([
    ["production", false, "simulated"],
    ["production", true, "flouci"],
    ["development", true, "simulated"],
    ["test", true, "simulated"],
  ])("allows %s + flag %s + %s", async (nodeEnv, flag, adapterName) => {
    const assert = await setup(nodeEnv as string, flag as boolean, adapterName as string);
    expect(() => assert()).not.toThrow();
  });

  it("register() exits the process on the forbidden combination", async () => {
    vi.stubEnv("NEXT_RUNTIME", "nodejs");
    vi.stubEnv("NODE_ENV", "production");
    vi.doMock("@/lib/env", () => ({ env: { PAYMENT_ADAPTER: "simulated", MONETIZATION_ENABLED: true } }));
    const exit = vi.spyOn(process, "exit").mockImplementation(() => undefined as never);
    const logged = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const { register } = await import("@/instrumentation");
    await register();
    expect(exit).toHaveBeenCalledWith(1);
    expect(JSON.stringify(logged.mock.calls)).toContain("forbidden in production");
    exit.mockRestore();
    logged.mockRestore();
  });

  it("register() checks nothing while the application is being built", async () => {
    vi.stubEnv("NEXT_RUNTIME", "nodejs");
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PHASE", "phase-production-build");
    vi.doMock("@/lib/env", () => ({ env: { PAYMENT_ADAPTER: "simulated", MONETIZATION_ENABLED: true } }));
    const exit = vi.spyOn(process, "exit").mockImplementation(() => undefined as never);
    const { register } = await import("@/instrumentation");
    await register();
    expect(exit).not.toHaveBeenCalled();
    exit.mockRestore();
  });
});

describe("SimulatedPaymentAdapter — two-step interface", () => {
  const params = {
    orderId: "order-1",
    amountMillimes: 1_072_000,
    successUrl: "https://app.test/pay/success",
    failUrl: "https://app.test/pay/fail",
    webhookUrl: "https://app.test/pay/webhook",
    acceptedMethods: ["card" as const],
    sessionTimeoutSeconds: 1200,
  };

  it("returns an external id and an internal success redirect URL", async () => {
    const { SimulatedPaymentAdapter } = await import("@/lib/payment/simulated");
    const adapter = new SimulatedPaymentAdapter();
    const { externalId, redirectUrl } = await adapter.createPayment(params);
    expect(externalId).toMatch(/^SIM-/);
    const url = new URL(redirectUrl);
    expect(`${url.origin}${url.pathname}`).toBe(params.successUrl);
    expect(url.searchParams.get("payment_id")).toBe(externalId);
    const verified = await adapter.verifyPayment(externalId);
    expect(verified).toMatchObject({ status: "success", amountMillimes: 1_072_000, method: "simulated" });
  });

  it("simulates the failure outcome through the fail URL", async () => {
    const { SimulatedPaymentAdapter } = await import("@/lib/payment/simulated");
    const adapter = new SimulatedPaymentAdapter({ outcome: "failure" });
    const { externalId, redirectUrl } = await adapter.createPayment(params);
    expect(redirectUrl.startsWith(params.failUrl)).toBe(true);
    expect((await adapter.verifyPayment(externalId)).status).toBe("failure");
  });

  it("keeps no state: another instance (a restarted server) verifies the same payment", async () => {
    const { SimulatedPaymentAdapter } = await import("@/lib/payment/simulated");
    const { externalId } = await new SimulatedPaymentAdapter().createPayment(params);
    expect(externalId).toMatch(/^SIM-success-1072000-[a-z0-9]+$/);
    const verified = await new SimulatedPaymentAdapter({ outcome: "failure" }).verifyPayment(externalId);
    expect(verified).toMatchObject({ status: "success", amountMillimes: 1_072_000, method: "simulated" });
  });

  it("throws on an unknown payment id instead of inventing a status", async () => {
    const { SimulatedPaymentAdapter } = await import("@/lib/payment/simulated");
    const adapter = new SimulatedPaymentAdapter();
    await expect(adapter.verifyPayment("SIM-unknown")).rejects.toThrow();
  });

  it.each([0, -1, 1.5])("rejects a non-positive-integer amount (%s)", async (amountMillimes) => {
    const { SimulatedPaymentAdapter } = await import("@/lib/payment/simulated");
    const adapter = new SimulatedPaymentAdapter();
    await expect(adapter.createPayment({ ...params, amountMillimes })).rejects.toThrow();
  });
});

describe("instrumentation register()", () => {
  it("does nothing outside the Node runtime", async () => {
    vi.stubEnv("NEXT_RUNTIME", "edge");
    vi.doMock("@/lib/env", () => ({ env: {} }));
    const { register } = await import("@/instrumentation");
    await expect(register()).resolves.toBeUndefined();
  });

  it("exits the process at startup in the Node runtime when the payment setup is invalid", async () => {
    vi.stubEnv("NEXT_RUNTIME", "nodejs");
    vi.doMock("@/lib/env", () => ({ env: {} }));
    const exit = vi.spyOn(process, "exit").mockImplementation(() => undefined as never);
    const logged = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const { register } = await import("@/instrumentation");
    await register();
    expect(exit).toHaveBeenCalledWith(1);
    expect(JSON.stringify(logged.mock.calls)).toContain("PAYMENT_ADAPTER is missing or invalid");
    exit.mockRestore();
    logged.mockRestore();
  });

  it("starts normally with a valid setup", async () => {
    vi.stubEnv("NEXT_RUNTIME", "nodejs");
    vi.doMock("@/lib/env", () => ({ env: { PAYMENT_ADAPTER: "simulated" } }));
    const exit = vi.spyOn(process, "exit").mockImplementation(() => undefined as never);
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const { register } = await import("@/instrumentation");
    await register();
    expect(exit).not.toHaveBeenCalled();
    expect(JSON.stringify(info.mock.calls)).toContain("adapter=simulated environment=test");
    exit.mockRestore();
    info.mockRestore();
  });
});
