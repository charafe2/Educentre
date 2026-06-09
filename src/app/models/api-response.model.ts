export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
  errors: unknown;
  meta?: unknown;
}

export interface PaginationMeta {
  current_page: number;
  per_page: number;
  total: number;
  last_page: number;
  from: number | null;
  to: number | null;
}

export interface PaginatedMeta<TSummary = unknown> {
  pagination: PaginationMeta;
  summary?: TSummary;
}

export interface PaginatedApiResponse<T, TSummary = unknown> extends ApiResponse<T[]> {
  meta: PaginatedMeta<TSummary>;
}
