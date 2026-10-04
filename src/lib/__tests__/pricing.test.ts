import { describe, it, expect } from "vitest";
import {
  BOOST_PRICE_HT,
  DEFAULT_VAT_RATE,
  FISCAL_STAMP_DT,
  SPONSORING_PRICE_HT,
  computeTTC,
  dtToMillimes,
  formatMoney,
} from "@/lib/pricing";

describe("dtToMillimes", () => {
  it("converts whole dinars to integer millimes", () => {
    expect(dtToMillimes(0)).toBe(0);
    expect(dtToMillimes(1)).toBe(1000);
    expect(dtToMillimes(1072)).toBe(1_072_000);
    expect(dtToMillimes(834)).toBe(834_000);
  });

  it("converts amounts with three decimals exactly", () => {
    expect(dtToMillimes(0.001)).toBe(1);
    expect(dtToMillimes(0.999)).toBe(999);
    expect(dtToMillimes(1.005)).toBe(1005);
    expect(dtToMillimes(4.35)).toBe(4350);
    expect(dtToMillimes(1072.125)).toBe(1_072_125);
    expect(dtToMillimes(999_999.999)).toBe(999_999_999);
  });

  it("absorbs floating-point noise", () => {
    expect(dtToMillimes(0.1 + 0.2)).toBe(300);
    expect(dtToMillimes(900 * 0.19)).toBe(171_000);
  });

  it("always returns an integer", () => {
    for (const amount of [0.0004, 0.0005, 1.0005, 12.3456, 1072.9999]) {
      expect(Number.isInteger(dtToMillimes(amount))).toBe(true);
    }
    expect(dtToMillimes(0.0004)).toBe(0);
    expect(dtToMillimes(0.0005)).toBe(1);
  });

  it("rejects negative and non-finite amounts", () => {
    expect(() => dtToMillimes(-1)).toThrow();
    expect(() => dtToMillimes(Number.NaN)).toThrow();
    expect(() => dtToMillimes(Number.POSITIVE_INFINITY)).toThrow();
  });
});

describe("computeTTC — millime rounding", () => {
  it("boost tariff is unchanged: 900 DT HT gives 1 072 DT TTC", () => {
    const { vatAmount, fiscalStampDT, priceTTC } = computeTTC(BOOST_PRICE_HT, DEFAULT_VAT_RATE, FISCAL_STAMP_DT);
    expect(BOOST_PRICE_HT).toBe(900);
    expect(vatAmount).toBe(171);
    expect(fiscalStampDT).toBe(1);
    expect(priceTTC).toBe(1072);
    expect(formatMoney(priceTTC)).toBe("1 072");
    expect(dtToMillimes(priceTTC)).toBe(1_072_000);
  });

  it("sponsoring tariff is unchanged: 700 DT HT gives 834 DT TTC", () => {
    const { vatAmount, priceTTC } = computeTTC(SPONSORING_PRICE_HT, DEFAULT_VAT_RATE, FISCAL_STAMP_DT);
    expect(SPONSORING_PRICE_HT).toBe(700);
    expect(vatAmount).toBe(133);
    expect(priceTTC).toBe(834);
    expect(formatMoney(priceTTC)).toBe("834");
    expect(dtToMillimes(priceTTC)).toBe(834_000);
  });

  it("demo tariffs are unchanged (50 and 100 DT HT, no stamp)", () => {
    expect(computeTTC(50, 0.19)).toEqual({ vatAmount: 9.5, fiscalStampDT: 0, priceTTC: 59.5 });
    expect(computeTTC(100, 0.19)).toEqual({ vatAmount: 19, fiscalStampDT: 0, priceTTC: 119 });
  });

  it("rounds VAT to the millime, not to the cent", () => {
    // 10.01 * 0.19 = 1.9019 → 1.902 (was 1.90 with cent rounding)
    const { vatAmount, priceTTC } = computeTTC(10.01, 0.19);
    expect(vatAmount).toBe(1.902);
    expect(priceTTC).toBe(11.912);
    expect(dtToMillimes(priceTTC)).toBe(11_912);
  });
});
