import { formatMoney } from "@/lib/pricing";

interface MoneyAmountProps {
  value: number;
  currency?: string;
}

export function MoneyAmount({ value, currency = "DT" }: MoneyAmountProps): JSX.Element {
  return (
    <span className="inline-flex items-baseline gap-1">
      <span className="font-bold">{formatMoney(value)}</span>
      <span className="text-sm text-ink-secondary">{currency}</span>
    </span>
  );
}
