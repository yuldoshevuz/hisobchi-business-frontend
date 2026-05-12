import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import i18n from '@/i18n';
import { Receipt, ShoppingCart } from 'lucide-react';
import { useSalesInfinite } from '@/api/hooks/use-sales';
import { useContacts } from '@/api/hooks/use-contacts';
import { PageHeader } from '@/components/layout/PageHeader';
import { Spinner } from '@/components/ui/spinner';
import { Badge } from '@/components/ui/badge';
import { AccessDeniedView } from '@/components/AccessDeniedView';
import { useCan, usePermissions } from '@/hooks/use-permissions';
import { useInfiniteScroll } from '@/hooks/use-infinite-scroll';
import { getApiErrorMessage } from '@/lib/api-error';
import { formatMoney } from '@/lib/format';
import { PermissionSlug } from '@/lib/permission-slugs';
import { tgHapticImpact } from '@/lib/telegram';
import {
  PAYMENT_STATUS_LABEL,
  PAYMENT_STATUS_VARIANT,
} from '@/lib/transaction-meta';
import { cn } from '@/lib/utils';
import type { SaleItem, Transaction } from '@/types/transaction.types';

function formatDateHeader(iso: string): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  const d = new Date(iso);
  d.setHours(0, 0, 0, 0);

  if (d.getTime() === today.getTime()) return i18n.t('common.today');
  if (d.getTime() === yesterday.getTime()) return i18n.t('common.yesterday');
  return new Intl.DateTimeFormat(i18n.language, {
    day: 'numeric',
    month: 'long',
    year: d.getFullYear() === today.getFullYear() ? undefined : 'numeric',
  }).format(d);
}

function groupByDate(items: Transaction[]): Array<{
  key: string;
  label: string;
  items: Transaction[];
}> {
  const groups = new Map<string, Transaction[]>();
  for (const item of items) {
    const key = item.date.slice(0, 10);
    const list = groups.get(key);
    if (list) list.push(item);
    else groups.set(key, [item]);
  }
  return Array.from(groups.entries()).map(([key, list]) => ({
    key,
    label: formatDateHeader(key),
    items: list,
  }));
}

function formatQuantity(value: string | null): string {
  if (!value) return '';
  const num = Number(value);
  if (!Number.isFinite(num)) return value;
  return num % 1 === 0 ? String(num) : num.toString();
}

interface SaleCardProps {
  sale: Transaction;
  contactName: string | null;
  onTap: (sale: Transaction) => void;
}

function SaleCard({
  sale,
  contactName,
  onTap,
}: SaleCardProps): React.ReactElement {
  const { t } = useTranslation();
  const isVoided = sale.status === 'voided';
  const items: SaleItem[] = sale.saleItems ?? [];
  const totalQty = items.reduce<number>((sum, item) => {
    const n = Number(item.quantity ?? 0);
    return sum + (Number.isFinite(n) ? n : 0);
  }, 0);

  return (
    <button
      type="button"
      onClick={() => {
        tgHapticImpact('light');
        onTap(sale);
      }}
      className={cn(
        'press w-full overflow-hidden rounded-2xl bg-card text-left active:bg-accent',
        isVoided && 'opacity-70',
      )}
    >
      <div className="flex items-start gap-3 px-4 pt-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--color-help-success-16)] text-[var(--color-help-success)]">
          <ShoppingCart className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span
              className={cn(
                'truncate text-[15px] font-medium',
                isVoided ? 'text-muted-foreground line-through' : 'text-foreground',
              )}
            >
              {contactName ?? t('sales_list.default_label')}
            </span>
            <span
              className={cn(
                'tabular-nums text-[15px] font-semibold text-[var(--color-help-success)]',
                isVoided && 'text-muted-foreground line-through',
              )}
            >
              +{formatMoney(sale.amount, sale.currency)}
            </span>
          </div>
          <div className="mt-0.5 flex items-center justify-between gap-2">
            <span className="truncate text-[13px] text-muted-foreground">
              {sale.description?.trim() ||
                (items.length > 0
                  ? totalQty > 0
                    ? t('sales_list.items_summary_qty', {
                        count: items.length,
                        qty: formatQuantity(String(totalQty)),
                      })
                    : t('sales_list.items_summary', { count: items.length })
                  : t('sales_list.default_label'))}
            </span>
            <div className="flex shrink-0 items-center gap-1">
              {isVoided ? (
                <Badge variant="destructive" className="text-[10px]">
                  {t('sales_list.voided_badge')}
                </Badge>
              ) : (
                <Badge
                  variant={PAYMENT_STATUS_VARIANT[sale.paymentStatus]}
                  className="text-[10px]"
                >
                  {PAYMENT_STATUS_LABEL[sale.paymentStatus]}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      {items.length > 0 ? (
        <div className="mt-3 border-t border-border bg-muted/30 px-4 py-2">
          <ul className="space-y-1">
            {items.slice(0, 4).map((item) => {
              const qty = formatQuantity(item.quantity);
              const price = item.unitPrice
                ? formatMoney(item.unitPrice, sale.currency)
                : null;
              return (
                <li
                  key={item.id}
                  className="flex items-baseline justify-between gap-2 text-[12px]"
                >
                  <span className="min-w-0 truncate text-foreground">
                    {item.nameSnapshot}
                    {qty ? (
                      <span className="text-muted-foreground">
                        {' '}
                        × {qty}
                        {price ? ` (${price})` : ''}
                      </span>
                    ) : null}
                  </span>
                  <span className="shrink-0 tabular-nums text-muted-foreground">
                    {formatMoney(item.lineTotal, sale.currency)}
                  </span>
                </li>
              );
            })}
            {items.length > 4 ? (
              <li className="text-[11px] text-muted-foreground">
                {t('sales_list.more_items', { count: items.length - 4 })}
              </li>
            ) : null}
          </ul>
        </div>
      ) : null}

      {sale.cashFlows.length > 0 ? (
        <div className="border-t border-border px-4 py-2 text-[11px] text-muted-foreground">
          {t('sales_list.payments_count', { count: sale.cashFlows.length })}
          {' · '}
          {t('sales_list.paid_label', {
            amount: formatMoney(sale.paidAmount, sale.currency),
          })}
        </div>
      ) : (
        <div className="border-t border-border px-4 py-2 text-[11px] text-muted-foreground">
          {t('sales_list.no_payments')}
        </div>
      )}
    </button>
  );
}

export function SalesListPage(): React.ReactElement {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isReady } = usePermissions();
  const canRead = useCan(PermissionSlug.TRANSACTIONS_READ);

  const sales = useSalesInfinite(
    { status: 'active' },
    { enabled: canRead },
  );

  const contacts = useContacts(
    { all: true, status: 'active' },
    { enabled: canRead },
  );
  const contactNameById = useMemo(() => {
    const map = new Map<number, string>();
    for (const c of contacts.data?.data ?? []) map.set(c.id, c.name);
    return map;
  }, [contacts.data]);

  const sentinelRef = useInfiniteScroll({
    hasNextPage: sales.hasNextPage ?? false,
    isFetchingNextPage: sales.isFetchingNextPage,
    fetchNextPage: () => {
      void sales.fetchNextPage();
    },
  });

  if (isReady && !canRead) {
    return (
      <AccessDeniedView
        title={t('dashboard.sales')}
        description={t('tx_list.no_access_description')}
        hint="transactions.read"
      />
    );
  }

  const flat = sales.data?.pages.flatMap((p) => p.data) ?? [];
  const groups = groupByDate(flat);

  return (
    <div className="pb-32">
      <PageHeader
        title={t('dashboard.sales')}
        description={t('sales_list.subtitle')}
        large
        showBack
      />

      {sales.isPending ? (
        <div className="flex justify-center py-16">
          <Spinner className="h-6 w-6" />
        </div>
      ) : sales.isError ? (
        <p className="px-4 py-6 text-[14px] text-destructive">
          {getApiErrorMessage(sales.error)}
        </p>
      ) : flat.length === 0 ? (
        <div className="px-6 py-16 text-center">
          <Receipt className="mx-auto h-10 w-10 text-muted-foreground" />
          <p className="mt-3 text-[14px] text-muted-foreground">
            {t('sales_list.empty')}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {groups.map((group) => (
            <section key={group.key} className="px-4">
              <div className="px-1 pb-1.5 pt-1 text-[12px] font-medium uppercase tracking-wide text-muted-foreground">
                {group.label}
              </div>
              <div className="space-y-2">
                {group.items.map((sale) => (
                  <SaleCard
                    key={sale.id}
                    sale={sale}
                    contactName={
                      sale.contactId
                        ? (contactNameById.get(sale.contactId) ?? null)
                        : null
                    }
                    onTap={(s) => navigate(`/transactions/${s.id}`)}
                  />
                ))}
              </div>
            </section>
          ))}
          <div ref={sentinelRef} className="h-8" />
          {sales.isFetchingNextPage ? (
            <div className="flex justify-center py-2">
              <Spinner />
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
