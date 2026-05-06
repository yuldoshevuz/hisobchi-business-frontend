import { useCallback, useState } from 'react';
import { useUpdateContact } from '@/api/hooks/use-contacts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { getApiErrorMessage } from '@/lib/api-error';
import { tgHapticImpact, tgHapticNotify } from '@/lib/telegram';
import {
  CONTACT_NAME_MAX_LENGTH,
  CONTACT_NAME_MIN_LENGTH,
  CONTACT_NOTES_MAX_LENGTH,
  CONTACT_TYPE_VALUES,
  type Contact,
  type ContactType,
  type UpdateContactRequest,
} from '@/types/contact.types';
import {
  CONTACT_TYPE_ICON,
  CONTACT_TYPE_LABEL,
  CONTACT_TYPE_NONE_ICON,
  CONTACT_TYPE_NONE_LABEL,
} from './contact-meta';

interface EditContactFormProps {
  contact: Contact;
  onClose: () => void;
}

export function EditContactForm({
  contact,
  onClose,
}: EditContactFormProps): React.ReactElement {
  const update = useUpdateContact();
  const [name, setName] = useState<string>(contact.name);
  const [type, setType] = useState<ContactType | null>(contact.type);
  const [phone, setPhone] = useState<string>(contact.phone ?? '');
  const [creditLimit, setCreditLimit] = useState<string>(
    contact.creditLimit ?? '',
  );
  const [notes, setNotes] = useState<string>(contact.notes ?? '');

  const trimmedName = name.trim();
  const isValid =
    trimmedName.length >= CONTACT_NAME_MIN_LENGTH &&
    trimmedName.length <= CONTACT_NAME_MAX_LENGTH;

  const trimmedPhone = phone.trim();
  const trimmedLimit = creditLimit.trim();
  const trimmedNotes = notes.trim();
  const initialPhone = contact.phone ?? '';
  const initialLimit = contact.creditLimit ?? '';
  const initialNotes = contact.notes ?? '';

  const hasChanges =
    trimmedName !== contact.name ||
    type !== contact.type ||
    trimmedPhone !== initialPhone ||
    trimmedLimit !== initialLimit ||
    trimmedNotes !== initialNotes;

  const submit = useCallback((): void => {
    if (!isValid || !hasChanges) return;
    const body: UpdateContactRequest = {};
    if (trimmedName !== contact.name) body.name = trimmedName;
    if (type !== contact.type) body.type = type;
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
      { id: contact.id, body },
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
    contact.id,
    contact.name,
    contact.type,
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
        <Label htmlFor="edit-contact-name">Nom</Label>
        <Input
          id="edit-contact-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={CONTACT_NAME_MAX_LENGTH}
          required
          autoFocus
        />
      </div>

      <div className="space-y-1.5">
        <Label>Turi</Label>
        <div className="grid grid-cols-2 gap-2">
          {CONTACT_TYPE_VALUES.map((t) => {
            const Icon = CONTACT_TYPE_ICON[t];
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
                <span className="truncate">{CONTACT_TYPE_LABEL[t]}</span>
              </button>
            );
          })}
          <button
            key="none"
            type="button"
            onClick={() => {
              tgHapticImpact('light');
              setType(null);
            }}
            className={`press flex flex-col items-center gap-1 rounded-xl border px-2 py-3 text-[12px] ${
              type === null
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border bg-card text-foreground'
            }`}
          >
            <CONTACT_TYPE_NONE_ICON className="h-4 w-4" />
            <span className="truncate">{CONTACT_TYPE_NONE_LABEL}</span>
          </button>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="edit-contact-phone">Telefon</Label>
        <Input
          id="edit-contact-phone"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+998901234567"
          inputMode="tel"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="edit-contact-credit">Kredit limiti</Label>
        <Input
          id="edit-contact-credit"
          value={creditLimit}
          onChange={(e) => setCreditLimit(e.target.value)}
          placeholder="5000000"
          inputMode="decimal"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="edit-contact-notes">Eslatma</Label>
        <textarea
          id="edit-contact-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          maxLength={CONTACT_NOTES_MAX_LENGTH}
          rows={3}
          className="flex min-h-[80px] w-full rounded-xl border border-input bg-card px-3 py-2 text-[15px] text-foreground placeholder:text-muted-foreground transition-colors hover:border-primary focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
