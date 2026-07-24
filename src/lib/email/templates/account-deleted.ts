export function accountDeletedEmailTemplate(companyName: string): { subject: string; html: string } {
  return {
    subject: "Votre compte MARKET-UP a été supprimé",
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px;">
        <h2 style="color: #1A1A1A; font-size: 18px; margin-bottom: 16px;">Compte supprimé</h2>
        <p style="color: #424242; font-size: 14px; line-height: 1.6;">
          Le compte <strong>${companyName}</strong> a été supprimé de la plateforme MARKET-UP
          à votre demande.
        </p>
        <p style="color: #424242; font-size: 14px; line-height: 1.6;">
          Vos données seront conservées pendant une période limitée conformément à nos obligations
          légales, puis définitivement supprimées.
        </p>
        <p style="color: #424242; font-size: 14px; line-height: 1.6;">
          Si vous n'êtes pas à l'origine de cette action, contactez immédiatement notre support
          à <a href="mailto:support@vivasky.media" style="color: #0078D4;">support@vivasky.media</a>.
        </p>
        <hr style="border: none; border-top: 1px solid #E0E0E0; margin: 24px 0;" />
        <p style="color: #9E9E9E; font-size: 12px;">MARKET-UP — vivasky.media</p>
      </div>
    `,
  };
}
