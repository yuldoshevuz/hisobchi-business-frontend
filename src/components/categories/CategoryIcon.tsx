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

type IconComponent = React.ComponentType<{ className?: string }>;

/**
 * Backend stores Material Symbols icon names (snake_case). Map the ones the
 * seed uses to the closest lucide-react equivalent. Anything not in this map
 * falls back to {@link Tag}.
 */
const MATERIAL_TO_LUCIDE: Record<string, IconComponent> = {
  home: Home,
  bolt: Zap,
  wifi: Wifi,
  badge: BadgeCheck,
  gavel: Gavel,
  inventory: Package,
  inventory_2: Boxes,
  local_shipping: Truck,
  campaign: Megaphone,
  build: Wrench,
  handyman: Hammer,
  shopping_cart: ShoppingCart,
  account_balance: Landmark,
  shield: Shield,
  flight: Plane,
  restaurant: Utensils,
  lunch_dining: UtensilsCrossed,
  checkroom: Shirt,
  devices: Smartphone,
  face: Smile,
  edit_note: AlignLeft,
  cleaning_services: SprayCan,
  construction: HardHat,
  category: Tag,
  point_of_sale: Receipt,
  support_agent: Headphones,
  trending_up: TrendingUp,
  savings: PiggyBank,
  card_giftcard: Gift,
  // Aliases / catch-alls used by some seed variants.
  store: Building2,
  star: Sparkles,
  tools: Construction,
};

interface CategoryIconProps {
  /** Material Symbols icon name from the backend. */
  icon?: string | null;
  /** Hex color (#RRGGBB) used for the icon foreground and a tinted background. */
  color?: string | null;
  /** Optional fallback when icon is missing or unknown (e.g. category name). */
  fallbackText?: string;
  className?: string;
}

/**
 * Fallback chain:
 *   1. If `icon` is in the Material→Lucide map → render that icon.
 *   2. Else if `fallbackText` is provided → render its first two letters.
 *   3. Else → render the generic {@link Tag} icon.
 *
 * Color fallback:
 *   - Valid hex `color` → tints icon foreground and gives a 14% alpha background.
 *   - Missing or invalid hex → primary theme tint via Tailwind utilities.
 */
export function CategoryIcon({
  icon,
  color,
  fallbackText,
  className,
}: CategoryIconProps): React.ReactElement {
  const MappedIcon = icon ? MATERIAL_TO_LUCIDE[icon] : undefined;
  const tintBg = color ? hexToRgba(color, 0.14) : null;
  const style =
    color && tintBg ? { color, backgroundColor: tintBg } : undefined;

  return (
    <div
      style={style}
      className={cn(
        'flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary',
        className,
      )}
    >
      {MappedIcon ? (
        <MappedIcon className="h-4 w-4" />
      ) : fallbackText && fallbackText.trim().length > 0 ? (
        <span className="text-[12px] font-semibold uppercase">
          {fallbackText.trim().slice(0, 2)}
        </span>
      ) : (
        <Tag className="h-4 w-4" />
      )}
    </div>
  );
}

/**
 * Returns rgba string for a 3- or 6-digit hex. Returns null on malformed input
 * so the caller can fall back to the theme defaults instead of producing an
 * invalid CSS value.
 */
function hexToRgba(hex: string, alpha: number): string | null {
  const normalised = hex.replace('#', '').trim();
  if (normalised.length !== 3 && normalised.length !== 6) return null;
  const full =
    normalised.length === 3
      ? normalised
          .split('')
          .map((c) => c + c)
          .join('')
      : normalised;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  if ([r, g, b].some((v) => Number.isNaN(v))) return null;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
