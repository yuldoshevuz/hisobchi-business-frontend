import { useSearchParams } from 'react-router-dom';
import { AccessDeniedView } from '@/components/AccessDeniedView';
import { PageHeader } from '@/components/layout/PageHeader';
import { CashFlowReport } from '@/components/reports/CashFlowReport';
import { FinancialStateReport } from '@/components/reports/FinancialStateReport';
import { PnlReport } from '@/components/reports/PnlReport';
import { useCan, usePermissions } from '@/hooks/use-permissions';
import { PermissionSlug } from '@/lib/permission-slugs';
import { cn } from '@/lib/utils';
import { tgHapticSelection } from '@/lib/telegram';

type ReportTab = 'cash-flow' | 'pnl' | 'financial-state';

const TABS: ReadonlyArray<{ id: ReportTab; label: string }> = [
  { id: 'cash-flow', label: 'Kassa' },
  { id: 'pnl', label: 'P&L' },
  { id: 'financial-state', label: 'Balans' },
];

function readTab(value: string | null): ReportTab {
  if (value === 'pnl' || value === 'financial-state') return value;
  return 'cash-flow';
}

export function ReportsPage(): React.ReactElement {
  const { isReady } = usePermissions();
  const canRead = useCan(PermissionSlug.REPORTS_READ);
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = readTab(searchParams.get('tab'));

  function selectTab(next: ReportTab): void {
    if (next === tab) return;
    tgHapticSelection();
    const params = new URLSearchParams(searchParams);
    if (next === 'cash-flow') params.delete('tab');
    else params.set('tab', next);
    setSearchParams(params, { replace: true });
  }

  if (isReady && !canRead) {
    return (
      <AccessDeniedView
        title="Hisobotlar"
        description="Bu bo'limga kirish uchun ruxsat yo'q"
        hint="'reports.read' ruxsati kerak."
      />
    );
  }

  return (
    <div className="pb-8">
      <PageHeader
        title="Hisobotlar"
        description="Pul harakati, foyda-zarar, balans"
        large
        showBack
      />

      <div className="px-4 pb-3">
        <div className="flex gap-1 rounded-xl bg-muted p-1">
          {TABS.map((t) => {
            const active = t.id === tab;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => selectTab(t.id)}
                className={cn(
                  'press flex-1 rounded-lg px-3 py-2 text-[14px] font-medium transition-colors',
                  active
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground',
                )}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {tab === 'cash-flow' ? <CashFlowReport /> : null}
      {tab === 'pnl' ? <PnlReport /> : null}
      {tab === 'financial-state' ? <FinancialStateReport /> : null}
    </div>
  );
}
