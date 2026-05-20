import { z } from "zod";

// --- Shared password rule ---
const passwordSchema = z
  .string()
  .min(8, "Le mot de passe doit faire au moins 8 caractères.")
  .regex(/[A-Z]/, "Le mot de passe doit contenir au moins une majuscule.")
  .regex(/[0-9]/, "Le mot de passe doit contenir au moins un chiffre.")
  .regex(/[^A-Za-z0-9]/, "Le mot de passe doit contenir au moins un caractère spécial.");

// --- Step 1: Signup Company ---
export const SignupCompanySchema = z.object({
  type: z.enum(["B2B", "B2C"]),
  displayName: z.string().min(1, "Le nom est obligatoire.").max(120),
  legalId: z.string().min(1, "L'identifiant légal est obligatoire.").max(30),
  vatNumber: z.string().max(30).optional().nullable(),
  accountEmail: z.string().email("Email invalide.").max(255),
  sectorId: z.string().min(1, "Le secteur est obligatoire."),
  gouvernorat: z.string().min(1, "Le gouvernorat est obligatoire."),
  ville: z.string().min(1, "La ville est obligatoire.").max(100),
  address: z.string().max(300).optional().nullable(),
  identityDocumentUrl: z.string().url().optional().nullable(),
});
export type SignupCompanyInput = z.infer<typeof SignupCompanySchema>;

// --- Step 2: Signup User ---
// Form-level schema: includes passwordConfirm for client-side validation.
// acceptedTermsAt is added programmatically in the submit handler (not a form field).
// The CGU checkbox is a required HTML checkbox that gates submission.
export const SignupUserSchema = z
  .object({
    userId: z.string().min(1, "userId requis."),
    firstName: z.string().min(1, "Le prénom est obligatoire.").max(60),
    lastName: z.string().min(1, "Le nom est obligatoire.").max(60),
    phone: z.string().max(30).optional().nullable(),
    languages: z.array(z.enum(["fr", "ar", "en"])).min(1),
    password: passwordSchema,
    passwordConfirm: z.string().min(1, "Veuillez confirmer le mot de passe."),
    acceptedTermsAt: z.string().datetime({ message: "Date d'acceptation CGU invalide." }).optional(),
  })
  .refine((data) => data.password === data.passwordConfirm, {
    message: "Les mots de passe ne correspondent pas.",
    path: ["passwordConfirm"],
  });
export type SignupUserInput = z.infer<typeof SignupUserSchema>;

// --- Step 3: Verify OTP ---
export const VerifyOtpSchema = z.object({
  userId: z.string().min(1, "userId requis."),
  otpCode: z.string().length(6, "Le code doit faire 6 chiffres.").regex(/^\d{6}$/, "Le code doit être numérique."),
});
export type VerifyOtpInput = z.infer<typeof VerifyOtpSchema>;

// --- Login ---
export const LoginSchema = z.object({
  email: z.string().email("Email invalide."),
  password: z.string().min(1, "Le mot de passe est obligatoire."),
  rememberMe: z.boolean().optional(),
});
export type LoginInput = z.infer<typeof LoginSchema>;

// --- Forgot Password ---
export const ForgotPasswordSchema = z.object({
  email: z.string().email("Email invalide."),
});
export type ForgotPasswordInput = z.infer<typeof ForgotPasswordSchema>;

// --- Reset Password ---
export const ResetPasswordSchema = z.object({
  resetToken: z.string().min(1, "Token requis."),
  newPassword: passwordSchema,
});
export type ResetPasswordInput = z.infer<typeof ResetPasswordSchema>;

// --- Resend Validation ---
export const ResendValidationSchema = z.object({
  email: z.string().email("Email invalide."),
});
export type ResendValidationInput = z.infer<typeof ResendValidationSchema>;
