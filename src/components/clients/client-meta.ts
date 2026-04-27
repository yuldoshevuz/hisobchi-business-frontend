import {
  type LucideIcon,
  Repeat2,
  Truck,
  User as UserIcon,
} from 'lucide-react';
import type { ClientType } from '@/types/client.types';

export const CLIENT_TYPE_LABEL: Record<ClientType, string> = {
  CUSTOMER: 'Mijoz',
  SUPPLIER: 'Yetkazib beruvchi',
  BOTH: 'Aralash',
};

export const CLIENT_TYPE_ICON: Record<ClientType, LucideIcon> = {
  CUSTOMER: UserIcon,
  SUPPLIER: Truck,
  BOTH: Repeat2,
};
