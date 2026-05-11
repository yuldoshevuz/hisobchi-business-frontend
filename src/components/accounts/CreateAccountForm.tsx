import { useCallback, useState } from 'react';
import { Lock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useCreateAccount } from '@/api/hooks/use-accounts';
import { useCurrentOrganization } from '@/api/hooks/use-organizations';
import { useFeature } from '@/api/hooks/use-subscription';
import {
  formatAmount,
  unformatAmount,
} from '@/components/transactions/forms/form-utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { getApiErrorMessage } from '@/lib/api-error';
import { tgHapticImpact, tgHapticNotify } from '@/lib/telegram';
import {
  ACCOUNT_CURRENCY_VALUES,
  ACCOUNT_NAME_MAX_LENGTH,
  ACCOUNT_NAME_MIN_LENGTH,
  ACCOUNT_TYPE_VALUES,
  type AccountCurrency,
  type AccountType,
} from '@/types/account.types';
import { ACCOUNT_TYPE_ICON, ACCOUNT_TYPE_LABEL } from './account-meta';

interface CreateAccountFormProps {
  onClose: () => void;
}

export function CreateAccountForm({
  onClose,
}: CreateAccountFormProps): React.ReactElement {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const create = useCreateAccount();
  const org = useCurrentOrganization();
  const baseCurrency = (org.data?.baseCurrency ?? 'UZS') as AccountCurrency;
  // MULTI_CURRENCY_SUPPORT — controls whether non-base-currency accounts
  // are allowed. When disabled, the picker locks to baseCurrency.
  const multiCurrency = useFeature('MULTI_CURRENCY_SUPPORT');
  const canPickAnyCurrency = multiCurrency.isEnabled;
  const [name, setName] = useState<string>('');
  const [type, setType] = useState<AccountType>('cash');
  const [currency, setCurrency] = useState<AccountCurrency>(baseCurrency);
  const [openingBalance, setOpeningBalance] = useState<string>('');

  const trimmedName = name.trim();
  const trimmedOpening = openingBalance.trim();
  // Empty string == "no opening balance" (skip it). Non-empty must be a
  // finite, non-negative number — backend re-validates anyway, this is just
  // for the disabled state.
  const openingBalanceValid =
    trimmedOpening === '' ||
    (Number.isFinite(Number(trimmedOpening)) && Number(trimmedOpening) >= 0);
  const isValid =
    trimmedName.length >= ACCOUNT_NAME_MIN_LENGTH &&
    trimmedName.length <= ACCOUNT_NAME_MAX_LENGTH &&
    openingBalanceValid;

  const submit = useCallback((): void => {
    if (!isValid) return;
    create.mutate(
      {
        name: trimmedName,
        type,
        currency,
        ...(trimmedOpening !== '' ? { openingBalance: trimmedOpening } : {}),
      },
      {
        onSuccess: () => {
          tgHapticNotify('success');
          onClose();
          setName('');
          setType('cash');
          setCurrency('UZS');
          setOpeningBalance('');
        },
        onError: () => tgHapticNotify('error'),
      },
    );
  }, [create, trimmedName, type, currency, trimmedOpening, isValid, onClose]);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="space-y-4"
    >
      <div className="space-y-1.5">
        <Label htmlFor="account-name">{t('create_account.name')}</Label>
        <Input
          id="account-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('create_account.name_placeholder')}
          maxLength={ACCOUNT_NAME_MAX_LENGTH}
          required
          autoFocus
        />
      </div>

      <div className="space-y-1.5">
        <Label>{t('create_account.type')}</Label>
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
        <Label>{t('create_account.currency')}</Label>
        <div className="flex flex-wrap gap-2">
          {ACCOUNT_CURRENCY_VALUES.map((c) => {
            const selected = currency === c;
            const locked = !canPickAnyCurrency && c !== baseCurrency;
            return (
              <button
                key={c}
                type="button"
                disabled={locked}
                onClick={() => {
                  if (locked) return;
                  tgHapticImpact('light');
                  setCurrency(c);
                }}
                className={`press relative min-w-[64px] rounded-xl border px-3 py-2 text-[14px] font-medium ${
                  selected
                    ? 'border-primary bg-primary/10 text-primary'
                    : locked
                      ? 'border-dashed border-amber-300 bg-amber-50 text-amber-700 opacity-70'
                      : 'border-border bg-card text-foreground'
                }`}
              >
                <span className="flex items-center gap-1">
                  {locked ? <Lock className="h-3 w-3" /> : null}
                  {c}
                </span>
              </button>
            );
          })}
        </div>
        {!canPickAnyCurrency && multiCurrency.isReady ? (
          <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-[12px]">
            <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-700" />
            <div className="flex-1">
              <span className="text-amber-900">
                {t('create_account.base_currency_only', {
                  currency: baseCurrency,
                })}
                <button
                  type="button"
                  onClick={() => navigate('/plans')}
                  className="underline"
                >
                  {t('create_account.upgrade_plan')}
                </button>
                .
              </span>
            </div>
          </div>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="account-opening-balance">
          {t('create_account.opening_balance')}
        </Label>
        <Input
          id="account-opening-balance"
          inputMode="decimal"
          value={formatAmount(openingBalance)}
          onChange={(e) => setOpeningBalance(unformatAmount(e.target.value))}
          placeholder={t('create_account.opening_balance_placeholder')}
        />
        <p className="text-[12px] text-muted-foreground">
          {t('create_account.opening_balance_hint')}
        </p>
      </div>

      {create.isError ? (
        <p className="text-[13px] text-destructive">
          {getApiErrorMessage(create.error)}
        </p>
      ) : null}

      <Button
        type="submit"
        size="lg"
        className="w-full"
        disabled={!isValid || create.isPending}
      >
        {create.isPending ? <Spinner /> : null}
        {t('common.save')}
      </Button>
    </form>
  );
}
