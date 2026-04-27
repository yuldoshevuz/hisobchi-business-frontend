const UZ_LOCALE = 'uz-UZ';

export function formatMoney(value: string | number, currency?: string): string {
  const numeric = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numeric)) {
    return currency ? `${value} ${currency}` : String(value);
  }
  const formatted = numeric.toLocaleString(UZ_LOCALE, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  return currency ? `${formatted} ${currency}` : formatted;
}
