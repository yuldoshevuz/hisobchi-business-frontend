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

export type AttachmentType = 'photo' | 'audio';
export const ATTACHMENT_TYPE_VALUES: readonly AttachmentType[] = ['photo', 'audio'] as const;

export type PaymentStatus = 'unpaid' | 'partial' | 'paid' | 'overpaid';
export const PAYMENT_STATUS_VALUES: readonly PaymentStatus[] = [
  'unpaid',
  'partial',
  'paid',
  'overpaid',
] as const;

/**
 * Transaction lifecycle:
 *   - `initial`: AI proposal awaiting user review in the mini-app edit
 *     screen. Excluded from EVERY aggregate (balances, paid_amount, stock,
 *     reports). Side-effects (cash_flows, stock_movements) are deferred
 *     until the user confirms (initial → active) via PATCH /:id/confirm.
 *     If the user rejects, DELETE /:id soft-deletes the row.
 *   - `active`: confirmed event with side-effects applied.
 *   - `voided`: previously-active row reversed via POST /:id/void.
 */
export type TransactionStatus = 'active' | 'voided' | 'initial';

/**
 * Field-level update payload for `PATCH /:id`. Only metadata-style fields
 * (amount / description / dueDate / category / contact); cash-flow / sale-item
 * / stock-movement edits go through their dedicated APIs.
 */
export interface UpdateTransactionItem {
  productId?: number | null;
  name?: string | null;
  quantity: string;
  unitPrice: string;
  cost?: string | null;
}

export interface UpdateTransactionCashFlow {
  accountId: number;
  amount: string;
  /** ISO date string. Defaults to the transaction date when omitted. */
  date?: string;
  flowKind?: string | null;
  notes?: string | null;
}

export interface UpdateTransactionRequest {
  amount?: string;
  /** Calendar day the event happened (YYYY-MM-DD). When changed, the row
   *  is re-bucketed across daily / weekly / monthly aggregates. */
  date?: string;
  description?: string | null;
  dueDate?: string | null;
  categoryId?: number | null;
  contactId?: number | null;
  /** Attach / clear `metadata.employeeMemberId` — surfaces the staff
   *  member on salary / commission rows. Pass `null` to detach. */
  memberId?: number | null;
  /** Initial-only: replaces all sale_items, server recomputes parent amount. */
  items?: UpdateTransactionItem[];
  /** Initial-only: replaces all deferred cash-flow legs. Direction is server-inferred. */
  cashFlows?: UpdateTransactionCashFlow[];
}
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
  contactId: number | null;
  categoryId: number | null;
  paidAmount: string;
  paymentStatus: PaymentStatus;
  status: TransactionStatus;
  dueDate: string | null;
  attachmentUrl: string | null;
  attachmentType: AttachmentType | null;
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
  contactId?: number;
  /** Backend accepts ONE accountId. */
  accountId?: number;
  /** Backend accepts ONE categoryId. */
  categoryId?: number;
  /** Filter by system category — used when the user picks an un-instantiated system default. */
  systemCategoryId?: number;
  dateFrom?: string;
  dateTo?: string;
  status?: TransactionStatus;
  /** Backend accepts ONE paymentStatus value. */
  paymentStatus?: PaymentStatus;
  search?: string;
}

export interface ListSalesQuery {
  page?: number;
  limit?: number;
  contactId?: number;
  accountId?: number;
  dateFrom?: string;
  dateTo?: string;
  status?: TransactionStatus;
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
  contactId?: number;
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

/**
 * `POST /expenses` body. Same cash-flow shape as a sale, server forces
 * direction = "out". `contactId` is optional (e.g. a worker, supplier or
 * service provider). For salary, set `systemCategoryId` to the "Oyliklar"
 * id and put `metadata.employeeMemberId`.
 */
export interface CreateExpenseRequest {
  /** Optional. Defaults to the server time when omitted. */
  date?: string;
  currency: string;
  amount: string;
  cashFlows: PaymentLegRequest[];
  contactId?: number;
  categoryId?: number;
  systemCategoryId?: number;
  description?: string;
  attachmentUrl?: string;
  /** Optional. Defaults to the server time when omitted. */
  dueDate?: string;
  metadata?: Record<string, unknown>;
  allowOverpayment?: boolean;
  idempotencyKey?: string;
}

/**
 * `POST /incomes` body. Used for non-sale income (interest, refunds,
 * miscellaneous). Same shape as expense but server forces direction = "in".
 */
export type CreateIncomeRequest = CreateExpenseRequest;

/**
 * `POST /accounts/:id/opening-balance` body. Initial balance row that must
 * precede every other transaction touching the account.
 */
export interface OpeningBalanceRequest {
  amount: string;
  /** Optional. Defaults to the server time when omitted. */
  date?: string;
  description?: string;
  attachmentUrl?: string;
}

/** `POST /debts` body. */
export interface CreateDebtRequest {
  direction: 'lent' | 'borrowed';
  amount: string;
  currency: string;
  /** Optional. Defaults to the server time when omitted. */
  date?: string;
  contactId: number;
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
  contactId?: number;
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
