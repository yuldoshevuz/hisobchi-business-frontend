import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMembers } from '@/api/hooks/use-members';
import { useInlineCreateMember } from '@/api/hooks/use-inline-create';
import { useTransactions } from '@/api/hooks/use-transactions';
import { useCreateCommission } from '@/api/hooks/use-commissions';
import {
  formatAmount,
  unformatAmount,
} from '@/components/transactions/forms/form-utils';
import { SelectField } from '@/components/transactions/forms/form-primitives';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { getApiErrorMessage } from '@/lib/api-error';
import { formatMoney } from '@/lib/format';
import { tgHapticNotify } from '@/lib/telegram';
import type { CreateCommissionRequest } from '@/types/commission.types';

interface CreateCommissionFormProps {
  onClose: () => void;
  /** Pre-fill the parent sale (e.g. opened from a sale's detail page). */
  defaultSaleId?: number;
}

export function CreateCommissionForm({
  onClose,
  defaultSaleId,
}: CreateCommissionFormProps): React.ReactElement {
  const { t } = useTranslation();
  const create = useCreateCommission();
  // Active sales only — backend rejects voided parents anyway, but filtering
  // here keeps the picker tidy.
  const sales = useTransactions({
    type: ['sale'],
    status: 'active',
    limit: 100,
  });
  const members = useMembers({ status: 'active', all: true });

  const [saleId, setSaleId] = useState<number | null>(defaultSaleId ?? null);
  const [memberId, setMemberId] = useState<number | null>(null);
  const inlineMember = useInlineCreateMember();
  const [amount, setAmount] = useState<string>('');
  const [percentage, setPercentage] = useState<string>('');

  const saleList = sales.data?.data ?? [];
  const memberList = members.data?.data ?? [];

  const selectedSale = useMemo(
    () => saleList.find((s) => s.id === saleId) ?? null,
    [saleList, saleId],
  );
  const selectedMember = useMemo(
    () => memberList.find((m) => m.id === memberId) ?? null,
    [memberList, memberId],
  );

  // When member or sale changes and the user hasn't typed an explicit amount /
  // percentage yet, seed both from the member's default commission % applied
  // to the sale total. Lets the cashier "just confirm" most rows.
  const [amountTouched, setAmountTouched] = useState<boolean>(false);
  const [percentageTouched, setPercentageTouched] = useState<boolean>(false);
  useEffect(() => {
    if (selectedMember === null || selectedSale === null) return;
    const defaultPct = selectedMember.defaultCommissionPercentage;
    if (defaultPct === null || defaultPct === '') return;
    if (!percentageTouched) setPercentage(defaultPct);
    if (!amountTouched) {
      const pct = Number(defaultPct);
      const total = Number(selectedSale.amount);
      if (Number.isFinite(pct) && Number.isFinite(total)) {
        setAmount(((total * pct) / 100).toFixed(4));
      }
    }
  }, [selectedMember, selectedSale, amountTouched, percentageTouched]);

  const trimmedAmount = amount.trim();
  const trimmedPercentage = percentage.trim();

  const amountValid =
    trimmedAmount !== '' &&
    Number.isFinite(Number(trimmedAmount)) &&
    Number(trimmedAmount) > 0;

  const percentageValid =
    trimmedPercentage === '' ||
    (Number.isFinite(Number(trimmedPercentage)) &&
      Number(trimmedPercentage) >= 0 &&
      Number(trimmedPercentage) <= 100);

  const isValid =
    saleId !== null && memberId !== null && amountValid && percentageValid;

  const submit = useCallback((): void => {
    if (!isValid || saleId === null || memberId === null) return;
    const body: CreateCommissionRequest = {
      saleId,
      memberId,
      amount: trimmedAmount,
      ...(trimmedPercentage !== ''
        ? { percentage: Number(trimmedPercentage) }
        : {}),
    };
    create.mutate(body, {
      onSuccess: () => {
        tgHapticNotify('success');
        onClose();
      },
      onError: () => tgHapticNotify('error'),
    });
  }, [
    isValid,
    saleId,
    memberId,
    trimmedAmount,
    trimmedPercentage,
    create,
    onClose,
  ]);

  const saleOptions = useMemo(
    () =>
      saleList.map((s) => ({
        value: s.id,
        label: `#${s.id} · ${formatMoney(s.amount, s.currency)}`,
        description: s.description ?? s.date,
      })),
    [saleList],
  );

  const memberOptions = useMemo(
    () =>
      memberList.map((m) => ({
        value: m.id,
        label: m.name,
        description: m.phone ?? undefined,
      })),
    [memberList],
  );

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="space-y-4"
    >
      <SelectField
        id="comm-sale"
        label={t('create_commission.sale')}
        value={saleId}
        onChange={(next) => setSaleId(next)}
        options={saleOptions}
        emptyText={
          sales.isPending ? t('create_commission.loading') : t('create_commission.no_sales')
        }
        disabled={defaultSaleId !== undefined}
      />

      <SelectField
        id="comm-member"
        label={t('create_commission.member')}
        value={memberId}
        onChange={(next) => setMemberId(next)}
        options={memberOptions}
        emptyText={
          members.isPending ? t('create_commission.loading') : t('create_commission.no_members')
        }
        onCreate={async (name) => {
          const id = await inlineMember.onCreate(name);
          if (id !== null) setMemberId(id);
        }}
        creating={inlineMember.creating}
      />

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="comm-amount">{t('create_commission.amount')}</Label>
          <Input
            id="comm-amount"
            inputMode="decimal"
            value={formatAmount(amount)}
            onChange={(e) => {
              setAmountTouched(true);
              setAmount(unformatAmount(e.target.value));
            }}
            placeholder="0"
            autoFocus
          />
          {selectedSale ? (
            <p className="text-[12px] text-muted-foreground">
              {t('create_commission.currency_label', { currency: selectedSale.currency })}
            </p>
          ) : null}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="comm-percentage">{t('create_commission.percentage')}</Label>
          <Input
            id="comm-percentage"
            inputMode="decimal"
            value={percentage}
            onChange={(e) => {
              setPercentageTouched(true);
              setPercentage(e.target.value);
            }}
            placeholder="0–100"
          />
        </div>
      </div>

      {create.isError ? (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-[13px] text-destructive">
          {getApiErrorMessage(create.error)}
        </p>
      ) : null}

      <Button
        type="submit"
        size="xl"
        className="w-full"
        disabled={!isValid || create.isPending}
      >
        {create.isPending ? <Spinner className="h-5 w-5" /> : null}
        {t('common.save')}
      </Button>
    </form>
  );
}
