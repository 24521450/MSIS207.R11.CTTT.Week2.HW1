import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DataGrid } from './DataGrid'
import type { ColumnDef } from './data-grid.types'

interface Entry {
  id: string
  name: string
  team: string
  projects: number
}

const columns: ColumnDef<Entry>[] = [
  { header: 'Name', accessorKey: 'name', sortable: true },
  { header: 'Team', accessorKey: 'team', sortable: true },
  { header: 'Projects', accessorKey: 'projects', sortable: true },
]

function makeEntries(count: number): Entry[] {
  return Array.from({ length: count }, (_, index) => ({
    id: 'entry-' + String(index + 1).padStart(2, '0'),
    name: 'Member ' + String(index + 1).padStart(2, '0'),
    team: index < 12 ? 'Engineering' : 'Design',
    projects: 20 - index,
  }))
}

function renderGrid(
  data = makeEntries(23),
  onRowSelect = vi.fn<(item: Entry) => void>(),
) {
  const result = render(
    <DataGrid
      ariaLabel="team directory"
      columns={columns}
      data={data}
      getRowId={(entry) => entry.id}
      onRowSelect={onRowSelect}
    />,
  )
  return { ...result, onRowSelect }
}

afterEach(() => {
  cleanup()
})

describe('DataGrid', () => {
  it('renders native table semantics, one roving data cell, and ten rows per page', () => {
    renderGrid()

    expect(screen.getByRole('grid', { name: 'team directory' })).toBeInTheDocument()
    expect(screen.getAllByRole('row')).toHaveLength(11)
    expect(screen.getAllByRole('gridcell')).toHaveLength(30)
    expect(screen.getAllByRole('gridcell').filter((cell) => cell.tabIndex === 0)).toHaveLength(1)
    expect(screen.getAllByRole('gridcell')[0]).toHaveAttribute('tabindex', '0')
    expect(screen.getByRole('columnheader', { name: /Name/ })).toHaveAttribute('scope', 'col')
    expect(screen.getByText('Page 1 of 3')).toBeInTheDocument()
  })

  it('filters, sorts, and paginates in that order and resets to page one for a new filter', async () => {
    const user = userEvent.setup()
    renderGrid()

    await user.click(screen.getByRole('button', { name: 'Go to next page' }))
    expect(screen.getByText('Page 2 of 3')).toBeInTheDocument()

    await user.type(screen.getByRole('searchbox', { name: 'Filter team directory' }), 'Engineering')
    expect(screen.getByText('Page 1 of 2')).toBeInTheDocument()
    expect(screen.getAllByRole('row')).toHaveLength(11)

    await user.click(screen.getByRole('button', { name: 'Sort by Projects' }))
    expect(screen.getByRole('columnheader', { name: /Projects/ })).toHaveAttribute('aria-sort', 'ascending')
    await user.click(screen.getByRole('button', { name: 'Go to next page' }))

    expect(screen.getByText('Page 2 of 2')).toBeInTheDocument()
    const visibleRows = screen.getAllByRole('row').slice(1)
    expect(within(visibleRows[0]!).getByRole('gridcell', { name: 'Member 02' })).toBeInTheDocument()
    expect(within(visibleRows[1]!).getByRole('gridcell', { name: 'Member 01' })).toBeInTheDocument()
  })

  it('moves focus to the remaining pagination control when an edge button disables', async () => {
    const user = userEvent.setup()
    renderGrid(makeEntries(20))

    const previous = screen.getByRole('button', { name: 'Go to previous page' })
    const next = screen.getByRole('button', { name: 'Go to next page' })
    next.focus()
    await user.keyboard('{Enter}')

    expect(screen.getByText('Page 2 of 2')).toBeInTheDocument()
    expect(next).toBeDisabled()
    expect(previous).toHaveFocus()

    await user.keyboard(' ')
    expect(screen.getByText('Page 1 of 2')).toBeInTheDocument()
    expect(previous).toBeDisabled()
    expect(next).toHaveFocus()

    await user.keyboard(' ')
    expect(screen.getByText('Page 2 of 2')).toBeInTheDocument()
    expect(next).toBeDisabled()
    expect(previous).toHaveFocus()

    await user.keyboard('{Enter}')
    expect(screen.getByText('Page 1 of 2')).toBeInTheDocument()
    expect(previous).toBeDisabled()
    expect(next).toHaveFocus()
  })

  it('shows a clear empty result and keeps search available', async () => {
    const user = userEvent.setup()
    renderGrid()

    const search = screen.getByRole('searchbox', { name: 'Filter team directory' })
    await user.type(search, 'no matching person')
    expect(screen.getByText('No records match this search. Try a different term.')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('No records match “no matching person”')
    expect(search).toBeInTheDocument()
    expect(screen.getByText('Page 1 of 1')).toBeInTheDocument()
  })

  it('compares numeric values numerically and exposes aria-sort on the active header', async () => {
    const user = userEvent.setup()
    const values: Entry[] = [
      { id: 'large', name: 'Large', team: 'QA', projects: 100 },
      { id: 'small', name: 'Small', team: 'QA', projects: 2 },
      { id: 'middle', name: 'Middle', team: 'QA', projects: 10 },
    ]
    renderGrid(values)

    const sortButton = screen.getByRole('button', { name: 'Sort by Projects' })
    sortButton.focus()
    await user.keyboard('{Enter}')
    expect(screen.getByRole('columnheader', { name: /Projects/ })).toHaveAttribute('aria-sort', 'ascending')
    expect(screen.getAllByRole('row')[1]).toHaveTextContent('Small')

    await user.keyboard(' ')
    expect(screen.getByRole('columnheader', { name: /Projects/ })).toHaveAttribute('aria-sort', 'descending')
    expect(screen.getAllByRole('row')[1]).toHaveTextContent('Large')
  })

  it('uses arrows between cells, Enter selects, and Space toggles the selected row', async () => {
    const user = userEvent.setup()
    const { onRowSelect } = renderGrid(makeEntries(3))

    const firstName = screen.getByRole('gridcell', { name: 'Member 01' })
    firstName.focus()
    await user.keyboard('{ArrowRight}')
    const firstRow = firstName.closest('tr')!
    const firstTeam = within(firstRow).getAllByRole('gridcell')[1]!
    expect(firstTeam).toHaveFocus()

    await user.keyboard('{ArrowDown}')
    const focusedSecondRow = screen.getAllByRole('row')[2]!
    const secondTeam = within(focusedSecondRow).getAllByRole('gridcell')[1]!
    expect(secondTeam).toHaveFocus()

    await user.keyboard('{ArrowLeft}')
    const secondName = within(focusedSecondRow).getAllByRole('gridcell')[0]!
    expect(secondName).toHaveFocus()

    await user.keyboard('{ArrowUp}')
    const firstVisibleRow = screen.getAllByRole('row')[1]!
    const firstVisibleName = within(firstVisibleRow).getAllByRole('gridcell')[0]!
    expect(firstVisibleName).toHaveFocus()

    await user.keyboard('{ArrowDown}')
    expect(secondName).toHaveFocus()

    await user.keyboard('{Enter}')
    const secondRow = secondName.closest('[role="row"]')
    expect(secondRow).toHaveAttribute('aria-selected', 'true')
    expect(onRowSelect).toHaveBeenCalledWith(expect.objectContaining({ id: 'entry-02' }))

    await user.keyboard(' ')
    expect(secondRow).toHaveAttribute('aria-selected', 'false')
    expect(onRowSelect).toHaveBeenCalledTimes(2)
  })

  it('keeps selection by row ID while sorting and paging away and back', async () => {
    const user = userEvent.setup()
    const selectionEntries = makeEntries(23).map((entry, index) => ({
      ...entry,
      projects: index + 1,
    }))
    renderGrid(selectionEntries)

    const selected = screen.getByRole('gridcell', { name: 'Member 03' })
    selected.focus()
    await user.keyboard('{Enter}')
    expect(selected.closest('[role="row"]')).toHaveAttribute('aria-selected', 'true')

    await user.click(screen.getByRole('button', { name: 'Sort by Projects' }))
    const reorderedSelected = screen.getByRole('gridcell', { name: 'Member 03' })
    expect(reorderedSelected.closest('[role="row"]')).toHaveAttribute('aria-selected', 'true')

    await user.click(screen.getByRole('button', { name: 'Go to next page' }))
    await user.click(screen.getByRole('button', { name: 'Go to previous page' }))
    expect(screen.getByRole('gridcell', { name: 'Member 03' }).closest('[role="row"]'))
      .toHaveAttribute('aria-selected', 'true')
  })

  it('keeps a selected row ID while filtering it out and showing it again', async () => {
    const user = userEvent.setup()
    renderGrid()

    const selected = screen.getByRole('gridcell', { name: 'Member 01' })
    selected.focus()
    await user.keyboard('{Enter}')

    const search = screen.getByRole('searchbox', { name: 'Filter team directory' })
    await user.type(search, 'Design')
    expect(screen.queryByRole('gridcell', { name: 'Member 01' })).not.toBeInTheDocument()

    await user.clear(search)
    expect(screen.getByRole('gridcell', { name: 'Member 01' }).closest('[role="row"]'))
      .toHaveAttribute('aria-selected', 'true')
  })

  it('keeps the focused cell attached to its row ID during an in-grid sort', () => {
    const data = makeEntries(5)
    renderGrid(data)

    const focusedCell = screen.getByRole('gridcell', { name: 'Member 03' })
    focusedCell.focus()
    fireEvent.click(screen.getByRole('button', { name: 'Sort by Projects' }))

    expect(screen.getByRole('gridcell', { name: 'Member 03' })).toHaveFocus()
  })

  it('keeps focused cell identity through reorder and moves focus when that ID disappears', () => {
    const data = makeEntries(4)
    const { rerender } = renderGrid(data)

    const focusedCell = screen.getByRole('gridcell', { name: 'Member 03' })
    focusedCell.focus()
    rerender(
      <DataGrid
        ariaLabel="team directory"
        columns={columns}
        data={[...data].reverse()}
        getRowId={(entry) => entry.id}
      />,
    )
    expect(screen.getByRole('gridcell', { name: 'Member 03' })).toHaveFocus()

    rerender(
      <DataGrid
        ariaLabel="team directory"
        columns={columns}
        data={data.filter((entry) => entry.id !== 'entry-03')}
        getRowId={(entry) => entry.id}
      />,
    )
    expect(screen.getByRole('gridcell', { name: 'Member 01' })).toHaveFocus()
  })

  it('moves focus to the labelled search field when all rows disappear', () => {
    const data = makeEntries(2)
    const { rerender } = renderGrid(data)

    screen.getByRole('gridcell', { name: 'Member 02' }).focus()
    rerender(
      <DataGrid
        ariaLabel="team directory"
        columns={columns}
        data={[]}
        getRowId={(entry) => entry.id}
      />,
    )

    expect(screen.getByRole('searchbox', { name: 'Filter team directory' })).toHaveFocus()
    expect(screen.getByText('There are no records to display.')).toBeInTheDocument()
  })

  it('uses stable string IDs when getRowId is omitted', async () => {
    const user = userEvent.setup()
    const data = makeEntries(3)
    const { rerender } = render(
      <DataGrid ariaLabel="team directory" columns={columns} data={data} />,
    )

    const firstMember = screen.getByRole('gridcell', { name: 'Member 01' })
    firstMember.focus()
    await user.keyboard('{Enter}')
    expect(firstMember.closest('[role="row"]')).toHaveAttribute('aria-selected', 'true')

    rerender(
      <DataGrid
        ariaLabel="team directory"
        columns={columns}
        data={[...data].reverse()}
      />,
    )
    expect(screen.getByRole('gridcell', { name: 'Member 01' }).closest('[role="row"]'))
      .toHaveAttribute('aria-selected', 'true')
  })




})








