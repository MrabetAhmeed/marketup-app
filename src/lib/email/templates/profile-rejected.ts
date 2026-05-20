export function profileRejectedEmailTemplate(params: {
  companyName: string;
  profileKind: string;
  rejectionReason: string;
  dashboardUrl: string;
}): { subject: string; html: string } {
  const kindLabel = params.profileKind === "brandup" ? "BrandUP" : params.profileKind === "traceup" ? "TraceUP" : "LinkUP";

  return {
    subject: `Profil ${kindLabel} refusé — Action requise — MARKET-UP`,
    html: `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background:#F5F5F5;font-family:'Segoe UI',Inter,Arial,sans-serif;color:#242424;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F5F5F5;padding:40px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" style="max-width:480px;background:#FFFFFF;border-radius:8px;border:1px solid #E0E0E0;padding:40px 32px;">
        <tr><td>
          <p style="margin:0 0 24px;font-size:20px;font-weight:700;color:#0078D4;">MARKET-UP</p>
          <h1 style="margin:0 0 8px;font-size:18px;font-weight:600;color:#242424;">Profil ${kindLabel} refusé</h1>
          <p style="margin:0 0 16px;font-size:14px;color:#616161;line-height:1.5;">
            Bonjour,<br><br>
            Le profil <strong>${kindLabel}</strong> de <strong>${params.companyName}</strong> n'a pas pu être validé par notre équipe.
          </p>
          <div style="margin:0 0 20px;padding:14px 16px;background:#FEF2F2;border:1px solid #FCA5A5;border-radius:6px;">
            <p style="margin:0 0 4px;font-size:12px;font-weight:600;color:#991B1B;">Motif du refus</p>
            <p style="margin:0;font-size:14px;color:#7F1D1D;line-height:1.5;">${params.rejectionReason}</p>
          </div>
          <p style="margin:0 0 20px;font-size:14px;color:#616161;line-height:1.5;">
            Vous pouvez corriger les points mentionnés et resoumettre votre profil depuis votre tableau de bord.
          </p>
          <a href="${params.dashboardUrl}" style="display:inline-block;padding:12px 24px;background:#0078D4;color:#FFFFFF;text-decoration:none;font-size:14px;font-weight:600;border-radius:6px;">
            Corriger et resoumettre
          </a>
          <p style="margin:24px 0 0;font-size:13px;color:#616161;line-height:1.5;">
            Merci de faire confiance à MARKET-UP.<br>
            L'équipe MARKET-UP
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  };
}
