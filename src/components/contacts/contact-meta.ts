import {
  type LucideIcon,
  Handshake,
  Truck,
  User as UserIcon,
} from 'lucide-react';
import type { ContactType } from '@/types/contact.types';

export const CONTACT_TYPE_LABEL: Record<ContactType, string> = {
  customer: 'Mijoz',
  supplier: 'Yetkazib beruvchi',
  partner: 'Hamkor',
};

export const CONTACT_TYPE_ICON: Record<ContactType, LucideIcon> = {
  customer: UserIcon,
  supplier: Truck,
  partner: Handshake,
};
