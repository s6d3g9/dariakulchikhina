/**
 * Pagination helpers.
 *
 * Provides:
 *   parsePagination(event)              — extract page/limit/search from URL query
 *   paginateResult(data, total, p, lim) — wrap array + add pagination metadata
 *   paginateArray(items, page, limit)   — slice an in-memory array with pagination
 *
 * Response format (consistent across all list endpoints):
 *   { data: T[], pagination: { page, limit, total, pages, hasNext, hasPrev } }
 */
import type { H3Event } from 'h3'

export interface PaginationParams {
  page:   number
  limit:  number
  search: string
  offset: number
}

export interface PaginationMeta {
  page:    number
  limit:   number
  total:   number
  pages:   number
  hasNext: boolean
  hasPrev: boolean
}

export interface PaginatedResult<T> {
  data:       T[]
  pagination: PaginationMeta
}

const DEFAULT_LIMIT = 20
const MAX_LIMIT     = 100

/**
 * Parse ?page, ?limit, ?search from the request URL query.
 * All parameters are optional and have safe defaults.
 */
export function parsePagination(event: H3Event): PaginationParams {
  const query  = getQuery(event)
  const page   = Math.max(1, parseInt(String(query.page  ?? '1'),                 10) || 1)
  const limit  = Math.min(
    MAX_LIMIT,
    Math.max(1, parseInt(String(query.limit ?? String(DEFAULT_LIMIT)), 10) || DEFAULT_LIMIT),
  )
  const search = String(query.search ?? '').trim()
  return { page, limit, search, offset: (page - 1) * limit }
}

/**
 * Build a paginated response from pre-fetched data + total count.
 * Use when the DB query returns the total separately (e.g. via COUNT(*)).
 */
export function paginateResult<T>(
  data:  T[],
  total: number,
  page:  number,
  limit: number,
): PaginatedResult<T> {
  const pages = total === 0 ? 1 : Math.ceil(total / limit)
  return {
    data,
    pagination: {
      page,
      limit,
      total,
      pages,
      hasNext: page < pages,
      hasPrev: page > 1,
    },
  }
}

/**
 * Paginate an already-loaded in-memory array.
 * Use for small datasets where loading everything first is acceptable.
 */
export function paginateArray<T>(
  items: T[],
  page:  number,
  limit: number,
): PaginatedResult<T> {
  const offset = (page - 1) * limit
  return paginateResult(items.slice(offset, offset + limit), items.length, page, limit)
}

/**
 * Quick helper: parse pagination from event and paginate an array at once.
 */
export function paginateArrayFromEvent<T>(event: H3Event, items: T[]): PaginatedResult<T> {
  const { page, limit } = parsePagination(event)
  return paginateArray(items, page, limit)
}
