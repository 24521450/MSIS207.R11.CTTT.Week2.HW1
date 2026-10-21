import { describe, expect, it } from 'vitest'
import type { ColumnDef } from './data-grid.types'
import { filterRows, getPageCount, paginateRows, sortRows } from './grid-model'

interface Person {
  id: string
  name: string
  department: string
  projects: number
}

const columns: ColumnDef<Person>[] = [
  { header: 'Name', accessorKey: 'name' },
  { header: 'Department', accessorKey: 'department' },
  { header: 'Projects', accessorKey: 'projects' },
]

const people: Person[] = [
  { id: 'p-1', name: 'Zoë Kim', department: 'Design', projects: 12 },
  { id: 'p-2', name: 'Ari Chen', department: 'Engineering', projects: 2 },
  { id: 'p-3', name: 'Mina Park', department: 'Engineering', projects: 10 },
  { id: 'p-4', name: 'Léa Martin', department: 'Operations', projects: 4 },
]

describe('grid data model', () => {
  it('filters case-insensitively across visible columns and ignores diacritics', () => {
    expect(filterRows(people, 'lea', columns).map((person) => person.id)).toEqual(['p-4'])
    expect(filterRows(people, 'ENGINEERING', columns).map((person) => person.id)).toEqual([
      'p-2',
      'p-3',
    ])
  })

  it('compares numeric values numerically and returns a new array', () => {
    const sorted = sortRows(people, { key: 'projects', direction: 'ascending' })

    expect(sorted.map((person) => person.projects)).toEqual([2, 4, 10, 12])
    expect(sorted).not.toBe(people)
    expect(people.map((person) => person.projects)).toEqual([12, 2, 10, 4])
  })

  it('sorts text in both directions with locale-aware numeric collation', () => {
    expect(sortRows(people, { key: 'name', direction: 'ascending' }).map((person) => person.name))
      .toEqual(['Ari Chen', 'Léa Martin', 'Mina Park', 'Zoë Kim'])
    expect(sortRows(people, { key: 'name', direction: 'descending' })[0]?.name).toBe('Zoë Kim')
  })

  it('runs filtering, sorting, and pagination as separate composable steps', () => {
    const filtered = filterRows(people, 'engineering', columns)
    const sorted = sortRows(filtered, { key: 'projects', direction: 'descending' })
    const page = paginateRows(sorted, 1, 1)

    expect(page.rows.map((person) => person.id)).toEqual(['p-3'])
    expect(page.page).toBe(1)
    expect(page.pageCount).toBe(2)
  })

  it('clamps pages and keeps a navigable first page for empty data', () => {
    expect(getPageCount(0)).toBe(1)
    expect(paginateRows([], 8)).toEqual({ rows: [], page: 1, pageCount: 1 })
    expect(paginateRows(people, 20, 2)).toEqual({
      rows: [{ id: 'p-3', name: 'Mina Park', department: 'Engineering', projects: 10 },
        { id: 'p-4', name: 'Léa Martin', department: 'Operations', projects: 4 }],
      page: 2,
      pageCount: 2,
    })
  })

  it('rejects invalid page sizes', () => {
    expect(() => paginateRows(people, 1, 0)).toThrow(RangeError)
  })
})
