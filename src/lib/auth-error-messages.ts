/**
 * Canonical mapping of API error codes to user-facing French messages
 * and UI presentation (banner / toast / field).
 *
 * Used by all auth pages to ensure consistency.
 */

export type ErrorPresentation = "banner" | "toast" | "field";

export interface ErrorMapEntry {
  message: string;
  presentation: ErrorPresentation;
  ctaLabel?: string;
  ctaTarget?: string;
}

export const AUTH_ERROR_MESSAGES: Record<string, ErrorMapEntry> = {
  // === Signup company errors ===
  EMAIL_ALREADY_USED: {
    message: "Cet email est déjà utilisé par un compte actif.",
    presentation: "banner",
    ctaLabel: "Se connecter",
    ctaTarget: "/login",
  },
  SIGNUP_IN_PROGRESS: {
    message: "Une inscription est en cours pour cet email. Connectez-vous pour la finaliser.",
    presentation: "banner",
    ctaLabel: "Se connecter",
    ctaTarget: "/login",
  },
  INVALID_SECTOR: {
    message: "Le secteur d'activité sélectionné est invalide.",
    presentation: "field",
  },
  INVALID_GOUVERNORAT: {
    message: "Le gouvernorat sélectionné est invalide.",
    presentation: "field",
  },

  // === Signup user errors ===
  USER_NOT_FOUND: {
    message: "Session d'inscription introuvable. Veuillez recommencer.",
    presentation: "banner",
    ctaLabel: "Recommencer",
    ctaTarget: "/signup/company",
  },
  ALREADY_VERIFIED: {
    message: "Ce compte est déjà vérifié. Connectez-vous.",
    presentation: "banner",
    ctaLabel: "Se connecter",
    ctaTarget: "/login",
  },
  STEP_ALREADY_COMPLETED: {
    message: "L'étape 2 a déjà été complétée. Vérifiez votre email.",
    presentation: "banner",
  },
  SIGNUP_INCOMPLETE: {
    message: "Inscription incomplète. Finalisez votre inscription.",
    presentation: "banner",
    ctaLabel: "Continuer l'inscription",
    ctaTarget: "/signup/verify",
  },

  // === OTP errors ===
  NO_OTP: {
    message: "Aucun code en attente. Complétez l'étape 2 d'abord.",
    presentation: "banner",
    ctaLabel: "Retour à l'étape 2",
    ctaTarget: "/signup/user",
  },
  OTP_EXPIRED: {
    message: "Ce code a expiré. Demandez un nouveau code.",
    presentation: "banner",
  },
  OTP_LOCKED: {
    message: "Trop de tentatives. Demandez un nouveau code.",
    presentation: "banner",
  },
  OTP_INVALID: {
    message: "Code incorrect. Vérifiez le code reçu.",
    presentation: "banner",
  },

  // === Login errors ===
  INVALID_CREDENTIALS: {
    message: "Email ou mot de passe incorrect.",
    presentation: "banner",
  },
  EMAIL_NOT_VERIFIED: {
    // Special: triggers auto-redirect, shown as toast on verify page
    message: "Un nouveau code a été envoyé à votre email.",
    presentation: "toast",
  },
  NO_COMPANY: {
    message: "Aucune entreprise associée à ce compte.",
    presentation: "banner",
  },

  // === Company status errors (dedicated codes) ===
  COMPANY_PENDING: {
    message: "Votre compte est en attente de validation par notre équipe. Vous recevrez un email sous 24-48h.",
    presentation: "banner",
  },
  COMPANY_SUSPENDED: {
    message: "Votre compte a été désactivé. Pour toute question, contactez manager@vivasky.media.",
    presentation: "banner",
  },

  // Legacy sub-codes (kept for backward compat)
  "COMPANY_NOT_ACTIVE.pending": {
    message: "Votre compte est en attente de validation par notre équipe (24-48h).",
    presentation: "banner",
  },
  "COMPANY_NOT_ACTIVE.rejected": {
    message: "Votre compte a été refusé. Contactez le support pour plus d'informations.",
    presentation: "banner",
  },
  "COMPANY_NOT_ACTIVE.suspended": {
    message: "Votre compte a été désactivé. Contactez manager@vivasky.media.",
    presentation: "banner",
  },
  "COMPANY_NOT_ACTIVE.deleted": {
    message: "Ce compte n'existe plus.",
    presentation: "banner",
  },

  // === Password reset errors ===
  TOKEN_INVALID: {
    message: "Ce lien de réinitialisation est invalide ou a expiré.",
    presentation: "banner",
    ctaLabel: "Demander un nouveau lien",
    ctaTarget: "/forgot",
  },

  // === Rate limit ===
  RATE_LIMITED: {
    message: "Trop de tentatives. Veuillez patienter quelques minutes.",
    presentation: "toast",
  },

  // === Session errors ===
  SESSION_INVALID: {
    message: "Votre session a expiré. Veuillez vous reconnecter.",
    presentation: "banner" as const,
  },

  // === Network / generic ===
  NETWORK_ERROR: {
    message: "Erreur de connexion. Vérifiez votre internet et réessayez.",
    presentation: "toast",
  },
  SERVER_ERROR: {
    message: "Une erreur est survenue. Réessayez dans quelques instants.",
    presentation: "toast",
  },
};

/**
 * Get the user-facing message for an error code.
 * Falls back to a generic message if the code is unknown.
 */
export function getAuthErrorMessage(code: string, subCode?: string): ErrorMapEntry {
  const key = subCode ? `${code}.${subCode}` : code;
  return (
    AUTH_ERROR_MESSAGES[key] ||
    AUTH_ERROR_MESSAGES[code] || {
      message: "Une erreur est survenue.",
      presentation: "banner" as ErrorPresentation,
    }
  );
}
