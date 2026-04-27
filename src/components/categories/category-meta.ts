import { ArrowDownCircle, ArrowUpCircle, Package } from 'lucide-react';
import type { CategoryType } from '@/types/category.types';

export const CATEGORY_TYPE_LABEL: Record<CategoryType, string> = {
  EXPENSE: 'Chiqim',
  INCOME: 'Kirim',
  PRODUCT: 'Mahsulot',
};

export const CATEGORY_TYPE_ICON: Record<
  CategoryType,
  React.ComponentType<{ className?: string }>
> = {
  EXPENSE: ArrowUpCircle,
  INCOME: ArrowDownCircle,
  PRODUCT: Package,
};
