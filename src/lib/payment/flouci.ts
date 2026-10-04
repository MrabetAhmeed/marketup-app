import type {
  CreatePaymentParams,
  CreatePaymentResult,
  NormalizedPaymentStatus,
  PaymentAdapter,
  PaymentAdapterDescription,
  PaymentEnvironment,
  VerifyPaymentResult,
} from "./types";

// ---------------------------------------------------------------------------
// Flouci adapter — https://docs.flouci.com/
//
//   POST {base}/api/v2/generate_payment        → { result: { success, payment_id, link } }
//   GET  {base}/api/v2/verify_payment/{id}     → { success, result: { status, amount, type } }
//   Authorization: Bearer <PUBLIC_KEY>:<PRIVATE_KEY>
//
// Amounts are in millimes. The same URL serves test and production: only the
// keys differ, so `environment` is declarative (FLOUCI_ENVIRONMENT).
// Keys are server-only and never appear in an error message.
// ---------------------------------------------------------------------------

const REQUEST_TIMEOUT_MS = 15_000;

const STATUS_MAP: Record<string, NormalizedPaymentStatus> = {
  SUCCESS: "success",
  PENDING: "pending",
  EXPIRED: "expired",
  FAILURE: "failure",
  PREAUTH_SUCCESS: "preauth_success",
  SYSTEM_FAILURE: "system_failure",
};

export interface FlouciAdapterConfig {
  publicKey: string;
  privateKey: string;
  /** e.g. https://developers.flouci.com */
  baseUrl: string;
  environment: PaymentEnvironment;
  /** Injected in tests: no real network call is ever made there. */
  fetchImpl?: typeof fetch;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export class FlouciPaymentAdapter implements PaymentAdapter {
  private readonly config: FlouciAdapterConfig;

  constructor(config: FlouciAdapterConfig) {
    this.config = { ...config, baseUrl: config.baseUrl.replace(/\/+$/, "") };
  }

  async createPayment(params: CreatePaymentParams): Promise<CreatePaymentResult> {
    if (!Number.isInteger(params.amountMillimes) || params.amountMillimes <= 0) {
      throw new Error("amountMillimes must be a positive integer");
    }

    const json = await this.request("generate_payment", "POST", "/api/v2/generate_payment", {
      amount: String(params.amountMillimes),
      success_link: params.successUrl,
      fail_link: params.failUrl,
      webhook: params.webhookUrl,
      developer_tracking_id: params.orderId,
      session_timeout_secs: params.sessionTimeoutSeconds,
      // The only method switch the API offers: the wallet depends on the merchant account.
      accept_card: params.acceptedMethods.includes("card"),
    });

    const result = isRecord(json) ? json.result : null;
    if (
      !isRecord(result) ||
      result.success !== true ||
      typeof result.payment_id !== "string" ||
      result.payment_id === "" ||
      typeof result.link !== "string" ||
      result.link === ""
    ) {
      throw new Error("Flouci generate_payment: unexpected response");
    }
    return { externalId: result.payment_id, redirectUrl: result.link };
  }

  async verifyPayment(externalId: string): Promise<VerifyPaymentResult> {
    const json = await this.request(
      "verify_payment",
      "GET",
      `/api/v2/verify_payment/${encodeURIComponent(externalId)}`,
    );

    const result = isRecord(json) ? json.result : null;
    if (!isRecord(json) || json.success !== true || !isRecord(result) || typeof result.status !== "string") {
      throw new Error("Flouci verify_payment: unexpected response");
    }

    const status = STATUS_MAP[result.status];
    if (!status) {
      // Never invent a status
      throw new Error("Flouci verify_payment: unknown payment status");
    }

    return {
      status,
      amountMillimes: typeof result.amount === "number" && Number.isInteger(result.amount) ? result.amount : null,
      method: result.type === "card" || result.type === "wallet" ? result.type : null,
      raw: json,
    };
  }

  describe(): PaymentAdapterDescription {
    return { name: "flouci", environment: this.config.environment };
  }

  /** Any network or HTTP failure throws. Messages name the operation, never a key. */
  private async request(operation: string, method: "GET" | "POST", path: string, body?: unknown): Promise<unknown> {
    const fetchImpl = this.config.fetchImpl ?? fetch;
    let response: Response;
    try {
      response = await fetchImpl(`${this.config.baseUrl}${path}`, {
        method,
        headers: {
          Authorization: `Bearer ${this.config.publicKey}:${this.config.privateKey}`,
          "Content-Type": "application/json",
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        cache: "no-store",
      });
    } catch {
      throw new Error(`Flouci ${operation}: network error`);
    }

    if (!response.ok) {
      throw new Error(`Flouci ${operation}: HTTP ${response.status}`);
    }

    try {
      return await response.json();
    } catch {
      throw new Error(`Flouci ${operation}: invalid JSON response`);
    }
  }
}
