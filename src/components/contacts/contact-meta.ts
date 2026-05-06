import {
  type LucideIcon,
  Handshake,
  HelpCircle,
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

/** Label for a contact whose role is null. */
export const CONTACT_TYPE_NONE_LABEL = 'Boshqa';
export const CONTACT_TYPE_NONE_ICON: LucideIcon = HelpCircle;

export function getContactTypeLabel(type: ContactType | null): string {
  return type ? CONTACT_TYPE_LABEL[type] : CONTACT_TYPE_NONE_LABEL;
}

export function getContactTypeIcon(type: ContactType | null): LucideIcon {
  return type ? CONTACT_TYPE_ICON[type] : CONTACT_TYPE_NONE_ICON;
}
