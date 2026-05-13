import { useTranslation } from 'react-i18next';
import { AlertTriangle } from 'lucide-react';
import type { Product } from '@/types/product.types';

interface StockShortfallWarningProps {
  product: Product | null;
  requestedQuantity: string;
}

/**
 * Inline notice surfaced the moment the operator picks a tracked product
 * AND types a quantity that exceeds the on-hand stock. Mirrors the
 * server-side gate (`StockBackfillService.ensureStockForSale`) — on
 * confirm the backend will create an auto-purchase for the shortfall, so
 * this preview tells the operator what's about to happen and prevents the
 * "where did this extra purchase come from?" surprise.
 *
 * Returns `null` for non-tracked products, missing quantities or any case
 * where stock would NOT go below zero — so callers can mount it
 * unconditionally next to the quantity field.
 */
export function StockShortfallWarning({
  product,
  requestedQuantity,
}: StockShortfallWarningProps): React.ReactElement | null {
  const { t } = useTranslation();
  if (!product) return null;
  if (product.currentStock === null) return null;
  const available = Number(product.currentStock);
  const requested = Number(requestedQuantity);
  if (!Number.isFinite(available) || !Number.isFinite(requested)) return null;
  if (requested <= 0) return null;
  if (requested <= available) return null;

  const missing = requested - available;
  const isZeroStock = available <= 0;
  const body = isZeroStock
    ? t('sale_form.stock_warning_zero', {
        product: product.name,
        requested: trimZerosDisplay(String(requested)),
      })
    : t('sale_form.stock_warning_body', {
        available: trimZerosDisplay(String(available)),
        requested: trimZerosDisplay(String(requested)),
        missing: trimZerosDisplay(String(missing)),
      });

  return (
    <div className="flex gap-3 rounded-xl border border-amber-300/70 bg-card px-3.5 py-3 shadow-sm dark:border-amber-500/40">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400">
        <AlertTriangle className="h-4.5 w-4.5" strokeWidth={2.2} />
      </div>
      <div className="min-w-0 flex-1 space-y-1">
        <div className="text-[14px] font-semibold leading-tight text-foreground">
          {t('sale_form.stock_warning_title')}
        </div>
        <div className="text-[13px] leading-snug text-muted-foreground">
          {body}
        </div>
      </div>
    </div>
  );
}

function trimZerosDisplay(value: string): string {
  if (!value.includes('.')) return value;
  return value.replace(/\.?0+$/, '');
}
