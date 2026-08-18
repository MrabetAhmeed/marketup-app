/**
 * Password changed confirmation email template.
 * Sent after a successful password change from /dashboard/settings.
 */
export function passwordChangedEmailTemplate(forgotUrl: string): { subject: string; html: string } {
  return {
    subject: "Votre mot de passe vivasky.media a été modifié",
    html: `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background:#F5F5F5;font-family:'Segoe UI',Inter,Arial,sans-serif;color:#242424;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F5F5F5;padding:40px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" style="max-width:480px;background:#FFFFFF;border-radius:8px;border:1px solid #E0E0E0;padding:40px 32px;">
        <tr><td>
          <p style="margin:0 0 24px;font-size:20px;font-weight:700;color:#0078D4;">vivasky.media</p>
          <h1 style="margin:0 0 8px;font-size:22px;font-weight:600;color:#242424;">Mot de passe modifié</h1>
          <p style="margin:0 0 24px;font-size:14px;color:#616161;line-height:1.5;">
            Votre mot de passe a été modifié avec succès. Toutes les autres sessions ont été déconnectées.
          </p>
          <p style="margin:0 0 24px;font-size:14px;color:#616161;line-height:1.5;">
            Si vous n'êtes pas à l'origine de cette modification, réinitialisez immédiatement votre mot de passe&nbsp;:
          </p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr><td align="center" style="padding:8px 0 24px;">
              <a href="${forgotUrl}" target="_blank" style="display:inline-block;padding:12px 32px;background:#B91C1C;color:#FFFFFF;font-size:14px;font-weight:600;text-decoration:none;border-radius:4px;">
                Réinitialiser mon mot de passe
              </a>
            </td></tr>
          </table>
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
