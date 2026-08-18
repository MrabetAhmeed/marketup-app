export function companyRestoredEmailTemplate(params: {
  companyName: string;
  dashboardUrl: string;
}): { subject: string; html: string } {
  return {
    subject: "Votre compte vivasky.media a été restauré",
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px;">
        <h2 style="color: #1A1A1A; font-size: 18px; margin-bottom: 16px;">Compte restauré</h2>
        <p style="color: #424242; font-size: 14px; line-height: 1.6;">
          Le compte <strong>${params.companyName}</strong> a été restauré par l'équipe vivasky.media.
        </p>
        <p style="color: #424242; font-size: 14px; line-height: 1.6;">
          Votre compte et vos profils sont de nouveau accessibles. Vous pouvez vous reconnecter
          et accéder à votre tableau de bord.
        </p>
        <div style="text-align: center; margin: 24px 0;">
          <a href="${params.dashboardUrl}" style="display: inline-block; background: #0078D4; color: #fff; text-decoration: none; padding: 10px 24px; border-radius: 6px; font-size: 14px; font-weight: 600;">
            Accéder à mon tableau de bord
          </a>
        </div>
        <hr style="border: none; border-top: 1px solid #E0E0E0; margin: 24px 0;" />
        <p style="color: #9E9E9E; font-size: 12px;">vivasky.media - Tunisie</p>
      </div>
    `,
  };
}
