import { useSearchParams } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { CategoriesPage } from './CategoriesPage';
import { ProductsPage } from './ProductsPage';
import { cn } from '@/lib/utils';
import { tgHapticSelection } from '@/lib/telegram';

type KatalogTab = 'products' | 'categories';

const TABS: ReadonlyArray<{ id: KatalogTab; label: string }> = [
  { id: 'products', label: 'Mahsulotlar' },
  { id: 'categories', label: 'Kategoriyalar' },
];

function readTab(value: string | null): KatalogTab {
  return value === 'categories' ? 'categories' : 'products';
}

export function KatalogPage(): React.ReactElement {
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
        title="Katalog"
        description="Mahsulotlar va kategoriyalar"
        large
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

      {tab === 'products' ? (
        <ProductsPage embedded />
      ) : (
        <CategoriesPage embedded />
      )}
    </div>
  );
}
