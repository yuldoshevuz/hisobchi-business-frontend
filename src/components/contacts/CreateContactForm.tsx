import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useCreateContact } from '@/api/hooks/use-contacts';
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
  type ContactType,
} from '@/types/contact.types';
import {
  CONTACT_TYPE_ICON,
  CONTACT_TYPE_NONE_ICON,
  getContactTypeLabel,
  getContactTypeNoneLabel,
} from './contact-meta';

interface CreateContactFormProps {
  onClose: () => void;
  /**
   * Pre-fill values from a deeplink (AI "yangi kontakt" intent). When
   * omitted the form starts blank with `type=customer` selected.
   */
  initialValues?: {
    name?: string;
    phone?: string;
    type?: ContactType | null;
    notes?: string;
  };
}

export function CreateContactForm({
  onClose,
  initialValues,
}: CreateContactFormProps): React.ReactElement {
  const { t } = useTranslation();
  const create = useCreateContact();
  const [name, setName] = useState<string>(initialValues?.name ?? '');
  const [type, setType] = useState<ContactType | null>(
    initialValues?.type !== undefined ? initialValues.type : 'customer',
  );
  const [phone, setPhone] = useState<string>(initialValues?.phone ?? '');
  const [creditLimit, setCreditLimit] = useState<string>('');
  const [notes, setNotes] = useState<string>(initialValues?.notes ?? '');

  const trimmedName = name.trim();
  const isValid =
    trimmedName.length >= CONTACT_NAME_MIN_LENGTH &&
    trimmedName.length <= CONTACT_NAME_MAX_LENGTH;

  const submit = useCallback((): void => {
    if (!isValid) return;
    const trimmedPhone = phone.trim();
    const trimmedLimit = creditLimit.trim();
    const trimmedNotes = notes.trim();
    create.mutate(
      {
        name: trimmedName,
        type: type ?? null,
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
        <Label htmlFor="contact-name">{t('create_contact.name')}</Label>
        <Input
          id="contact-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('create_contact.name_placeholder')}
          maxLength={CONTACT_NAME_MAX_LENGTH}
          required
          autoFocus
        />
      </div>

      <div className="space-y-1.5">
        <Label>{t('create_contact.type')}</Label>
        <div className="grid grid-cols-2 gap-2">
          {CONTACT_TYPE_VALUES.map((tValue) => {
            const Icon = CONTACT_TYPE_ICON[tValue];
            const selected = type === tValue;
            return (
              <button
                key={tValue}
                type="button"
                onClick={() => {
                  tgHapticImpact('light');
                  setType(tValue);
                }}
                className={`press flex flex-col items-center gap-1 rounded-xl border px-2 py-3 text-[12px] ${
                  selected
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-card text-foreground'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="truncate">{getContactTypeLabel(tValue)}</span>
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
            <span className="truncate">{getContactTypeNoneLabel()}</span>
          </button>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="contact-phone">{t('create_contact.phone')}</Label>
        <Input
          id="contact-phone"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder={t('create_contact.phone_placeholder')}
          inputMode="tel"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="contact-credit">
          {t('create_contact.credit_limit')}
        </Label>
        <Input
          id="contact-credit"
          value={creditLimit}
          onChange={(e) => setCreditLimit(e.target.value)}
          placeholder={t('create_contact.credit_limit_placeholder')}
          inputMode="decimal"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="contact-notes">{t('create_contact.notes')}</Label>
        <textarea
          id="contact-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          maxLength={CONTACT_NOTES_MAX_LENGTH}
          rows={3}
          placeholder={t('create_contact.notes_placeholder')}
          className="flex min-h-[80px] w-full rounded-xl border border-input bg-card px-3 py-2 text-[15px] text-foreground placeholder:text-muted-foreground transition-colors hover:border-primary focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
        {t('common.save')}
      </Button>
    </form>
  );
}
