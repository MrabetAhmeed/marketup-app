/**
 * Password reset email template.
 * Plain HTML, no external CSS, accessible.
 */
export function passwordResetEmailTemplate(resetUrl: string): { subject: string; html: string } {
  return {
    subject: "Réinitialisation de votre mot de passe MARKET-UP",
    html: `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background:#F5F5F5;font-family:'Segoe UI',Inter,Arial,sans-serif;color:#242424;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F5F5F5;padding:40px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" style="max-width:480px;background:#FFFFFF;border-radius:8px;border:1px solid #E0E0E0;padding:40px 32px;">
        <tr><td>
          <p style="margin:0 0 24px;font-size:20px;font-weight:700;color:#0078D4;">MARKET-UP</p>
          <h1 style="margin:0 0 8px;font-size:22px;font-weight:600;color:#242424;">Réinitialisation du mot de passe</h1>
          <p style="margin:0 0 24px;font-size:14px;color:#616161;line-height:1.5;">
            Vous avez demandé la réinitialisation de votre mot de passe. Cliquez sur le bouton ci-dessous pour choisir un nouveau mot de passe.
          </p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr><td align="center" style="padding:8px 0 24px;">
              <a href="${resetUrl}" target="_blank" style="display:inline-block;padding:12px 32px;background:#0078D4;color:#FFFFFF;font-size:14px;font-weight:600;text-decoration:none;border-radius:4px;">
                Réinitialiser mon mot de passe
              </a>
            </td></tr>
          </table>
          <p style="margin:0 0 8px;font-size:13px;color:#616161;line-height:1.5;">
            Ce lien est valable <strong>1 heure</strong>. Passé ce délai, vous devrez refaire une demande.
          </p>
          <p style="margin:0 0 24px;font-size:12px;color:#8A8886;line-height:1.4;">
            Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur&nbsp;:<br/>
            <span style="color:#0078D4;word-break:break-all;">${resetUrl}</span>
          </p>
          <p style="margin:0 0 24px;font-size:13px;color:#616161;line-height:1.5;">
            Si vous n'avez pas demandé cette réinitialisation, ignorez cet email. Votre mot de passe ne sera pas modifié.
          </p>
          <hr style="border:none;border-top:1px solid #E0E0E0;margin:24px 0;" />
          <p style="margin:0;font-size:11px;color:#8A8886;line-height:1.4;">
            MARKET-UP · AGGREGAX SUARL · Tunisie<br/>
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
