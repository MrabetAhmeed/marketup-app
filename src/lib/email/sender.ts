import { Resend } from "resend";
import { env } from "@/lib/env";
import { otpEmailTemplate } from "./templates/otp";
import { passwordResetEmailTemplate } from "./templates/password-reset";
import { profileSubmittedEmailTemplate } from "./templates/profile-submitted";
import { profileValidatedEmailTemplate } from "./templates/profile-validated";
import { profileRejectedEmailTemplate } from "./templates/profile-rejected";
import { companyValidatedEmailTemplate } from "./templates/company-validated";
import { companyRejectedEmailTemplate } from "./templates/company-rejected";
import { rseReceiptValidatedEmailTemplate } from "./templates/rse-receipt-validated";
import { rseReceiptRejectedEmailTemplate } from "./templates/rse-receipt-rejected";
import { companyResubmittedEmailTemplate } from "./templates/company-resubmitted";
import { passwordChangedEmailTemplate } from "./templates/password-changed";
import { accountDeletedEmailTemplate } from "./templates/account-deleted";
import { companySuspendedEmailTemplate } from "./templates/company-suspended";
import { companyReactivatedEmailTemplate } from "./templates/company-reactivated";
import { companyRestoredEmailTemplate } from "./templates/company-restored";

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

/** Notify user that their company account has been validated. */
export async function sendCompanyValidatedEmail(params: {
  userEmail: string;
  companyName: string;
  dashboardUrl: string;
}): Promise<void> {
  const { subject, html } = companyValidatedEmailTemplate({
    companyName: params.companyName,
    dashboardUrl: params.dashboardUrl,
  });
  await sendEmail(params.userEmail, subject, html);
}

/** Notify user that their company account has been rejected. */
export async function sendCompanyRejectedEmail(params: {
  userEmail: string;
  companyName: string;
  rejectedReason: string;
}): Promise<void> {
  const { subject, html } = companyRejectedEmailTemplate({
    companyName: params.companyName,
    rejectedReason: params.rejectedReason,
    supportEmail: "support@vivasky.media",
  });
  await sendEmail(params.userEmail, subject, html);
}

/** Notify user that their RSE receipt has been validated. */
export async function sendRseReceiptValidatedEmail(params: {
  userEmail: string;
  companyName: string;
  associationName: string;
  amount: number;
}): Promise<void> {
  const { subject, html } = rseReceiptValidatedEmailTemplate({
    companyName: params.companyName,
    associationName: params.associationName,
    amount: params.amount,
    rsePageUrl: `${env.NEXTAUTH_URL}/dashboard/rse`,
  });
  await sendEmail(params.userEmail, subject, html);
}

/** Notify user that their RSE receipt has been rejected. */
export async function sendRseReceiptRejectedEmail(params: {
  userEmail: string;
  companyName: string;
  associationName: string;
  amount: number;
  rejectedReason: string;
}): Promise<void> {
  const { subject, html } = rseReceiptRejectedEmailTemplate({
    companyName: params.companyName,
    associationName: params.associationName,
    amount: params.amount,
    rejectedReason: params.rejectedReason,
    rsePageUrl: `${env.NEXTAUTH_URL}/dashboard/rse`,
  });
  await sendEmail(params.userEmail, subject, html);
}

/** Notify admin that a company has resubmitted after rejection. */
export async function sendCompanyResubmittedEmail(params: {
  adminEmail: string;
  companyName: string;
  adminUrl: string;
}): Promise<void> {
  const { subject, html } = companyResubmittedEmailTemplate({
    companyName: params.companyName,
    adminUrl: params.adminUrl,
  });
  await sendEmail(params.adminEmail, subject, html);
}

/** Notify user that their password has been changed. */
export async function sendPasswordChangedEmail(to: string): Promise<void> {
  const forgotUrl = `${env.NEXTAUTH_URL}/forgot`;
  const { subject, html } = passwordChangedEmailTemplate(forgotUrl);
  await sendEmail(to, subject, html);
}

/** Notify user that their account has been deleted (self-delete). */
export async function sendAccountDeletedEmail(params: {
  userEmail: string;
  companyName: string;
}): Promise<void> {
  const { subject, html } = accountDeletedEmailTemplate(params.companyName);
  await sendEmail(params.userEmail, subject, html);
}

/** Notify owner that their company has been suspended by admin. */
export async function sendCompanySuspendedEmail(params: {
  userEmail: string;
  companyName: string;
  reason: string;
}): Promise<void> {
  const { subject, html } = companySuspendedEmailTemplate({
    companyName: params.companyName,
    reason: params.reason,
  });
  await sendEmail(params.userEmail, subject, html);
}

/** Notify owner that their company has been reactivated by admin. */
export async function sendCompanyReactivatedEmail(params: {
  userEmail: string;
  companyName: string;
}): Promise<void> {
  const { subject, html } = companyReactivatedEmailTemplate({
    companyName: params.companyName,
    dashboardUrl: `${env.NEXTAUTH_URL}/dashboard`,
  });
  await sendEmail(params.userEmail, subject, html);
}

/** Notify owner that their deleted account has been restored by admin. */
export async function sendCompanyRestoredEmail(params: {
  userEmail: string;
  companyName: string;
}): Promise<void> {
  const { subject, html } = companyRestoredEmailTemplate({
    companyName: params.companyName,
    dashboardUrl: `${env.NEXTAUTH_URL}/dashboard`,
  });
  await sendEmail(params.userEmail, subject, html);
}
