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
  FEATURE_COMING_SOON_DELETE: {
    message: "La suppression du compte sera disponible prochainement.",
    presentation: "toast" as const,
  },
  FEATURE_COMING_SOON_CREATE: {
    message: "La création de profil sera disponible prochainement.",
    presentation: "toast" as const,
  },
  FEATURE_COMING_SOON_VIDEO_ADD: {
    message: "L'ajout de vidéo sera disponible prochainement.",
    presentation: "toast" as const,
  },
  FEATURE_COMING_SOON_REACTIVATE: {
    message: "La réactivation du profil sera disponible prochainement.",
    presentation: "toast" as const,
  },
  FEATURE_COMING_SOON_GALLERY_UPLOAD: {
    message: "L'upload d'image sera disponible prochainement.",
    presentation: "toast" as const,
  },
  FEATURE_COMING_SOON_GALLERY_DELETE: {
    message: "La suppression d'image sera disponible prochainement.",
    presentation: "toast" as const,
  },
  FEATURE_COMING_SOON_GALLERY_REORDER: {
    message: "Le réordonnancement sera disponible prochainement.",
    presentation: "toast" as const,
  },
} as const;

export type StubKey = keyof typeof STUB_MESSAGES;
