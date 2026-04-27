import { api } from './client';
import type {
  AdjustStockRequest,
  CreateProductRequest,
  ListProductsQuery,
  PaginatedProducts,
  Product,
  UpdateProductRequest,
} from '@/types/product.types';

const BASE = '/web/products';

export const productsApi = {
  async list(query: ListProductsQuery = {}): Promise<PaginatedProducts> {
    const { data } = await api.get<PaginatedProducts>(BASE, { params: query });
    return data;
  },
  async getById(id: number): Promise<Product> {
    const { data } = await api.get<Product>(`${BASE}/${id}`);
    return data;
  },
  async create(body: CreateProductRequest): Promise<Product> {
    const { data } = await api.post<Product>(BASE, body);
    return data;
  },
  async update(id: number, body: UpdateProductRequest): Promise<Product> {
    const { data } = await api.patch<Product>(`${BASE}/${id}`, body);
    return data;
  },
  async adjustStock(id: number, body: AdjustStockRequest): Promise<Product> {
    const { data } = await api.post<Product>(`${BASE}/${id}/adjust-stock`, body);
    return data;
  },
  async remove(id: number): Promise<void> {
    await api.delete(`${BASE}/${id}`);
  },
};
