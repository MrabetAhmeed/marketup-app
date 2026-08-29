export function backupFailedEmailTemplate(params: {
  error: string;
  date: string;
}): { subject: string; html: string } {
  return {
    subject: `[ALERTE] Echec du backup quotidien — ${params.date}`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px;">
        <h2 style="color: #1A1A1A; font-size: 18px; margin-bottom: 16px;">Echec du backup quotidien</h2>
        <p style="color: #424242; font-size: 14px; line-height: 1.6;">
          Le backup du <strong>${params.date}</strong> a echoue. La purge des comptes orphelins
          n'a <strong>pas</strong> ete executee (mode sequentiel strict).
        </p>
        <div style="background: #FEF2F2; border: 1px solid #FCA5A5; border-radius: 6px; padding: 12px 16px; margin: 16px 0;">
          <p style="color: #991B1B; font-size: 13px; margin: 0;">
            <strong>Erreur :</strong> ${params.error}
          </p>
        </div>
        <p style="color: #424242; font-size: 14px; line-height: 1.6;">
          Verifiez les logs applicatifs et la connectivite du cluster de backup dans Atlas.
        </p>
        <hr style="border: none; border-top: 1px solid #E0E0E0; margin: 24px 0;" />
        <p style="color: #9E9E9E; font-size: 12px;">vivasky.media - Systeme de backup automatique</p>
      </div>
    `,
  };
}
