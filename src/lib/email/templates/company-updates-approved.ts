export function companyUpdatesApprovedEmailTemplate(params: {
  companyName: string;
  fieldLabels: string[];
  dashboardUrl: string;
}): { subject: string; html: string } {
  const fieldList = params.fieldLabels.map((l) => `<li style="margin:0 0 4px;font-size:14px;color:#242424;">${l}</li>`).join("");
  return {
    subject: `Modifications validées — ${params.companyName} — MARKET-UP`,
    html: `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background:#F5F5F5;font-family:'Segoe UI',Inter,Arial,sans-serif;color:#242424;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F5F5F5;padding:40px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" style="max-width:480px;background:#FFFFFF;border-radius:8px;border:1px solid #E0E0E0;padding:40px 32px;">
        <tr><td>
          <p style="margin:0 0 24px;font-size:20px;font-weight:700;color:#0078D4;">MARKET-UP</p>
          <h1 style="margin:0 0 8px;font-size:18px;font-weight:600;color:#242424;">Modifications validées</h1>
          <p style="margin:0 0 16px;font-size:14px;color:#616161;line-height:1.5;">
            Bonjour,<br><br>
            Les modifications soumises pour <strong>${params.companyName}</strong> ont été validées par notre équipe.
            Elles sont désormais visibles sur vos profils publics.
          </p>
          <p style="margin:0 0 8px;font-size:13px;font-weight:600;color:#242424;">Champs modifiés :</p>
          <ul style="margin:0 0 20px;padding-left:20px;">${fieldList}</ul>
          <a href="${params.dashboardUrl}" style="display:inline-block;padding:12px 24px;background:#0078D4;color:#FFFFFF;text-decoration:none;font-size:14px;font-weight:600;border-radius:6px;">
            Voir mon compte
          </a>
          <p style="margin:24px 0 0;font-size:13px;color:#616161;line-height:1.5;">
            Merci de faire confiance à MARKET-UP.<br>L'équipe MARKET-UP
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  };
}
