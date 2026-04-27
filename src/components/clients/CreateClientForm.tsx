import { useCallback, useState } from 'react';
import { useCreateClient } from '@/api/hooks/use-clients';
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
  type ClientType,
} from '@/types/client.types';
import { CLIENT_TYPE_ICON, CLIENT_TYPE_LABEL } from './client-meta';

interface CreateClientFormProps {
  onClose: () => void;
}

export function CreateClientForm({
  onClose,
}: CreateClientFormProps): React.ReactElement {
  const create = useCreateClient();
  const [name, setName] = useState<string>('');
  const [type, setType] = useState<ClientType>('CUSTOMER');
  const [phone, setPhone] = useState<string>('');
  const [creditLimit, setCreditLimit] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  const trimmedName = name.trim();
  const isValid =
    trimmedName.length >= CLIENT_NAME_MIN_LENGTH &&
    trimmedName.length <= CLIENT_NAME_MAX_LENGTH;

  const submit = useCallback((): void => {
    if (!isValid) return;
    const trimmedPhone = phone.trim();
    const trimmedLimit = creditLimit.trim();
    const trimmedNotes = notes.trim();
    create.mutate(
      {
        name: trimmedName,
        type,
        ...(trimmedPhone ? { phone: trimmedPhone } : {}),
        ...(trimmedLimit ? { creditLimit: trimmedLimit } : {}),
        ...(trimmedNotes ? { notes: trimmedNotes } : {}),
      },
      {
        onSuccess: () => {
          tgHapticNotify('success');
          onClose();
        },
        onError: () => tgHapticNotify('error'),
      },
    );
  }, [create, isValid, trimmedName, type, phone, creditLimit, notes, onClose]);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="space-y-4"
    >
      <div className="space-y-1.5">
        <Label htmlFor="client-name">Nom</Label>
        <Input
          id="client-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Hisobchi Demo LLC"
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
        <Label htmlFor="client-phone">Telefon</Label>
        <Input
          id="client-phone"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+998901234567"
          inputMode="tel"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="client-credit">Kredit limiti</Label>
        <Input
          id="client-credit"
          value={creditLimit}
          onChange={(e) => setCreditLimit(e.target.value)}
          placeholder="5000000"
          inputMode="decimal"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="client-notes">Eslatma</Label>
        <textarea
          id="client-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          maxLength={CLIENT_NOTES_MAX_LENGTH}
          rows={3}
          placeholder="Qo‘shimcha izoh"
          className="flex min-h-[80px] w-full rounded-xl border border-input bg-card px-3 py-2 text-[15px] text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
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
