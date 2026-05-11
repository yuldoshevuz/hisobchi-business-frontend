import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { AccessDeniedView } from '@/components/AccessDeniedView';
import { FeatureGate } from '@/components/FeatureGate';
import { PageHeader } from '@/components/layout/PageHeader';
import { CashFlowReport } from '@/components/reports/CashFlowReport';
import { ContactsReport } from '@/components/reports/ContactsReport';
import { FinancialStateReport } from '@/components/reports/FinancialStateReport';
import { PnlReport } from '@/components/reports/PnlReport';
import { useCan, usePermissions } from '@/hooks/use-permissions';
import { PermissionSlug } from '@/lib/permission-slugs';
import { cn } from '@/lib/utils';
import { tgHapticSelection } from '@/lib/telegram';

type ReportTab = 'cash-flow' | 'pnl' | 'financial-state' | 'contacts';

const TABS: ReadonlyArray<{ id: ReportTab; labelKey: string }> = [
  { id: 'cash-flow', labelKey: 'reports.tab.cash_flow' },
  { id: 'pnl', labelKey: 'reports.tab.pnl' },
  { id: 'financial-state', labelKey: 'reports.tab.financial_state' },
  { id: 'contacts', labelKey: 'reports.tab.contacts' },
];

function readTab(value: string | null): ReportTab {
  if (
    value === 'pnl' ||
    value === 'financial-state' ||
    value === 'contacts'
  ) {
    return value;
  }
  return 'cash-flow';
}

export function ReportsPage(): React.ReactElement {
  const { t } = useTranslation();
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
        title={t('reports.title')}
        description={t('reports.no_access')}
        hint="reports.read"
      />
    );
  }

  return (
    <div className="pb-8">
      <PageHeader
        title={t('reports.title')}
        description={t('reports.subtitle')}
        large
        showBack
      />

      <div className="px-4 pb-3">
        <div className="flex gap-1 rounded-xl bg-muted p-1">
          {TABS.map((tab_) => {
            const active = tab_.id === tab;
            return (
              <button
                key={tab_.id}
                type="button"
                onClick={() => selectTab(tab_.id)}
                className={cn(
                  'press flex-1 rounded-lg px-3 py-2 text-[14px] font-medium transition-colors',
                  active
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground',
                )}
              >
                {t(tab_.labelKey)}
              </button>
            );
          })}
        </div>
      </div>

      {tab === 'cash-flow' ? <CashFlowReport /> : null}
      {tab === 'pnl' ? (
        <FeatureGate feature="ADVANCED_REPORTS" variant="block">
          <PnlReport />
        </FeatureGate>
      ) : null}
      {tab === 'financial-state' ? (
        <FeatureGate feature="ADVANCED_REPORTS" variant="block">
          <FinancialStateReport />
        </FeatureGate>
      ) : null}
      {tab === 'contacts' ? (
        <FeatureGate feature="DEBT_TRACKING" variant="block">
          <ContactsReport />
        </FeatureGate>
      ) : null}
    </div>
  );
}
