import { Banknote, CreditCard, Landmark, Smartphone } from 'lucide-react';
import type { AccountType } from '@/types/account.types';

export const ACCOUNT_TYPE_LABEL: Record<AccountType, string> = {
  CASH: 'Naqd kassa',
  BANK: 'Bank hisobi',
  E_WALLET: 'Elektron hamyon',
  CARD: 'Plastik karta',
};

export const ACCOUNT_TYPE_ICON: Record<
  AccountType,
  React.ComponentType<{ className?: string }>
> = {
  CASH: Banknote,
  BANK: Landmark,
  E_WALLET: Smartphone,
  CARD: CreditCard,
};
