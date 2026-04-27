import { api } from './client';
import type {
  Category,
  CreateCategoryRequest,
  ListCategoriesQuery,
  ListSystemCategoriesQuery,
  MergedCategory,
  SystemCategory,
  UpdateCategoryRequest,
} from '@/types/category.types';

const BASE = '/web/categories';
const SYSTEM_BASE = '/web/system-categories';

export const categoriesApi = {
  async list(query: ListCategoriesQuery = {}): Promise<MergedCategory[]> {
    const { data } = await api.get<MergedCategory[]>(BASE, { params: query });
    return data;
  },
  async getById(id: number): Promise<Category> {
    const { data } = await api.get<Category>(`${BASE}/${id}`);
    return data;
  },
  async create(body: CreateCategoryRequest): Promise<Category> {
    const { data } = await api.post<Category>(BASE, body);
    return data;
  },
  async update(id: number, body: UpdateCategoryRequest): Promise<Category> {
    const { data } = await api.patch<Category>(`${BASE}/${id}`, body);
    return data;
  },
  async customizeBySystem(
    systemCategoryId: number,
    body: UpdateCategoryRequest,
  ): Promise<Category> {
    const { data } = await api.patch<Category>(
      `${BASE}/by-system/${systemCategoryId}`,
      body,
    );
    return data;
  },
  async remove(id: number): Promise<void> {
    await api.delete(`${BASE}/${id}`);
  },
  async listSystem(
    query: ListSystemCategoriesQuery = {},
  ): Promise<SystemCategory[]> {
    const { data } = await api.get<SystemCategory[]>(SYSTEM_BASE, {
      params: query,
    });
    return data;
  },
};
