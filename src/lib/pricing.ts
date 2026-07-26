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
export function computeTTC(priceHT: number, vatRate: number): { vatAmount: number; priceTTC: number } {
  const vatAmount = Math.round(priceHT * vatRate * 100) / 100;
  const priceTTC = priceHT + vatAmount;
  return { vatAmount, priceTTC };
}

// ---------------------------------------------------------------------------
// Product pricing constants (single source of truth — change here only)
// ---------------------------------------------------------------------------

/** Boost: 50 DT HT for 30 days, per profileKind */
export const BOOST_PRICE_HT = 50;
export const BOOST_DURATION_DAYS = 30;

/** Sponsoring: 100 DT HT for 7 days, per profileKind */
export const SPONSORING_PRICE_HT = 100;
export const SPONSORING_DURATION_DAYS = 7;

/** Standard VAT rate (19%) */
export const DEFAULT_VAT_RATE = 0.19;
