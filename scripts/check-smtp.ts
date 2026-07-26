/**
 * SMTP connectivity check — Run: npm run check:smtp
 *
 * Creates a Nodemailer transporter and calls verify().
 * Reports OK or a detailed error. Never sends an actual email.
 */

import nodemailer from "nodemailer";

const host = process.env.SMTP_HOST || "";
const port = Number(process.env.SMTP_PORT) || 465;
const secureEnv = process.env.SMTP_SECURE;
const secure = secureEnv === "true" || secureEnv === "1" ? true : secureEnv === "false" || secureEnv === "0" ? false : port === 465;
const user = process.env.SMTP_USER || "";
const pass = process.env.SMTP_PASS || "";
const from = process.env.EMAIL_FROM || "(not set)";

if (!host || !user) {
  console.log("[check-smtp] SMTP not configured (SMTP_HOST or SMTP_USER empty).");
  console.log("             Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS in .env.local");
  console.log("             Then run: npm run check:smtp");
  process.exit(0);
}

console.log(`[check-smtp] Connecting to ${host}:${port} (secure: ${secure}) as ${user}`);
console.log(`[check-smtp] EMAIL_FROM = ${from}`);

const transporter = nodemailer.createTransport({
  host,
  port,
  secure,
  auth: { user, pass },
  connectionTimeout: 10_000,
  greetingTimeout: 10_000,
  socketTimeout: 30_000,
});

transporter
  .verify()
  .then(() => {
    console.log("[check-smtp] OK — SMTP connection verified successfully.");
    process.exit(0);
  })
  .catch((err: unknown) => {
    console.error("[check-smtp] FAILED — SMTP connection error:");
    console.error(err);
    process.exit(1);
  });
