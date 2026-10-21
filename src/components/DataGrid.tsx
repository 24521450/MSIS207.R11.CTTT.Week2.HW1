import {
  useCallback,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type FocusEvent,
  type KeyboardEvent,
} from 'react'
import type {
  DataGridProps,
  SortState,
} from './data-grid.types'
import { filterRows, paginateRows, sortRows } from './grid-model'

const PAGE_SIZE = 10

interface ActiveCell<T> {
  rowId: string
  columnKey: keyof T
}

function cellReferenceKey<T>(rowId: string, columnKey: keyof T): string {
  return JSON.stringify([rowId, typeof columnKey, String(columnKey)])
}

function displayText(value: unknown): string {
  if (value == null) return ''
  return String(value)
}

function isRecord(value: unknown): value is Record<PropertyKey, unknown> {
  return typeof value === 'object' && value !== null
}

export function DataGrid<T>({
  data,
  columns,
  onRowSelect,
  ariaLabel,
  getRowId,
}: DataGridProps<T>) {
  const generatedIds = useRef(new WeakMap<object, string>())
  const nextGeneratedId = useRef(0)
  const cellElements = useRef(new Map<string, HTMLTableCellElement>())
  const focusedCellKey = useRef<string | null>(null)
  const searchInput = useRef<HTMLInputElement>(null)
  const id = useId()
  const instructionsId = id + '-keyboard-help'
  const statusId = id + '-result-status'

  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [sort, setSort] = useState<SortState<T> | null>(null)
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null)
  const [activeCell, setActiveCell] = useState<ActiveCell<T> | null>(null)

  const resolveRowId = useCallback(
    (item: T): string => {
      if (getRowId) return getRowId(item)

      if (!isRecord(item)) {
        throw new TypeError(
          'DataGrid rows must be objects; pass getRowId when rows do not have an id field.',
        )
      }

      const itemId = item.id
      if (typeof itemId === 'string' || typeof itemId === 'number') {
        return 'id:' + typeof itemId + ':' + String(itemId)
      }

      const objectItem = item as object
      const existingId = generatedIds.current.get(objectItem)
      if (existingId) return existingId

      nextGeneratedId.current += 1
      const stableId = 'object:' + nextGeneratedId.current
      generatedIds.current.set(objectItem, stableId)
      return stableId
    },
    [getRowId],
  )

  const allRowIds = useMemo(
    () => data.map((item) => resolveRowId(item)),
    [data, resolveRowId],
  )
  if (new Set(allRowIds).size !== allRowIds.length) {
    throw new Error('DataGrid requires a unique stable row ID for every row.')
  }

  const rowIdByItem = useMemo(
    () =>
      new Map(
        data.map((item, index) => [
          item,
          allRowIds[index] ?? resolveRowId(item),
        ] as const),
      ),
    [allRowIds, data, resolveRowId],
  )
  const rowIdFor = useCallback(
    (item: T): string => rowIdByItem.get(item) ?? resolveRowId(item),
    [resolveRowId, rowIdByItem],
  )

  const filteredRows = useMemo(
    () => filterRows(data, query, columns),
    [columns, data, query],
  )
  const sortedRows = useMemo(
    () => sortRows(filteredRows, sort),
    [filteredRows, sort],
  )
  const pageResult = useMemo(
    () => paginateRows(sortedRows, page, PAGE_SIZE),
    [page, sortedRows],
  )
  const visibleRows = pageResult.rows

  const isCellVisible = useCallback(
    (cell: ActiveCell<T> | null): boolean => {
      if (!cell || !columns.some((column) => column.accessorKey === cell.columnKey)) {
        return false
      }
      return visibleRows.some((item) => rowIdFor(item) === cell.rowId)
    },
    [columns, rowIdFor, visibleRows],
  )

  useLayoutEffect(() => {
    if (isCellVisible(activeCell)) return

    const firstRow = visibleRows[0]
    const firstColumn = columns[0]
    if (!firstRow || !firstColumn) {
      setActiveCell(null)
      if (focusedCellKey.current !== null) {
        searchInput.current?.focus()
        focusedCellKey.current = null
      }
      return
    }

    const replacement: ActiveCell<T> = {
      rowId: rowIdFor(firstRow),
      columnKey: firstColumn.accessorKey,
    }
    setActiveCell(replacement)

    if (focusedCellKey.current !== null) {
      const replacementKey = cellReferenceKey(
        replacement.rowId,
        replacement.columnKey,
      )
      cellElements.current.get(replacementKey)?.focus()
    }
  }, [activeCell, columns, isCellVisible, rowIdFor, visibleRows])

  const handleSort = useCallback((columnKey: keyof T) => {
    setSort((current) => {
      if (!current || current.key !== columnKey) {
        return { key: columnKey, direction: 'ascending' }
      }
      return {
        key: columnKey,
        direction:
          current.direction === 'ascending' ? 'descending' : 'ascending',
      }
    })
  }, [])

  const selectRow = useCallback(
    (item: T) => {
      setSelectedRowId(rowIdFor(item))
      onRowSelect?.(item)
    },
    [onRowSelect, rowIdFor],
  )

  const toggleRow = useCallback(
    (item: T) => {
      const rowId = rowIdFor(item)
      setSelectedRowId((current) => (current === rowId ? null : rowId))
      onRowSelect?.(item)
    },
    [onRowSelect, rowIdFor],
  )

  const focusCell = useCallback(
    (rowIndex: number, columnIndex: number) => {
      const item = visibleRows[rowIndex]
      const column = columns[columnIndex]
      if (!item || !column) return

      const target: ActiveCell<T> = {
        rowId: rowIdFor(item),
        columnKey: column.accessorKey,
      }
      setActiveCell(target)
      cellElements.current
        .get(cellReferenceKey(target.rowId, target.columnKey))
        ?.focus()
    },
    [columns, rowIdFor, visibleRows],
  )

  const handleCellKeyDown = useCallback(
    (
      event: KeyboardEvent<HTMLTableCellElement>,
      item: T,
      rowIndex: number,
      columnIndex: number,
    ) => {
      let nextRow = rowIndex
      let nextColumn = columnIndex

      switch (event.key) {
        case 'ArrowUp':
          nextRow -= 1
          break
        case 'ArrowDown':
          nextRow += 1
          break
        case 'ArrowLeft':
          nextColumn -= 1
          break
        case 'ArrowRight':
          nextColumn += 1
          break
        case 'Enter':
          event.preventDefault()
          selectRow(item)
          return
        case ' ':
          event.preventDefault()
          toggleRow(item)
          return
        default:
          return
      }

      event.preventDefault()
      const lastRow = visibleRows.length - 1
      const lastColumn = columns.length - 1
      focusCell(
        Math.min(lastRow, Math.max(0, nextRow)),
        Math.min(lastColumn, Math.max(0, nextColumn)),
      )
    },
    [columns.length, focusCell, selectRow, toggleRow, visibleRows.length],
  )

  const handleTableFocusCapture = useCallback(
    (event: FocusEvent<HTMLTableElement>) => {
      const target = event.target
      if (
        target instanceof HTMLTableCellElement &&
        target.getAttribute('role') === 'gridcell'
      ) {
        const row = target.parentElement
        const rowId = row?.getAttribute('data-row-id')
        const columnKey = target.getAttribute('data-column-key')
        if (rowId !== null && rowId !== undefined && columnKey !== null) {
          focusedCellKey.current = JSON.stringify([
            rowId,
            target.getAttribute('data-column-type'),
            columnKey,
          ])
          return
        }
      }
      focusedCellKey.current = null
    },
    [],
  )

  const handleTableBlurCapture = useCallback(
    (event: FocusEvent<HTMLTableElement>) => {
      const nextTarget = event.relatedTarget
      if (
        !(nextTarget instanceof Node) ||
        !event.currentTarget.contains(nextTarget)
      ) {
        focusedCellKey.current = null
      }
    },
    [],
  )

  const selectedItem =
    selectedRowId === null
      ? undefined
      : data.find((item) => rowIdFor(item) === selectedRowId)
  const selectedLabel =
    selectedItem === undefined || selectedItem === null || columns[0] === undefined
      ? ''
      : displayText(selectedItem[columns[0].accessorKey])
  const statusText =
    filteredRows.length === 0
      ? 'No records match “' + query.trim() + '”. Page 1 of 1.'
      : 'Showing ' +
        ((pageResult.page - 1) * PAGE_SIZE + 1) +
        ' to ' +
        Math.min(pageResult.page * PAGE_SIZE, filteredRows.length) +
        ' of ' +
        filteredRows.length +
        ' records. Page ' +
        pageResult.page +
        ' of ' +
        pageResult.pageCount +
        '.' +
        (selectedItem === undefined || selectedItem === null
          ? ' No row selected.'
          : ' Selected: ' + selectedLabel + '.')

  return (
    <div className="data-grid">
      <div className="data-grid__toolbar">
        <div className="data-grid__search">
          <label htmlFor={id + '-search'}>Filter {ariaLabel}</label>
          <div className="data-grid__search-field">
            <span className="data-grid__search-icon" aria-hidden="true" />
            <input
              ref={searchInput}
              id={id + '-search'}
              type="search"
              value={query}
              onChange={(event) => {
                setQuery(event.currentTarget.value)
                setPage(1)
              }}
              aria-describedby={instructionsId}
              placeholder="Search names, teams, or offices"
            />
          </div>
        </div>
        <p className="data-grid__record-count" aria-hidden="true">
          {filteredRows.length} {filteredRows.length === 1 ? 'record' : 'records'}
        </p>
      </div>

      <p id={instructionsId} className="data-grid__instructions">
        Use the arrow keys to move between data cells. Press Enter to select a
        row or Space to toggle it. Sort buttons work with Enter or Space; Tab
        moves through the controls normally. On small screens, scroll the table horizontally.
      </p>

      <div className="data-grid__table-wrap">
        <table
          role="grid"
          aria-label={ariaLabel}
          aria-describedby={instructionsId + ' ' + statusId}
          aria-rowcount={Math.max(2, filteredRows.length + 1)}
          aria-colcount={columns.length}
          onFocusCapture={handleTableFocusCapture}
          onBlurCapture={handleTableBlurCapture}
        >
          <thead>
            <tr role="row" aria-rowindex={1}>
              {columns.map((column, columnIndex) => {
                const isSorted = sort?.key === column.accessorKey
                const direction = isSorted ? sort.direction : undefined
                const sortLabel = isSorted
                  ? 'Sort by ' + column.header + ', currently ' + direction
                  : 'Sort by ' + column.header

                return (
                  <th
                    key={String(column.accessorKey)}
                    scope="col"
                    role="columnheader"
                    aria-colindex={columnIndex + 1}
                    aria-sort={direction}
                  >
                    {column.sortable ? (
                      <button
                        type="button"
                        className="data-grid__sort-button"
                        onClick={() => handleSort(column.accessorKey)}
                        aria-label={sortLabel}
                        aria-pressed={isSorted}
                      >
                        <span>{column.header}</span>
                        <span
                          className="data-grid__sort-indicator"
                          aria-hidden="true"
                        >
                          {direction === 'ascending'
                            ? '↑'
                            : direction === 'descending'
                              ? '↓'
                              : '↕'}
                        </span>
                      </button>
                    ) : (
                      column.header
                    )}
                  </th>
                )
              })}
            </tr>
          </thead>

          <tbody>
            {visibleRows.length > 0 ? (
              visibleRows.map((item, rowIndex) => {
                const rowId = rowIdFor(item)
                return (
                  <tr
                    key={rowId}
                    role="row"
                    data-row-id={rowId}
                    aria-selected={selectedRowId === rowId}
                    aria-rowindex={(pageResult.page - 1) * PAGE_SIZE + rowIndex + 2}
                  >
                    {columns.map((column, columnIndex) => {
                      const referenceKey = cellReferenceKey(
                        rowId,
                        column.accessorKey,
                      )
                      const isActive =
                        activeCell?.rowId === rowId &&
                        activeCell.columnKey === column.accessorKey

                      return (
                        <td
                          key={String(column.accessorKey)}
                          ref={(element) => {
                            if (element) {
                              cellElements.current.set(referenceKey, element)
                            } else {
                              cellElements.current.delete(referenceKey)
                            }
                          }}
                          role="gridcell"
                          data-column-key={String(column.accessorKey)}
                          data-column-type={typeof column.accessorKey}
                          aria-colindex={columnIndex + 1}
                          tabIndex={isActive ? 0 : -1}
                          onFocus={() =>
                            setActiveCell({
                              rowId,
                              columnKey: column.accessorKey,
                            })
                          }
                          onClick={() => selectRow(item)}
                          onKeyDown={(event) =>
                            handleCellKeyDown(
                              event,
                              item,
                              rowIndex,
                              columnIndex,
                            )
                          }
                        >
                          {displayText(item[column.accessorKey])}
                          {columnIndex === 0 && selectedRowId === rowId ? (
                            <span
                              className="data-grid__selected-badge"
                              aria-hidden="true"
                            >
                              ✓ Selected
                            </span>
                          ) : null}
                        </td>
                      )
                    })}
                  </tr>
                )
              })
            ) : (
              <tr role="row" aria-rowindex={2}>
                <td
                  className="data-grid__empty"
                  role="gridcell"
                  colSpan={Math.max(1, columns.length)}
                  tabIndex={-1}
                >
                  {query.trim()
                    ? 'No records match this search. Try a different term.'
                    : 'There are no records to display.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="data-grid__footer">
        <p
          id={statusId}
          className="data-grid__status"
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          {statusText}
        </p>
        <nav
          className="data-grid__pagination"
          aria-label={ariaLabel + ' pagination'}
        >
          <button
            type="button"
            className="data-grid__page-button"
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            disabled={pageResult.page <= 1}
            aria-label="Go to previous page"
          >
            <span aria-hidden="true">←</span>
            <span>Previous</span>
          </button>
          <span className="data-grid__page-number">
            Page {pageResult.page} of {pageResult.pageCount}
          </span>
          <button
            type="button"
            className="data-grid__page-button"
            onClick={() =>
              setPage((current) =>
                Math.min(pageResult.pageCount, current + 1),
              )
            }
            disabled={pageResult.page >= pageResult.pageCount}
            aria-label="Go to next page"
          >
            <span>Next</span>
            <span aria-hidden="true">→</span>
          </button>
        </nav>
      </div>
    </div>
  )
}




