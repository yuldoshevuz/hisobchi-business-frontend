import { useState } from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { getApiErrorMessage } from '@/lib/api-error';
import { tgHapticImpact, tgHapticNotify } from '@/lib/telegram';
import {
  VOID_REASON_MAX_LENGTH,
  VOID_REASON_MIN_LENGTH,
} from '@/types/transaction.types';

interface VoidConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** `cash_flow` displays a softer, narrower warning. */
  scope: 'transaction' | 'cash_flow';
  isPending: boolean;
  error: unknown;
  onConfirm: (reason: string) => Promise<unknown>;
  onSuccess?: () => void;
}

const TX_WARNING =
  "Bu tranzaktsiyaga bog'liq barcha to'lovlar bekor qilinadi. Hisob qoldig'i va ombor harakati teskari yoziladi.";
const CF_WARNING =
  "Faqat shu to'lov bekor qilinadi. Tranzaktsiya o'zi ochiq qoladi va to'lov holati qayta hisoblanadi.";

export function VoidConfirmDialog({
  open,
  onOpenChange,
  scope,
  isPending,
  error,
  onConfirm,
  onSuccess,
}: VoidConfirmDialogProps): React.ReactElement {
  const [reason, setReason] = useState<string>('');

  const trimmed = reason.trim();
  const isValid =
    trimmed.length >= VOID_REASON_MIN_LENGTH &&
    trimmed.length <= VOID_REASON_MAX_LENGTH;

  async function handleConfirm(): Promise<void> {
    if (!isValid || isPending) return;
    tgHapticImpact('heavy');
    try {
      await onConfirm(trimmed);
      tgHapticNotify('success');
      setReason('');
      onOpenChange(false);
      onSuccess?.();
    } catch {
      tgHapticNotify('error');
    }
  }

  return (
    <Modal
      open={open}
      onOpenChange={(o) => {
        if (!o) setReason('');
        onOpenChange(o);
      }}
      title={scope === 'transaction' ? 'Tranzaktsiyani bekor qilish' : "To'lovni bekor qilish"}
      description={scope === 'transaction' ? TX_WARNING : CF_WARNING}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void handleConfirm();
        }}
        className="space-y-4"
      >
        <div className="space-y-1.5">
          <Label htmlFor="void-reason">Sabab</Label>
          <textarea
            id="void-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={VOID_REASON_MAX_LENGTH}
            rows={3}
            placeholder="Nima uchun bekor qilinmoqda?"
            className="flex min-h-[80px] w-full rounded-xl border border-input bg-card px-3 py-2 text-[15px] text-foreground placeholder:text-muted-foreground transition-colors hover:border-primary focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            autoFocus
          />
        </div>

        {error ? (
          <p className="text-[13px] text-destructive">
            {getApiErrorMessage(error)}
          </p>
        ) : null}

        <Button
          type="submit"
          variant="destructive"
          size="lg"
          className="w-full"
          disabled={!isValid || isPending}
        >
          {isPending ? <Spinner /> : null}
          Tasdiqlash
        </Button>
      </form>
    </Modal>
  );
}
