import type { TFunction } from 'i18next';
import type { Product } from '@/types/product.types';

/** ISO date for today (UTC). Default for transaction date pickers. */
export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Build the SelectField `description` line for a product option. Products
 * are tags only now — stock is no longer surfaced to end users, so this
 * returns undefined to suppress the description.
 */
export function formatProductMeta(
  _product: Product,
  _t: TFunction,
): string | undefined {
  return undefined;
}

/**
 * Formats a raw numeric string for display: groups the integer part with
 * thin spaces every 3 digits. Preserves a single trailing/decimal `.` so the
 * user can type fractional parts naturally (e.g. "1234." → "1 234.").
 */
export function formatAmount(raw: string): string {
  if (!raw) return '';
  // Strip everything except digits and dots, then collapse multiple dots to one.
  const onlyNumeric = raw.replace(/[^\d.]/g, '');
  const firstDotIdx = onlyNumeric.indexOf('.');
  const normalized =
    firstDotIdx === -1
      ? onlyNumeric
      : onlyNumeric.slice(0, firstDotIdx + 1) +
        onlyNumeric.slice(firstDotIdx + 1).replace(/\./g, '');
  const [intPart, decPart] = normalized.split('.');
  const intFormatted = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return decPart !== undefined ? `${intFormatted}.${decPart}` : intFormatted;
}

/** Removes display separators so the value can be stored / sent to the API. */
export function unformatAmount(formatted: string): string {
  return formatted.replace(/\s/g, '');
}

/**
 * Display-only formatter: thousands-grouped integer, with trailing zeros (and
 * dangling `.`) stripped from the decimal part so a `.toFixed(4)` value like
 * "45000.0000" renders as "45 000" instead of "45 000.0000". Use this for
 * read-only money labels — `formatAmount` is the one for input fields, since
 * stripping trailing zeros while a user is typing would eat keystrokes.
 */
export function formatAmountDisplay(raw: string): string {
  if (!raw) return '';
  const onlyNumeric = raw.replace(/[^\d.-]/g, '');
  const negative = onlyNumeric.startsWith('-');
  const unsigned = negative ? onlyNumeric.slice(1) : onlyNumeric;
  const firstDotIdx = unsigned.indexOf('.');
  const normalized =
    firstDotIdx === -1
      ? unsigned
      : unsigned.slice(0, firstDotIdx + 1) +
        unsigned.slice(firstDotIdx + 1).replace(/\./g, '');
  let [intPart, decPart] = normalized.split('.');
  if (decPart !== undefined) {
    decPart = decPart.replace(/0+$/, '');
  }
  const intFormatted = (intPart || '0').replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  const body =
    decPart !== undefined && decPart.length > 0
      ? `${intFormatted}.${decPart}`
      : intFormatted;
  return negative ? `-${body}` : body;
}
