/**
 * OTP verification email template.
 * Plain HTML, no external CSS, accessible.
 */
export function otpEmailTemplate(otp: string): { subject: string; html: string } {
  return {
    subject: "Votre code de vérification vivasky.media",
    html: `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background:#F5F5F5;font-family:'Segoe UI',Inter,Arial,sans-serif;color:#242424;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F5F5F5;padding:40px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" style="max-width:480px;background:#FFFFFF;border-radius:8px;border:1px solid #E0E0E0;padding:40px 32px;">
        <tr><td>
          <p style="margin:0 0 24px;font-size:20px;font-weight:700;color:#0078D4;">vivasky.media</p>
          <h1 style="margin:0 0 8px;font-size:22px;font-weight:600;color:#242424;">Votre code de vérification</h1>
          <p style="margin:0 0 24px;font-size:14px;color:#616161;line-height:1.5;">
            Utilisez le code ci-dessous pour finaliser votre inscription sur vivasky.media.
          </p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr><td align="center" style="padding:16px 0 24px;">
              <div style="display:inline-block;padding:16px 32px;background:#EFF6FC;border:1px solid #0078D4;border-radius:8px;font-size:32px;font-weight:700;letter-spacing:8px;color:#0078D4;font-family:monospace;">
                ${otp}
              </div>
            </td></tr>
          </table>
          <p style="margin:0 0 24px;font-size:13px;color:#616161;line-height:1.5;">
            Ce code est valable <strong>10 minutes</strong>. Si vous n'avez pas demandé ce code, ignorez cet email.
          </p>
          <hr style="border:none;border-top:1px solid #E0E0E0;margin:24px 0;" />
          <p style="margin:0;font-size:11px;color:#8A8886;line-height:1.4;">
            vivasky.media - Tunisie<br/>
            Cet email a été envoyé automatiquement. Merci de ne pas y répondre.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  };
}
