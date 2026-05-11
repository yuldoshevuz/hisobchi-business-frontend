import { ArrowDownCircle, ArrowUpCircle, Package } from 'lucide-react';
import i18n from '@/i18n';
import type { CategoryType } from '@/types/category.types';

export const CATEGORY_TYPE_LABEL_KEY: Record<CategoryType, string> = {
  expense: 'category_type.expense',
  income: 'category_type.income',
  product: 'category_type.product',
};

export const CATEGORY_TYPE_LABEL: Record<CategoryType, string> = new Proxy(
  CATEGORY_TYPE_LABEL_KEY,
  {
    get(target, prop: string) {
      const key = target[prop as CategoryType];
      return key ? i18n.t(key) : (prop as string);
    },
  },
) as Record<CategoryType, string>;

export const CATEGORY_TYPE_ICON: Record<
  CategoryType,
  React.ComponentType<{ className?: string }>
> = {
  expense: ArrowUpCircle,
  income: ArrowDownCircle,
  product: Package,
};
