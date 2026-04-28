import { useQuery } from '@tanstack/react-query';
import { currencyRatesApi } from '@/api/currency-rates.api';
import { queryKeys } from '@/api/query-keys';
import { tokenStore } from '@/store/token-store';
import type { CurrencyRate } from '@/types/currency-rate.types';

/**
 * Latest CBU rate snapshot. The backend refreshes from cbu.uz daily at
 * 06:00 Asia/Tashkent, so a `staleTime` of 1 hour is generous: the user will
 * see the freshest rate on every screen load anyway.
 */
export function useCurrencyRates(
  options: { enabled?: boolean } = {},
): ReturnType<typeof useQuery<CurrencyRate[], Error>> {
  const callerEnabled = options.enabled ?? true;
  return useQuery<CurrencyRate[], Error>({
    queryKey: queryKeys.currencyRates.list,
    queryFn: () => currencyRatesApi.list(),
    enabled: Boolean(tokenStore.getAccessToken()) && callerEnabled,
    staleTime: 60 * 60 * 1000,
  });
}

/**
 * Convert `amount` from `fromCurrency` to `toCurrency` using CBU rates as a
 * UZS bridge. Returns a string with 4-decimal precision, or `null` when the
 * rates are not loaded yet or the currency pair is unknown.
 *
 * UZS is the implicit pivot — every CBU rate is "X currency = Y UZS" — so
 * `from → UZS → to`. Currencies with `nominal > 1` (IDR, VND, ...) are
 * normalized first (rate / nominal).
 */
export function convertViaUzs(
  rates: CurrencyRate[] | undefined,
  amount: string,
  fromCurrency: string,
  toCurrency: string,
): string | null {
  const a = Number(amount);
  if (!Number.isFinite(a)) return null;
  if (fromCurrency === toCurrency) return a.toFixed(4);

  const perUnit = (code: string): number | null => {
    if (code === 'UZS') return 1;
    const r = rates?.find((x) => x.code === code);
    if (!r) return null;
    const rate = Number(r.rate);
    if (!Number.isFinite(rate) || r.nominal < 1) return null;
    return rate / r.nominal;
  };

  const fromRate = perUnit(fromCurrency);
  const toRate = perUnit(toCurrency);
  if (fromRate === null || toRate === null || toRate === 0) return null;
  const inUzs = a * fromRate;
  const result = inUzs / toRate;
  return result.toFixed(4);
}
