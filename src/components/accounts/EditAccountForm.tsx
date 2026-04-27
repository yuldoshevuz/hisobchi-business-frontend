import { useCallback, useState } from 'react';
import { useUpdateAccount } from '@/api/hooks/use-accounts';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { getApiErrorMessage } from '@/lib/api-error';
import { tgHapticNotify } from '@/lib/telegram';
import {
  ACCOUNT_NAME_MAX_LENGTH,
  ACCOUNT_NAME_MIN_LENGTH,
  type Account,
} from '@/types/account.types';

interface EditAccountFormProps {
  account: Account;
  onClose: () => void;
}

export function EditAccountForm({
  account,
  onClose,
}: EditAccountFormProps): React.ReactElement {
  const update = useUpdateAccount();
  const [name, setName] = useState<string>(account.name);
  const [isPrimary, setIsPrimary] = useState<boolean>(account.isPrimary);

  const trimmedName = name.trim();
  const isNameValid =
    trimmedName.length >= ACCOUNT_NAME_MIN_LENGTH &&
    trimmedName.length <= ACCOUNT_NAME_MAX_LENGTH;
  const hasChanges =
    trimmedName !== account.name || isPrimary !== account.isPrimary;

  const submit = useCallback((): void => {
    if (!isNameValid || !hasChanges) return;
    const body: { name?: string; isPrimary?: boolean } = {};
    if (trimmedName !== account.name) body.name = trimmedName;
    if (isPrimary !== account.isPrimary) body.isPrimary = isPrimary;
    update.mutate(
      { id: account.id, body },
      {
        onSuccess: () => {
          tgHapticNotify('success');
          onClose();
        },
        onError: () => tgHapticNotify('error'),
      },
    );
  }, [
    update,
    account.id,
    account.name,
    account.isPrimary,
    trimmedName,
    isPrimary,
    isNameValid,
    hasChanges,
    onClose,
  ]);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
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

      <label
        htmlFor="edit-account-default"
        className="press flex cursor-pointer items-center gap-3 rounded-xl bg-card px-4 py-3"
      >
        <Checkbox
          id="edit-account-default"
          checked={isPrimary}
          disabled={account.status === 'ARCHIVED'}
          onCheckedChange={(v) => setIsPrimary(v === true)}
        />
        <div className="min-w-0 flex-1">
          <div className="text-[15px] font-medium">Asosiy hisob</div>
          <div className="text-[12px] text-muted-foreground">
            {account.status === 'ARCHIVED'
              ? 'Arxivlangan hisob asosiy bo‘la olmaydi'
              : 'Yangi tranzaksiyalar uchun avtomatik tanlanadi'}
          </div>
        </div>
      </label>

      {update.isError ? (
        <p className="text-[13px] text-destructive">
          {getApiErrorMessage(update.error)}
        </p>
      ) : null}

      <Button
        type="submit"
        size="lg"
        className="w-full"
        disabled={!isNameValid || !hasChanges || update.isPending}
      >
        {update.isPending ? <Spinner /> : null}
        Saqlash
      </Button>
    </form>
  );
}
