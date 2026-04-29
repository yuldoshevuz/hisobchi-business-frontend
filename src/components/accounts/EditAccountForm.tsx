import { useCallback, useState } from 'react';
import { useUpdateAccount } from '@/api/hooks/use-accounts';
import { useCreateAdjustment } from '@/api/hooks/use-adjustments';
import {
  formatAmount,
  unformatAmount,
} from '@/components/transactions/forms/form-utils';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { getApiErrorMessage } from '@/lib/api-error';
import { formatMoney } from '@/lib/format';
import { tgHapticNotify } from '@/lib/telegram';
import { cn } from '@/lib/utils';
import {
  ACCOUNT_NAME_MAX_LENGTH,
  ACCOUNT_NAME_MIN_LENGTH,
  type Account,
} from '@/types/account.types';

interface EditAccountFormProps {
  account: Account;
  onClose: () => void;
}

/**
 * Edit account: rename, toggle the default flag, and (optionally) correct the
 * balance. The correction is recorded as an ADJUSTMENT transaction with a
 * single IN or OUT cash flow whose amount equals the diff between the typed
 * "actual balance" and the stored `currentBalance`. The diff is signed by
 * `direction` so the backend writes it inside one ACID `$transaction`.
 *
 * The rename and the correction are two separate API calls — each atomic
 * server-side — issued sequentially. If the rename fails, the correction is
 * skipped; if the correction fails after a successful rename, the user
 * sees the error and can retry without losing the renamed account.
 */
export function EditAccountForm({
  account,
  onClose,
}: EditAccountFormProps): React.ReactElement {
  const update = useUpdateAccount();
  const adjust = useCreateAdjustment();
  const [name, setName] = useState<string>(account.name);
  const [isPrimary, setIsPrimary] = useState<boolean>(account.isPrimary);
  // Empty string == "leave balance alone". Non-empty: parsed and diffed
  // against the persisted value to compute the adjustment direction.
  const [actualBalance, setActualBalance] = useState<string>('');

  const trimmedName = name.trim();
  const isNameValid =
    trimmedName.length >= ACCOUNT_NAME_MIN_LENGTH &&
    trimmedName.length <= ACCOUNT_NAME_MAX_LENGTH;

  const trimmedActual = actualBalance.trim();
  const currentBalance = Number(account.currentBalance);
  const targetBalance = Number(trimmedActual);
  const hasTarget = trimmedActual !== '' && Number.isFinite(targetBalance);
  // 4-decimal rounding mirrors the backend `Decimal` precision so float
  // drift never produces a phantom "no change" verdict.
  const rawDiff = hasTarget ? targetBalance - currentBalance : 0;
  const diff = Number(rawDiff.toFixed(4));
  const correctionDirection: 'in' | 'out' | null =
    !hasTarget || diff === 0 ? null : diff > 0 ? 'in' : 'out';
  const correctionAmount = Math.abs(diff).toFixed(4);

  const renameChanged = trimmedName !== account.name;
  const primaryChanged = isPrimary !== account.isPrimary;
  const hasChanges =
    renameChanged || primaryChanged || correctionDirection !== null;

  const isPending = update.isPending || adjust.isPending;
  const errorMessage = update.error ?? adjust.error ?? null;

  const submit = useCallback(async (): Promise<void> => {
    if (!isNameValid || !hasChanges) return;

    if (renameChanged || primaryChanged) {
      const body: { name?: string; isPrimary?: boolean } = {};
      if (renameChanged) body.name = trimmedName;
      if (primaryChanged) body.isPrimary = isPrimary;
      try {
        await update.mutateAsync({ id: account.id, body });
      } catch {
        tgHapticNotify('error');
        return;
      }
    }

    if (correctionDirection !== null) {
      try {
        await adjust.mutateAsync({
          accountId: account.id,
          direction: correctionDirection,
          amount: correctionAmount,
          description: `Balansni tahrirlash (${formatMoney(account.currentBalance)} → ${formatMoney(trimmedActual)})`,
        });
      } catch {
        tgHapticNotify('error');
        return;
      }
    }

    tgHapticNotify('success');
    onClose();
  }, [
    update,
    adjust,
    account.id,
    account.currentBalance,
    trimmedName,
    isPrimary,
    renameChanged,
    primaryChanged,
    correctionDirection,
    correctionAmount,
    trimmedActual,
    isNameValid,
    hasChanges,
    onClose,
  ]);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
      className="space-y-4"
    >
      <div className="space-y-1.5">
        <Label htmlFor="edit-account-name">Nom</Label>
        <Input
          id="edit-account-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={ACCOUNT_NAME_MAX_LENGTH}
          required
          autoFocus
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="edit-account-balance">Joriy qoldiq</Label>
        <Input
          id="edit-account-balance"
          inputMode="decimal"
          // formatAmount/unformatAmount group the integer part with thin
          // spaces while the user types — same UX as AmountField in the
          // transaction forms. We store the unformatted value in state.
          value={formatAmount(actualBalance)}
          onChange={(e) => setActualBalance(unformatAmount(e.target.value))}
          placeholder={formatMoney(account.currentBalance)}
        />
        <p className="text-[12px] text-muted-foreground">
          Hozir hisobda bor bo'lgan haqiqiy summani kiriting. Tizim farq
          bo'lsa "tuzatish" tranzaksiyasini avtomatik yozadi.
        </p>
        {correctionDirection !== null ? (
          <CorrectionPreview
            direction={correctionDirection}
            amount={correctionAmount}
            currency={account.currency}
          />
        ) : null}
      </div>

      <label
        htmlFor="edit-account-default"
        className="press flex cursor-pointer items-center gap-3 rounded-xl bg-card px-4 py-3"
      >
        <Checkbox
          id="edit-account-default"
          checked={isPrimary}
          disabled={account.status === 'archived'}
          onCheckedChange={(v) => setIsPrimary(v === true)}
        />
        <div className="min-w-0 flex-1">
          <div className="text-[15px] font-medium">Asosiy hisob</div>
          <div className="text-[12px] text-muted-foreground">
            {account.status === 'archived'
              ? "Arxivlangan hisob asosiy bo'la olmaydi"
              : 'Yangi tranzaksiyalar uchun avtomatik tanlanadi'}
          </div>
        </div>
      </label>

      {errorMessage ? (
        <p className="text-[13px] text-destructive">
          {getApiErrorMessage(errorMessage)}
        </p>
      ) : null}

      <Button
        type="submit"
        size="lg"
        className="w-full"
        disabled={!isNameValid || !hasChanges || isPending}
      >
        {isPending ? <Spinner /> : null}
        Saqlash
      </Button>
    </form>
  );
}

interface CorrectionPreviewProps {
  direction: 'in' | 'out';
  amount: string;
  currency: string;
}

function CorrectionPreview({
  direction,
  amount,
  currency,
}: CorrectionPreviewProps): React.ReactElement {
  const isAdd = direction === 'in';
  return (
    <div
      className={cn(
        'rounded-xl border px-3 py-2 text-[13px]',
        isAdd
          ? 'border-[var(--color-help-success)] bg-[var(--color-help-success-16)]'
          : 'border-destructive bg-destructive/10',
      )}
    >
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
        Tuzatish
      </div>
      <div
        className={cn(
          'mt-0.5 text-[15px] font-semibold tabular-nums',
          isAdd ? 'text-[var(--color-help-success)]' : 'text-destructive',
        )}
      >
        {isAdd ? '+' : '−'} {formatMoney(amount)} {currency}
      </div>
      <div className="mt-0.5 text-[11px] text-muted-foreground">
        {isAdd ? "Balansga qo'shiladi" : 'Balansdan ayriladi'}
      </div>
    </div>
  );
}
