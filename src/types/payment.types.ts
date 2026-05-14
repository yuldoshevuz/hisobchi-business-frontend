/**
 * Frontend mirror of the backend payment types. Kept hand-written rather
 * than generated so the types stay narrow and the file documents the
 * contract for readers who never open the backend repo.
 */

export type PaymentProvider = 'click' | 'payme';

export type PaymentInvoiceStatus =
  | 'pending'
  | 'paid'
  | 'cancelled'
  | 'expired'
  | 'refunded';

export interface PaymentInvoice {
  id: number;
  userId: number;
  planId: number;
  planPriceId: number;
  amount: string;
  currency: string;
  status: PaymentInvoiceStatus;
  provider: PaymentProvider | null;
  providerInvoiceId: string | null;
  paidAt: string | null;
  expiresAt: string;
  createdAt: string;
}

export interface CheckoutSession {
  invoice: PaymentInvoice;
  /** Provider checkout URL the user should be redirected to. */
  checkoutUrl: string;
}

export interface CreateInvoiceInput {
  planId: number;
  planPriceId: number;
  provider: PaymentProvider;
}
