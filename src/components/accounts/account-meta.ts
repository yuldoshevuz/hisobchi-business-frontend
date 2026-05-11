import { Banknote, CreditCard, Landmark, Smartphone } from 'lucide-react';
import i18n from '@/i18n';
import type { AccountType } from '@/types/account.types';

/**
 * i18n key per account type. Resolve via i18n.t() at call sites that
 * don't have a useTranslation() hook handy — pure helper, picks up the
 * active locale at call time.
 */
export const ACCOUNT_TYPE_LABEL_KEY: Record<AccountType, string> = {
  cash: 'account.type.cash',
  bank: 'account.type.bank',
  e_wallet: 'account.type.e_wallet',
  card: 'account.type.card',
};

/**
 * Proxy that resolves the key against the live i18n instance on every
 * read. Existing call sites that used the constant `ACCOUNT_TYPE_LABEL`
 * keep their syntax (`ACCOUNT_TYPE_LABEL[type]`) but now return the
 * locale-aware string. Note: components inside React must re-render on
 * locale change for the new label to appear — react-i18next's
 * useTranslation() takes care of that automatically.
 */
export const ACCOUNT_TYPE_LABEL: Record<AccountType, string> = new Proxy(
  ACCOUNT_TYPE_LABEL_KEY,
  {
    get(target, prop: string) {
      const key = target[prop as AccountType];
      return key ? i18n.t(key) : (prop as string);
    },
  },
) as Record<AccountType, string>;

export const ACCOUNT_TYPE_ICON: Record<
  AccountType,
  React.ComponentType<{ className?: string }>
> = {
  cash: Banknote,
  bank: Landmark,
  e_wallet: Smartphone,
  card: CreditCard,
};
