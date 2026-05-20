import { Resend } from "resend";
import { env } from "@/lib/env";
import { otpEmailTemplate } from "./templates/otp";
import { passwordResetEmailTemplate } from "./templates/password-reset";
import { profileSubmittedEmailTemplate } from "./templates/profile-submitted";
import { profileValidatedEmailTemplate } from "./templates/profile-validated";
import { profileRejectedEmailTemplate } from "./templates/profile-rejected";

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

/** Notify admin that a profile has been submitted for validation. */
export async function sendProfileSubmittedEmail(params: {
  adminEmail: string;
  companyName: string;
  profileKind: string;
  previousStatus: string;
  submittedAt: Date;
  adminUrl: string;
}): Promise<void> {
  const { subject, html } = profileSubmittedEmailTemplate({
    companyName: params.companyName,
    profileKind: params.profileKind,
    previousStatus: params.previousStatus,
    submittedAt: params.submittedAt.toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }),
    adminUrl: params.adminUrl,
  });
  await sendEmail(params.adminEmail, subject, html);
}

/** Notify user that their profile has been validated by admin. */
export async function sendProfileValidatedEmail(params: {
  userEmail: string;
  companyName: string;
  profileKind: string;
  profileUrl: string;
}): Promise<void> {
  const { subject, html } = profileValidatedEmailTemplate({
    companyName: params.companyName,
    profileKind: params.profileKind,
    profileUrl: params.profileUrl,
  });
  await sendEmail(params.userEmail, subject, html);
}

/** Notify user that their profile has been rejected by admin. */
export async function sendProfileRejectedEmail(params: {
  userEmail: string;
  companyName: string;
  profileKind: string;
  rejectionReason: string;
  dashboardUrl: string;
}): Promise<void> {
  const { subject, html } = profileRejectedEmailTemplate({
    companyName: params.companyName,
    profileKind: params.profileKind,
    rejectionReason: params.rejectionReason,
    dashboardUrl: params.dashboardUrl,
  });
  await sendEmail(params.userEmail, subject, html);
}

/** Send account approved notification. Stub — template built in Phase 6. */
export async function sendAccountApprovedEmail(to: string, _companyName: string): Promise<void> {
  await sendEmail(
    to,
    "Votre compte MARKET-UP est activé",
    `<p>Votre compte est maintenant actif. Connectez-vous sur <a href="${env.NEXTAUTH_URL}">${env.NEXTAUTH_URL}</a>.</p>`,
  );
}
