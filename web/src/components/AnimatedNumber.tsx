import { useCountUp } from "../hooks/useCountUp";
import { formatCurrency } from "../lib/odds";

export default function AnimatedNumber({
  value,
  decimals = 0,
  suffix = "",
  prefix = "",
  currency = false,
}: {
  value: number;
  decimals?: number;
  suffix?: string;
  prefix?: string;
  currency?: boolean;
}) {
  const n = useCountUp(value);

  let text: string;
  if (currency) {
    text = formatCurrency(n);
  } else if (decimals > 0) {
    text = n.toFixed(decimals);
  } else {
    text = Math.round(n).toLocaleString();
  }

  return (
    <>
      {prefix}
      {text}
      {suffix}
    </>
  );
}
