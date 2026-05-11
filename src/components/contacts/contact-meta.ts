import {
  type LucideIcon,
  Handshake,
  HelpCircle,
  Truck,
  User as UserIcon,
} from 'lucide-react';
import i18n from '@/i18n';
import type { ContactType } from '@/types/contact.types';

export const CONTACT_TYPE_LABEL_KEY: Record<ContactType, string> = {
  customer: 'contacts.type.customer',
  supplier: 'contacts.type.supplier',
  partner: 'contacts.type.partner',
};

/** Locale-aware label record — see account-meta.ts for the proxy
 *  pattern rationale. */
export const CONTACT_TYPE_LABEL: Record<ContactType, string> = new Proxy(
  CONTACT_TYPE_LABEL_KEY,
  {
    get(target, prop: string) {
      const key = target[prop as ContactType];
      return key ? i18n.t(key) : (prop as string);
    },
  },
) as Record<ContactType, string>;

export const CONTACT_TYPE_ICON: Record<ContactType, LucideIcon> = {
  customer: UserIcon,
  supplier: Truck,
  partner: Handshake,
};

/** Label for a contact whose role is null. */
export const CONTACT_TYPE_NONE_LABEL_KEY = 'contacts.type.unset';
export const CONTACT_TYPE_NONE_ICON: LucideIcon = HelpCircle;

export function getContactTypeNoneLabel(): string {
  return i18n.t(CONTACT_TYPE_NONE_LABEL_KEY);
}

export function getContactTypeLabel(type: ContactType | null): string {
  return type
    ? i18n.t(CONTACT_TYPE_LABEL_KEY[type])
    : i18n.t(CONTACT_TYPE_NONE_LABEL_KEY);
}

export function getContactTypeIcon(type: ContactType | null): LucideIcon {
  return type ? CONTACT_TYPE_ICON[type] : CONTACT_TYPE_NONE_ICON;
}
