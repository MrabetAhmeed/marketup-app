import { z } from "zod";

/** An unset or empty variable is treated as absent — never as a usable empty string. */
function emptyToUndefined(v: unknown): unknown {
  return v === "" ? undefined : v;
}

function optionalString(): z.ZodEffects<z.ZodOptional<z.ZodString>, string | undefined, unknown> {
  return z.preprocess(emptyToUndefined, z.string().optional());
}

const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1", "[::1]", "0.0.0.0"]);
const MIN_ROUTE_SECRET_LENGTH = 32;

const envObjectSchema = z.object({
  // MongoDB
  MONGODB_URI: z.string().min(1, "MONGODB_URI is required"),

  // NextAuth
  NEXTAUTH_URL: z.string().url().default("http://localhost:3000"),
  NEXTAUTH_SECRET: z.string().min(1, "NEXTAUTH_SECRET is required"),

  // SMTP (transactional email via Nodemailer)
  SMTP_HOST: z.string().default(""),
  SMTP_PORT: z.coerce.number().int().default(465),
  SMTP_SECURE: z.preprocess(
    (v) => (v === "" || v === undefined ? undefined : v === "true" || v === "1"),
    z.boolean().optional(),
  ),
  SMTP_USER: z.string().default(""),
  SMTP_PASS: z.string().default(""),
  EMAIL_FROM: z.string().min(1).default("onboarding@resend.dev"),

  // Monetization
  MONETIZATION_ENABLED: z.preprocess(
    (v) => v === "true" || v === "1",
    z.boolean().default(false),
  ),
  // Payment (V1.2 F1) — no default: the adapter must always be set explicitly.
  // Error messages never echo the received value (secrets must not reach logs).
  PAYMENT_ADAPTER: z.enum(["simulated", "flouci"], {
    errorMap: () => ({ message: "PAYMENT_ADAPTER must be set to \"simulated\" or \"flouci\"" }),
  }),
  PAYMENT_ACCEPTED_METHODS: z
    .string()
    .default("card")
    .transform((v) => v.split(",").map((m) => m.trim()).filter(Boolean))
    .pipe(
      z
        .array(z.enum(["card", "wallet"], { errorMap: () => ({ message: "PAYMENT_ACCEPTED_METHODS only accepts \"card\" and \"wallet\"" }) }))
        .min(1, "PAYMENT_ACCEPTED_METHODS must list at least one method"),
    ),
  PAYMENT_SESSION_TIMEOUT_SECONDS: z.coerce.number().int().positive().default(1200),
  // Simulator only: outcome of every simulated payment (F3 G3).
  PAYMENT_SIMULATED_OUTCOME: z.preprocess(
    emptyToUndefined,
    z.enum(["success", "failure"], {
      errorMap: () => ({ message: "PAYMENT_SIMULATED_OUTCOME must be \"success\" or \"failure\"" }),
    }).default("success"),
  ),
  PAYMENT_WEBHOOK_SECRET: optionalString(),
  PAYMENT_SWEEP_SECRET: optionalString(),
  FLOUCI_PUBLIC_KEY: optionalString(),
  FLOUCI_PRIVATE_KEY: optionalString(),
  FLOUCI_BASE_URL: optionalString(),
  FLOUCI_ENVIRONMENT: z.preprocess(
    emptyToUndefined,
    z.enum(["test", "production"], {
      errorMap: () => ({ message: "FLOUCI_ENVIRONMENT must be \"test\" or \"production\"" }),
    }).optional(),
  ),

  // Pusher
  PUSHER_APP_ID: z.string().default(""),
  PUSHER_KEY: z.string().default(""),
  PUSHER_SECRET: z.string().default(""),
  PUSHER_CLUSTER: z.string().default("eu"),

  // Admin notifications
  ADMIN_NOTIFICATION_EMAIL: z.string().default("manager@vivasky.media"),

  // Storage
  STORAGE_ADAPTER: z.enum(["local", "r2", "cloudinary"]).default("local"),

  // Cloudinary
  CLOUDINARY_CLOUD_NAME: z.string().default(""),
  CLOUDINARY_API_KEY: z.string().default(""),
  CLOUDINARY_API_SECRET: z.string().default(""),
  UPLOAD_MAX_SIZE_MB: z.coerce.number().int().positive().default(5),
  UPLOAD_ALLOWED_IMAGE_TYPES: z.string().default("image/jpeg,image/png,image/webp"),
  UPLOAD_ALLOWED_DOC_TYPES: z.string().default("application/pdf"),

  // Backup
  BACKUP_MONGODB_URI: z.string().default(""),
  BACKUP_CRON_SECRET: z.string().default(""),
  SIGNUP_TEMP_MAX_AGE_DAYS: z.coerce.number().int().min(0).default(7),

  // Legal pages — external document URLs (with optional #fragment for scroll)
  MENTIONS_LEGALES_SOURCE_URL: z.string().url().default("https://static.vivasky.media/cgu_cgv.html#mentions-legales"),
  CGU_SOURCE_URL: z.string().url().default("https://static.vivasky.media/cgu_cgv.html#cgu"),
  CGV_SOURCE_URL: z.string().url().default("https://static.vivasky.media/cgu_cgv.html#cgv"),
  CONFIDENTIALITE_SOURCE_URL: z.string().url().default("https://static.vivasky.media/cgu_cgv.html#confidentialite"),

  // Cloudflare R2 (optional in dev — app must not crash if empty)
  R2_ACCOUNT_ID: z.string().default(""),
  R2_ACCESS_KEY_ID: z.string().default(""),
  R2_SECRET_ACCESS_KEY: z.string().default(""),
  R2_BUCKET_NAME: z.string().default("marketup-uploads"),
  R2_ENDPOINT: z.string().default(""),
  R2_PUBLIC_URL: z.string().default(""),

});

/**
 * Rules that only apply when the real PSP is selected (cadrage V1.2 §11, V6).
 * Each issue names the variable; none includes the variable's value.
 */
const envSchema = envObjectSchema.superRefine((v, ctx) => {
  if (v.PAYMENT_ADAPTER !== "flouci") return;

  const requireVar = (name: keyof typeof v, present: boolean): void => {
    if (!present) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: [name], message: `${name} is required when PAYMENT_ADAPTER=flouci` });
    }
  };

  requireVar("FLOUCI_PUBLIC_KEY", v.FLOUCI_PUBLIC_KEY !== undefined);
  requireVar("FLOUCI_PRIVATE_KEY", v.FLOUCI_PRIVATE_KEY !== undefined);
  requireVar("FLOUCI_ENVIRONMENT", v.FLOUCI_ENVIRONMENT !== undefined);
  requireVar("FLOUCI_BASE_URL", v.FLOUCI_BASE_URL !== undefined);
  requireVar("PAYMENT_WEBHOOK_SECRET", v.PAYMENT_WEBHOOK_SECRET !== undefined);
  requireVar("PAYMENT_SWEEP_SECRET", v.PAYMENT_SWEEP_SECRET !== undefined);

  if (v.FLOUCI_BASE_URL !== undefined && !isHttpsUrl(v.FLOUCI_BASE_URL)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["FLOUCI_BASE_URL"], message: "FLOUCI_BASE_URL must be an https URL" });
  }

  for (const name of ["PAYMENT_WEBHOOK_SECRET", "PAYMENT_SWEEP_SECRET"] as const) {
    const secret = v[name];
    if (secret !== undefined && secret.length < MIN_ROUTE_SECRET_LENGTH) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [name],
        message: `${name} must be at least ${MIN_ROUTE_SECRET_LENGTH} characters when PAYMENT_ADAPTER=flouci`,
      });
    }
  }

  // Return links and webhook are built from NEXTAUTH_URL: a local default would
  // silently send Flouci callbacks to a machine it cannot reach.
  if (!isPublicHttpsUrl(v.NEXTAUTH_URL)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["NEXTAUTH_URL"],
      message: "NEXTAUTH_URL must be a public https URL when PAYMENT_ADAPTER=flouci",
    });
  }
});

function isHttpsUrl(value: string): boolean {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

function isPublicHttpsUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !LOCAL_HOSTNAMES.has(url.hostname);
  } catch {
    return false;
  }
}

export type Env = z.infer<typeof envSchema>;

function validateEnv(): Env {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error("Invalid environment variables:", parsed.error.flatten().fieldErrors);
    throw new Error("Invalid environment variables");
  }
  return parsed.data;
}

export const env: Env = validateEnv();
