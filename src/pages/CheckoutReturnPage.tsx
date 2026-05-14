import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Clock, XCircle } from 'lucide-react';
import { useInvoice } from '@/api/hooks/use-payments';
import { queryKeys } from '@/api/query-keys';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Section } from '@/components/ui/list-item';
import { Spinner } from '@/components/ui/spinner';
import { getApiErrorMessage } from '@/lib/api-error';
import type { PaymentInvoiceStatus } from '@/types/payment.types';

/**
 * Where Click and Payme drop the user after the hosted checkout
 * completes. The route reads `?invoiceId=…` and polls the invoice until
 * it leaves PENDING; in the happy path the provider webhook flips it to
 * PAID a couple of seconds after the redirect lands and we surface the
 * activation confirmation.
 */
export function CheckoutReturnPage(): React.ReactElement {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const invoiceId = useMemo(() => {
    const raw = params.get('invoiceId');
    const n = raw ? Number(raw) : NaN;
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [params]);

  const invoice = useInvoice(invoiceId);

  // When the invoice settles successfully, refresh the subscription cache
  // so the user's plan badge updates the moment they navigate back.
  useEffect(() => {
    if (invoice.data?.status === 'paid') {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.subscription.current,
      });
    }
  }, [invoice.data?.status, queryClient]);

  return (
    <div className="pb-8">
      <PageHeader
        title={t('checkout_return.title')}
        description={t('checkout_return.subtitle')}
        large
        showBack
      />

      <Section>
        {invoiceId === null ? (
          <StatusCard
            tone="error"
            title={t('checkout_return.missing_invoice')}
            subtitle={t('checkout_return.missing_invoice_hint')}
          />
        ) : invoice.isPending && !invoice.data ? (
          <StatusCard
            tone="pending"
            title={t('checkout_return.loading')}
            subtitle={t('checkout_return.loading_hint')}
          />
        ) : invoice.error ? (
          <StatusCard
            tone="error"
            title={t('checkout_return.error')}
            subtitle={getApiErrorMessage(invoice.error)}
          />
        ) : invoice.data ? (
          <InvoiceStateCard status={invoice.data.status} />
        ) : null}
      </Section>

      <div className="mt-6 flex flex-col gap-2 px-4">
        <Button
          variant="default"
          onClick={() => navigate('/plans', { replace: true })}
        >
          {t('checkout_return.back_to_plans')}
        </Button>
        <Button
          variant="outline"
          onClick={() => navigate('/', { replace: true })}
        >
          {t('checkout_return.back_to_dashboard')}
        </Button>
      </div>
    </div>
  );
}

function InvoiceStateCard({
  status,
}: {
  status: PaymentInvoiceStatus;
}): React.ReactElement {
  const { t } = useTranslation();
  switch (status) {
    case 'paid':
      return (
        <StatusCard
          tone="success"
          title={t('checkout_return.success_title')}
          subtitle={t('checkout_return.success_subtitle')}
          badge={t('checkout_return.status.paid')}
        />
      );
    case 'pending':
      return (
        <StatusCard
          tone="pending"
          title={t('checkout_return.pending_title')}
          subtitle={t('checkout_return.pending_subtitle')}
          badge={t('checkout_return.status.pending')}
        />
      );
    case 'expired':
      return (
        <StatusCard
          tone="error"
          title={t('checkout_return.expired_title')}
          subtitle={t('checkout_return.expired_subtitle')}
          badge={t('checkout_return.status.expired')}
        />
      );
    case 'cancelled':
      return (
        <StatusCard
          tone="error"
          title={t('checkout_return.cancelled_title')}
          subtitle={t('checkout_return.cancelled_subtitle')}
          badge={t('checkout_return.status.cancelled')}
        />
      );
    case 'refunded':
      return (
        <StatusCard
          tone="error"
          title={t('checkout_return.refunded_title')}
          subtitle={t('checkout_return.refunded_subtitle')}
          badge={t('checkout_return.status.refunded')}
        />
      );
  }
}

function StatusCard({
  tone,
  title,
  subtitle,
  badge,
}: {
  tone: 'success' | 'pending' | 'error';
  title: string;
  subtitle: string;
  badge?: string;
}): React.ReactElement {
  const Icon =
    tone === 'success' ? CheckCircle2 : tone === 'pending' ? Clock : XCircle;
  const iconColor =
    tone === 'success'
      ? 'text-green-600 bg-green-50'
      : tone === 'pending'
        ? 'text-amber-600 bg-amber-50'
        : 'text-destructive bg-destructive/10';

  return (
    <div className="px-4 py-6">
      <div className="flex flex-col items-center gap-3 text-center">
        <div
          className={`flex h-12 w-12 items-center justify-center rounded-full ${iconColor}`}
        >
          {tone === 'pending' ? (
            <Spinner className="h-6 w-6" />
          ) : (
            <Icon className="h-6 w-6" />
          )}
        </div>
        <div className="space-y-1">
          <div className="text-[16px] font-semibold">{title}</div>
          <p className="text-[13px] text-muted-foreground">{subtitle}</p>
        </div>
        {badge ? (
          <Badge
            variant={
              tone === 'success'
                ? 'success'
                : tone === 'pending'
                  ? 'secondary'
                  : 'destructive'
            }
            className="text-[10px]"
          >
            {badge}
          </Badge>
        ) : null}
      </div>
    </div>
  );
}
