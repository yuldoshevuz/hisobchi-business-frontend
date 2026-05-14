import { api } from './client';
import type {
  CheckoutSession,
  CreateInvoiceInput,
  PaymentInvoice,
} from '@/types/payment.types';

const BASE = '/web/payments';

export const paymentsApi = {
  /**
   * Issue a checkout invoice and receive the provider redirect URL. The
   * backend may return a previously-created PENDING invoice for the same
   * (plan, planPrice, provider) tuple — that's expected and lets the
   * user reopen the checkout page without us double-charging.
   */
  async createInvoice(input: CreateInvoiceInput): Promise<CheckoutSession> {
    const { data } = await api.post<CheckoutSession>(`${BASE}/invoice`, input);
    return data;
  },

  /** Poll a single invoice — used on the checkout return screen. */
  async getInvoice(id: number): Promise<PaymentInvoice> {
    const { data } = await api.get<PaymentInvoice>(`${BASE}/invoice/${id}`);
    return data;
  },
};
