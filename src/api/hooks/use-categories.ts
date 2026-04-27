import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { categoriesApi } from '@/api/categories.api';
import { queryKeys } from '@/api/query-keys';
import { tokenStore } from '@/store/token-store';
import type {
  Category,
  CreateCategoryRequest,
  ListCategoriesQuery,
  ListSystemCategoriesQuery,
  PaginatedCategories,
  PaginatedSystemCategories,
  UpdateCategoryRequest,
} from '@/types/category.types';

const DEFAULT_PAGE_SIZE = 20;

export function useCategories(
  query: ListCategoriesQuery = {},
  options: { enabled?: boolean } = {},
): ReturnType<typeof useQuery<PaginatedCategories, Error>> {
  const callerEnabled = options.enabled ?? true;
  return useQuery<PaginatedCategories, Error>({
    queryKey: queryKeys.categories.list(query),
    queryFn: () => categoriesApi.list(query),
    enabled: Boolean(tokenStore.getActiveOrgId()) && callerEnabled,
  });
}

/**
 * "Load more" pagination for the categories page. Each page is appended to the
 * client cache; the page emits `pages: PaginatedCategories[]` which we flatten
 * into a single rendered list.
 */
export function useCategoriesInfinite(
  query: Omit<ListCategoriesQuery, 'page'> = {},
  options: { enabled?: boolean } = {},
): ReturnType<typeof useInfiniteQuery<PaginatedCategories, Error>> {
  const callerEnabled = options.enabled ?? true;
  const limit = query.limit ?? DEFAULT_PAGE_SIZE;
  return useInfiniteQuery<PaginatedCategories, Error>({
    queryKey: queryKeys.categories.list({ ...query, limit }),
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      categoriesApi.list({ ...query, page: pageParam as number, limit }),
    getNextPageParam: (last) =>
      last.meta.page < last.meta.totalPages ? last.meta.page + 1 : undefined,
    enabled: Boolean(tokenStore.getActiveOrgId()) && callerEnabled,
  });
}

export function useSystemCategories(
  query: ListSystemCategoriesQuery = {},
  options: { enabled?: boolean } = {},
): ReturnType<typeof useQuery<PaginatedSystemCategories, Error>> {
  const callerEnabled = options.enabled ?? true;
  return useQuery<PaginatedSystemCategories, Error>({
    queryKey: queryKeys.categories.system(query),
    queryFn: () => categoriesApi.listSystem(query),
    enabled: Boolean(tokenStore.getActiveOrgId()) && callerEnabled,
  });
}

export function useCreateCategory(): ReturnType<
  typeof useMutation<Category, Error, CreateCategoryRequest>
> {
  const queryClient = useQueryClient();
  return useMutation<Category, Error, CreateCategoryRequest>({
    mutationFn: (body) => categoriesApi.create(body),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.categories.all,
      });
    },
  });
}

interface UpdateCategoryVars {
  id: number;
  body: UpdateCategoryRequest;
}

export function useUpdateCategory(): ReturnType<
  typeof useMutation<Category, Error, UpdateCategoryVars>
> {
  const queryClient = useQueryClient();
  return useMutation<Category, Error, UpdateCategoryVars>({
    mutationFn: ({ id, body }) => categoriesApi.update(id, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.categories.all,
      });
    },
  });
}

interface CustomizeBySystemVars {
  systemCategoryId: number;
  body: UpdateCategoryRequest;
}

export function useCustomizeSystemCategory(): ReturnType<
  typeof useMutation<Category, Error, CustomizeBySystemVars>
> {
  const queryClient = useQueryClient();
  return useMutation<Category, Error, CustomizeBySystemVars>({
    mutationFn: ({ systemCategoryId, body }) =>
      categoriesApi.customizeBySystem(systemCategoryId, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.categories.all,
      });
    },
  });
}

/** Hard-deletes an instantiated row. Backend rejects when in use. */
export function useDeleteCategory(): ReturnType<
  typeof useMutation<void, Error, number>
> {
  const queryClient = useQueryClient();
  return useMutation<void, Error, number>({
    mutationFn: (id) => categoriesApi.archive(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.categories.all,
      });
    },
  });
}
