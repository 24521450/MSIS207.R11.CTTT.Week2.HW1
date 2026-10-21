import type { ColumnDef, PaginationResult, SortState } from './data-grid.types'

const textCollator = new Intl.Collator('en', {
  numeric: true,
  sensitivity: 'base',
})

function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase()
}

function searchableText(value: unknown): string {
  return normalize(String(value ?? ''))
}

function assertPageSize(pageSize: number): void {
  if (!Number.isInteger(pageSize) || pageSize < 1) {
    throw new RangeError('pageSize must be a positive integer')
  }
}

function compareValues(left: unknown, right: unknown): number {
  if (left === right) return 0
  if (left == null) return 1
  if (right == null) return -1

  if (typeof left === 'number' && typeof right === 'number') {
    if (Number.isNaN(left)) return Number.isNaN(right) ? 0 : 1
    if (Number.isNaN(right)) return -1
    return left < right ? -1 : 1
  }

  return textCollator.compare(String(left), String(right))
}

export function filterRows<T>(
  data: readonly T[],
  query: string,
  columns: readonly ColumnDef<T>[],
): T[] {
  const normalizedQuery = normalize(query.trim())
  if (!normalizedQuery) return [...data]

  return data.filter((item) =>
    columns.some((column) =>
      searchableText(item[column.accessorKey]).includes(normalizedQuery),
    ),
  )
}

export function sortRows<T>(
  rows: readonly T[],
  sort: SortState<T> | null,
): T[] {
  if (!sort) return [...rows]

  const multiplier = sort.direction === 'ascending' ? 1 : -1
  return [...rows].sort((left, right) => {
    const comparison = compareValues(left[sort.key], right[sort.key])
    if (left[sort.key] == null || right[sort.key] == null) {
      return comparison
    }
    return comparison * multiplier
  })
}

export function getPageCount(totalRows: number, pageSize = 10): number {
  assertPageSize(pageSize)
  return Math.max(1, Math.ceil(Math.max(0, totalRows) / pageSize))
}

export function paginateRows<T>(
  rows: readonly T[],
  requestedPage: number,
  pageSize = 10,
): PaginationResult<T> {
  assertPageSize(pageSize)
  const pageCount = getPageCount(rows.length, pageSize)
  const safePage = Number.isFinite(requestedPage) ? Math.trunc(requestedPage) : 1
  const page = Math.min(pageCount, Math.max(1, safePage))
  const start = (page - 1) * pageSize

  return {
    rows: rows.slice(start, start + pageSize),
    page,
    pageCount,
  }
}
