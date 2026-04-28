import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { formatAmount, unformatAmount } from './form-utils';

interface SelectFieldProps {
  id: string;
  label: React.ReactNode;
  /** `null` (or empty string) means no selection. */
  value: number | null | '';
  onChange: (next: number | null) => void;
  options: Array<{ value: number; label: string; disabled?: boolean }>;
  placeholder?: string;
  disabled?: boolean;
  helperText?: string;
  errorText?: string;
}

/**
 * Number-id select. Every dropdown in the create flow chooses an entity by
 * primary key (`number`), so the simpler non-generic API avoids the TS
 * inference pitfalls that come with `T extends string | number`.
 */
export function SelectField({
  id,
  label,
  value,
  onChange,
  options,
  placeholder = 'Tanlang...',
  disabled,
  helperText,
  errorText,
}: SelectFieldProps): React.ReactElement {
  const stringValue = value === null || value === '' ? '' : String(value);
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <select
        id={id}
        value={stringValue}
        onChange={(e) => {
          const raw = e.target.value;
          onChange(raw === '' ? null : Number(raw));
        }}
        disabled={disabled}
        className="flex h-10 w-full rounded-md border border-input bg-card px-3 text-base text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
      >
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value} disabled={o.disabled}>
            {o.label}
          </option>
        ))}
      </select>
      {errorText ? (
        <p className="text-[12px] text-destructive">{errorText}</p>
      ) : helperText ? (
        <p className="text-[12px] text-muted-foreground">{helperText}</p>
      ) : null}
    </div>
  );
}

interface AmountFieldProps {
  id: string;
  label?: string;
  value: string;
  onChange: (next: string) => void;
  currencyDisplay?: string;
  placeholder?: string;
  autoFocus?: boolean;
}

export function AmountField({
  id,
  label = 'Summa',
  value,
  onChange,
  currencyDisplay,
  placeholder = '0',
  autoFocus,
}: AmountFieldProps): React.ReactElement {
  return (
    <div className="grid grid-cols-3 gap-2">
      <div className="col-span-2 space-y-1.5">
        <Label htmlFor={id}>{label}</Label>
        <Input
          id={id}
          inputMode="decimal"
          value={formatAmount(value)}
          onChange={(e) => onChange(unformatAmount(e.target.value))}
          placeholder={placeholder}
          autoFocus={autoFocus}
        />
      </div>
      <div className="space-y-1.5">
        <Label>Valyuta</Label>
        <div className="flex h-10 items-center justify-center rounded-md border border-input bg-muted/40 px-2 text-base text-muted-foreground">
          {currencyDisplay || '—'}
        </div>
      </div>
    </div>
  );
}

interface DateFieldProps {
  id: string;
  label?: string;
  value: string;
  onChange: (next: string) => void;
  helperText?: string;
}

export function DateField({
  id,
  label = 'Sana',
  value,
  onChange,
  helperText = "Tanlanmasa, hozirgi vaqt qo'yiladi",
}: DateFieldProps): React.ReactElement {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {helperText ? (
        <p className="text-[12px] text-muted-foreground">{helperText}</p>
      ) : null}
    </div>
  );
}

interface DescriptionFieldProps {
  id: string;
  value: string;
  onChange: (next: string) => void;
  label?: string;
  required?: boolean;
  placeholder?: string;
  rows?: number;
  maxLength?: number;
  helperText?: string;
}

export function DescriptionField({
  id,
  value,
  onChange,
  label = 'Izoh',
  required,
  placeholder = 'Ixtiyoriy',
  rows = 2,
  maxLength = 500,
  helperText,
}: DescriptionFieldProps): React.ReactElement {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>
        {label}
        {required ? ' *' : ''}
      </Label>
      <textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={maxLength}
        rows={rows}
        placeholder={placeholder}
        className="flex min-h-[60px] w-full rounded-xl border border-input bg-card px-3 py-2 text-[15px] text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
      {helperText ? (
        <p className="text-[12px] text-muted-foreground">{helperText}</p>
      ) : null}
    </div>
  );
}
