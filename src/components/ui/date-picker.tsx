import { useState } from 'react';
import { Calendar as CalendarIcon, X } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { cn } from '@/lib/utils';
import { tgHapticImpact } from '@/lib/telegram';

interface DatePickerProps {
  id?: string;
  /** ISO `YYYY-MM-DD`. Empty string is the "not picked" state. */
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  disabled?: boolean;
  /** Show a clear (×) button inside the trigger when a value is set. */
  clearable?: boolean;
  /** Modal title; defaults to "Sana tanlash". */
  modalTitle?: React.ReactNode;
  /** Inclusive lower / upper bounds (`YYYY-MM-DD`). */
  min?: string;
  max?: string;
  className?: string;
}

const MONTHS_UZ_SHORT = [
  'Yan',
  'Fev',
  'Mar',
  'Apr',
  'May',
  'Iyn',
  'Iyl',
  'Avg',
  'Sen',
  'Okt',
  'Noy',
  'Dek',
] as const;

/**
 * Drop-in replacement for `<Input type="date">`. The trigger is styled like
 * the rest of the app's pickers (matches `Input` height + border) and opens
 * a custom calendar in a bottom-sheet modal — no native browser picker, no
 * iOS/Android wheel inconsistency, and the same brand-tinted hover/focus as
 * every other form control.
 *
 * Two practical reasons we shipped a custom one instead of leaning on the
 * native `<input type="date">`:
 *   1. The native picker on Telegram WebApp's iOS skin can't be styled and
 *      ignores `accent-color`, leaving a very out-of-place blue widget.
 *   2. Multi-locale month names ("Yanvar/Fevral/...") aren't available on
 *      every browser, and we want the same UX everywhere.
 */
export function DatePicker({
  id,
  value,
  onChange,
  placeholder = 'Sana tanlang',
  disabled,
  clearable = false,
  modalTitle = 'Sana tanlash',
  min,
  max,
  className,
}: DatePickerProps): React.ReactElement {
  const [open, setOpen] = useState<boolean>(false);

  function setToday(): void {
    const today = isoToday();
    if ((min && today < min) || (max && today > max)) return;
    tgHapticImpact('light');
    onChange(today);
    setOpen(false);
  }

  function handlePick(next: string): void {
    tgHapticImpact('light');
    onChange(next);
    setOpen(false);
  }

  function handleClear(e: React.MouseEvent): void {
    e.stopPropagation();
    tgHapticImpact('light');
    onChange('');
  }

  return (
    <>
      <button
        id={id}
        type="button"
        disabled={disabled}
        onClick={() => {
          tgHapticImpact('light');
          setOpen(true);
        }}
        className={cn(
          'press flex h-10 w-full items-center justify-between gap-2 rounded-md border border-input bg-card px-3 text-left text-base text-foreground transition-colors hover:border-primary focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-input',
          className,
        )}
      >
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <CalendarIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span
            className={cn(
              'min-w-0 flex-1 truncate',
              value ? 'text-foreground' : 'text-muted-foreground',
            )}
          >
            {value ? formatDisplay(value) : placeholder}
          </span>
        </div>
        {clearable && value ? (
          <span
            role="button"
            aria-label="Sanani tozalash"
            onClick={handleClear}
            className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:bg-accent"
          >
            <X className="h-3.5 w-3.5" />
          </span>
        ) : null}
      </button>

      <Modal open={open} onOpenChange={setOpen} title={modalTitle}>
        <div className="space-y-4">
          <Calendar
            value={value || null}
            onChange={handlePick}
            min={min}
            max={max}
          />
          <div className="flex gap-2">
            <Button
              type="button"
              variant="ghost"
              size="lg"
              className="flex-1"
              onClick={setToday}
            >
              Bugun
            </Button>
            {clearable && value ? (
              <Button
                type="button"
                variant="ghost"
                size="lg"
                className="flex-1"
                onClick={() => {
                  tgHapticImpact('light');
                  onChange('');
                  setOpen(false);
                }}
              >
                Tozalash
              </Button>
            ) : null}
          </div>
        </div>
      </Modal>
    </>
  );
}

function formatDisplay(iso: string): string {
  const [y, m, d] = iso.split('-').map((p) => Number(p));
  if (!y || !m || !d) return iso;
  return `${d.toString().padStart(2, '0')} ${MONTHS_UZ_SHORT[m - 1]} ${y}`;
}

function isoToday(): string {
  const now = new Date();
  const y = now.getFullYear().toString().padStart(4, '0');
  const mo = (now.getMonth() + 1).toString().padStart(2, '0');
  const d = now.getDate().toString().padStart(2, '0');
  return `${y}-${mo}-${d}`;
}
