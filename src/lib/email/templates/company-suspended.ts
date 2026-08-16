export function companySuspendedEmailTemplate(params: {
  companyName: string;
  reason: string;
}): { subject: string; html: string } {
  return {
    subject: "Votre compte MARKET-UP a été désactivé",
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px;">
        <h2 style="color: #1A1A1A; font-size: 18px; margin-bottom: 16px;">Compte désactivé</h2>
        <p style="color: #424242; font-size: 14px; line-height: 1.6;">
          Le compte <strong>${params.companyName}</strong> a été désactivé par l'équipe MARKET-UP.
        </p>
        <div style="background: #FEF2F2; border: 1px solid #FCA5A5; border-radius: 6px; padding: 12px 16px; margin: 16px 0;">
          <p style="color: #991B1B; font-size: 13px; margin: 0;">
            <strong>Motif :</strong> ${params.reason}
          </p>
        </div>
        <p style="color: #424242; font-size: 14px; line-height: 1.6;">
          Pendant la désactivation, vos profils publics sont masqués et votre accès au tableau
          de bord est suspendu.
        </p>
        <p style="color: #424242; font-size: 14px; line-height: 1.6;">
          Pour toute question, contactez notre support à
          <a href="mailto:manager@vivasky.media" style="color: #0078D4;">manager@vivasky.media</a>.
        </p>
        <hr style="border: none; border-top: 1px solid #E0E0E0; margin: 24px 0;" />
        <p style="color: #9E9E9E; font-size: 12px;">MARKET-UP — vivasky.media</p>
      </div>
    `,
  };
}
