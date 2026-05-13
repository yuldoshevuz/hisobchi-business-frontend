import { Users } from 'lucide-react';
import { SelectField } from './form-primitives';
import type { Member } from '@/types/member.types';

interface MemberPickerFieldProps {
  id: string;
  label: React.ReactNode;
  value: number | null | '';
  onChange: (next: number | null) => void;
  members: readonly Member[];
  helperText?: string;
  errorText?: string;
  disabled?: boolean;
  modalTitle?: React.ReactNode;
  emptyText?: string;
  clearable?: boolean;
  /** Inline-create on miss: parent receives the typed name and is expected
   *  to call `POST /members` (name-only is fine — phone stays null until
   *  the owner backfills it). Selecting the new id should be done by the
   *  parent after the API call resolves. */
  onCreate?: (text: string) => void | Promise<void>;
  creating?: boolean;
}

/**
 * Picker for an OrganizationMember. Mirrors `ContactPickerField`'s
 * affordances (search, clear, optional inline-create) but renders the
 * staff metadata — name, phone — and skips the contact-type filter
 * because members don't have one.
 */
export function MemberPickerField({
  id,
  label,
  value,
  onChange,
  members,
  helperText,
  errorText,
  disabled,
  modalTitle,
  emptyText,
  clearable = false,
  onCreate,
  creating = false,
}: MemberPickerFieldProps): React.ReactElement {
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
      emptyText={emptyText}
      clearable={clearable}
      searchThreshold={4}
      onCreate={onCreate}
      creating={creating}
      options={members.map((m) => ({
        value: m.id,
        label: m.name,
        description: m.phone ?? undefined,
        icon: Users,
      }))}
    />
  );
}
