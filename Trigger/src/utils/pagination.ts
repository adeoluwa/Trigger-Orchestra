import {PaginationParams, PaginatedResult } from '@shared/types';

export function getPaginationParams(query: Record<string, unknown>): PaginationParams {
  const page = Math.max(1, parseInt(String(query.page ?? 1), 10))
  const limit = Math.min(100, Math.max(1, parseInt(String(query.limit ?? 20), 10)))

  return { page, limit}
}

export function buildPaginatedResult<T>(
  data:T[],
  total: number,
  params: PaginationParams
): PaginatedResult<T> {
  return {
    data,
    total,
    page: params.page,
    limit: params.limit,
    totalPages: Math.ceil(total / params.limit),
  }
}

export function getSkip(params: PaginationParams): number {
  return (params.page - 1) * params.limit
}