import { z } from "zod";

export const ChangePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Le mot de passe actuel est requis"),
    newPassword: z
      .string()
      .min(8, "Minimum 8 caractères")
      .regex(/[A-Z]/, "Au moins une majuscule")
      .regex(/\d/, "Au moins un chiffre")
      .regex(/[^A-Za-z0-9]/, "Au moins un caractère spécial"),
    confirmPassword: z.string().min(1, "La confirmation est requise"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirmPassword"],
  });

export type ChangePasswordInput = z.infer<typeof ChangePasswordSchema>;

export const DeleteAccountSchema = z.object({
  confirmText: z.literal("SUPPRIMER", {
    errorMap: () => ({ message: 'Tapez "SUPPRIMER" pour confirmer' }),
  }),
  password: z.string().min(1, "Le mot de passe est requis"),
});

export type DeleteAccountInput = z.infer<typeof DeleteAccountSchema>;
