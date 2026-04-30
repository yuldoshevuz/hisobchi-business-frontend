import { useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Plus,
  Trash2,
  XCircle,
} from 'lucide-react';
import {
  useTransaction,
  useVoidCashFlow,
  useVoidTransaction,
} from '@/api/hooks/use-transactions';
import { useAccounts } from '@/api/hooks/use-accounts';
import { useContacts } from '@/api/hooks/use-contacts';
import { useCategories } from '@/api/hooks/use-categories';
import { useMembers } from '@/api/hooks/use-members';
import { PageHeader } from '@/components/layout/PageHeader';
import { ScreenAction } from '@/components/layout/ScreenAction';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Spinner } from '@/components/ui/spinner';
import { AccessDeniedView } from '@/components/AccessDeniedView';
import { AddCashFlowForm } from '@/components/transactions/AddCashFlowForm';
import { VoidConfirmDialog } from '@/components/transactions/VoidConfirmDialog';
import { useCan, usePermissions } from '@/hooks/use-permissions';
import { getApiErrorMessage } from '@/lib/api-error';
import { formatMoney } from '@/lib/format';
import { PermissionSlug } from '@/lib/permission-slugs';
import { tgHapticImpact } from '@/lib/telegram';
import {
  PAYMENT_STATUS_LABEL,
  PAYMENT_STATUS_VARIANT,
  TRANSACTION_TYPE_ICON,
  TRANSACTION_TYPE_LABEL,
  TRANSACTION_TYPE_SIGN,
  transactionDescription,
  typeHasPaymentLifecycle,
} from '@/lib/transaction-meta';
import { cn } from '@/lib/utils';
import type { CashFlow, Transaction } from '@/types/transaction.types';

export function TransactionDetailPage(): React.ReactElement {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const { isReady } = usePermissions();
  const canRead = useCan(PermissionSlug.TRANSACTIONS_READ);
  const canCreateCashFlow = useCan(PermissionSlug.CASH_FLOWS_CREATE);
  const canVoid = useCan(PermissionSlug.TRANSACTIONS_VOID);

  const txId = Number(id);
  const transactionQuery = useTransaction(Number.isFinite(txId) ? txId : null, {
    enabled: canRead,
  });

  const tx = transactionQuery.data ?? null;

  const accounts = useAccounts({ status: 'active' }, { enabled: Boolean(tx) });
  const contacts = useContacts(
    { all: true, status: 'active' },
    { enabled: Boolean(tx?.contactId) },
  );
  const categories = useCategories(
    { all: true },
    { enabled: Boolean(tx?.categoryId) },
  );
  const members = useMembers({ all: true }, { enabled: Boolean(tx) });

  const memberNameById = useMemo(() => {
    const m = new Map<number, string>();
    for (const member of members.data?.data ?? []) {
      m.set(member.id, member.user.fullName);
    }
    return m;
  }, [members.data]);

  const accountNameById = useMemo(() => {
    const m = new Map<number, string>();
    for (const a of accounts.data ?? []) m.set(a.id, a.name);
    return m;
  }, [accounts.data]);

  const contactName = tx?.contactId
    ? ((contacts.data?.data ?? []).find((c) => c.id === tx.contactId)?.name ??
      null)
    : null;

  const categoryName = tx?.categoryId
    ? ((categories.data?.data ?? []).find((c) => c.id === tx.categoryId)
        ?.name ?? null)
    : null;

  // Deep-link query params: action=add-cash-flow / void; suggestedAmount.
  const action = searchParams.get('action');
  const suggestedAmount = searchParams.get('suggestedAmount');
  const [addCashFlowOpen, setAddCashFlowOpen] = useState<boolean>(false);
  const [voidTxOpen, setVoidTxOpen] = useState<boolean>(false);
  const [voidCashFlow, setVoidCashFlowState] = useState<CashFlow | null>(null);

  // Consume `?action=...` exactly once after the transaction loads, then strip
  // it from the URL so a refresh does not re-trigger the bottom-sheet.
  const [consumedAction, setConsumedAction] = useState<string | null>(null);
  if (tx && action && action !== consumedAction) {
    setConsumedAction(action);
    if (action === 'add-cash-flow') setAddCashFlowOpen(true);
    if (action === 'void') setVoidTxOpen(true);
    const next = new URLSearchParams(searchParams);
    next.delete('action');
    setSearchParams(next, { replace: true });
  }

  const voidTx = useVoidTransaction();
  const voidCf = useVoidCashFlow();

  if (isReady && !canRead) {
    return (
      <AccessDeniedView
        title="Tranzaktsiya"
        description="Bu tranzaktsiyani ko'rish uchun ruxsat yo'q"
        hint="'transactions.read' ruxsati kerak."
      />
    );
  }

  if (transactionQuery.isPending) {
    return (
      <div className="flex justify-center py-16">
        <Spinner className="h-6 w-6" />
      </div>
    );
  }
  if (transactionQuery.isError || !tx) {
    return (
      <div className="px-4 py-8">
        <p className="text-[14px] text-destructive">
          {getApiErrorMessage(transactionQuery.error, 'Yozuv topilmadi')}
        </p>
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="mt-4"
          onClick={() => navigate('/transactions')}
        >
          Ro'yxatga qaytish
        </Button>
      </div>
    );
  }

  const Icon = TRANSACTION_TYPE_ICON[tx.type];
  const sign = TRANSACTION_TYPE_SIGN[tx.type];
  const isVoided = tx.status === 'voided';

  const showAddCashFlowAction =
    canCreateCashFlow &&
    !isVoided &&
    typeHasPaymentLifecycle(tx.type) &&
    tx.paymentStatus !== 'paid';

  return (
    <div className="pb-32">
      <PageHeader
        title={TRANSACTION_TYPE_LABEL[tx.type]}
        description={new Intl.DateTimeFormat('uz-UZ', {
          dateStyle: 'long',
        }).format(new Date(tx.date))}
        showBack
      />

      {/* Header card */}
      <section className="px-4 pt-2">
        <div className="rounded-2xl bg-card p-4">
          <div className="flex items-start gap-3">
            <div
              className={cn(
                'flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl',
                sign === 'positive' &&
                  'bg-[var(--color-help-success-16)] text-[var(--color-help-success)]',
                sign === 'negative' && 'bg-destructive/10 text-destructive',
                sign === 'neutral' && 'bg-muted text-muted-foreground',
              )}
            >
              <Icon className="h-6 w-6" />
            </div>
            <div className="min-w-0 flex-1">
              <div
                className={cn(
                  'text-[24px] font-semibold tabular-nums',
                  sign === 'positive' && 'text-[var(--color-help-success)]',
                  sign === 'negative' && 'text-destructive',
                  isVoided && 'line-through text-muted-foreground',
                )}
              >
                {formatMoney(tx.amount, tx.currency)}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                {isVoided ? (
                  <Badge variant="destructive" className="text-[11px]">
                    Bekor qilingan
                  </Badge>
                ) : null}
                {typeHasPaymentLifecycle(tx.type) ? (
                  <Badge
                    variant={PAYMENT_STATUS_VARIANT[tx.paymentStatus]}
                    className="text-[11px]"
                  >
                    {PAYMENT_STATUS_LABEL[tx.paymentStatus]}
                  </Badge>
                ) : null}
                {typeHasPaymentLifecycle(tx.type) ? (
                  <span className="text-[12px] text-muted-foreground tabular-nums">
                    {formatMoney(tx.paidAmount, tx.currency)} /{' '}
                    {formatMoney(tx.amount, tx.currency)}
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Meta details */}
      <section className="px-4 pt-3">
        <div className="space-y-2 rounded-2xl bg-card p-4 text-[14px]">
          <DetailRow
            label="Izoh"
            value={transactionDescription(tx)}
          />
          {contactName ? <DetailRow label="Kontakt" value={contactName} /> : null}
          {categoryName ? (
            <DetailRow label="Kategoriya" value={categoryName} />
          ) : null}
          {tx.dueDate ? (
            <DetailRow
              label="Muddat"
              value={new Intl.DateTimeFormat('uz-UZ', {
                dateStyle: 'long',
              }).format(new Date(tx.dueDate))}
            />
          ) : null}
          <DetailRow
            label="Yaratdi"
            value={`${memberNameById.get(tx.createdBy) ?? `#${tx.createdBy}`} · ${new Intl.DateTimeFormat(
              'uz-UZ',
              {
                dateStyle: 'short',
                timeStyle: 'short',
              },
            ).format(new Date(tx.createdAt))}`}
          />
        </div>
      </section>

      {/* Cash flows */}
      <section className="px-4 pt-4">
        <h2 className="px-1 pb-1.5 text-[12px] font-medium uppercase tracking-wide text-muted-foreground">
          To'lovlar
        </h2>
        <div className="overflow-hidden rounded-2xl bg-card">
          {tx.cashFlows.length === 0 ? (
            <div className="px-4 py-6 text-center text-[13px] text-muted-foreground">
              Hali to'lovlar yo'q
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {tx.cashFlows.map((cf) => (
                <CashFlowRow
                  key={cf.id}
                  cashFlow={cf}
                  accountName={accountNameById.get(cf.accountId) ?? `#${cf.accountId}`}
                  canVoid={
                    canVoid &&
                    cf.status === 'active' &&
                    !isVoided &&
                    isVoidableCashFlow(tx, cf)
                  }
                  onVoidClick={() => setVoidCashFlowState(cf)}
                />
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* Sale items (sale only) */}
      {tx.type === 'sale' && tx.saleItems && tx.saleItems.length > 0 ? (
        <section className="px-4 pt-4">
          <h2 className="px-1 pb-1.5 text-[12px] font-medium uppercase tracking-wide text-muted-foreground">
            Mahsulotlar
          </h2>
          <div className="overflow-hidden rounded-2xl bg-card">
            <ul className="divide-y divide-border">
              {tx.saleItems.map((item) => (
                <li
                  key={item.id}
                  className="flex items-start justify-between gap-3 px-4 py-3"
                >
                  <div className="min-w-0">
                    <div className="truncate text-[14px] font-medium">
                      {item.nameSnapshot}
                    </div>
                    {item.quantity && item.unitPrice ? (
                      <div className="text-[12px] text-muted-foreground tabular-nums">
                        {item.quantity} × {formatMoney(item.unitPrice, tx.currency)}
                      </div>
                    ) : null}
                  </div>
                  <div className="shrink-0 tabular-nums text-[14px] font-semibold">
                    {formatMoney(item.lineTotal, tx.currency)}
                  </div>
                </li>
              ))}
            </ul>
            <div className="flex justify-between border-t border-border px-4 py-3 text-[14px]">
              <span className="text-muted-foreground">Jami</span>
              <span className="font-semibold tabular-nums">
                {formatMoney(tx.amount, tx.currency)}
              </span>
            </div>
          </div>
        </section>
      ) : null}

      {(showAddCashFlowAction || (canVoid && !isVoided)) ? (
        <ScreenAction>
          <div className="flex w-full gap-2">
            {showAddCashFlowAction ? (
              <Button
                type="button"
                size="xl"
                className="flex-1"
                onClick={() => {
                  tgHapticImpact('light');
                  setAddCashFlowOpen(true);
                }}
              >
                <Plus className="h-5 w-5" />
                To'lov qo'shish
              </Button>
            ) : null}
            {canVoid && !isVoided ? (
              <Button
                type="button"
                variant="destructive"
                size="xl"
                className="flex-1"
                onClick={() => {
                  tgHapticImpact('medium');
                  setVoidTxOpen(true);
                }}
              >
                <XCircle className="h-5 w-5" />
                Bekor qilish
              </Button>
            ) : null}
          </div>
        </ScreenAction>
      ) : null}

      <Modal
        open={addCashFlowOpen}
        onOpenChange={setAddCashFlowOpen}
        title="To'lov qo'shish"
        description="Tranzaktsiyaga yangi to'lov yoziladi"
      >
        <AddCashFlowForm
          transaction={tx}
          suggestedAmount={suggestedAmount ?? undefined}
          onClose={() => setAddCashFlowOpen(false)}
        />
      </Modal>

      <VoidConfirmDialog
        open={voidTxOpen}
        onOpenChange={setVoidTxOpen}
        scope="transaction"
        isPending={voidTx.isPending}
        error={voidTx.error}
        onConfirm={(reason) =>
          voidTx.mutateAsync({ transactionId: tx.id, body: { reason } })
        }
      />

      <VoidConfirmDialog
        open={voidCashFlow !== null}
        onOpenChange={(o) => {
          if (!o) setVoidCashFlowState(null);
        }}
        scope="cash_flow"
        isPending={voidCf.isPending}
        error={voidCf.error}
        onConfirm={async (reason) => {
          if (!voidCashFlow) return;
          await voidCf.mutateAsync({
            cashFlowId: voidCashFlow.id,
            parentTransactionId: tx.id,
            body: { reason },
          });
        }}
        onSuccess={() => setVoidCashFlowState(null)}
      />
    </div>
  );
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}): React.ReactElement {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="text-right text-foreground">{value}</span>
    </div>
  );
}

interface CashFlowRowProps {
  cashFlow: CashFlow;
  accountName: string;
  canVoid: boolean;
  onVoidClick: () => void;
}

function CashFlowRow({
  cashFlow,
  accountName,
  canVoid,
  onVoidClick,
}: CashFlowRowProps): React.ReactElement {
  const isVoided = cashFlow.status === 'voided';
  const isIn = cashFlow.direction === 'in';
  return (
    <li
      className={cn(
        'flex items-start justify-between gap-3 px-4 py-3',
        isVoided && 'opacity-60',
      )}
    >
      <div className="flex min-w-0 items-start gap-2">
        <div
          className={cn(
            'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
            isIn
              ? 'bg-[var(--color-help-success-16)] text-[var(--color-help-success)]'
              : 'bg-destructive/10 text-destructive',
          )}
        >
          {isIn ? (
            <ArrowDownLeft className="h-4 w-4" />
          ) : (
            <ArrowUpRight className="h-4 w-4" />
          )}
        </div>
        <div className="min-w-0">
          <div
            className={cn(
              'truncate text-[14px] font-medium',
              isVoided && 'line-through',
            )}
          >
            {accountName}
          </div>
          <div className="text-[12px] text-muted-foreground">
            {new Intl.DateTimeFormat('uz-UZ', { dateStyle: 'short' }).format(
              new Date(cashFlow.date),
            )}
            {cashFlow.notes ? ` · ${cashFlow.notes}` : ''}
            {cashFlow.pairedCashFlowId ? ' · juftlangan' : ''}
            {isVoided ? ' · bekor qilingan' : ''}
          </div>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <div
          className={cn(
            'tabular-nums text-[14px] font-semibold',
            isIn
              ? 'text-[var(--color-help-success)]'
              : 'text-destructive',
            isVoided && 'line-through text-muted-foreground',
          )}
        >
          {isIn ? '+' : '−'}
          {formatMoney(cashFlow.amount, cashFlow.currency)}
        </div>
        {canVoid ? (
          <button
            type="button"
            onClick={onVoidClick}
            className="press text-muted-foreground active:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        ) : null}
      </div>
    </li>
  );
}

/**
 * Mirrors backend rule: the cash_flow that birthed a debt_in/debt_out is NOT
 * voidable on its own — only via voiding the whole transaction. For other
 * lifecycle types every active cash_flow is independently voidable.
 */
function isVoidableCashFlow(tx: Transaction, cf: CashFlow): boolean {
  if (tx.type !== 'debt_in' && tx.type !== 'debt_out') return true;
  // Heuristic: the originating cash_flow on a debt has no `flowKind` set
  // (it's the debt principal, not a repayment). Backend will still 403 if
  // the user tries — this is just UX hygiene.
  return cf.flowKind !== null;
}
