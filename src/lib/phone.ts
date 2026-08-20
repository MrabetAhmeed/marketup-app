import { z } from "zod";

/**
 * Normalize a Tunisian phone number to +216XXXXXXXX format.
 * Accepts: "22335544", "+21622335544", "21622335544", with spaces/hyphens/dots.
 * Rejects: any non-Tunisian indicative (+33, +44, +213…).
 *
 * To open other countries later, add their codes to ALLOWED_PREFIXES.
 */
// To open other countries later, add their codes here and adjust the logic below.
// const ALLOWED_PREFIXES = ["216"];

export function normalizeTunisianPhone(raw: string): string {
  // Strip spaces, hyphens, dots, parentheses
  const cleaned = raw.replace(/[\s\-().]/g, "");

  // 8 digits → assume +216
  if (/^\d{8}$/.test(cleaned)) return `+216${cleaned}`;

  // 216XXXXXXXX without + → add +
  if (/^216\d{8}$/.test(cleaned)) return `+${cleaned}`;

  // +216XXXXXXXX → OK
  if (/^\+216\d{8}$/.test(cleaned)) return cleaned;

  // +XXX... with a different prefix → reject
  if (/^\+?\d+$/.test(cleaned)) {
    throw new Error("Seuls les numéros tunisiens sont acceptés pour le moment.");
  }

  throw new Error("Numéro invalide (format attendu : +216XXXXXXXX ou 8 chiffres).");
}

/**
 * Zod schema for a Tunisian phone number.
 * Cleans input, normalizes to +216XXXXXXXX, rejects foreign numbers.
 * Use this as the SINGLE source of truth for phone/whatsapp validation.
 */
export const tunisianPhoneSchema = z
  .string()
  .trim()
  .refine(
    (v) => /^[+\s\-().0-9]*$/.test(v),
    "Numéro invalide (caractères autorisés : chiffres, +, espaces, tirets).",
  )
  .transform((v) => {
    try {
      return normalizeTunisianPhone(v);
    } catch {
      // Will be caught by the pipe validation below
      return v;
    }
  })
  .pipe(
    z.string().regex(
      /^\+216\d{8}$/,
      "Seuls les numéros tunisiens sont acceptés pour le moment (format : +216XXXXXXXX ou 8 chiffres).",
    ),
  );
