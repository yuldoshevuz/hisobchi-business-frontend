import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  useSwapCashFlowAccount,
  useTransaction,
} from '@/api/hooks/use-transactions';
import { useAccounts } from '@/api/hooks/use-accounts';
import { ACCOUNT_TYPE_ICON } from '@/components/accounts/account-meta';
import { PageHeader } from '@/components/layout/PageHeader';
import { ScreenAction } from '@/components/layout/ScreenAction';
import { SelectField } from '@/components/transactions/forms/form-primitives';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { AccessDeniedView } from '@/components/AccessDeniedView';
import { getApiErrorMessage } from '@/lib/api-error';
import { tgClose, tgHapticImpact, tgHapticNotify } from '@/lib/telegram';

/**
 * Deep-link page behind the bot's rich-notification "Kassa ✏️" button.
 * Pick the destination account from a dropdown (filtered to the
 * transaction's currency) and save. Backend re-points the first active
 * cash-flow leg and emits `TRANSACTION_UPDATED`, which the bot listener
 * uses to re-render the rich notification in place.
 */
export function EditTransactionAccountPage(): React.ReactElement {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const txId = Number(id);
  const txQuery = useTransaction(Number.isFinite(txId) ? txId : null);
  const swap = useSwapCashFlowAccount();
  const tx = txQuery.data ?? null;
  const accountsQuery = useAccounts(
    { status: 'active' },
    { enabled: Boolean(tx) },
  );

  // Use the first active cash flow as the swap target. The bot only
  // surfaces this page for transaction types with a single principal
  // leg (expense / income / sale / purchase / debt_in / debt_out
  // create) so this is a safe default.
  const targetCashFlow = useMemo(() => {
    if (!tx) return null;
    return (tx.cashFlows ?? []).find((cf) => cf.status === 'active') ?? null;
  }, [tx]);

  const [selectedId, setSelectedId] = useState<number | null>(null);

  useEffect(() => {
    if (targetCashFlow) setSelectedId(targetCashFlow.accountId);
  }, [targetCashFlow]);

  const accountOptions = useMemo(() => {
    if (!tx) return [];
    return (accountsQuery.data ?? [])
      .filter((a) => a.currency === tx.currency)
      .map((a) => ({
        value: a.id,
        label: a.name,
        description: `${a.currentBalance} ${a.currency}`,
        icon: ACCOUNT_TYPE_ICON[a.type],
      }));
  }, [accountsQuery.data, tx]);

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
  if (!targetCashFlow) {
    return (
      <AccessDeniedView
        title="Hisob topilmadi"
        description="Bu tranzaksiyada aktiv kassa harakati yo'q."
        hint="Tranzaksiya batafsil sahifasidan tahrirlang."
      />
    );
  }

  const hasChanges = selectedId !== targetCashFlow.accountId;

  async function handleSave(): Promise<void> {
    if (!hasChanges || selectedId === null || !tx || !targetCashFlow) return;
    tgHapticImpact('light');
    try {
      await swap.mutateAsync({
        cashFlowId: targetCashFlow.id,
        parentTransactionId: tx.id,
        accountId: selectedId,
      });
      tgHapticNotify('success');
      // Close the WebApp — the bot's rich notification has already been
      // re-rendered by the TRANSACTION_UPDATED listener, so there's
      // nothing more to do here.
      navigate(`/transactions/${tx.id}`);
      tgClose();
    } catch {
      tgHapticNotify('error');
    }
  }

  return (
    <div className="pb-32">
      <PageHeader
        title="Hisob"
        description={`#${tx.id} · ${tx.amount} ${tx.currency}`}
        large
        showBack
      />

      <div className="space-y-3 px-4">
        <SelectField<number>
          id="edit-tx-account"
          label="Hisob"
          value={selectedId}
          onChange={(v) => setSelectedId(v)}
          options={accountOptions}
          placeholder={
            accountsQuery.isPending ? 'Yuklanmoqda…' : 'Hisob tanlang'
          }
          emptyText={`${tx.currency} valyutasidagi aktiv hisob yo'q`}
          helperText={`Faqat ${tx.currency} valyutasidagi hisoblar ko'rsatilgan`}
        />

        {swap.isError ? (
          <p className="text-[13px] text-destructive">
            {getApiErrorMessage(swap.error, "Saqlab bo'lmadi")}
          </p>
        ) : null}
      </div>

      <ScreenAction>
        <Button
          type="button"
          size="xl"
          className="w-full"
          disabled={!hasChanges || swap.isPending}
          onClick={handleSave}
        >
          {swap.isPending ? <Spinner /> : null}
          Saqlash
        </Button>
      </ScreenAction>
    </div>
  );
}
