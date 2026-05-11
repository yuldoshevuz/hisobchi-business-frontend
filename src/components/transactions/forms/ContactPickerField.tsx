import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, SlidersHorizontal, Users } from 'lucide-react';
import {
  CONTACT_TYPE_ICON,
  CONTACT_TYPE_LABEL,
  CONTACT_TYPE_NONE_ICON,
  getContactTypeNoneLabel,
  getContactTypeIcon,
  getContactTypeLabel,
} from '@/components/contacts/contact-meta';
import { Modal } from '@/components/ui/modal';
import { cn } from '@/lib/utils';
import { tgHapticImpact } from '@/lib/telegram';
import {
  CONTACT_TYPE_NONE,
  CONTACT_TYPE_VALUES,
  type Contact,
  type ContactTypeFilter,
} from '@/types/contact.types';
import { SelectField } from './form-primitives';

type TypeFilter = ContactTypeFilter | 'all';

interface ContactPickerFieldProps {
  id: string;
  label: React.ReactNode;
  value: number | null | '';
  onChange: (next: number | null) => void;
  contacts: readonly Contact[];
  helperText?: string;
  errorText?: string;
  disabled?: boolean;
  /** Modal title override; defaults to `label`. */
  modalTitle?: React.ReactNode;
  /**
   * Pre-set the type filter so the picker opens already narrowed to one
   * type. The user can still flip back to "Hammasi" or another type.
   */
  defaultTypeFilter?: TypeFilter;
  emptyText?: string;
}

/**
 * Specialised wrapper around `SelectField` for the contact picker. Adds:
 *   • per-type icon + subtitle inside each option,
 *   • a compact 40×40 filter trigger inside the modal's search row that
 *     opens a sheet listing the type options (Hammasi / Mijoz / Yetkazib
 *     beruvchi / Hamkor),
 *   • client-side filtering so the parent doesn't have to re-fetch.
 *
 * Each form keeps full control over `value` / `onChange` / labelling — only
 * the picker chrome and option mapping are encapsulated here.
 */
export function ContactPickerField({
  id,
  label,
  value,
  onChange,
  contacts,
  helperText,
  errorText,
  disabled,
  modalTitle,
  defaultTypeFilter = 'all',
  emptyText,
}: ContactPickerFieldProps): React.ReactElement {
  const { t } = useTranslation();
  const [typeFilter, setTypeFilter] = useState<TypeFilter>(defaultTypeFilter);

  const filtered =
    typeFilter === 'all'
      ? contacts
      : typeFilter === CONTACT_TYPE_NONE
        ? contacts.filter((c) => c.type === null)
        : contacts.filter((c) => c.type === typeFilter);

  const computedEmpty =
    emptyText ??
    (typeFilter === 'all'
      ? t('contact_picker.empty')
      : t('contact_picker.empty_for_type', {
          type:
            typeFilter === CONTACT_TYPE_NONE
              ? getContactTypeNoneLabel()
              : CONTACT_TYPE_LABEL[typeFilter],
        }));

  return (
    <SelectField
      id={id}
      label={label}
      value={value}
      onChange={onChange}
      disabled={disabled}
      helperText={helperText}
      errorText={errorText}
      modalTitle={modalTitle}
      emptyText={computedEmpty}
      // The search threshold is intentionally low so users with even a small
      // address book can still narrow by name.
      searchThreshold={4}
      searchSlot={
        <TypeFilterButton value={typeFilter} onChange={setTypeFilter} />
      }
      options={filtered.map((c) => ({
        value: c.id,
        label: c.name,
        description: getContactTypeLabel(c.type),
        icon: getContactTypeIcon(c.type),
      }))}
    />
  );
}

interface TypeFilterButtonProps {
  value: TypeFilter;
  onChange: (next: TypeFilter) => void;
}

function TypeFilterButton({
  value,
  onChange,
}: TypeFilterButtonProps): React.ReactElement {
  const { t } = useTranslation();
  const [open, setOpen] = useState<boolean>(false);
  const isFiltered = value !== 'all';
  const TriggerIcon =
    !isFiltered
      ? SlidersHorizontal
      : value === CONTACT_TYPE_NONE
        ? CONTACT_TYPE_NONE_ICON
        : CONTACT_TYPE_ICON[value];

  function handleSelect(next: TypeFilter): void {
    tgHapticImpact('light');
    onChange(next);
    setOpen(false);
  }

  return (
    <>
      <button
        type="button"
        aria-label={t('contact_picker.filter_by_type')}
        aria-pressed={isFiltered}
        onClick={() => {
          tgHapticImpact('light');
          setOpen(true);
        }}
        className={cn(
          'press flex h-10 w-10 shrink-0 items-center justify-center rounded-md border transition-colors',
          isFiltered
            ? 'border-primary bg-primary/10 text-primary'
            : 'border-input bg-card text-foreground hover:border-primary',
        )}
      >
        <TriggerIcon className="h-4 w-4" />
      </button>

      <Modal open={open} onOpenChange={setOpen} title={t('contact_picker.filter_by_type')}>
        <div className="-mx-4 divide-y divide-border bg-card">
          {(
            ['all', ...CONTACT_TYPE_VALUES, CONTACT_TYPE_NONE] as TypeFilter[]
          ).map((key) => {
            const active = value === key;
            const Icon =
              key === 'all'
                ? Users
                : key === CONTACT_TYPE_NONE
                  ? CONTACT_TYPE_NONE_ICON
                  : CONTACT_TYPE_ICON[key];
            const labelText =
              key === 'all'
                ? t('contact_picker.all')
                : key === CONTACT_TYPE_NONE
                  ? getContactTypeNoneLabel()
                  : CONTACT_TYPE_LABEL[key];
            return (
              <button
                key={key}
                type="button"
                onClick={() => handleSelect(key)}
                className="press flex w-full items-center gap-3 px-4 py-3 text-left active:bg-accent"
              >
                <div
                  className={cn(
                    'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
                    active
                      ? 'bg-primary/10 text-primary'
                      : 'bg-muted text-muted-foreground',
                  )}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <span
                  className={cn(
                    'flex-1 text-[15px]',
                    active ? 'font-semibold text-primary' : 'text-foreground',
                  )}
                >
                  {labelText}
                </span>
                {active ? (
                  <Check className="h-4 w-4 shrink-0 text-primary" />
                ) : null}
              </button>
            );
          })}
        </div>
      </Modal>
    </>
  );
}
