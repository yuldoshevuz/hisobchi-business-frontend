import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowRight, CalendarClock } from 'lucide-react';
import { useTransactions } from '@/api/hooks/use-transactions';
import { useContacts } from '@/api/hooks/use-contacts';
import { Badge } from '@/components/ui/badge';
import { formatMoney } from '@/lib/format';
import { cn } from '@/lib/utils';
import { tgHapticImpact } from '@/lib/telegram';
import type { Transaction } from '@/types/transaction.types';

const MONTHS_UZ_SHORT = [
  'Yan', 'Fev', 'Mar', 'Apr', 'May', 'Iyn',
  'Iyl', 'Avg', 'Sen', 'Okt', 'Noy', 'Dek',
] as const;

/**
 * Time horizon (in days) — debts with a due date inside this window relative
 * to today are surfaced as reminders. Anything past today is overdue and gets
 * the heavier styling.
 */
const HORIZON_DAYS = 14;

/**
 * Dashboard reminders for debt transactions whose `dueDate` is approaching
 * or has passed. Backend does NOT yet generate `scheduled_reminders` rows for
 * one-off debt due dates (those live only on recurring plans), so we derive
 * the list client-side from active unpaid/partial debt transactions.
 *
 * Tapping a card jumps to the transaction detail where the user can either
 * record a repayment cash flow or void the debt entirely.
 */
export function DebtRemindersHighlights(): React.ReactElement | null {
  const navigate = useNavigate();
  // Two queries: in-debts (qarz olganlar — pul kim bizdan oladi) and
  // out-debts (qarz berganlar — pul kim bizga qaytaradi). The backend list
  // accepts a `type[]` param so we could in theory do one round-trip, but
  // splitting keeps the cache keys clean and the badge counts honest.
  const inDebts = useTransactions({
    type: ['debt_in'],
    status: 'active',
    limit: 100,
  });
  const outDebts = useTransactions({
    type: ['debt_out'],
    status: 'active',
    limit: 100,
  });
  const contacts = useContacts({ all: true });

  const today = isoToday();
  const horizon = isoDaysFromToday(HORIZON_DAYS);

  const dueRows = useMemo(() => {
    const rows: Transaction[] = [
      ...(inDebts.data?.data ?? []),
      ...(outDebts.data?.data ?? []),
    ];
    return rows
      .filter(
        (t) =>
          t.dueDate !== null &&
          t.paymentStatus !== 'paid' &&
          t.dueDate <= horizon,
      )
      .sort((a, b) =>
        (a.dueDate ?? '') < (b.dueDate ?? '')
          ? -1
          : (a.dueDate ?? '') > (b.dueDate ?? '')
            ? 1
            : 0,
      );
  }, [inDebts.data, outDebts.data, horizon]);

  if (dueRows.length === 0) return null;

  const contactById = new Map(
    (contacts.data?.data ?? []).map((c) => [c.id, c] as const),
  );
  const isCarousel = dueRows.length > 1;

  return (
    <div className="space-y-2 px-4">
      <div className="flex items-center gap-2">
        <h2 className="flex-1 text-[14px] font-semibold uppercase tracking-wide text-destructive">
          Qarz eslatmalari
        </h2>
        <Badge variant="destructive" className="text-[11px]">
          {dueRows.length}
        </Badge>
      </div>

      {isCarousel ? (
        <div className="-mx-4 overflow-x-auto px-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex snap-x snap-mandatory gap-3">
            {dueRows.map((t) => (
              <div key={t.id} className="w-[88%] shrink-0 snap-start last:pr-1">
                <DebtCard
                  transaction={t}
                  today={today}
                  contactName={
                    t.contactId !== null
                      ? (contactById.get(t.contactId)?.name ?? null)
                      : null
                  }
                  onTap={() => {
                    tgHapticImpact('light');
                    navigate(`/transactions/${t.id}`);
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <DebtCard
          transaction={dueRows[0]!}
          today={today}
          contactName={
            dueRows[0]!.contactId !== null
              ? (contactById.get(dueRows[0]!.contactId)?.name ?? null)
              : null
          }
          onTap={() => {
            tgHapticImpact('light');
            navigate(`/transactions/${dueRows[0]!.id}`);
          }}
        />
      )}
    </div>
  );
}

interface DebtCardProps {
  transaction: Transaction;
  contactName: string | null;
  today: string;
  onTap: () => void;
}

function DebtCard({
  transaction,
  contactName,
  today,
  onTap,
}: DebtCardProps): React.ReactElement {
  const overdue = transaction.dueDate !== null && transaction.dueDate < today;
  const direction =
    transaction.type === 'debt_in' ? 'Qarz olingan' : 'Qarz berilgan';
  const remaining = remainingAmount(transaction);

  return (
    <button
      type="button"
      onClick={onTap}
      className={cn(
        'press flex w-full flex-col gap-2 rounded-2xl border p-4 text-left transition-colors active:bg-destructive/15',
        overdue
          ? 'border-destructive bg-destructive/10'
          : 'border-destructive/40 bg-destructive/5',
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-destructive/15 text-destructive">
          {overdue ? (
            <AlertCircle className="h-5 w-5" />
          ) : (
            <CalendarClock className="h-5 w-5" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-[15px] font-semibold text-foreground">
              {contactName ??
                transaction.description ??
                `Tranzaktsiya #${transaction.id}`}
            </span>
            <Badge variant="destructive" className="shrink-0 text-[10px]">
              {overdue ? "Muddati o'tgan" : 'Yaqinlashmoqda'}
            </Badge>
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[12px] text-muted-foreground">
            <span
              className={cn(
                'tabular-nums font-medium',
                overdue
                  ? 'font-semibold text-destructive'
                  : 'text-destructive/80',
              )}
            >
              {transaction.dueDate ? formatDateUz(transaction.dueDate) : '—'}
            </span>
            <span>·</span>
            <span>{direction}</span>
            <span>·</span>
            <span>
              {transaction.paymentStatus === 'partial'
                ? "Qisman to'langan"
                : "To'lanmagan"}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-end justify-between pt-1">
        <span className="text-[20px] font-bold tabular-nums text-foreground">
          {formatMoney(remaining, transaction.currency)}{' '}
          <span className="text-[13px] font-normal text-muted-foreground">
            {transaction.currency}
          </span>
        </span>
        <ArrowRight className="h-4 w-4 text-muted-foreground" />
      </div>
    </button>
  );
}

function remainingAmount(t: Transaction): string {
  const total = Number(t.amount);
  const paid = Number(t.paidAmount);
  if (!Number.isFinite(total) || !Number.isFinite(paid)) return t.amount;
  return Math.max(total - paid, 0).toString();
}

function formatDateUz(iso: string): string {
  const [datePart] = iso.split('T');
  const [y, m, d] = (datePart ?? '').split('-').map((p) => Number(p));
  if (!y || !m || !d) return iso;
  return `${d.toString().padStart(2, '0')} ${MONTHS_UZ_SHORT[m - 1]} ${y}`;
}

function isoToday(): string {
  const now = new Date();
  return toIso(now);
}

function isoDaysFromToday(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return toIso(d);
}

function toIso(d: Date): string {
  const y = d.getFullYear().toString().padStart(4, '0');
  const mo = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  return `${y}-${mo}-${day}`;
}

