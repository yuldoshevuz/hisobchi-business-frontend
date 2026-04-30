import { useCallback, useState } from 'react';
import { useVoidCommission } from '@/api/hooks/use-commissions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { getApiErrorMessage } from '@/lib/api-error';
import { tgHapticNotify } from '@/lib/telegram';

interface VoidCommissionFormProps {
  commissionId: number;
  onClose: () => void;
}

export function VoidCommissionForm({
  commissionId,
  onClose,
}: VoidCommissionFormProps): React.ReactElement {
  const voidMutation = useVoidCommission();
  const [reason, setReason] = useState<string>('');

  const submit = useCallback((): void => {
    voidMutation.mutate(
      {
        id: commissionId,
        body: reason.trim() === '' ? undefined : { reason: reason.trim() },
      },
      {
        onSuccess: () => {
          tgHapticNotify('success');
          onClose();
        },
        onError: () => tgHapticNotify('error'),
      },
    );
  }, [voidMutation, commissionId, reason, onClose]);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="space-y-4"
    >
      <div className="space-y-1.5">
        <Label htmlFor="comm-void-reason">Sabab (ixtiyoriy)</Label>
        <Input
          id="comm-void-reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Masalan: noto'g'ri summa"
          autoFocus
        />
      </div>

      {voidMutation.isError ? (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-[13px] text-destructive">
          {getApiErrorMessage(voidMutation.error)}
        </p>
      ) : null}

      <Button
        type="submit"
        size="xl"
        variant="destructive"
        className="w-full"
        disabled={voidMutation.isPending}
      >
        {voidMutation.isPending ? <Spinner className="h-5 w-5" /> : null}
        Bekor qilish
      </Button>
    </form>
  );
}
