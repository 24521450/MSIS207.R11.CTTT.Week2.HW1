import { useState } from 'react'
import { DataGrid } from './components/DataGrid'
import type { ColumnDef } from './components/data-grid.types'
import { employees, type Employee } from './data/employees'

const employeeColumns: ColumnDef<Employee>[] = [
  { header: 'Team member', accessorKey: 'name', sortable: true },
  { header: 'Department', accessorKey: 'department', sortable: true },
  { header: 'Office', accessorKey: 'office', sortable: true },
  { header: 'Projects', accessorKey: 'projects', sortable: true },
  { header: 'Utilization (%)', accessorKey: 'utilization', sortable: true },
]

const departmentCount = new Set(employees.map((employee) => employee.department)).size
const officeCount = new Set(employees.map((employee) => employee.office)).size

export default function App() {
  const [lastRowAction, setLastRowAction] = useState<Employee | null>(null)

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>

      <header className="site-header">
        <div className="site-header__inner">
          <div className="brand-lockup">
            <span className="brand-mark" aria-hidden="true">
              <svg viewBox="0 0 32 32" focusable="false">
                <path d="M5 5h9v9H5zM18 5h9v9h-9zM5 18h9v9H5z" />
                <path d="M18 18h9v4h-9zM18 25h4v2h-4z" />
              </svg>
            </span>
            <span className="brand-copy">
              <span className="brand-name">Fieldnotes</span>
              <span className="brand-caption">People operations</span>
            </span>
          </div>

          <div className="header-context">
            <span className="course-tag">MSIS207 · HW 1</span>
            <span className="header-context__label">Accessible data grid</span>
          </div>
        </div>
      </header>

      <main id="main-content" className="page-content">
        <section className="page-intro" aria-labelledby="page-title">
          <div className="page-intro__copy">
            <p className="eyebrow">
              <span className="eyebrow__line" aria-hidden="true" />
              People directory <span aria-hidden="true">/</span> 2026
            </p>
            <h1 id="page-title">Good work starts with a clear view.</h1>
            <p className="page-intro__description">
              Find the right people, see where the work is moving, and keep
              every detail within reach.
            </p>
          </div>

          <div className="directory-snapshot" aria-label="Directory overview">
            <div className="snapshot-total">
              <span className="snapshot-total__number">{employees.length}</span>
              <span className="snapshot-total__label">people<br />in this view</span>
            </div>
            <dl className="snapshot-details">
              <div>
                <dt>Departments</dt>
                <dd>{departmentCount}</dd>
              </div>
              <div>
                <dt>Offices</dt>
                <dd>{officeCount}</dd>
              </div>
            </dl>
          </div>
        </section>

        <section className="directory-section" aria-labelledby="directory-heading">
          <div className="section-heading">
            <div className="section-heading__main">
              <span className="section-heading__number" aria-hidden="true">01</span>
              <div>
                <p className="eyebrow section-heading__eyebrow">Browse & explore</p>
                <h2 id="directory-heading">The team directory</h2>
                <p className="section-heading__description">
                  Twenty colleagues, one thoughtful view. Search, sort, and
                  move through the list with your keyboard.
                </p>
              </div>
            </div>
            <span className="local-data-badge">
              <span className="local-data-badge__dot" aria-hidden="true" />
              Local sample data
            </span>
          </div>

          <div className="directory-card">
            <DataGrid
              ariaLabel="team directory"
              columns={employeeColumns}
              data={employees}
              getRowId={(employee) => employee.id}
              onRowSelect={(employee) => setLastRowAction(employee)}
            />

            <div className="callback-note" role="status" aria-live="polite">
              <span className="callback-note__icon" aria-hidden="true">
                {lastRowAction ? '✓' : '↳'}
              </span>
              <div className="callback-note__copy">
                <span className="callback-note__label">Row action callback</span>
                <span className="callback-note__value">
                  {lastRowAction
                    ? lastRowAction.name + ' · ' + lastRowAction.department
                    : 'Choose a data cell, then press Enter or Space.'}
                </span>
              </div>
            </div>
          </div>
        </section>

        <div className="page-footnote">
          <span className="page-footnote__mark" aria-hidden="true">Nº 01</span>
          <p>
            Built with semantic HTML, stable row IDs, and native keyboard
            controls.
          </p>
          <span className="page-footnote__course">MSIS207.R11.CTTT</span>
        </div>
      </main>
    </div>
  )
}
