export function transactionAdminEmailTemplate(params: {
  companyName: string;
  type: "boost" | "sponsoring";
  amountTTC: string;
  invoiceNumber: string;
}): { subject: string; html: string } {
  const typeLabel = params.type === "boost" ? "Boost" : "Sponsoring";
  return {
    subject: `Nouvelle transaction ${typeLabel} — ${params.companyName} — ${params.amountTTC} DT`,
    html: `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background:#F5F5F5;font-family:'Segoe UI',Inter,Arial,sans-serif;color:#242424;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F5F5F5;padding:40px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" style="max-width:480px;background:#FFFFFF;border-radius:8px;border:1px solid #E0E0E0;padding:40px 32px;">
        <tr><td>
          <p style="margin:0 0 24px;font-size:20px;font-weight:700;color:#5C2D91;">vivasky.media Admin</p>
          <h1 style="margin:0 0 8px;font-size:18px;font-weight:600;color:#242424;">Nouvelle transaction</h1>
          <p style="margin:0 0 20px;font-size:14px;color:#616161;line-height:1.5;">
            Une nouvelle transaction <strong>${typeLabel}</strong> a été enregistrée.
          </p>
          <table role="presentation" width="100%" style="margin:0 0 20px;font-size:14px;color:#242424;">
            <tr><td style="padding:6px 0;color:#616161;">Entreprise</td><td style="padding:6px 0;font-weight:600;">${params.companyName}</td></tr>
            <tr><td style="padding:6px 0;color:#616161;">Type</td><td style="padding:6px 0;font-weight:600;">${typeLabel}</td></tr>
            <tr><td style="padding:6px 0;color:#616161;">Montant TTC</td><td style="padding:6px 0;font-weight:600;">${params.amountTTC} DT</td></tr>
            <tr><td style="padding:6px 0;color:#616161;">Commande</td><td style="padding:6px 0;font-weight:600;font-family:monospace;">${params.invoiceNumber}</td></tr>
          </table>
          <p style="margin:0;font-size:13px;color:#616161;line-height:1.5;">
            Consultez les détails dans l'espace admin vivasky.media.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  };
}
