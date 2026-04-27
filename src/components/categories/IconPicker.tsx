import {
  AlignLeft,
  BadgeCheck,
  Boxes,
  Building2,
  Construction,
  Gavel,
  Gift,
  Hammer,
  HardHat,
  Headphones,
  Home,
  Landmark,
  Megaphone,
  Package,
  PiggyBank,
  Plane,
  Receipt,
  ShoppingCart,
  Smartphone,
  Smile,
  Shield,
  Shirt,
  Sparkles,
  SprayCan,
  Tag,
  TrendingUp,
  Truck,
  Utensils,
  UtensilsCrossed,
  Wifi,
  Wrench,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { tgHapticImpact } from '@/lib/telegram';

type IconComponent = React.ComponentType<{ className?: string }>;

/**
 * Curated set of Material-Symbol names the picker exposes. Names mirror what
 * the backend stores so values round-trip cleanly. Keep in sync with
 * `CategoryIcon.MATERIAL_TO_LUCIDE`.
 */
const ICON_OPTIONS: Array<{ name: string; Icon: IconComponent }> = [
  { name: 'shopping_cart', Icon: ShoppingCart },
  { name: 'home', Icon: Home },
  { name: 'restaurant', Icon: Utensils },
  { name: 'lunch_dining', Icon: UtensilsCrossed },
  { name: 'local_shipping', Icon: Truck },
  { name: 'flight', Icon: Plane },
  { name: 'wifi', Icon: Wifi },
  { name: 'bolt', Icon: Zap },
  { name: 'badge', Icon: BadgeCheck },
  { name: 'gavel', Icon: Gavel },
  { name: 'inventory', Icon: Package },
  { name: 'inventory_2', Icon: Boxes },
  { name: 'campaign', Icon: Megaphone },
  { name: 'build', Icon: Wrench },
  { name: 'handyman', Icon: Hammer },
  { name: 'construction', Icon: HardHat },
  { name: 'account_balance', Icon: Landmark },
  { name: 'shield', Icon: Shield },
  { name: 'checkroom', Icon: Shirt },
  { name: 'devices', Icon: Smartphone },
  { name: 'face', Icon: Smile },
  { name: 'edit_note', Icon: AlignLeft },
  { name: 'cleaning_services', Icon: SprayCan },
  { name: 'category', Icon: Tag },
  { name: 'point_of_sale', Icon: Receipt },
  { name: 'support_agent', Icon: Headphones },
  { name: 'trending_up', Icon: TrendingUp },
  { name: 'savings', Icon: PiggyBank },
  { name: 'card_giftcard', Icon: Gift },
  { name: 'store', Icon: Building2 },
  { name: 'star', Icon: Sparkles },
  { name: 'tools', Icon: Construction },
];

interface IconPickerProps {
  value: string | null;
  onChange: (icon: string | null) => void;
}

export function IconPicker({
  value,
  onChange,
}: IconPickerProps): React.ReactElement {
  return (
    <div className="grid grid-cols-6 gap-2 sm:grid-cols-8">
      {ICON_OPTIONS.map(({ name, Icon }) => {
        const selected = value === name;
        return (
          <button
            key={name}
            type="button"
            onClick={() => {
              tgHapticImpact('light');
              onChange(selected ? null : name);
            }}
            aria-pressed={selected}
            className={cn(
              'press flex h-10 w-10 items-center justify-center rounded-xl border',
              selected
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border bg-card text-muted-foreground',
            )}
          >
            <Icon className="h-4 w-4" />
          </button>
        );
      })}
    </div>
  );
}
