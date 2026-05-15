export const STUB_MESSAGES = {
  FEATURE_COMING_SOON: {
    message: "Cette fonctionnalité sera disponible prochainement.",
    presentation: "toast" as const,
  },
  FEATURE_COMING_SOON_SUBMIT: {
    message: "La soumission sera disponible bientôt.",
    presentation: "toast" as const,
  },
  FEATURE_COMING_SOON_PAYMENT: {
    message: "Le paiement sera disponible bientôt.",
    presentation: "toast" as const,
  },
} as const;

export type StubKey = keyof typeof STUB_MESSAGES;
