import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useUpdateAccount } from '@/api/hooks/use-accounts';
import { useCreateAdjustment } from '@/api/hooks/use-adjustments';
import {
  formatAmount,
  unformatAmount,
} from '@/components/transactions/forms/form-utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { getApiErrorMessage } from '@/lib/api-error';
import { formatMoney } from '@/lib/format';
import { tgHapticImpact, tgHapticNotify } from '@/lib/telegram';
import { cn } from '@/lib/utils';
import {
  ACCOUNT_NAME_MAX_LENGTH,
  ACCOUNT_NAME_MIN_LENGTH,
  ACCOUNT_TYPE_VALUES,
  type Account,
  type AccountType,
} from '@/types/account.types';
import { ACCOUNT_TYPE_ICON, ACCOUNT_TYPE_LABEL } from './account-meta';

interface EditAccountFormProps {
  account: Account;
  onClose: () => void;
}

/**
 * Edit account: rename, change type, and (optionally) correct the balance.
 * The correction is recorded as an ADJUSTMENT transaction with a single IN
 * or OUT cash flow whose amount equals the diff between the typed "actual
 * balance" and the stored `currentBalance`. The diff is signed by
 * `direction` so the backend writes it inside one ACID `$transaction`.
 *
 * Setting the account as primary is intentionally NOT here — there's a
 * dedicated action for it (kebab menu / list item). Mixing it with the
 * edit form caused users to flip primary by mistake when they only meant
 * to rename. Keep the two flows separate.
 *
 * The rename/type-change and the correction are two separate API calls —
 * each atomic server-side — issued sequentially. If the first fails, the
 * correction is skipped; if the correction fails after a successful update,
 * the user sees the error and can retry without losing the rename.
 */
export function EditAccountForm({
  account,
  onClose,
}: EditAccountFormProps): React.ReactElement {
  const { t } = useTranslation();
  const update = useUpdateAccount();
  const adjust = useCreateAdjustment();
  const [name, setName] = useState<string>(account.name);
  const [type, setType] = useState<AccountType>(account.type);
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
  const typeChanged = type !== account.type;
  const hasChanges =
    renameChanged || typeChanged || correctionDirection !== null;

  const isPending = update.isPending || adjust.isPending;
  const errorMessage = update.error ?? adjust.error ?? null;

  const submit = useCallback(async (): Promise<void> => {
    if (!isNameValid || !hasChanges) return;

    if (renameChanged || typeChanged) {
      const body: { name?: string; type?: AccountType } = {};
      if (renameChanged) body.name = trimmedName;
      if (typeChanged) body.type = type;
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
          description: t('edit_account.adjustment_description', {
            old: formatMoney(account.currentBalance),
            new: formatMoney(trimmedActual),
          }),
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
    type,
    renameChanged,
    typeChanged,
    correctionDirection,
    correctionAmount,
    trimmedActual,
    isNameValid,
    hasChanges,
    onClose,
    t,
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
        <Label htmlFor="edit-account-name">{t('edit_account.name')}</Label>
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
        <Label>{t('edit_account.type')}</Label>
        <div className="grid grid-cols-2 gap-2">
          {ACCOUNT_TYPE_VALUES.map((tValue) => {
            const Icon = ACCOUNT_TYPE_ICON[tValue];
            const selected = type === tValue;
            return (
              <button
                key={tValue}
                type="button"
                onClick={() => {
                  tgHapticImpact('light');
                  setType(tValue);
                }}
                className={`press flex items-center gap-2 rounded-xl border px-3 py-3 text-left text-[14px] ${
                  selected
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-card text-foreground'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="truncate">{ACCOUNT_TYPE_LABEL[tValue]}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="edit-account-balance">
          {t('edit_account.current_balance')}
        </Label>
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
          {t('edit_account.current_balance_hint')}
        </p>
        {correctionDirection !== null ? (
          <CorrectionPreview
            direction={correctionDirection}
            amount={correctionAmount}
            currency={account.currency}
          />
        ) : null}
      </div>

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
        {t('common.save')}
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
  const { t } = useTranslation();
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
        {t('edit_account.correction')}
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
        {isAdd
          ? t('edit_account.correction_add')
          : t('edit_account.correction_subtract')}
      </div>
    </div>
  );
}
