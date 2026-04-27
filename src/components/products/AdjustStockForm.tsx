import { useCallback, useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import { useAdjustStock } from '@/api/hooks/use-products';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { getApiErrorMessage } from '@/lib/api-error';
import { tgHapticImpact, tgHapticNotify } from '@/lib/telegram';
import {
  STOCK_ADJUSTMENT_REASON_MAX_LENGTH,
  type Product,
} from '@/types/product.types';

interface AdjustStockFormProps {
  product: Product;
  onClose: () => void;
}

type Direction = 'IN' | 'OUT';

export function AdjustStockForm({
  product,
  onClose,
}: AdjustStockFormProps): React.ReactElement {
  const adjust = useAdjustStock();
  const [direction, setDirection] = useState<Direction>('IN');
  const [amount, setAmount] = useState<string>('');
  const [reason, setReason] = useState<string>('');

  const trimmedAmount = amount.trim();
  const numericAmount = Number(trimmedAmount);
  const isAmountValid =
    Number.isFinite(numericAmount) && numericAmount > 0;
  const trimmedReason = reason.trim();
  const isValid = isAmountValid && trimmedReason.length > 0;

  const submit = useCallback((): void => {
    if (!isValid) return;
    const signed =
      direction === 'IN' ? trimmedAmount : `-${trimmedAmount}`;
    adjust.mutate(
      {
        id: product.id,
        body: { quantity: signed, reason: trimmedReason },
      },
      {
        onSuccess: () => {
          tgHapticNotify('success');
          onClose();
        },
        onError: () => tgHapticNotify('error'),
      },
    );
  }, [adjust, product.id, direction, trimmedAmount, trimmedReason, isValid, onClose]);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="space-y-4"
    >
      <div className="rounded-xl bg-muted/40 px-3 py-3 text-center">
        <div className="text-[12px] uppercase tracking-wide text-muted-foreground">
          Joriy qoldiq
        </div>
        <div className="mt-1 text-[20px] font-semibold tabular-nums">
          {product.currentStock ?? '—'}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <DirectionButton
          active={direction === 'IN'}
          onClick={() => {
            tgHapticImpact('light');
            setDirection('IN');
          }}
          icon={<Plus className="h-4 w-4" />}
          label="Kirim"
        />
        <DirectionButton
          active={direction === 'OUT'}
          onClick={() => {
            tgHapticImpact('light');
            setDirection('OUT');
          }}
          icon={<Minus className="h-4 w-4" />}
          label="Chiqim"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="adjust-amount">Miqdor</Label>
        <Input
          id="adjust-amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="5"
          inputMode="decimal"
          required
          autoFocus
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="adjust-reason">Sabab</Label>
        <Input
          id="adjust-reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Recount, sinish, topilgan…"
          maxLength={STOCK_ADJUSTMENT_REASON_MAX_LENGTH}
          required
        />
      </div>

      {adjust.isError ? (
        <p className="text-[13px] text-destructive">
          {getApiErrorMessage(adjust.error)}
        </p>
      ) : null}

      <Button
        type="submit"
        size="lg"
        className="w-full"
        disabled={!isValid || adjust.isPending}
      >
        {adjust.isPending ? <Spinner /> : null}
        Qo‘llash
      </Button>
    </form>
  );
}

interface DirectionButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}

function DirectionButton({
  active,
  onClick,
  icon,
  label,
}: DirectionButtonProps): React.ReactElement {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`press flex items-center justify-center gap-2 rounded-xl border px-3 py-3 text-[14px] font-medium ${
        active
          ? 'border-primary bg-primary/10 text-primary'
          : 'border-border bg-card text-foreground'
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}
