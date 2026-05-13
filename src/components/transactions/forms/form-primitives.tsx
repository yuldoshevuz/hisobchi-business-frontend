import { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, ChevronDown, Plus, X, type LucideIcon } from 'lucide-react';
import { DatePicker } from '@/components/ui/date-picker';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Modal } from '@/components/ui/modal';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import { tgHapticImpact } from '@/lib/telegram';
import { formatAmount, unformatAmount } from './form-utils';

/** Optional leading visual for an option. Either a Lucide icon component or
 * any drop-in equivalent that accepts a `className`. When provided, it shows
 * in the modal row AND in the trigger button when the option is selected. */
type SelectIcon =
  | LucideIcon
  | React.ComponentType<{ className?: string }>;

export interface SelectOption<T extends string | number> {
  value: T;
  label: string;
  description?: string;
  disabled?: boolean;
  /**
   * Small inline icon component (Lucide-shaped). When set, the framework
   * wraps it in a 9×9 muted bg in the modal row and renders it inline in the
   * trigger pill.
   */
  icon?: SelectIcon;
  /**
   * Pre-rendered icon node — useful when the option's visual already supplies
   * its own sizing/background (e.g. CategoryIcon). When set, takes precedence
   * over `icon` and is rendered as-is in BOTH the trigger and the modal row.
   */
  iconNode?: React.ReactNode;
}

interface SelectFieldProps<T extends string | number> {
  id: string;
  label: React.ReactNode;
  /** `null` (or empty string) means no selection. */
  value: T | null | '';
  onChange: (next: T | null) => void;
  options: SelectOption<T>[];
  placeholder?: string;
  disabled?: boolean;
  helperText?: string;
  errorText?: string;
  /** Modal title override; defaults to the field's `label`. */
  modalTitle?: React.ReactNode;
  /** Show a search input above the list when options.length >= this. */
  searchThreshold?: number;
  /**
   * Render text shown when no options are available. Defaults to a generic
   * "ro'yxat bo'sh" message.
   */
  emptyText?: string;
  /**
   * Optional node rendered to the right of the modal's search input — used
   * for compact filters (e.g. a type-filter button for the contact picker).
   * Forces the search row to render even below `searchThreshold` so the slot
   * is always reachable.
   */
  searchSlot?: React.ReactNode;
  /**
   * When `true`, lets the user clear the current selection — an inline ✕
   * appears in the trigger pill and a "Clear" row anchors the top of the
   * modal list. Use it for optional fields (category, contact, default
   * account) so a stray pick can be reverted without re-loading the form.
   */
  clearable?: boolean;
  /**
   * Optional "create on miss" hook. When set, a `+ Yangi qo'sh: <search>`
   * row is rendered as the LAST item in the modal's option list whenever
   * the user has typed a non-empty search term that doesn't match any
   * existing option verbatim. The parent owns the actual API call —
   * SelectField just relays the trimmed search text and closes the modal
   * after the callback resolves.
   */
  onCreate?: (text: string) => void | Promise<void>;
  /** Label generator for the inline-create row. */
  createLabel?: (text: string) => string;
  /** Disable the create CTA while the parent is mid-mutation. */
  creating?: boolean;
}

/**
 * Generic ID select. Tapping the field opens a bottom-sheet modal with the
 * options as a tappable list — replaces the native `<select>` so the picker
 * matches the rest of the app's mobile-first chrome (large hit targets,
 * sticky search, multi-line option rows). The generic value type lets the
 * same component back number-keyed entity pickers (accounts, products, …)
 * and string-keyed pickers like the merged-category ref.
 */
export function SelectField<T extends string | number>({
  id,
  label,
  value,
  onChange,
  options,
  placeholder,
  disabled,
  helperText,
  errorText,
  modalTitle,
  searchThreshold = 8,
  emptyText,
  searchSlot,
  clearable = false,
  onCreate,
  createLabel,
  creating = false,
}: SelectFieldProps<T>): React.ReactElement {
  const { t } = useTranslation();
  const [open, setOpen] = useState<boolean>(false);
  const [search, setSearch] = useState<string>('');

  const normalizedValue: T | null = value === '' ? null : value;
  const selected = useMemo(
    () =>
      normalizedValue === null
        ? null
        : (options.find((o) => o.value === normalizedValue) ?? null),
    [options, normalizedValue],
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (term === '') return options;
    return options.filter((o) => o.label.toLowerCase().includes(term));
  }, [options, search]);

  const trimmedSearch = search.trim();
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  // The create CTA is always visible when the parent wired up `onCreate`.
  // Two states:
  //   - empty / too-short search → static "+ Yangi qo'sh" pill; clicking
  //     it focuses the search input so the user can type the name
  //     without leaving the picker.
  //   - 2+ char search → "+ Yangi qo'sh: <text>" pill that creates
  //     immediately on tap. We DON'T hide it on exact-match anymore —
  //     the parent may genuinely want a same-named duplicate (e.g.
  //     two employees both called "Aziz") and the picker shouldn't
  //     second-guess that.
  const showCreateCta = onCreate !== undefined;
  const canCreateNow = onCreate !== undefined && trimmedSearch.length >= 2;

  async function handleCreate(): Promise<void> {
    if (!onCreate) return;
    if (trimmedSearch.length < 2) {
      // Empty / too-short: redirect to the search input so the user
      // can type a name without an extra modal layer.
      searchInputRef.current?.focus();
      return;
    }
    tgHapticImpact('light');
    await onCreate(trimmedSearch);
    setOpen(false);
    setSearch('');
  }

  // Forcing the search row when a `searchSlot` or an `onCreate` hook is
  // provided keeps both slots reachable on tiny lists too (otherwise the
  // user couldn't see the inline-create affordance under
  // `searchThreshold` options, and the "type to create" loop would
  // silently break).
  const showSearch =
    options.length >= searchThreshold ||
    searchSlot !== undefined ||
    onCreate !== undefined;

  function pick(next: SelectOption<T>): void {
    if (next.disabled) return;
    tgHapticImpact('light');
    onChange(next.value);
    setOpen(false);
    setSearch('');
  }

  function clearSelection(): void {
    tgHapticImpact('light');
    onChange(null);
    setOpen(false);
    setSearch('');
  }

  function handleOpenChange(nextOpen: boolean): void {
    setOpen(nextOpen);
    if (!nextOpen) setSearch('');
  }

  const showInlineClear = clearable && normalizedValue !== null && !disabled;

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <button
        id={id}
        type="button"
        disabled={disabled}
        onClick={() => {
          tgHapticImpact('light');
          setOpen(true);
        }}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={cn(
          'press flex h-10 w-full items-center justify-between gap-2 rounded-md border border-input bg-card px-3 text-left text-base text-foreground transition-colors hover:border-primary focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-input',
        )}
      >
        <div className="flex min-w-0 flex-1 items-center gap-2">
          {/* The trigger pill renders only the lightweight inline `icon`
              (Lucide-shaped). `iconNode` is reserved for the modal list rows
              — it tends to be a pre-styled element (e.g. CategoryIcon's
              colored bg block) that looks heavy inside a 40px-tall pill. */}
          {selected?.icon ? (
            <selected.icon className="h-4 w-4 shrink-0 text-muted-foreground" />
          ) : null}
          <span
            className={cn(
              'min-w-0 flex-1 truncate',
              selected ? 'text-foreground' : 'text-muted-foreground',
            )}
          >
            {selected ? selected.label : (placeholder ?? t('form.select'))}
          </span>
        </div>
        {showInlineClear ? (
          <span
            role="button"
            aria-label={t('form.clear_selection')}
            onClick={(e) => {
              // Stop the outer trigger from also firing — without this the
              // clear tap would land on the button parent and open the modal
              // immediately after wiping the value, which feels wrong.
              e.stopPropagation();
              clearSelection();
            }}
            className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:bg-accent"
          >
            <X className="h-3.5 w-3.5" />
          </span>
        ) : null}
        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
      </button>

      {errorText ? (
        <p className="text-[12px] text-destructive">{errorText}</p>
      ) : helperText ? (
        <p className="text-[12px] text-muted-foreground">{helperText}</p>
      ) : null}

      <Modal
        open={open}
        onOpenChange={handleOpenChange}
        title={modalTitle ?? label}
      >
        {showSearch ? (
          <div className="flex items-center gap-2 pb-3">
            <div className="flex-1 min-w-0">
              <Input
                ref={searchInputRef}
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  // Submit on Enter when the create CTA is in
                  // "ready-to-create" state — keeps the UX one-step.
                  if (e.key === 'Enter' && canCreateNow) {
                    e.preventDefault();
                    void handleCreate();
                  }
                }}
                placeholder={
                  onCreate !== undefined
                    ? t('form.search_or_create')
                    : t('form.search')
                }
              />
            </div>
            {searchSlot}
            {showCreateCta ? (
              <button
                type="button"
                onClick={() => void handleCreate()}
                disabled={creating}
                aria-label={t('form.create_new_aria')}
                className={cn(
                  'press flex h-10 w-10 shrink-0 items-center justify-center rounded-md border transition-colors disabled:opacity-60',
                  canCreateNow
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-input bg-card text-muted-foreground hover:border-primary hover:text-primary',
                )}
              >
                {creating ? (
                  <Spinner className="h-4 w-4" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
              </button>
            ) : null}
          </div>
        ) : null}

        {clearable && normalizedValue !== null ? (
          // Anchor a "Clear" row above the list so the action stays
          // reachable even when the list is long and the inline ✕ in the
          // trigger pill has scrolled out of view behind the keyboard.
          <button
            type="button"
            onClick={clearSelection}
            className="press -mx-4 flex w-[calc(100%+2rem)] items-center gap-3 border-b border-border bg-card px-4 py-3 text-left active:bg-accent"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <X className="h-4 w-4" />
            </div>
            <span className="text-[15px] font-medium text-muted-foreground">
              {t('form.clear_selection')}
            </span>
          </button>
        ) : null}

        {options.length === 0 ? (
          <div className="py-8 text-center text-[14px] text-muted-foreground">
            {emptyText ?? t('form.no_options')}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-8 text-center text-[14px] text-muted-foreground">
            {t('common.no_results')}
          </div>
        ) : null}

        {/* Inline-create row — only shown when the user has typed a usable
            name (≥ 2 chars). Mirrors the compact `+` button in the search
            row so the action is reachable whether the user reads top-to-
            bottom or focuses on the existing options first. */}
        {canCreateNow ? (
          <button
            type="button"
            onClick={() => void handleCreate()}
            disabled={creating}
            className="press -mx-4 mb-2 flex w-[calc(100%+2rem)] items-center gap-3 border-b border-border bg-primary/5 px-4 py-2.5 text-left active:bg-primary/10 disabled:opacity-60"
          >
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Plus className="h-3.5 w-3.5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13px] font-medium text-primary">
                {createLabel
                  ? createLabel(trimmedSearch)
                  : t('form.create_new', { name: trimmedSearch })}
              </div>
            </div>
            {creating ? <Spinner className="h-4 w-4" /> : null}
          </button>
        ) : null}

        {filtered.length > 0 ? (
          <div className="-mx-4 divide-y divide-border bg-card">
            {filtered.map((o) => {
              const isSelected = o.value === normalizedValue;
              const OptionIcon = o.icon;
              return (
                <button
                  key={String(o.value)}
                  type="button"
                  onClick={() => pick(o)}
                  disabled={o.disabled}
                  className={cn(
                    'press flex w-full items-center gap-3 px-4 py-3 text-left active:bg-accent disabled:opacity-50',
                  )}
                >
                  {o.iconNode ? (
                    <span className="shrink-0">{o.iconNode}</span>
                  ) : OptionIcon ? (
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                      <OptionIcon className="h-4 w-4" />
                    </div>
                  ) : null}
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[15px] font-medium text-foreground">
                      {o.label}
                    </div>
                    {o.description ? (
                      <div className="mt-0.5 truncate text-[12px] text-muted-foreground">
                        {o.description}
                      </div>
                    ) : null}
                  </div>
                  {isSelected ? (
                    <Check className="h-4 w-4 shrink-0 text-primary" />
                  ) : null}
                </button>
              );
            })}
          </div>
        ) : null}
      </Modal>
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
  label,
  value,
  onChange,
  currencyDisplay,
  placeholder = '0',
  autoFocus,
}: AmountFieldProps): React.ReactElement {
  const { t } = useTranslation();
  return (
    <div className="grid grid-cols-3 gap-2">
      <div className="col-span-2 space-y-1.5">
        <Label htmlFor={id}>{label ?? t('form.amount')}</Label>
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
        <Label>{t('form.currency')}</Label>
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
  label,
  value,
  onChange,
  helperText,
}: DateFieldProps): React.ReactElement {
  const { t } = useTranslation();
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label ?? t('form.date')}</Label>
      <DatePicker id={id} value={value} onChange={onChange} clearable />
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
  label,
  required,
  placeholder,
  rows = 2,
  maxLength = 500,
  helperText,
}: DescriptionFieldProps): React.ReactElement {
  const { t } = useTranslation();
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>
        {label ?? t('form.note')}
        {required ? ' *' : ''}
      </Label>
      <textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={maxLength}
        rows={rows}
        placeholder={placeholder ?? t('form.note_placeholder')}
        className="flex min-h-[60px] w-full rounded-xl border border-input bg-card px-3 py-2 text-[15px] text-foreground placeholder:text-muted-foreground transition-colors hover:border-primary focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
      {helperText ? (
        <p className="text-[12px] text-muted-foreground">{helperText}</p>
      ) : null}
    </div>
  );
}
