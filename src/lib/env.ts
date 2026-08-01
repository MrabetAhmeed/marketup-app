import { z } from "zod";

const envSchema = z.object({
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
  PAYMENT_ADAPTER: z.enum(["simulated"]).default("simulated"),

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

  // Cloudflare R2 (optional in dev — app must not crash if empty)
  R2_ACCOUNT_ID: z.string().default(""),
  R2_ACCESS_KEY_ID: z.string().default(""),
  R2_SECRET_ACCESS_KEY: z.string().default(""),
  R2_BUCKET_NAME: z.string().default("marketup-uploads"),
  R2_ENDPOINT: z.string().default(""),
  R2_PUBLIC_URL: z.string().default(""),

});

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
