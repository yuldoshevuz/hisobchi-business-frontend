import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { categoriesApi } from '@/api/categories.api';
import { queryKeys } from '@/api/query-keys';
import { tokenStore } from '@/store/token-store';
import type {
  Category,
  CreateCategoryRequest,
  ListCategoriesQuery,
  ListSystemCategoriesQuery,
  MergedCategory,
  SystemCategory,
  UpdateCategoryRequest,
} from '@/types/category.types';

export function useCategories(
  query: ListCategoriesQuery = {},
  options: { enabled?: boolean } = {},
): ReturnType<typeof useQuery<MergedCategory[], Error>> {
  const callerEnabled = options.enabled ?? true;
  return useQuery<MergedCategory[], Error>({
    queryKey: queryKeys.categories.list(query),
    queryFn: () => categoriesApi.list(query),
    enabled: Boolean(tokenStore.getActiveOrgId()) && callerEnabled,
  });
}

export function useSystemCategories(
  query: ListSystemCategoriesQuery = {},
  options: { enabled?: boolean } = {},
): ReturnType<typeof useQuery<SystemCategory[], Error>> {
  const callerEnabled = options.enabled ?? true;
  return useQuery<SystemCategory[], Error>({
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
    mutationFn: (id) => categoriesApi.remove(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.categories.all,
      });
    },
  });
}
