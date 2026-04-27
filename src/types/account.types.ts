export type AccountType = "CASH" | "BANK" | "E_WALLET" | "CARD";

export type AccountStatus = "ACTIVE" | "ARCHIVED";

export type AccountCurrency = "UZS" | "USD" | "EUR" | "RUB";

export const ACCOUNT_TYPE_VALUES: readonly AccountType[] = [
  "CASH",
  "BANK",
  "E_WALLET",
  "CARD",
] as const;

export const ACCOUNT_CURRENCY_VALUES: readonly AccountCurrency[] = [
  "UZS",
  "USD",
  "EUR",
  "RUB",
] as const;

export const ACCOUNT_NAME_MIN_LENGTH = 1;
export const ACCOUNT_NAME_MAX_LENGTH = 100;

export interface Account {
  id: number;
  name: string;
  type: AccountType;
  currency: string;
  currentBalance: string;
  isPrimary: boolean;
  status: AccountStatus;
  createdAt: string;
}

export interface ListAccountsQuery {
  status?: AccountStatus;
  includeArchived?: boolean;
}

export interface CreateAccountRequest {
  name: string;
  type: AccountType;
  currency: AccountCurrency;
  isPrimary?: boolean;
  openingBalance?: string;
}

export interface UpdateAccountRequest {
  name?: string;
  isPrimary?: boolean;
  status?: AccountStatus;
}
