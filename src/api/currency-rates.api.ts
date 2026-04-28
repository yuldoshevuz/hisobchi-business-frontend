import { api } from './client';
import type { CurrencyRate } from '@/types/currency-rate.types';

const BASE = '/web/currency-rates';

export const currencyRatesApi = {
  async list(): Promise<CurrencyRate[]> {
    const { data } = await api.get<CurrencyRate[]>(BASE);
    return data;
  },
};
