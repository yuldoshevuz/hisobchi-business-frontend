import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  useTransaction,
  useUpdateTransaction,
} from '@/api/hooks/use-transactions';
import {
  useCategories,
  useCustomizeSystemCategory,
} from '@/api/hooks/use-categories';
import { CategoryIcon } from '@/components/categories/CategoryIcon';
import { PageHeader } from '@/components/layout/PageHeader';
import { ScreenAction } from '@/components/layout/ScreenAction';
import { SelectField } from '@/components/transactions/forms/form-primitives';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { AccessDeniedView } from '@/components/AccessDeniedView';
import { getApiErrorMessage } from '@/lib/api-error';
import { tgClose, tgHapticImpact, tgHapticNotify } from '@/lib/telegram';

const CLEAR_KEY = 'clear';

interface CategoryOption {
  value: string;
  label: string;
  categoryId: number | null;
  systemCategoryId: number | null;
  iconNode: React.ReactNode;
}

/**
 * Deep-link page behind the bot's rich-notification "Kategoriya ✏️"
 * button. Single-purpose select-based UI: pick a category from the
 * dropdown and save. PATCH `/transactions/:id` emits
 * `TRANSACTION_UPDATED` which the bot listener uses to re-render the
 * rich notification in place.
 *
 * The merged-catalog endpoint returns rows where `id === null` for
 * un-instantiated system defaults — those would all share the same
 * value and confuse a numeric SelectField (multiple "selected" rows).
 * We key options by a composite `id:<n>` / `sys:<n>` string and only
 * resolve to a real `categoryId` at save time, instantiating via
 * `customizeBySystem` when needed.
 */
export function EditTransactionCategoryPage(): React.ReactElement {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const txId = Number(id);
  const txQuery = useTransaction(Number.isFinite(txId) ? txId : null);
  const updateTx = useUpdateTransaction();
  const customizeSystem = useCustomizeSystemCategory();
  const tx = txQuery.data ?? null;

  // Match category type to the transaction direction: income / sale /
  // debt_in surface income-type categories; everything else (expense /
  // purchase / debt_out / etc.) uses expense-type. Transfers /
  // adjustments don't carry categories so the page short-circuits below.
  const incomeLike =
    tx?.type === 'income' || tx?.type === 'sale' || tx?.type === 'debt_in';
  const categoryType = incomeLike ? 'income' : 'expense';
  const categoriesQuery = useCategories(
    { all: true, type: categoryType },
    { enabled: Boolean(tx) },
  );

  const initialKey: string =
    tx?.categoryId != null ? `id:${tx.categoryId}` : CLEAR_KEY;
  const [selectedKey, setSelectedKey] = useState<string>(CLEAR_KEY);

  useEffect(() => {
    setSelectedKey(initialKey);
  }, [initialKey]);

  const options = useMemo<CategoryOption[]>(() => {
    const rows = (categoriesQuery.data?.data ?? []).filter((c) => !c.isArchived);
    const items = rows.map<CategoryOption>((c) => ({
      value:
        c.id !== null
          ? `id:${c.id}`
          : `sys:${c.systemCategoryId ?? 'x'}`,
      label: c.name,
      categoryId: c.id,
      systemCategoryId: c.systemCategoryId,
      iconNode: (
        <CategoryIcon icon={c.icon} color={c.color} fallbackText={c.name} />
      ),
    }));
    return [
      {
        value: CLEAR_KEY,
        label: 'Kategoriyasiz',
        categoryId: null,
        systemCategoryId: null,
        iconNode: (
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            —
          </div>
        ),
      },
      ...items,
    ];
  }, [categoriesQuery.data]);

  if (txQuery.isPending) {
    return (
      <div className="flex justify-center py-16">
        <Spinner className="h-6 w-6" />
      </div>
    );
  }
  if (txQuery.isError || !tx) {
    return (
      <AccessDeniedView
        title="Tranzaksiya topilmadi"
        description={getApiErrorMessage(txQuery.error)}
        hint="Yopib qaytadan oching."
      />
    );
  }
  if (tx.type === 'transfer' || tx.type === 'adjustment') {
    return (
      <AccessDeniedView
        title="Kategoriya yo'q"
        description="Bu tranzaksiya turi kategoriya talab qilmaydi."
        hint="O'tkazma / korrektsiya tranzaksiyalarida kategoriya bo'lmaydi."
      />
    );
  }

  const hasChanges = selectedKey !== initialKey;
  const saving = updateTx.isPending || customizeSystem.isPending;

  async function handleSave(): Promise<void> {
    if (!hasChanges || !tx) return;
    const selected = options.find((o) => o.value === selectedKey);
    if (!selected) return;
    tgHapticImpact('light');
    try {
      let categoryId: number | null = selected.categoryId;
      // Un-instantiated system row → instantiate first, then PATCH with
      // the freshly-minted org-scoped id.
      if (
        categoryId === null &&
        selected.systemCategoryId !== null &&
        selected.value !== CLEAR_KEY
      ) {
        const instantiated = await customizeSystem.mutateAsync({
          systemCategoryId: selected.systemCategoryId,
          body: {},
        });
        categoryId = instantiated.id;
      }
      await updateTx.mutateAsync({
        transactionId: tx.id,
        body: { categoryId },
      });
      tgHapticNotify('success');
      // Close the WebApp so the user lands back on the Telegram chat,
      // where the bot's rich notification has already been re-rendered
      // by the TRANSACTION_UPDATED listener. Navigating in-app first
      // gives a graceful fallback when running outside Telegram.
      navigate(`/transactions/${tx.id}`);
      tgClose();
    } catch {
      tgHapticNotify('error');
    }
  }

  return (
    <div className="pb-32">
      <PageHeader
        title="Kategoriya"
        description={`#${tx.id} · ${tx.amount} ${tx.currency}`}
        large
        showBack
      />

      <div className="space-y-3 px-4">
        <SelectField<string>
          id="edit-tx-category"
          label="Kategoriya"
          value={selectedKey}
          onChange={setSelectedKey}
          options={options}
          placeholder={
            categoriesQuery.isPending
              ? 'Yuklanmoqda…'
              : 'Tanlang (yoki kategoriyasiz)'
          }
          emptyText="Bu turdagi kategoriyalar yo'q. Avval Katalog bo'limidan kategoriya qo'shing."
          helperText="Kategoriyasiz qoldirish uchun ro'yxatdan «Kategoriyasiz» ni tanlang."
        />

        {updateTx.isError || customizeSystem.isError ? (
          <p className="text-[13px] text-destructive">
            {getApiErrorMessage(
              updateTx.error ?? customizeSystem.error,
              "Saqlab bo'lmadi",
            )}
          </p>
        ) : null}
      </div>

      <ScreenAction>
        <Button
          type="button"
          size="xl"
          className="w-full"
          disabled={!hasChanges || saving}
          onClick={handleSave}
        >
          {saving ? <Spinner /> : null}
          Saqlash
        </Button>
      </ScreenAction>
    </div>
  );
}
