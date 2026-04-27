import { useCallback, useState } from 'react';
import { useUpdateClient } from '@/api/hooks/use-clients';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { getApiErrorMessage } from '@/lib/api-error';
import { tgHapticImpact, tgHapticNotify } from '@/lib/telegram';
import {
  CLIENT_NAME_MAX_LENGTH,
  CLIENT_NAME_MIN_LENGTH,
  CLIENT_NOTES_MAX_LENGTH,
  CLIENT_TYPE_VALUES,
  type Client,
  type ClientType,
  type UpdateClientRequest,
} from '@/types/client.types';
import { CLIENT_TYPE_ICON, CLIENT_TYPE_LABEL } from './client-meta';

interface EditClientFormProps {
  client: Client;
  onClose: () => void;
}

export function EditClientForm({
  client,
  onClose,
}: EditClientFormProps): React.ReactElement {
  const update = useUpdateClient();
  const [name, setName] = useState<string>(client.name);
  const [type, setType] = useState<ClientType>(client.type);
  const [phone, setPhone] = useState<string>(client.phone ?? '');
  const [creditLimit, setCreditLimit] = useState<string>(
    client.creditLimit ?? '',
  );
  const [notes, setNotes] = useState<string>(client.notes ?? '');

  const trimmedName = name.trim();
  const isValid =
    trimmedName.length >= CLIENT_NAME_MIN_LENGTH &&
    trimmedName.length <= CLIENT_NAME_MAX_LENGTH;

  const trimmedPhone = phone.trim();
  const trimmedLimit = creditLimit.trim();
  const trimmedNotes = notes.trim();
  const initialPhone = client.phone ?? '';
  const initialLimit = client.creditLimit ?? '';
  const initialNotes = client.notes ?? '';

  const hasChanges =
    trimmedName !== client.name ||
    type !== client.type ||
    trimmedPhone !== initialPhone ||
    trimmedLimit !== initialLimit ||
    trimmedNotes !== initialNotes;

  const submit = useCallback((): void => {
    if (!isValid || !hasChanges) return;
    const body: UpdateClientRequest = {};
    if (trimmedName !== client.name) body.name = trimmedName;
    if (type !== client.type) body.type = type;
    if (trimmedPhone !== initialPhone) {
      body.phone = trimmedPhone === '' ? null : trimmedPhone;
    }
    if (trimmedLimit !== initialLimit) {
      body.creditLimit = trimmedLimit === '' ? null : trimmedLimit;
    }
    if (trimmedNotes !== initialNotes) {
      body.notes = trimmedNotes === '' ? null : trimmedNotes;
    }
    update.mutate(
      { id: client.id, body },
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
    client.id,
    client.name,
    client.type,
    initialPhone,
    initialLimit,
    initialNotes,
    trimmedName,
    type,
    trimmedPhone,
    trimmedLimit,
    trimmedNotes,
    isValid,
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
        <Label htmlFor="edit-client-name">Nom</Label>
        <Input
          id="edit-client-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={CLIENT_NAME_MAX_LENGTH}
          required
          autoFocus
        />
      </div>

      <div className="space-y-1.5">
        <Label>Turi</Label>
        <div className="grid grid-cols-3 gap-2">
          {CLIENT_TYPE_VALUES.map((t) => {
            const Icon = CLIENT_TYPE_ICON[t];
            const selected = type === t;
            return (
              <button
                key={t}
                type="button"
                onClick={() => {
                  tgHapticImpact('light');
                  setType(t);
                }}
                className={`press flex flex-col items-center gap-1 rounded-xl border px-2 py-3 text-[12px] ${
                  selected
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-card text-foreground'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="truncate">{CLIENT_TYPE_LABEL[t]}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="edit-client-phone">Telefon</Label>
        <Input
          id="edit-client-phone"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+998901234567"
          inputMode="tel"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="edit-client-credit">Kredit limiti</Label>
        <Input
          id="edit-client-credit"
          value={creditLimit}
          onChange={(e) => setCreditLimit(e.target.value)}
          placeholder="5000000"
          inputMode="decimal"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="edit-client-notes">Eslatma</Label>
        <textarea
          id="edit-client-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          maxLength={CLIENT_NOTES_MAX_LENGTH}
          rows={3}
          className="flex min-h-[80px] w-full rounded-xl border border-input bg-card px-3 py-2 text-[15px] text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      {update.isError ? (
        <p className="text-[13px] text-destructive">
          {getApiErrorMessage(update.error)}
        </p>
      ) : null}

      <Button
        type="submit"
        size="lg"
        className="w-full"
        disabled={!isValid || !hasChanges || update.isPending}
      >
        {update.isPending ? <Spinner /> : null}
        Saqlash
      </Button>
    </form>
  );
}
