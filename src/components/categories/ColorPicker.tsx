import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { tgHapticImpact } from '@/lib/telegram';

const COLOR_PALETTE: readonly string[] = [
  '#27AE60',
  '#2ECC71',
  '#16A085',
  '#1ABC9C',
  '#3498DB',
  '#2980B9',
  '#9B59B6',
  '#8E44AD',
  '#E91E63',
  '#C0392B',
  '#E74C3C',
  '#D35400',
  '#E67E22',
  '#F39C12',
  '#F1C40F',
  '#2C3E50',
  '#34495E',
  '#7F8C8D',
  '#95A5A6',
  '#795548',
] as const;

interface ColorPickerProps {
  value: string | null;
  onChange: (color: string | null) => void;
}

export function ColorPicker({
  value,
  onChange,
}: ColorPickerProps): React.ReactElement {
  return (
    <div className="grid grid-cols-6 gap-2 sm:grid-cols-10">
      {COLOR_PALETTE.map((c) => {
        const selected = value?.toLowerCase() === c.toLowerCase();
        return (
          <button
            key={c}
            type="button"
            onClick={() => {
              tgHapticImpact('light');
              onChange(selected ? null : c);
            }}
            aria-label={c}
            aria-pressed={selected}
            style={{ backgroundColor: c }}
            className={cn(
              'press relative h-9 w-9 rounded-full ring-offset-2 ring-offset-card',
              selected ? 'ring-2 ring-foreground' : 'ring-0',
            )}
          >
            {selected ? (
              <Check className="absolute inset-0 m-auto h-4 w-4 text-white" />
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
