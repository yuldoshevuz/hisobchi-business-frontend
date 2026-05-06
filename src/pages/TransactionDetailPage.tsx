import { useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Check,
  Loader2,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
  XCircle,
} from 'lucide-react';
import {
  useCancelTransaction,
  useConfirmTransaction,
  useTransaction,
  useUpdateTransaction,
  useVoidCashFlow,
  useVoidTransaction,
} from '@/api/hooks/use-transactions';
import { useAccounts } from '@/api/hooks/use-accounts';
import { useContacts } from '@/api/hooks/use-contacts';
import { useCategories } from '@/api/hooks/use-categories';
import { useMembers } from '@/api/hooks/use-members';
import { useProducts } from '@/api/hooks/use-products';
import { PageHeader } from '@/components/layout/PageHeader';
import { ScreenAction } from '@/components/layout/ScreenAction';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/date-picker';
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
import {
  formatAmount,
  formatAmountDisplay,
  unformatAmount,
} from '@/components/transactions/forms/form-utils';
import { SelectField } from '@/components/transactions/forms/form-primitives';
import { ACCOUNT_TYPE_ICON } from '@/components/accounts/account-meta';
import type {
  CashFlow,
  SaleItem,
  Transaction,
  UpdateTransactionCashFlow,
  UpdateTransactionItem,
} from '@/types/transaction.types';
import type { Account } from '@/types/account.types';
import type { Product } from '@/types/product.types';
import type { Contact } from '@/types/contact.types';

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
  const isItemsType = tx?.type === 'sale' || tx?.type === 'purchase';
  const products = useProducts(
    { all: true, status: 'active' },
    { enabled: Boolean(tx && isItemsType) },
  );
  // Load contacts whenever there's a tx — needed both for the readonly
  // "Kontakt" detail row AND for the optional contact picker in the edit
  // modal. Cheap query (org-scoped, paginated `all`), fine to always run.
  const contacts = useContacts(
    { all: true, status: 'active' },
    { enabled: Boolean(tx) },
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

  // Computed before any early-return so hook order stays stable across renders
  // (loading → loaded transitions otherwise trip "rendered more hooks").
  const deferredCashFlows = useMemo(
    () => extractDeferredCashFlows(tx?.metadata ?? null),
    [tx?.metadata],
  );

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
  const [editOpen, setEditOpen] = useState<boolean>(false);
  const [cancelOpen, setCancelOpen] = useState<boolean>(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);

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
  const confirmTx = useConfirmTransaction();
  const cancelTx = useCancelTransaction();
  const updateTx = useUpdateTransaction();

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
  // `initial` rows are AI proposals — backend hasn't applied side-effects
  // (cash flows, balance, stock) yet. The UI surfaces the deferred legs from
  // metadata so the user can review what WILL happen on confirm.
  const isInitial = tx.status === 'initial';

  const showAddCashFlowAction =
    canCreateCashFlow &&
    !isVoided &&
    !isInitial &&
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

      {/* AI initial banner */}
      {isInitial ? (
        <section className="px-4 pt-2">
          <div className="rounded-2xl border border-primary/30 bg-primary/5 p-3 text-[13px]">
            <div className="flex items-start gap-2">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <div className="space-y-1">
                <div className="font-medium text-primary">
                  AI taklifi — tekshirib tasdiqlang
                </div>
                <div className="text-muted-foreground">
                  Bu yozuv hisobotlarga, balansga va qoldiqqa hozircha ta'sir
                  qilmaydi. Tasdiqlasangiz amalga oshadi, bekor qilsangiz
                  butunlay o'chiriladi.
                </div>
              </div>
            </div>
          </div>
        </section>
      ) : null}

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
                {isInitial ? (
                  <Badge variant="default" className="gap-1 text-[11px]">
                    <Sparkles className="h-3 w-3" />
                    Tasdiqlash kerak
                  </Badge>
                ) : null}
                {isVoided ? (
                  <Badge variant="destructive" className="text-[11px]">
                    Bekor qilingan
                  </Badge>
                ) : null}
                {!isInitial && typeHasPaymentLifecycle(tx.type) ? (
                  <Badge
                    variant={PAYMENT_STATUS_VARIANT[tx.paymentStatus]}
                    className="text-[11px]"
                  >
                    {PAYMENT_STATUS_LABEL[tx.paymentStatus]}
                  </Badge>
                ) : null}
                {!isInitial && typeHasPaymentLifecycle(tx.type) ? (
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
            label="Sana"
            value={new Intl.DateTimeFormat('uz-UZ', {
              dateStyle: 'long',
            }).format(new Date(tx.date))}
          />
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
          {isInitial ? "Taklif qilingan to'lovlar" : "To'lovlar"}
        </h2>
        <div className="overflow-hidden rounded-2xl bg-card">
          {isInitial ? (
            deferredCashFlows.length === 0 ? (
              <div className="px-4 py-6 text-center text-[13px] text-muted-foreground">
                AI to'lov taklif qilmadi (qarzga deb hisoblanadi)
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {deferredCashFlows.map((leg, idx) => (
                  <DeferredCashFlowRow
                    key={idx}
                    leg={leg}
                    accountName={
                      accountNameById.get(leg.accountId) ?? `#${leg.accountId}`
                    }
                    currency={tx.currency}
                  />
                ))}
              </ul>
            )
          ) : tx.cashFlows.length === 0 ? (
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

      {/* Sale / purchase items — same `sale_items` table, both directions */}
      {(tx.type === 'sale' || tx.type === 'purchase') &&
      tx.saleItems &&
      tx.saleItems.length > 0 ? (
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

      {isInitial ? (
        <ScreenAction>
          <div className="flex w-full flex-col gap-2">
            {confirmError ? (
              <p className="px-1 text-[12px] text-destructive">{confirmError}</p>
            ) : null}
            <div className="flex w-full gap-2">
              <Button
                type="button"
                variant="outline"
                size="xl"
                className="flex-1"
                disabled={confirmTx.isPending || cancelTx.isPending}
                onClick={() => {
                  tgHapticImpact('light');
                  setEditOpen(true);
                }}
              >
                <Pencil className="h-5 w-5" />
                Tahrirlash
              </Button>
              <Button
                type="button"
                size="xl"
                className="flex-1"
                disabled={confirmTx.isPending || cancelTx.isPending}
                onClick={async () => {
                  tgHapticImpact('medium');
                  setConfirmError(null);
                  try {
                    await confirmTx.mutateAsync({ transactionId: tx.id });
                  } catch (err) {
                    setConfirmError(
                      getApiErrorMessage(err, 'Tasdiqlab bo\'lmadi'),
                    );
                  }
                }}
              >
                {confirmTx.isPending ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Check className="h-5 w-5" />
                )}
                Tasdiqlash
              </Button>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="lg"
              disabled={confirmTx.isPending || cancelTx.isPending}
              onClick={() => {
                tgHapticImpact('medium');
                setCancelOpen(true);
              }}
            >
              <Trash2 className="h-4 w-4" />
              Bekor qilish (o'chirish)
            </Button>
          </div>
        </ScreenAction>
      ) : (showAddCashFlowAction || (canVoid && !isVoided)) ? (
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

      <Modal
        open={editOpen}
        onOpenChange={setEditOpen}
        title="Tranzaktsiyani tahrirlash"
        description="Faqat asosiy maydonlar — to'lov qo'shish uchun avval tasdiqlang"
      >
        <InitialEditForm
          transaction={tx}
          accounts={accounts.data ?? []}
          products={products.data?.data ?? []}
          contacts={contacts.data?.data ?? []}
          deferredCashFlows={deferredCashFlows}
          isPending={updateTx.isPending}
          error={updateTx.error}
          onSubmit={async (body) => {
            await updateTx.mutateAsync({ transactionId: tx.id, body });
            setEditOpen(false);
          }}
          onCancel={() => setEditOpen(false)}
        />
      </Modal>

      <Modal
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title="AI taklifini bekor qilish"
        description="Bu yozuv to'liq o'chiriladi. Mahsulot va kontaktlar saqlanadi."
      >
        {cancelTx.error ? (
          <p className="mb-3 text-[12px] text-destructive">
            {getApiErrorMessage(cancelTx.error, 'Bekor qilib bo\'lmadi')}
          </p>
        ) : null}
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="flex-1"
            disabled={cancelTx.isPending}
            onClick={() => setCancelOpen(false)}
          >
            Yo'q
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="lg"
            className="flex-1"
            disabled={cancelTx.isPending}
            onClick={async () => {
              await cancelTx.mutateAsync({ transactionId: tx.id });
              navigate('/transactions');
            }}
          >
            {cancelTx.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : null}
            Ha, o'chir
          </Button>
        </div>
      </Modal>
    </div>
  );
}

/**
 * Inline form for editing the simple metadata fields of an `initial`
 * transaction before confirm. Cash-flow / sale-item edits are out of scope
 * here — those need their own dedicated UIs.
 */
interface ItemDraft {
  productId: number | null;
  name: string;
  quantity: string;
  unitPrice: string;
}

function buildInitialItemDrafts(transaction: Transaction): ItemDraft[] {
  const items = transaction.saleItems ?? [];
  return items.map((item: SaleItem) => ({
    productId: item.productId,
    name: item.nameSnapshot,
    quantity: item.quantity ?? '1',
    unitPrice: item.unitPrice ?? '0',
  }));
}

interface CashFlowDraft {
  accountId: number | null;
  amount: string;
}

function buildInitialCashFlowDrafts(
  legs: DeferredCashFlow[],
): CashFlowDraft[] {
  return legs.map((leg) => ({
    accountId: leg.accountId,
    amount: leg.amount,
  }));
}

function InitialEditForm({
  transaction,
  accounts,
  products,
  contacts,
  deferredCashFlows,
  isPending,
  error,
  onSubmit,
  onCancel,
}: {
  transaction: Transaction;
  accounts: Account[];
  products: Product[];
  contacts: Contact[];
  deferredCashFlows: DeferredCashFlow[];
  isPending: boolean;
  error: unknown;
  onSubmit: (body: {
    amount?: string;
    date?: string;
    description?: string | null;
    dueDate?: string | null;
    contactId?: number | null;
    items?: UpdateTransactionItem[];
    cashFlows?: UpdateTransactionCashFlow[];
  }) => Promise<void>;
  onCancel: () => void;
}): React.ReactElement {
  const initialDrafts = useMemo(
    () => buildInitialItemDrafts(transaction),
    [transaction],
  );
  // Items editor is available for sale / purchase even when AI didn't
  // extract any — user can spell out what was sold / bought via the
  // "+ Mahsulot qo'shish" button. Other types stay amount-only.
  const supportsItems =
    transaction.type === 'sale' || transaction.type === 'purchase';
  const initialCashFlowDrafts = useMemo(
    () => buildInitialCashFlowDrafts(deferredCashFlows),
    [deferredCashFlows],
  );

  const [items, setItems] = useState<ItemDraft[]>(initialDrafts);
  const [cashFlows, setCashFlows] = useState<CashFlowDraft[]>(
    initialCashFlowDrafts,
  );
  const [amount, setAmount] = useState<string>(transaction.amount);
  const [description, setDescription] = useState<string>(
    transaction.description ?? '',
  );
  // Slice the ISO timestamp to YYYY-MM-DD — the DatePicker emits the
  // same shape and the backend's `IsDate + Type=>Date` pipe accepts it.
  const initialDateIso = transaction.date.slice(0, 10);
  const [date, setDate] = useState<string>(initialDateIso);
  const [dueDate, setDueDate] = useState<string>(transaction.dueDate ?? '');
  const [contactId, setContactId] = useState<number | null>(
    transaction.contactId,
  );

  // Restrict the contact picker to the role that fits this txn type:
  //   sale → customer / partner; purchase → supplier / partner.
  // Income / expense / debt rows can use any contact, so we don't filter.
  const relevantContacts = useMemo(() => {
    if (transaction.type === 'sale') {
      return contacts.filter(
        (c) => c.type === 'customer' || c.type === 'partner',
      );
    }
    if (transaction.type === 'purchase') {
      return contacts.filter(
        (c) => c.type === 'supplier' || c.type === 'partner',
      );
    }
    return contacts;
  }, [contacts, transaction.type]);

  const computedTotal = useMemo(() => {
    if (!supportsItems || items.length === 0) return null;
    let total = 0;
    for (const it of items) {
      const q = Number(it.quantity);
      const p = Number(it.unitPrice);
      if (Number.isFinite(q) && Number.isFinite(p)) total += q * p;
    }
    return total;
  }, [items, supportsItems]);

  const updateItem = (idx: number, patch: Partial<ItemDraft>): void => {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  };
  const addItem = (): void => {
    setItems((prev) => [
      ...prev,
      { productId: null, name: '', quantity: '1', unitPrice: '0' },
    ]);
  };
  const removeItem = (idx: number): void => {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const itemsChanged = useMemo(() => {
    if (items.length !== initialDrafts.length) return true;
    return items.some(
      (it, i) =>
        it.name !== initialDrafts[i].name ||
        it.quantity !== initialDrafts[i].quantity ||
        it.unitPrice !== initialDrafts[i].unitPrice ||
        it.productId !== initialDrafts[i].productId,
    );
  }, [items, initialDrafts]);

  const updateCashFlow = (idx: number, patch: Partial<CashFlowDraft>): void => {
    setCashFlows((prev) =>
      prev.map((cf, i) => (i === idx ? { ...cf, ...patch } : cf)),
    );
  };
  const addCashFlow = (): void => {
    setCashFlows((prev) => [
      ...prev,
      {
        accountId: accounts[0]?.id ?? null,
        amount: '',
      },
    ]);
  };
  const removeCashFlow = (idx: number): void => {
    setCashFlows((prev) => prev.filter((_, i) => i !== idx));
  };

  const cashFlowsChanged = useMemo(() => {
    if (cashFlows.length !== initialCashFlowDrafts.length) return true;
    return cashFlows.some(
      (cf, i) =>
        cf.accountId !== initialCashFlowDrafts[i].accountId ||
        cf.amount !== initialCashFlowDrafts[i].amount,
    );
  }, [cashFlows, initialCashFlowDrafts]);

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        const body: {
          amount?: string;
          date?: string;
          description?: string | null;
          dueDate?: string | null;
          items?: UpdateTransactionItem[];
          cashFlows?: UpdateTransactionCashFlow[];
        } = {};
        if (date && date !== initialDateIso) {
          body.date = date;
        }

        if (supportsItems && (itemsChanged || items.length > 0)) {
          // Server replaces all sale_items wholesale; only send rows that
          // have at least a name (skip empty drafts the user added but
          // never filled in).
          const valid = items.filter((it) => it.name.trim().length > 0);
          if (itemsChanged) {
            body.items = valid.map((it) => ({
              productId: it.productId,
              name: it.name.trim(),
              quantity: it.quantity || '1',
              unitPrice: it.unitPrice || '0',
            }));
          }
        } else if (amount && amount !== transaction.amount) {
          body.amount = amount;
        }

        if (description !== (transaction.description ?? '')) {
          body.description = description.length > 0 ? description : null;
        }
        if (dueDate !== (transaction.dueDate ?? '')) {
          body.dueDate = dueDate.length > 0 ? dueDate : null;
        }
        if (contactId !== transaction.contactId) {
          body.contactId = contactId;
        }

        if (cashFlowsChanged) {
          const valid = cashFlows.filter(
            (cf) =>
              cf.accountId !== null &&
              cf.amount.length > 0 &&
              Number(cf.amount) > 0,
          );
          body.cashFlows = valid.map((cf) => ({
            accountId: cf.accountId as number,
            amount: cf.amount,
          }));
        }

        if (Object.keys(body).length === 0) {
          onCancel();
          return;
        }
        void onSubmit(body);
      }}
    >
      <div className="block text-[12px] font-medium">
        Sana
        <div className="mt-1">
          <DatePicker
            value={date}
            onChange={(v) => setDate(v ?? initialDateIso)}
            placeholder="Sana tanlang"
          />
        </div>
      </div>

      {supportsItems ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-[12px] font-medium">Mahsulotlar</div>
            <button
              type="button"
              onClick={addItem}
              className="press flex items-center gap-1 rounded-lg px-2 py-1 text-[12px] text-primary"
            >
              <Plus className="h-3.5 w-3.5" />
              Qo'shish
            </button>
          </div>
          {items.length === 0 ? (
            <p className="rounded-xl bg-muted/40 px-3 py-2 text-[12px] text-muted-foreground">
              Mahsulot yo'q. Sotilgan / olingan mahsulotlarni qo'shing — har
              biriga soni va narxini kiriting.
            </p>
          ) : (
            <ul className="space-y-2">
              {items.map((it, idx) => {
                const lineTotal =
                  Number(it.quantity) * Number(it.unitPrice) || 0;
                const isExisting = idx < initialDrafts.length;
                return (
                  <li
                    key={idx}
                    className="space-y-2 rounded-xl border border-border bg-card p-3"
                  >
                    <div className="flex items-start gap-2">
                      <div className="min-w-0 flex-1">
                        {isExisting ? (
                          <div className="px-1 text-[13px] font-medium">
                            {it.name}
                          </div>
                        ) : (
                          <SelectField
                            id={`item-product-${idx}`}
                            label=""
                            value={it.productId === null ? -1 : it.productId}
                            placeholder="Mahsulot tanlang"
                            onChange={(picked) => {
                              if (picked === -1 || picked === null) {
                                updateItem(idx, {
                                  productId: null,
                                  name: '',
                                  unitPrice: '0',
                                });
                                return;
                              }
                              const p = products.find((x) => x.id === picked);
                              if (!p) return;
                              updateItem(idx, {
                                productId: p.id,
                                name: p.name,
                                unitPrice:
                                  it.unitPrice && it.unitPrice !== '0'
                                    ? it.unitPrice
                                    : (p.defaultPrice ?? '0'),
                              });
                            }}
                            options={[
                              {
                                value: -1,
                                label: "+ Yangi mahsulot…",
                              },
                              ...products.map((p) => ({
                                value: p.id,
                                label: p.name,
                              })),
                            ]}
                          />
                        )}
                        {!isExisting && it.productId === null ? (
                          <input
                            type="text"
                            placeholder="Yangi mahsulot nomi"
                            value={it.name}
                            onChange={(e) =>
                              updateItem(idx, { name: e.target.value })
                            }
                            className="mt-2 w-full rounded-lg border border-border bg-background px-2 py-1.5 text-[13px] font-medium outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/30"
                          />
                        ) : null}
                      </div>
                      <button
                        type="button"
                        onClick={() => removeItem(idx)}
                        className="press flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground active:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <label className="block flex-1 text-[11px] text-muted-foreground">
                        Soni
                        <input
                          type="text"
                          inputMode="decimal"
                          className="mt-1 w-full rounded-lg border border-border bg-background px-2 py-1.5 text-[14px] tabular-nums outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/30"
                          value={formatAmount(it.quantity)}
                          onChange={(e) =>
                            updateItem(idx, {
                              quantity: unformatAmount(e.target.value),
                            })
                          }
                        />
                      </label>
                      <label className="block flex-[2] text-[11px] text-muted-foreground">
                        Narx ({transaction.currency})
                        <input
                          type="text"
                          inputMode="decimal"
                          className="mt-1 w-full rounded-lg border border-border bg-background px-2 py-1.5 text-[14px] tabular-nums outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/30"
                          value={formatAmount(it.unitPrice)}
                          onChange={(e) =>
                            updateItem(idx, {
                              unitPrice: unformatAmount(e.target.value),
                            })
                          }
                        />
                      </label>
                    </div>
                    <div className="text-right text-[12px] text-muted-foreground tabular-nums">
                      Jami:{' '}
                      <span className="font-semibold text-foreground">
                        {formatMoney(lineTotal, transaction.currency)}
                      </span>
                    </div>
                  </li>
                );
              })}
              <div className="flex justify-between rounded-xl bg-muted/40 px-3 py-2 text-[14px]">
                <span className="text-muted-foreground">Umumiy summa</span>
                <span className="font-semibold tabular-nums">
                  {formatMoney(computedTotal ?? 0, transaction.currency)}
                </span>
              </div>
            </ul>
          )}
        </div>
      ) : (
        <label className="block text-[12px] font-medium">
          Summa ({transaction.currency})
          <input
            type="text"
            inputMode="decimal"
            className="mt-1 w-full rounded-xl border border-border bg-card px-3 py-2 text-[14px] tabular-nums outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/30"
            value={formatAmount(amount)}
            onChange={(e) => setAmount(unformatAmount(e.target.value))}
          />
          {amount ? (
            <div className="mt-1 text-[11px] text-muted-foreground tabular-nums">
              {formatAmountDisplay(amount)} {transaction.currency}
            </div>
          ) : null}
        </label>
      )}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="text-[12px] font-medium">To'lovlar</div>
          <button
            type="button"
            onClick={addCashFlow}
            disabled={accounts.length === 0}
            className="press flex items-center gap-1 rounded-lg px-2 py-1 text-[12px] text-primary disabled:opacity-50"
          >
            <Plus className="h-3.5 w-3.5" />
            Qo'shish
          </button>
        </div>
        {accounts.length === 0 ? (
          <p className="rounded-xl bg-muted/40 px-3 py-2 text-[12px] text-muted-foreground">
            Hisob (Kassa / Bank) topilmadi. Avval Hisoblar bo'limidan biror
            hisob yarating.
          </p>
        ) : cashFlows.length === 0 ? (
          <p className="rounded-xl bg-muted/40 px-3 py-2 text-[12px] text-muted-foreground">
            To'lov yo'q — qarz sifatida saqlanadi. To'lov bo'lgan bo'lsa,
            "Qo'shish"ni bosing.
          </p>
        ) : (
          <ul className="space-y-2">
            {cashFlows.map((cf, idx) => (
              <li
                key={idx}
                className="space-y-2 rounded-xl border border-border bg-card p-3"
              >
                <SelectField
                  id={`cf-account-${idx}`}
                  label="Hisob"
                  value={cf.accountId}
                  onChange={(id) => updateCashFlow(idx, { accountId: id })}
                  options={accounts.map((a) => ({
                    value: a.id,
                    label: `${a.name} · ${a.currency}`,
                    icon: ACCOUNT_TYPE_ICON[a.type],
                  }))}
                />
                <div className="flex gap-2">
                  <label className="block flex-1 text-[11px] text-muted-foreground">
                    Summa ({transaction.currency})
                    <input
                      type="text"
                      inputMode="decimal"
                      className="mt-1 w-full rounded-lg border border-border bg-background px-2 py-1.5 text-[14px] tabular-nums outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/30"
                      value={formatAmount(cf.amount)}
                      onChange={(e) =>
                        updateCashFlow(idx, {
                          amount: unformatAmount(e.target.value),
                        })
                      }
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => removeCashFlow(idx)}
                    className="press mt-5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground active:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="space-y-1.5">
        <SelectField
          id="initial-contact"
          label={
            transaction.type === 'sale'
              ? 'Mijoz (ixtiyoriy)'
              : transaction.type === 'purchase'
                ? "Yetkazib beruvchi (ixtiyoriy)"
                : 'Kontakt (ixtiyoriy)'
          }
          value={contactId}
          placeholder="Kontakt tanlang"
          onChange={(picked) => setContactId(picked)}
          options={relevantContacts.map((c) => ({
            value: c.id,
            label: c.name,
          }))}
          emptyText="Bu turga mos kontakt yo'q"
        />
        {contactId !== null ? (
          <button
            type="button"
            onClick={() => setContactId(null)}
            className="press text-[11px] text-muted-foreground active:text-destructive"
          >
            Tozalash
          </button>
        ) : null}
      </div>

      <label className="block text-[12px] font-medium">
        Izoh
        <textarea
          className="mt-1 min-h-[64px] w-full resize-y rounded-xl border border-border bg-card px-3 py-2 text-[14px] outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/30"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={500}
        />
      </label>
      <div className="block text-[12px] font-medium">
        Muddat (qarz holatlarida)
        <div className="mt-1">
          <DatePicker
            value={dueDate}
            onChange={setDueDate}
            placeholder="Sana tanlang"
            clearable
          />
        </div>
      </div>
      {error ? (
        <p className="text-[12px] text-destructive">
          {getApiErrorMessage(error, 'Saqlab bo\'lmadi')}
        </p>
      ) : null}
      <div className="flex gap-2 pt-1">
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="flex-1"
          disabled={isPending}
          onClick={onCancel}
        >
          Bekor
        </Button>
        <Button
          type="submit"
          size="lg"
          className="flex-1"
          disabled={isPending}
        >
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Saqlash
        </Button>
      </div>
    </form>
  );
}

/**
 * Read-only render of a deferred cash-flow leg (stored in
 * `metadata._deferredCashFlows` on `initial` rows). Visually similar to
 * `CashFlowRow` but with no actions and a "kutilmoqda" hint.
 */
function DeferredCashFlowRow({
  leg,
  accountName,
  currency,
}: {
  leg: DeferredCashFlow;
  accountName: string;
  currency: string;
}): React.ReactElement {
  const isIn = leg.direction === 'in';
  return (
    <li className="flex items-start justify-between gap-3 px-4 py-3">
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
          <div className="truncate text-[14px] font-medium">{accountName}</div>
          <div className="text-[12px] text-muted-foreground">
            Tasdiqlanmagan · kutilmoqda
          </div>
        </div>
      </div>
      <div
        className={cn(
          'tabular-nums text-[14px] font-semibold',
          isIn ? 'text-[var(--color-help-success)]' : 'text-destructive',
        )}
      >
        {isIn ? '+' : '−'}
        {formatMoney(leg.amount, leg.currency || currency)}
      </div>
    </li>
  );
}

interface DeferredCashFlow {
  accountId: number;
  direction: 'in' | 'out';
  amount: string;
  currency: string;
  date: string;
  flowKind: string | null;
}

/**
 * Pull the `_deferredCashFlows` array off `tx.metadata` (only set on
 * `initial` rows). Returns [] for any other shape — defensive against
 * missing/malformed metadata coming back from older AI runs.
 */
function extractDeferredCashFlows(
  metadata: Record<string, unknown> | null,
): DeferredCashFlow[] {
  if (!metadata) return [];
  const raw = (metadata as { _deferredCashFlows?: unknown })._deferredCashFlows;
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (item): item is DeferredCashFlow =>
      typeof item === 'object' &&
      item !== null &&
      typeof (item as DeferredCashFlow).accountId === 'number' &&
      typeof (item as DeferredCashFlow).amount === 'string' &&
      ((item as DeferredCashFlow).direction === 'in' ||
        (item as DeferredCashFlow).direction === 'out'),
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
