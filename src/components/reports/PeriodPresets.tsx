import { DatePicker } from '@/components/ui/date-picker';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { tgHapticImpact } from '@/lib/telegram';

type PresetKey = 'this-month' | 'last-month' | 'last-30' | 'this-year';

interface PeriodPresetsProps {
  dateFrom: string;
  dateTo: string;
  onChange: (next: { dateFrom: string; dateTo: string }) => void;
}

/**
 * Date-range control shared across cash-flow + P&L. Renders four quick-pick
 * presets plus two raw date pickers — common report flow is "show me this
 * month" → glance → "now last month" rather than typing exact dates.
 *
 * Selection is computed in the user's local timezone; reports filter on
 * calendar dates so a UTC-anchored "today" would shift the boundary by 5h
 * for Asia/Tashkent users at the wrong moments. Keep this client-local.
 */
export function PeriodPresets({
  dateFrom,
  dateTo,
  onChange,
}: PeriodPresetsProps): React.ReactElement {
  const presets: ReadonlyArray<{ key: PresetKey; label: string }> = [
    { key: 'this-month', label: 'Bu oy' },
    { key: 'last-month', label: "O'tgan oy" },
    { key: 'last-30', label: '30 kun' },
    { key: 'this-year', label: 'Bu yil' },
  ];

  function applyPreset(key: PresetKey): void {
    tgHapticImpact('light');
    onChange(rangeForPreset(key));
  }

  const activePreset = matchPreset(dateFrom, dateTo);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {presets.map(({ key, label }) => {
          const active = activePreset === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => applyPreset(key)}
              className={cn(
                'press rounded-full border px-3 py-1.5 text-[13px] font-medium transition-colors',
                active
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border bg-card text-foreground hover:border-primary',
              )}
            >
              {label}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1.5">
          <Label htmlFor="period-from" className="text-[11px] uppercase tracking-wide text-muted-foreground">
            Boshlanish
          </Label>
          <DatePicker
            id="period-from"
            value={dateFrom}
            onChange={(next) => onChange({ dateFrom: next, dateTo })}
            max={dateTo}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="period-to" className="text-[11px] uppercase tracking-wide text-muted-foreground">
            Tugash
          </Label>
          <DatePicker
            id="period-to"
            value={dateTo}
            onChange={(next) => onChange({ dateFrom, dateTo: next })}
            min={dateFrom}
          />
        </div>
      </div>
    </div>
  );
}

export function rangeForPreset(key: PresetKey): {
  dateFrom: string;
  dateTo: string;
} {
  const now = new Date();
  const today = startOfDay(now);
  switch (key) {
    case 'this-month': {
      const from = new Date(now.getFullYear(), now.getMonth(), 1);
      return { dateFrom: formatDate(from), dateTo: formatDate(today) };
    }
    case 'last-month': {
      const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const to = new Date(now.getFullYear(), now.getMonth(), 0);
      return { dateFrom: formatDate(from), dateTo: formatDate(to) };
    }
    case 'last-30': {
      const from = new Date(today);
      from.setDate(from.getDate() - 29);
      return { dateFrom: formatDate(from), dateTo: formatDate(today) };
    }
    case 'this-year': {
      const from = new Date(now.getFullYear(), 0, 1);
      return { dateFrom: formatDate(from), dateTo: formatDate(today) };
    }
  }
}

/**
 * Returns the preset key when `(dateFrom, dateTo)` exactly matches one;
 * otherwise null. Used to highlight the active preset chip.
 */
function matchPreset(
  dateFrom: string,
  dateTo: string,
): PresetKey | null {
  for (const key of [
    'this-month',
    'last-month',
    'last-30',
    'this-year',
  ] as const) {
    const range = rangeForPreset(key);
    if (range.dateFrom === dateFrom && range.dateTo === dateTo) return key;
  }
  return null;
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function formatDate(date: Date): string {
  const y = date.getFullYear().toString().padStart(4, '0');
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const d = date.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export const DEFAULT_PERIOD = rangeForPreset('this-month');
