import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { CategoriesPage } from './CategoriesPage';
import { ProductsPage } from './ProductsPage';
import { cn } from '@/lib/utils';
import { tgHapticSelection } from '@/lib/telegram';

type KatalogTab = 'products' | 'categories';

const TABS: ReadonlyArray<{ id: KatalogTab; labelKey: string }> = [
  { id: 'products', labelKey: 'katalog.products' },
  { id: 'categories', labelKey: 'katalog.categories' },
];

function readTab(value: string | null): KatalogTab {
  return value === 'categories' ? 'categories' : 'products';
}

export function KatalogPage(): React.ReactElement {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = readTab(searchParams.get('tab'));

  function selectTab(next: KatalogTab): void {
    if (next === tab) return;
    tgHapticSelection();
    const params = new URLSearchParams(searchParams);
    if (next === 'products') params.delete('tab');
    else params.set('tab', next);
    setSearchParams(params, { replace: true });
  }

  return (
    <div>
      <PageHeader
        title={t('dashboard.catalog')}
        description={t('dashboard.catalog_subtitle')}
        large
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

      {tab === 'products' ? (
        <ProductsPage embedded />
      ) : (
        <CategoriesPage embedded />
      )}
    </div>
  );
}
