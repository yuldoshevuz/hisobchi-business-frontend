import { useState } from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/date-picker';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAccounts } from '@/api/hooks/use-accounts';
import { useCategories } from '@/api/hooks/use-categories';
import { CategoryIcon } from '@/components/categories/CategoryIcon';
import {
  PAYMENT_STATUS_LABEL,
  TRANSACTION_TYPE_ICON,
  TRANSACTION_TYPE_LABEL,
} from '@/lib/transaction-meta';
import { cn } from '@/lib/utils';
import { tgHapticImpact } from '@/lib/telegram';
import {
  PAYMENT_STATUS_VALUES,
  TRANSACTION_TYPE_VALUES,
  type ListTransactionsQuery,
  type PaymentStatus,
  type TransactionType,
} from '@/types/transaction.types';

interface TransactionFiltersSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: ListTransactionsQuery;
  onChange: (next: ListTransactionsQuery) => void;
}

export function TransactionFiltersSheet({
  open,
  onOpenChange,
  value,
  onChange,
}: TransactionFiltersSheetProps): React.ReactElement {
  const [draft, setDraft] = useState<ListTransactionsQuery>(value);
  const [lastSeenOpen, setLastSeenOpen] = useState<boolean>(open);
  const accounts = useAccounts({ status: 'active' }, { enabled: open });
  // Transactions only ever reference income/expense categories — product
  // categories are inventory metadata, not txn metadata. Fetch the two
  // typed lists separately so the picker matches what's actually selectable.
  const incomeCategories = useCategories(
    { all: true, type: 'income' },
    { enabled: open },
  );
  const expenseCategories = useCategories(
    { all: true, type: 'expense' },
    { enabled: open },
  );

  // Sync draft → applied filters whenever the sheet opens. Doing this during
  // render (with the "store the previous value" pattern) keeps the React
  // Compiler happy and avoids a transient blank-state flash.
  if (open !== lastSeenOpen) {
    setLastSeenOpen(open);
    if (open) setDraft(value);
  }

  function toggleType(type: TransactionType): void {
    const current = draft.type ?? [];
    const next = current.includes(type)
      ? current.filter((t) => t !== type)
      : [...current, type];
    setDraft({ ...draft, type: next.length ? next : undefined });
  }

  function togglePaymentStatus(status: PaymentStatus): void {
    setDraft({
      ...draft,
      paymentStatus: draft.paymentStatus === status ? undefined : status,
    });
  }

  function toggleAccount(id: number): void {
    setDraft({
      ...draft,
      accountId: draft.accountId === id ? undefined : id,
    });
  }

  // Categories come in two flavours from the merged catalog:
  //   - instantiated (id != null) → filter via `categoryId`
  //   - system default (id == null) → filter via `systemCategoryId` so we
  //     don't have to write a row to the DB just to filter the list.
  function toggleCategory(args: {
    id: number | null;
    systemCategoryId: number | null;
  }): void {
    const isSelected =
      (args.id !== null && draft.categoryId === args.id) ||
      (args.id === null &&
        args.systemCategoryId !== null &&
        draft.systemCategoryId === args.systemCategoryId);
    if (isSelected) {
      setDraft({ ...draft, categoryId: undefined, systemCategoryId: undefined });
      return;
    }
    if (args.id !== null) {
      setDraft({ ...draft, categoryId: args.id, systemCategoryId: undefined });
    } else if (args.systemCategoryId !== null) {
      setDraft({
        ...draft,
        categoryId: undefined,
        systemCategoryId: args.systemCategoryId,
      });
    }
  }

  function reset(): void {
    setDraft({});
  }

  function apply(): void {
    tgHapticImpact('light');
    onChange(draft);
    onOpenChange(false);
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Saralash"
      description="Tranzaktsiyalar bo'yicha filterlar"
    >
      <div className="space-y-5">
        <div className="space-y-2">
          <Label>Turi</Label>
          <div className="flex flex-wrap gap-2">
            {TRANSACTION_TYPE_VALUES.map((t) => {
              const Icon = TRANSACTION_TYPE_ICON[t];
              const selected = (draft.type ?? []).includes(t);
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => toggleType(t)}
                  className={cn(
                    'press inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px]',
                    selected
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border bg-card text-foreground',
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {TRANSACTION_TYPE_LABEL[t]}
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Sana oralig'i</Label>
          <div className="grid grid-cols-2 gap-2">
            <DatePicker value={draft.dateFrom ?? ''}
              onChange={(next) => setDraft({ ...draft, dateFrom: next || undefined })}
            />
            <DatePicker value={draft.dateTo ?? ''}
              onChange={(next) => setDraft({ ...draft, dateTo: next || undefined })}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Hisoblar</Label>
          {accounts.isPending ? (
            <p className="text-[13px] text-muted-foreground">Yuklanmoqda...</p>
          ) : (accounts.data ?? []).length === 0 ? (
            <p className="text-[13px] text-muted-foreground">Hisoblar yo'q</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {(accounts.data ?? []).map((a) => {
                const selected = draft.accountId === a.id;
                return (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => toggleAccount(a.id)}
                    className={cn(
                      'press inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px]',
                      selected
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border bg-card text-foreground',
                    )}
                  >
                    {a.name} · {a.currency}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {([
          { label: 'Kirim kategoriyalari', list: incomeCategories },
          { label: 'Chiqim kategoriyalari', list: expenseCategories },
        ] as const).map(({ label, list }) => (
          <div key={label} className="space-y-2">
            <Label>{label}</Label>
            {list.isPending ? (
              <p className="text-[13px] text-muted-foreground">Yuklanmoqda...</p>
            ) : (list.data?.data ?? []).length === 0 ? (
              <p className="text-[13px] text-muted-foreground">
                Kategoriyalar yo'q
              </p>
            ) : (
              <div className="grid grid-cols-4 gap-2">
                {(list.data?.data ?? []).map((c) => {
                  // System defaults that the org hasn't customised yet have
                  // id=null; we still show + select them via systemCategoryId.
                  const key =
                    c.id !== null
                      ? `cat-${c.id}`
                      : c.systemCategoryId !== null
                        ? `sys-${c.systemCategoryId}`
                        : `name-${c.name}`;
                  const selected =
                    (c.id !== null && draft.categoryId === c.id) ||
                    (c.id === null &&
                      c.systemCategoryId !== null &&
                      draft.systemCategoryId === c.systemCategoryId);
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() =>
                        toggleCategory({
                          id: c.id,
                          systemCategoryId: c.systemCategoryId,
                        })
                      }
                      className={cn(
                        'press flex aspect-square flex-col items-center justify-center gap-1 rounded-2xl border p-1 text-center transition-colors',
                        selected
                          ? 'border-primary bg-primary/10'
                          : 'border-border bg-card',
                      )}
                    >
                      <CategoryIcon
                        icon={c.icon}
                        color={c.color}
                        fallbackText={c.name}
                        className="h-9 w-9"
                      />
                      <span
                        className={cn(
                          'line-clamp-2 px-1 text-[10px] leading-tight',
                          selected ? 'text-primary' : 'text-muted-foreground',
                        )}
                      >
                        {c.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ))}

        <div className="space-y-2">
          <Label>To'lov holati</Label>
          <div className="flex flex-wrap gap-2">
            {PAYMENT_STATUS_VALUES.map((s) => {
              const selected = draft.paymentStatus === s;
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => togglePaymentStatus(s)}
                  className={cn(
                    'press rounded-full border px-3 py-1.5 text-[13px]',
                    selected
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border bg-card text-foreground',
                  )}
                >
                  {PAYMENT_STATUS_LABEL[s]}
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Status</Label>
          <div className="flex gap-2">
            {(['active', 'voided'] as const).map((s) => {
              // Multi-toggle: both selected (or neither) = no status filter
              // = show both. Single selection sends that value to the API.
              const isActiveSelected = draft.status !== 'voided';
              const isVoidedSelected = draft.status !== 'active';
              const selected = s === 'active' ? isActiveSelected : isVoidedSelected;
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    const wasActive = isActiveSelected;
                    const wasVoided = isVoidedSelected;
                    const nextActive = s === 'active' ? !wasActive : wasActive;
                    const nextVoided = s === 'voided' ? !wasVoided : wasVoided;
                    // At least one must remain on — refuse to deselect the
                    // last chip so the user never lands on an empty result.
                    if (!nextActive && !nextVoided) return;
                    setDraft({
                      ...draft,
                      status:
                        nextActive && nextVoided
                          ? undefined
                          : nextActive
                            ? 'active'
                            : 'voided',
                    });
                  }}
                  className={cn(
                    'press flex-1 rounded-xl border px-3 py-2 text-[14px]',
                    selected
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border bg-card text-foreground',
                  )}
                >
                  {s === 'active' ? 'Faol' : 'Bekor qilingan'}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="flex-1"
            onClick={reset}
          >
            Tozalash
          </Button>
          <Button type="button" size="lg" className="flex-1" onClick={apply}>
            Qo'llash
          </Button>
        </div>
      </div>
    </Modal>
  );
}
