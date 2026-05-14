import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { paymentsApi } from '@/api/payments.api';
import { queryKeys } from '@/api/query-keys';
import type {
  CheckoutSession,
  CreateInvoiceInput,
  PaymentInvoice,
} from '@/types/payment.types';

/**
 * Kicks off a checkout: backend creates (or recycles) a PENDING invoice
 * and returns the provider URL. Caller usually redirects on success.
 */
export function useCreateInvoice(): ReturnType<
  typeof useMutation<CheckoutSession, Error, CreateInvoiceInput>
> {
  const queryClient = useQueryClient();
  return useMutation<CheckoutSession, Error, CreateInvoiceInput>({
    mutationFn: (input) => paymentsApi.createInvoice(input),
    onSuccess: (session) => {
      // Seed the per-invoice cache so the return page loads instantly.
      queryClient.setQueryData(
        queryKeys.payments.invoice(session.invoice.id),
        session.invoice,
      );
    },
  });
}

/**
 * Polls a single invoice. Used on the checkout return screen where we
 * wait for the provider webhook to flip status PENDING → PAID. The
 * `refetchInterval` keeps polling until the invoice leaves PENDING; once
 * it's terminal we drop to a long interval (effectively idle).
 */
export function useInvoice(
  id: number | null,
): ReturnType<typeof useQuery<PaymentInvoice, Error>> {
  return useQuery<PaymentInvoice, Error>({
    queryKey: id === null ? ['payments', 'invoice', 'idle'] : queryKeys.payments.invoice(id),
    queryFn: () => paymentsApi.getInvoice(id as number),
    enabled: id !== null,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (!status || status === 'pending') return 3000;
      return false;
    },
  });
}
