import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { productsApi } from '@/api/products.api';
import { queryKeys } from '@/api/query-keys';
import { tokenStore } from '@/store/token-store';
import type {
  AdjustStockRequest,
  CreateProductRequest,
  ListProductsQuery,
  PaginatedProducts,
  Product,
  UpdateProductRequest,
} from '@/types/product.types';

const DEFAULT_PAGE_SIZE = 20;

export function useProducts(
  query: ListProductsQuery = {},
  options: { enabled?: boolean } = {},
): ReturnType<typeof useQuery<PaginatedProducts, Error>> {
  const callerEnabled = options.enabled ?? true;
  return useQuery<PaginatedProducts, Error>({
    queryKey: queryKeys.products.list(query),
    queryFn: () => productsApi.list(query),
    enabled: Boolean(tokenStore.getActiveOrgId()) && callerEnabled,
  });
}

export function useProductsInfinite(
  query: Omit<ListProductsQuery, 'page'> = {},
  options: { enabled?: boolean } = {},
): ReturnType<typeof useInfiniteQuery<PaginatedProducts, Error>> {
  const callerEnabled = options.enabled ?? true;
  const limit = query.limit ?? DEFAULT_PAGE_SIZE;
  return useInfiniteQuery<PaginatedProducts, Error>({
    queryKey: queryKeys.products.list({ ...query, limit }),
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      productsApi.list({ ...query, page: pageParam as number, limit }),
    getNextPageParam: (last) =>
      last.meta.page < last.meta.totalPages ? last.meta.page + 1 : undefined,
    enabled: Boolean(tokenStore.getActiveOrgId()) && callerEnabled,
  });
}

export function useCreateProduct(): ReturnType<
  typeof useMutation<Product, Error, CreateProductRequest>
> {
  const queryContact = useQueryClient();
  return useMutation<Product, Error, CreateProductRequest>({
    mutationFn: (body) => productsApi.create(body),
    onSuccess: () => {
      void queryContact.invalidateQueries({ queryKey: queryKeys.products.all });
    },
  });
}

interface UpdateProductVars {
  id: number;
  body: UpdateProductRequest;
}

export function useUpdateProduct(): ReturnType<
  typeof useMutation<Product, Error, UpdateProductVars>
> {
  const queryContact = useQueryClient();
  return useMutation<Product, Error, UpdateProductVars>({
    mutationFn: ({ id, body }) => productsApi.update(id, body),
    onSuccess: () => {
      void queryContact.invalidateQueries({ queryKey: queryKeys.products.all });
    },
  });
}

interface AdjustStockVars {
  id: number;
  body: AdjustStockRequest;
}

export function useAdjustStock(): ReturnType<
  typeof useMutation<Product, Error, AdjustStockVars>
> {
  const queryContact = useQueryClient();
  return useMutation<Product, Error, AdjustStockVars>({
    mutationFn: ({ id, body }) => productsApi.adjustStock(id, body),
    onSuccess: () => {
      void queryContact.invalidateQueries({ queryKey: queryKeys.products.all });
    },
  });
}

export function useDeleteProduct(): ReturnType<
  typeof useMutation<void, Error, number>
> {
  const queryContact = useQueryClient();
  return useMutation<void, Error, number>({
    mutationFn: (id) => productsApi.remove(id),
    onSuccess: () => {
      void queryContact.invalidateQueries({ queryKey: queryKeys.products.all });
    },
  });
}
