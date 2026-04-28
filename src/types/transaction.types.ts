import type { PaginatedResponse } from "./member.types";

export type TransactionType =
  | 'sale'
  | 'purchase'
  | 'expense'
  | 'income'
  | 'debt_in'
  | 'debt_out'
  | 'transfer'
  | 'adjustment'
  | 'opening_balance'
  | 'suspense';

export const TRANSACTION_TYPE_VALUES: readonly TransactionType[] = [
  'sale',
  'purchase',
  'expense',
  'income',
  'debt_in',
  'debt_out',
  'transfer',
  'adjustment',
  'opening_balance',
  'suspense',
] as const;

export type PaymentStatus = 'unpaid' | 'partial' | 'paid' | 'overpaid';
export const PAYMENT_STATUS_VALUES: readonly PaymentStatus[] = [
  'unpaid',
  'partial',
  'paid',
  'overpaid',
] as const;

export type TransactionStatus = 'active' | 'voided';
export type CashFlowStatus = 'active' | 'voided';
export type CashFlowDirection = 'in' | 'out';

export const TRANSACTION_DESCRIPTION_MAX_LENGTH = 500;
export const VOID_REASON_MIN_LENGTH = 1;
export const VOID_REASON_MAX_LENGTH = 500;
export const CASH_FLOW_NOTES_MAX_LENGTH = 500;
export const SALE_ITEM_NAME_MAX_LENGTH = 200;

export interface CashFlow {
  id: number;
  transactionId: number;
  accountId: number;
  direction: CashFlowDirection;
  amount: string;
  currency: string;
  date: string;
  status: CashFlowStatus;
  flowKind: string | null;
  pairedCashFlowId: number | null;
  notes: string | null;
  attachmentUrl: string | null;
  createdAt: string;
}

export interface SaleItem {
  id: number;
  productId: number | null;
  nameSnapshot: string;
  quantity: string | null;
  unitPrice: string | null;
  costSnapshot: string | null;
  lineTotal: string;
}

export interface Transaction {
  id: number;
  type: TransactionType;
  amount: string;
  currency: string;
  date: string;
  description: string | null;
  clientId: number | null;
  categoryId: number | null;
  paidAmount: string;
  paymentStatus: PaymentStatus;
  status: TransactionStatus;
  dueDate: string | null;
  attachmentUrl: string | null;
  metadata: Record<string, unknown> | null;
  cashFlows: CashFlow[];
  saleItems?: SaleItem[];
  createdAt: string;
  /** `users.id` of the member who recorded the event. */
  createdBy: number;
}

export type PaginatedTransactions = PaginatedResponse<Transaction>;

export interface ListTransactionsQuery {
  page?: number;
  limit?: number;
  type?: TransactionType[];
  clientId?: number;
  /** Backend accepts ONE accountId. */
  accountId?: number;
  dateFrom?: string;
  dateTo?: string;
  status?: TransactionStatus;
  /** Backend accepts ONE paymentStatus value. */
  paymentStatus?: PaymentStatus;
  search?: string;
}

export interface CreateCashFlowLeg {
  accountId: number;
  direction: CashFlowDirection;
  amount: string;
  currency?: string;
  /** Optional. Defaults to the server time when omitted. */
  date?: string;
  notes?: string;
  attachmentUrl?: string;
  flowKind?: string;
}

/** Cash-flow leg sent on sale/purchase/income/expense create. Direction is server-controlled. */
export interface PaymentLegRequest {
  accountId: number;
  amount: string;
  /** Optional. Defaults to the server time when omitted. */
  date?: string;
  notes?: string;
  attachmentUrl?: string;
  flowKind?: string;
}

/** `POST /sales` body. */
export interface CreateSaleRequest {
  /** Optional. Defaults to the server time when omitted. */
  date?: string;
  currency: string;
  amount?: string;
  cashFlows: PaymentLegRequest[];
  clientId?: number;
  categoryId?: number;
  systemCategoryId?: number;
  description?: string;
  attachmentUrl?: string;
  /** Optional. Defaults to the server time when omitted. */
  dueDate?: string;
  metadata?: Record<string, unknown>;
  items?: CreateSaleItem[];
  allowOverpayment?: boolean;
  idempotencyKey?: string;
}

/** `POST /purchases` body. Same shape as sale. */
export type CreatePurchaseRequest = CreateSaleRequest;

/** `POST /debts` body. */
export interface CreateDebtRequest {
  direction: 'lent' | 'borrowed';
  amount: string;
  currency: string;
  /** Optional. Defaults to the server time when omitted. */
  date?: string;
  clientId: number;
  accountId: number;
  /** Optional. Defaults to the server time when omitted. */
  dueDate?: string;
  description?: string;
  attachmentUrl?: string;
  metadata?: Record<string, unknown>;
  idempotencyKey?: string;
}

/** `POST /transfers` body. */
export interface CreateTransferRequest {
  fromAccountId: number;
  toAccountId: number;
  amount: string;
  /** Required when source/dest currencies differ. */
  toAmount?: string;
  /** Required when source/dest currencies differ. */
  exchangeRate?: string;
  /** Optional. Defaults to the server time when omitted. */
  date?: string;
  description?: string;
  attachmentUrl?: string;
  metadata?: Record<string, unknown>;
  idempotencyKey?: string;
}

/** `POST /adjustments` body — manual balance correction. */
export interface CreateAdjustmentRequest {
  accountId: number;
  /** `in` adds to the account, `out` subtracts. */
  direction: 'in' | 'out';
  amount: string;
  /** Optional. Defaults to the server time when omitted. */
  date?: string;
  description?: string;
  attachmentUrl?: string;
  metadata?: Record<string, unknown>;
  idempotencyKey?: string;
}

/** Body for per-business repayment endpoints. Direction is server-controlled. */
export interface AddPaymentRequest {
  accountId: number;
  amount: string;
  /** Optional. Defaults to the server time when omitted. */
  date?: string;
  notes?: string;
  attachmentUrl?: string;
  flowKind?: string;
  allowOverpayment?: boolean;
}

export interface CreateSaleItem {
  productId?: number | null;
  name: string;
  quantity?: string | null;
  unitPrice?: string | null;
  cost?: string | null;
}

export interface CreateTransactionRequestBase {
  type: TransactionType;
  amount: string;
  currency: string;
  date: string;
  description?: string;
  clientId?: number;
  categoryId?: number;
  systemCategoryId?: number;
  attachmentUrl?: string;
  dueDate?: string;
  cashFlows: CreateCashFlowLeg[];
  metadata?: Record<string, unknown>;
  idempotencyKey?: string;
  items?: CreateSaleItem[];
  allowOverpayment?: boolean;
}

export type CreateTransactionRequest = CreateTransactionRequestBase;

export interface AddCashFlowRequest {
  accountId: number;
  direction: CashFlowDirection;
  amount: string;
  date: string;
  notes?: string;
  attachmentUrl?: string;
  allowOverpayment?: boolean;
  flowKind?: string;
}

export interface VoidRequest {
  reason: string;
}
