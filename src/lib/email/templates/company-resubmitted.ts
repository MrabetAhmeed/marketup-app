export function companyResubmittedEmailTemplate(params: {
  companyName: string;
  adminUrl: string;
}): { subject: string; html: string } {
  return {
    subject: `Re-soumission compte : ${params.companyName} — MARKET-UP`,
    html: `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background:#F5F5F5;font-family:'Segoe UI',Inter,Arial,sans-serif;color:#242424;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F5F5F5;padding:40px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" style="max-width:480px;background:#FFFFFF;border-radius:8px;border:1px solid #E0E0E0;padding:40px 32px;">
        <tr><td>
          <p style="margin:0 0 24px;font-size:20px;font-weight:700;color:#5C2D91;">MARKET-UP Admin</p>
          <h1 style="margin:0 0 8px;font-size:18px;font-weight:600;color:#242424;">Re-soumission de compte</h1>
          <p style="margin:0 0 20px;font-size:14px;color:#616161;line-height:1.5;">
            L'entreprise <strong>${params.companyName}</strong> a corrigé ses informations et resoumet son compte pour validation.
          </p>
          <a href="${params.adminUrl}" style="display:inline-block;padding:12px 24px;background:#5C2D91;color:#FFFFFF;text-decoration:none;font-size:14px;font-weight:600;border-radius:6px;">
            Examiner dans le dashboard admin
          </a>
          <p style="margin:24px 0 0;font-size:12px;color:#A0A0A0;">Cet email est envoyé automatiquement par MARKET-UP.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  };
}
