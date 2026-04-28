import { Banknote, CreditCard, Landmark, Smartphone } from 'lucide-react';
import type { AccountType } from '@/types/account.types';

export const ACCOUNT_TYPE_LABEL: Record<AccountType, string> = {
  cash: 'Naqd kassa',
  bank: 'Bank hisobi',
  e_wallet: 'Elektron hamyon',
  card: 'Plastik karta',
};

export const ACCOUNT_TYPE_ICON: Record<
  AccountType,
  React.ComponentType<{ className?: string }>
> = {
  cash: Banknote,
  bank: Landmark,
  e_wallet: Smartphone,
  card: CreditCard,
};
