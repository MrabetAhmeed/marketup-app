export type SupportedLang = "fr" | "ar" | "en";

export interface I18nString {
  fr: string;
  ar?: string;
  en?: string;
}

export function pickLocale(
  value: I18nString | string | null | undefined,
  lang: SupportedLang = "fr",
): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  return value[lang] || value.fr || value.ar || value.en || "";
}
