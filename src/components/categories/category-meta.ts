import { ArrowDownCircle, ArrowUpCircle, Package } from 'lucide-react';
import type { CategoryType } from '@/types/category.types';

export const CATEGORY_TYPE_LABEL: Record<CategoryType, string> = {
  expense: 'Chiqim',
  income: 'Kirim',
  product: 'Mahsulot',
};

export const CATEGORY_TYPE_ICON: Record<
  CategoryType,
  React.ComponentType<{ className?: string }>
> = {
  expense: ArrowUpCircle,
  income: ArrowDownCircle,
  product: Package,
};
