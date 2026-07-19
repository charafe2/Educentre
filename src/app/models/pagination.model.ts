import { ApiResponse } from './api-response.model';

export interface PaginationMeta {
  currentPage: number;
  lastPage: number;
  perPage: number;
  total: number;
}


export function paginationPages(meta: PaginationMeta, radius = 2): number[] {
  const start = Math.max(1, meta.currentPage - radius);
  const end = Math.min(meta.lastPage, meta.currentPage + radius);
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

export interface PaginatedApiResponse<T, S = unknown> extends ApiResponse<T[]> {
  pagination: PaginationMeta;
  summary: S;
}
