import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { formatMoney } from '@/lib/format';
import {
  PAYMENT_STATUS_LABEL,
  PAYMENT_STATUS_VARIANT,
  TRANSACTION_TYPE_ICON,
  TRANSACTION_TYPE_LABEL,
  TRANSACTION_TYPE_SIGN,
  transactionDescription,
  typeHasPaymentLifecycle,
} from '@/lib/transaction-meta';
import { Badge } from '@/components/ui/badge';
import { tgHapticImpact } from '@/lib/telegram';
import type { Transaction } from '@/types/transaction.types';

interface TransactionListItemProps {
  transaction: Transaction;
  contactName?: string | null;
  categoryName?: string | null;
  /**
   * Whether the txn type can carry a category at all. Sale / purchase
   * categorise per-item (sale_items.product.category), so the parent
   * categoryId stays null and we shouldn't shame the row with "(boshqa)".
   * Only expense / income / debt rows use the parent categoryId.
   */
  showCategoryBadge?: boolean;
  onTap: (transaction: Transaction) => void;
}

export function TransactionListItem({
  transaction,
  contactName,
  categoryName,
  showCategoryBadge = true,
  onTap,
}: TransactionListItemProps): React.ReactElement {
  const { t } = useTranslation();
  const Icon = TRANSACTION_TYPE_ICON[transaction.type];
  const sign = TRANSACTION_TYPE_SIGN[transaction.type];
  const isVoided = transaction.status === 'voided';

  const amountClass = cn(
    'tabular-nums text-[15px] font-semibold',
    sign === 'positive' && 'text-[var(--color-help-success)]',
    sign === 'negative' && 'text-destructive',
    sign === 'neutral' && 'text-foreground',
    isVoided && 'line-through text-muted-foreground',
  );

  const signPrefix =
    sign === 'positive' ? '+' : sign === 'negative' ? '−' : '';

  const subtitleParts: string[] = [];
  if (contactName) subtitleParts.push(contactName);
  if (transaction.description?.trim()) {
    subtitleParts.push(transaction.description.trim());
  }
  // Fallback to the localized type label so the row never bottoms out at "—"
  // when the creation form didn't capture a description (most non-credit flows).
  const subtitle =
    subtitleParts.length > 0
      ? subtitleParts.join(' · ')
      : transactionDescription(transaction);

  return (
    <button
      type="button"
      onClick={() => {
        tgHapticImpact('light');
        onTap(transaction);
      }}
      className={cn(
        'press flex w-full items-start gap-3 px-4 py-3 text-left active:bg-accent',
        isVoided && 'opacity-70',
      )}
    >
      <div
        className={cn(
          'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
          sign === 'positive' && 'bg-[var(--color-help-success-16)] text-[var(--color-help-success)]',
          sign === 'negative' && 'bg-destructive/10 text-destructive',
          sign === 'neutral' && 'bg-muted text-muted-foreground',
        )}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span
            className={cn(
              'truncate text-[15px] font-medium',
              isVoided ? 'line-through text-muted-foreground' : 'text-foreground',
            )}
          >
            {TRANSACTION_TYPE_LABEL[transaction.type]}
          </span>
          <span className={amountClass}>
            {signPrefix}
            {formatMoney(transaction.amount, transaction.currency)}
          </span>
        </div>
        <div className="mt-0.5 flex items-center justify-between gap-2">
          <span className="truncate text-[13px] text-muted-foreground">
            {subtitle || '—'}
          </span>
          <div className="flex shrink-0 items-center gap-1">
            {showCategoryBadge ? (
              categoryName ? (
                <Badge variant="outline" className="text-[10px]">
                  {categoryName}
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  className="text-[10px] text-muted-foreground"
                >
                  {t('tx_list_item.other_category')}
                </Badge>
              )
            ) : null}
            {isVoided ? (
              <Badge variant="destructive" className="text-[10px]">
                {t('tx_list_item.voided')}
              </Badge>
            ) : typeHasPaymentLifecycle(transaction.type) ? (
              <Badge
                variant={PAYMENT_STATUS_VARIANT[transaction.paymentStatus]}
                className="text-[10px]"
              >
                {PAYMENT_STATUS_LABEL[transaction.paymentStatus]}
              </Badge>
            ) : null}
          </div>
        </div>
      </div>
    </button>
  );
}
