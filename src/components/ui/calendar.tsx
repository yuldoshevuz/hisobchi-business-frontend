import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CalendarProps {
  /** ISO `YYYY-MM-DD` or `null` when nothing is picked. */
  value: string | null;
  onChange: (next: string) => void;
  /** Initial month displayed when `value` is null. Defaults to today. */
  initialMonth?: Date;
  /** Inclusive lower bound (`YYYY-MM-DD`). */
  min?: string;
  /** Inclusive upper bound (`YYYY-MM-DD`). */
  max?: string;
}

/**
 * Self-contained month-grid calendar — no external deps. The locale is fixed
 * to Uzbek (Mon-first weeks, "Yanvar/Fevral/..." month names) since the app
 * is single-locale UI today; switch the constants up top if that changes.
 *
 * Date math runs in UTC to keep the rendered grid stable across timezones —
 * a calendar cell labelled "5" must always emit `YYYY-MM-05`, never the
 * day-before/after when the user's clock is in a non-UTC zone.
 */
export function Calendar({
  value,
  onChange,
  initialMonth,
  min,
  max,
}: CalendarProps): React.ReactElement {
  const { t } = useTranslation();
  const weekdays = t('calendar.weekdays', { returnObjects: true }) as string[];
  const monthsLong = t('calendar.months_long', {
    returnObjects: true,
  }) as string[];
  const seed = value ? parseIso(value) : (initialMonth ?? new Date());
  const [view, setView] = useState<{ year: number; month: number }>({
    year: seed.getUTCFullYear(),
    month: seed.getUTCMonth(),
  });

  const cells = useMemo(() => buildGrid(view.year, view.month), [view]);
  const today = formatIso(new Date());

  function shiftMonth(delta: number): void {
    setView((prev) => {
      const next = new Date(Date.UTC(prev.year, prev.month + delta, 1));
      return { year: next.getUTCFullYear(), month: next.getUTCMonth() };
    });
  }

  function isDisabled(iso: string): boolean {
    if (min && iso < min) return true;
    if (max && iso > max) return true;
    return false;
  }

  return (
    <div className="select-none space-y-3">
      <div className="flex items-center justify-between">
        <button
          type="button"
          aria-label={t('calendar.prev_month_aria')}
          onClick={() => shiftMonth(-1)}
          className="press flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-accent"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="text-[15px] font-medium tabular-nums">
          {monthsLong[view.month]} {view.year}
        </div>
        <button
          type="button"
          aria-label={t('calendar.next_month_aria')}
          onClick={() => shiftMonth(1)}
          className="press flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-accent"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-muted-foreground">
        {weekdays.map((d) => (
          <div key={d} className="py-1">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((cell) => {
          const iso = cell.iso;
          const isSelected = value === iso;
          const isToday = iso === today;
          const disabled = isDisabled(iso);
          return (
            <button
              key={iso}
              type="button"
              disabled={disabled}
              onClick={() => onChange(iso)}
              className={cn(
                'press flex h-9 w-full items-center justify-center rounded-md text-[14px] tabular-nums transition-colors',
                disabled && 'cursor-not-allowed opacity-30',
                !isSelected && cell.outside && 'text-muted-foreground/50',
                !isSelected && !cell.outside && 'text-foreground hover:bg-accent',
                isToday && !isSelected && 'border border-primary',
                isSelected && 'bg-primary text-primary-foreground',
              )}
            >
              {cell.day}
            </button>
          );
        })}
      </div>
    </div>
  );
}

interface GridCell {
  iso: string;
  day: number;
  outside: boolean;
}

/**
 * Builds a 6×7 grid that always shows the entire month plus leading/trailing
 * days needed to fill out the weeks. Mon-first to match Uzbek convention.
 */
function buildGrid(year: number, month: number): GridCell[] {
  const firstDay = new Date(Date.UTC(year, month, 1));
  // Convert JS sun-first weekday (0=Sun) to mon-first (0=Mon).
  const lead = (firstDay.getUTCDay() + 6) % 7;
  const start = new Date(Date.UTC(year, month, 1 - lead));

  const cells: GridCell[] = [];
  for (let i = 0; i < 42; i += 1) {
    const d = new Date(Date.UTC(year, month, 1 - lead + i));
    cells.push({
      iso: formatIso(d),
      day: d.getUTCDate(),
      outside: d.getUTCMonth() !== month,
    });
  }
  void start;
  return cells;
}

function formatIso(date: Date): string {
  const y = date.getUTCFullYear().toString().padStart(4, '0');
  const m = (date.getUTCMonth() + 1).toString().padStart(2, '0');
  const d = date.getUTCDate().toString().padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function parseIso(iso: string): Date {
  // ISO "YYYY-MM-DD" → UTC midnight. Avoids the local-tz parsing quirk
  // (`new Date('2026-01-01')` yields UTC, but we make it explicit anyway).
  const [y, m, d] = iso.split('-').map((p) => Number(p));
  return new Date(Date.UTC(y!, (m ?? 1) - 1, d ?? 1));
}

export { formatIso as formatCalendarIso, parseIso as parseCalendarIso };
