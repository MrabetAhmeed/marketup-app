import { z } from "zod";

const envSchema = z.object({
  // MongoDB
  MONGODB_URI: z.string().min(1, "MONGODB_URI is required"),

  // NextAuth
  NEXTAUTH_URL: z.string().url().default("http://localhost:3000"),
  NEXTAUTH_SECRET: z.string().min(1, "NEXTAUTH_SECRET is required"),

  // Resend
  RESEND_API_KEY: z.string().default(""),

  // Pusher
  PUSHER_APP_ID: z.string().default(""),
  PUSHER_KEY: z.string().default(""),
  PUSHER_SECRET: z.string().default(""),
  PUSHER_CLUSTER: z.string().default("eu"),

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
