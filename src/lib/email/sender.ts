import { Resend } from "resend";
import { env } from "@/lib/env";
import { otpEmailTemplate } from "./templates/otp";
import { passwordResetEmailTemplate } from "./templates/password-reset";

const FROM_ADDRESS = `MARKET-UP <${env.EMAIL_FROM}>`;

let resendClient: Resend | null = null;

function getClient(): Resend | null {
  if (!env.RESEND_API_KEY) {
    return null;
  }
  if (!resendClient) {
    resendClient = new Resend(env.RESEND_API_KEY);
  }
  return resendClient;
}

async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  const client = getClient();
  if (!client) {
    console.warn(`[email] RESEND_API_KEY not set — skipping email to ${to} (subject: "${subject}")`);
    return;
  }

  const { error } = await client.emails.send({
    from: FROM_ADDRESS,
    to,
    subject,
    html,
  });

  if (error) {
    console.error("[email] Failed to send:", error);
    throw new Error(`Email send failed: ${error.message}`);
  }
}

/** Send a 6-digit OTP verification code. */
export async function sendOtpEmail(to: string, otp: string): Promise<void> {
  const { subject, html } = otpEmailTemplate(otp);
  await sendEmail(to, subject, html);
}

/** Send a password reset link. */
export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
  const { subject, html } = passwordResetEmailTemplate(resetUrl);
  await sendEmail(to, subject, html);
}

/** Send account approved notification. Stub — template built in Phase 6. */
export async function sendAccountApprovedEmail(to: string, _companyName: string): Promise<void> {
  await sendEmail(
    to,
    "Votre compte MARKET-UP est activé",
    `<p>Votre compte est maintenant actif. Connectez-vous sur <a href="${env.NEXTAUTH_URL}">${env.NEXTAUTH_URL}</a>.</p>`,
  );
}
