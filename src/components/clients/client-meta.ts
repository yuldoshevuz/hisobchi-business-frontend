import {
  type LucideIcon,
  Repeat2,
  Truck,
  User as UserIcon,
} from 'lucide-react';
import type { ClientType } from '@/types/client.types';

export const CLIENT_TYPE_LABEL: Record<ClientType, string> = {
  customer: 'Mijoz',
  supplier: 'Yetkazib beruvchi',
  both: 'Aralash',
};

export const CLIENT_TYPE_ICON: Record<ClientType, LucideIcon> = {
  customer: UserIcon,
  supplier: Truck,
  both: Repeat2,
};
