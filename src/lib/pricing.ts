/**
 * Format a number as a French-locale monetary value.
 * Uses narrow non-breaking space (\u202F) as thousands separator.
 *
 * Examples:
 *   formatMoney(1250)   -> "1 250"
 *   formatMoney(50)     -> "50"
 *   formatMoney(0)      -> "0"
 *   formatMoney(1250.5) -> "1 250,50"
 */
export function formatMoney(value: number): string {
  const hasDecimals = value % 1 !== 0;
  const formatted = new Intl.NumberFormat("fr-TN", {
    useGrouping: true,
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(value);

  // Intl may use regular or narrow no-break space; normalize to narrow no-break space
  return formatted.replace(/[\u00A0\s]/g, "\u202F");
}

/**
 * Compute TTC from HT + VAT rate.
 * @param priceHT - Price excluding tax (HT)
 * @param vatRate - VAT rate (e.g. 0.19 for 19%)
 */
export function computeTTC(
  priceHT: number,
  vatRate: number,
  fiscalStampDT: number = 0,
): { vatAmount: number; fiscalStampDT: number; priceTTC: number } {
  const vatAmount = roundToMillime(priceHT * vatRate);
  const priceTTC = roundToMillime(priceHT + vatAmount + fiscalStampDT);
  return { vatAmount, fiscalStampDT, priceTTC };
}

/** The dinar has three decimals: amounts are rounded to the millime. */
function roundToMillime(amountDT: number): number {
  return Math.round(amountDT * 1000) / 1000;
}

/**
 * Convert an amount in dinars to millimes (1 DT = 1 000 millimes), as an integer.
 * The only conversion used to talk to the payment operator.
 *
 * Examples:
 *   dtToMillimes(1072)  -> 1072000
 *   dtToMillimes(1.005) -> 1005
 */
export function dtToMillimes(amountDT: number): number {
  if (!Number.isFinite(amountDT) || amountDT < 0) {
    throw new Error("amountDT must be a finite, non-negative number");
  }
  return Math.round(amountDT * 1000);
}

// ---------------------------------------------------------------------------
// Product pricing constants (single source of truth — change here only)
// ---------------------------------------------------------------------------

/** Boost: 900 DT HT for 30 days, per profileKind */
export const BOOST_PRICE_HT = 900;
export const BOOST_DURATION_DAYS = 30;

/** Sponsoring: 700 DT HT for 7 days, per profileKind */
export const SPONSORING_PRICE_HT = 700;
export const SPONSORING_DURATION_DAYS = 7;

/** Standard VAT rate (19%) */
export const DEFAULT_VAT_RATE = 0.19;

/** Fiscal stamp per transaction (1 DT, not subject to VAT) */
export const FISCAL_STAMP_DT = 1;
