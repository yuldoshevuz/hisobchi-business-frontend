import { useCallback, useState } from 'react';
import { Lock } from 'lucide-react';
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
        <Label htmlFor="account-name">Nom</Label>
        <Input
          id="account-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Asosiy kassa"
          maxLength={ACCOUNT_NAME_MAX_LENGTH}
          required
          autoFocus
        />
      </div>

      <div className="space-y-1.5">
        <Label>Turi</Label>
        <div className="grid grid-cols-2 gap-2">
          {ACCOUNT_TYPE_VALUES.map((t) => {
            const Icon = ACCOUNT_TYPE_ICON[t];
            const selected = type === t;
            return (
              <button
                key={t}
                type="button"
                onClick={() => {
                  tgHapticImpact('light');
                  setType(t);
                }}
                className={`press flex items-center gap-2 rounded-xl border px-3 py-3 text-left text-[14px] ${
                  selected
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-card text-foreground'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="truncate">{ACCOUNT_TYPE_LABEL[t]}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Valyuta</Label>
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
                Faqat asosiy valyuta ({baseCurrency}) mavjud. Boshqa valyutada
                hisob ochish uchun{' '}
                <button
                  type="button"
                  onClick={() => navigate('/plans')}
                  className="underline"
                >
                  tarifni yangilang
                </button>
                .
              </span>
            </div>
          </div>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="account-opening-balance">Boshlang'ich qoldiq</Label>
        <Input
          id="account-opening-balance"
          inputMode="decimal"
          value={formatAmount(openingBalance)}
          onChange={(e) => setOpeningBalance(unformatAmount(e.target.value))}
          placeholder="0"
        />
        <p className="text-[12px] text-muted-foreground">
          Ixtiyoriy. Hozirda hisobda bor bo'lgan summa. Bo'sh qoldirilsa 0
          dan boshlanadi.
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
        Saqlash
      </Button>
    </form>
  );
}
