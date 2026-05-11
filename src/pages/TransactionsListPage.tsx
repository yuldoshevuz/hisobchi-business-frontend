import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Filter, Receipt, Search } from 'lucide-react';
import { useTransactionsInfinite } from '@/api/hooks/use-transactions';
import { useContacts } from '@/api/hooks/use-contacts';
import { useCategories } from '@/api/hooks/use-categories';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { TransactionListItem } from '@/components/transactions/TransactionListItem';
import { TransactionFiltersSheet } from '@/components/transactions/TransactionFiltersSheet';
import { AccessDeniedView } from '@/components/AccessDeniedView';
import { useCan, usePermissions } from '@/hooks/use-permissions';
import { useInfiniteScroll } from '@/hooks/use-infinite-scroll';
import { getApiErrorMessage } from '@/lib/api-error';
import { TRANSACTION_TYPE_LABEL } from '@/lib/transaction-meta';
import { PermissionSlug } from '@/lib/permission-slugs';
import { tgHapticImpact } from '@/lib/telegram';
import {
  TRANSACTION_TYPE_VALUES,
  type ListTransactionsQuery,
  type Transaction,
  type TransactionType,
} from '@/types/transaction.types';

function formatDateHeader(iso: string): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  const d = new Date(iso);
  d.setHours(0, 0, 0, 0);

  if (d.getTime() === today.getTime()) return 'Bugun';
  if (d.getTime() === yesterday.getTime()) return 'Kecha';
  return new Intl.DateTimeFormat('uz-UZ', {
    day: 'numeric',
    month: 'long',
    year: d.getFullYear() === today.getFullYear() ? undefined : 'numeric',
  }).format(d);
}

function parseTypeParam(raw: string | null): TransactionType[] {
  if (!raw) return [];
  const allowed = new Set<string>(TRANSACTION_TYPE_VALUES);
  return raw
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter((s): s is TransactionType => allowed.has(s));
}

function parseAccountIdParam(raw: string | null): number | undefined {
  if (!raw) return undefined;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

function groupByDate(items: Transaction[]): Array<{
  key: string;
  label: string;
  items: Transaction[];
}> {
  const groups = new Map<string, Transaction[]>();
  for (const item of items) {
    const key = item.date.slice(0, 10);
    const list = groups.get(key);
    if (list) list.push(item);
    else groups.set(key, [item]);
  }
  return Array.from(groups.entries()).map(([key, list]) => ({
    key,
    label: formatDateHeader(key),
    items: list,
  }));
}

export function TransactionsListPage(): React.ReactElement {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { isReady } = usePermissions();
  const canRead = useCan(PermissionSlug.TRANSACTIONS_READ);

  const urlType = parseTypeParam(searchParams.get('type'));
  const urlAccountId = parseAccountIdParam(searchParams.get('accountId'));

  const [search, setSearch] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');
  const [filters, setFilters] = useState<ListTransactionsQuery>({
    status: 'active',
    ...(urlType.length > 0 ? { type: urlType } : {}),
    ...(urlAccountId !== undefined ? { accountId: urlAccountId } : {}),
  });
  const [filtersOpen, setFiltersOpen] = useState<boolean>(false);

  // When navigating between dashboard cards, the URL `?type=...` changes but
  // the page is the same component instance — keep `filters.type` in sync.
  const filterTypeKey = (filters.type ?? []).join(',');
  const urlTypeKey = urlType.join(',');
  if (filterTypeKey !== urlTypeKey) {
    setFilters((f) => ({
      ...f,
      type: urlType.length > 0 ? urlType : undefined,
    }));
  }
  if (filters.accountId !== urlAccountId) {
    setFilters((f) => ({ ...f, accountId: urlAccountId }));
  }

  useEffect(() => {
    const id = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(id);
  }, [search]);

  const queryFilters = useMemo<ListTransactionsQuery>(() => {
    return {
      ...filters,
      ...(debouncedSearch ? { search: debouncedSearch } : {}),
    };
  }, [filters, debouncedSearch]);

  const transactions = useTransactionsInfinite(queryFilters, {
    enabled: canRead,
  });

  // Pre-fetch contacts to resolve names in list rows (small list, fits one query).
  const contacts = useContacts(
    { all: true, status: 'active' },
    { enabled: canRead },
  );
  const contactNameById = useMemo(() => {
    const map = new Map<number, string>();
    for (const c of contacts.data?.data ?? []) map.set(c.id, c.name);
    return map;
  }, [contacts.data]);

  // Same trick for categories so each row can render its tag without an
  // extra fetch per item.
  const categories = useCategories({ all: true }, { enabled: canRead });
  const categoryNameById = useMemo(() => {
    // Merged catalog rows have `id=null` for system defaults the org
    // hasn't customised yet — those don't appear on transactions, so
    // skip them.
    const map = new Map<number, string>();
    for (const c of categories.data?.data ?? []) {
      if (c.id !== null) map.set(c.id, c.name);
    }
    return map;
  }, [categories.data]);

  const sentinelRef = useInfiniteScroll({
    hasNextPage: transactions.hasNextPage ?? false,
    isFetchingNextPage: transactions.isFetchingNextPage,
    fetchNextPage: () => {
      void transactions.fetchNextPage();
    },
  });

  if (isReady && !canRead) {
    return (
      <AccessDeniedView
        title={t('dashboard.transactions')}
        description={t('tx_list.no_access_description')}
        hint="transactions.read"
      />
    );
  }

  const flat = transactions.data?.pages.flatMap((p) => p.data) ?? [];
  const groups = groupByDate(flat);

  const activeFilterCount =
    (filters.type?.length ?? 0) +
    (filters.paymentStatus ? 1 : 0) +
    (filters.accountId !== undefined ? 1 : 0) +
    (filters.dateFrom ? 1 : 0) +
    (filters.dateTo ? 1 : 0) +
    // Default is ACTIVE only; any other state (both, or VOIDED only) counts.
    (filters.status !== 'active' ? 1 : 0);

  // Show the type-specific label as the page title when exactly one type is
  // active (e.g. "Sotuvlar"). Otherwise fall back to the generic title.
  const headerTitle =
    urlType.length === 1
      ? TRANSACTION_TYPE_LABEL[urlType[0]]
      : t('dashboard.transactions');

  return (
    <div className="pb-32">
      <PageHeader
        title={headerTitle}
        description={t('tx_list.subtitle')}
        large
        showBack
      />

      <div className="space-y-3">
        <div className="flex items-center gap-2 px-4">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('tx_list.search_placeholder')}
              className="pl-9"
            />
          </div>
          <Button
            type="button"
            variant="outline"
            size="default"
            className="relative shrink-0"
            onClick={() => {
              tgHapticImpact('light');
              setFiltersOpen(true);
            }}
          >
            <Filter className="h-4 w-4" />
            {activeFilterCount > 0 ? (
              <span className="ml-1 rounded-full bg-primary px-1.5 text-[11px] font-semibold text-primary-foreground">
                {activeFilterCount}
              </span>
            ) : null}
          </Button>
        </div>

        {transactions.isPending ? (
          <div className="flex justify-center py-16">
            <Spinner className="h-6 w-6" />
          </div>
        ) : transactions.isError ? (
          <p className="px-4 py-6 text-[14px] text-destructive">
            {getApiErrorMessage(transactions.error)}
          </p>
        ) : flat.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <Receipt className="mx-auto h-10 w-10 text-muted-foreground" />
            <p className="mt-3 text-[14px] text-muted-foreground">
              {t('tx_list.empty_title')}
            </p>
            <p className="mt-1 text-[12px] text-muted-foreground">
              {t('tx_list.empty_hint')}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {groups.map((group) => (
              <section key={group.key} className="px-4">
                <div className="px-1 pb-1.5 pt-1 text-[12px] font-medium uppercase tracking-wide text-muted-foreground">
                  {group.label}
                </div>
                <div className="divide-y divide-border overflow-hidden rounded-2xl bg-card">
                  {group.items.map((tx) => (
                    <TransactionListItem
                      key={tx.id}
                      transaction={tx}
                      contactName={
                        tx.contactId ? contactNameById.get(tx.contactId) : null
                      }
                      categoryName={
                        tx.categoryId
                          ? categoryNameById.get(tx.categoryId)
                          : null
                      }
                      // Parent categories are operational buckets
                      // (Ijara / Kommunal / Oyliklar / Tushum…) — they
                      // apply to every type that has a financial
                      // direction. Transfer / adjustment / opening_balance
                      // are type-only flows, so hide the badge for those.
                      showCategoryBadge={
                        tx.type !== 'transfer' &&
                        tx.type !== 'adjustment' &&
                        tx.type !== 'opening_balance'
                      }
                      onTap={() => navigate(`/transactions/${tx.id}`)}
                    />
                  ))}
                </div>
              </section>
            ))}
            <div ref={sentinelRef} className="h-8" />
            {transactions.isFetchingNextPage ? (
              <div className="flex justify-center py-2">
                <Spinner />
              </div>
            ) : null}
          </div>
        )}
      </div>

      <TransactionFiltersSheet
        open={filtersOpen}
        onOpenChange={setFiltersOpen}
        value={filters}
        onChange={(next) => {
          setFilters(next);
          // Mirror the type filter into the URL so refresh / share preserves it.
          const params = new URLSearchParams(searchParams);
          if (next.type && next.type.length > 0) {
            params.set('type', next.type.join(','));
          } else {
            params.delete('type');
          }
          setSearchParams(params, { replace: true });
        }}
      />
    </div>
  );
}
