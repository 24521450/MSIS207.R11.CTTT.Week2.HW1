# Task Decomposition (WBS)

This work follows the four stages from Lab 2 slide 5: functional slicing, contract-first specification, atomic implementation, and independent verification.

## Stage 1 — Functional slices

- [x] Create the public GitHub repository and an independent local checkout named MSIS207.R11.CTTT.Week2.HW1 beside W2.
- [x] Record project rules and this work breakdown before application code.
- [x] Define shared public TypeScript API and strict Vite project scaffold.
- [x] Define and implement pure data operations: search, typed comparison, sorting, page clamping, and pagination.
- [x] Define and implement the accessible grid: native table markup, ARIA roles, sort buttons, stable IDs, selection, roving tabindex, keyboard movement, and focus recovery.
- [x] Define and implement the 20-row local demo and polished responsive page.
- [x] Add 18 behavior tests for sort, filter plus pagination, empty results, identity-preserved selection, keyboard movement, focus recovery, and focus transfer at disabled pagination boundaries.
- [x] Run strict typecheck, test suite, production build, browser review, accessibility checks, and production Lighthouse.
- [x] Record only observed AI failure modes and their reproduction/evidence/fixes.
- [x] Complete the README and reports, verify Git hygiene, and push the commit history to main.

## Stage 2 — Contracts before implementation

### Public component API — establish before grid implementation

    interface ColumnDef<T> {
      header: string;
      accessorKey: keyof T;
      sortable?: boolean;
    }
    interface DataGridProps<T> {
      data: T[];
      columns: ColumnDef<T>[];
      onRowSelect?: (item: T) => void;
      ariaLabel: string;
      getRowId?: (item: T) => string;
    }

### Pure model module — establish before model implementation

    type SortDirection = "ascending" | "descending";
    interface SortState<T> {
      key: keyof T;
      direction: SortDirection;
    }
    filterRows<T>(data, query, columns): T[]
    sortRows<T>(rows, sort): T[]
    getPageCount(totalRows, pageSize): number
    paginateRows<T>(rows, requestedPage, pageSize): { rows: T[]; page: number; pageCount: number }

The model must compare numbers numerically, compare text with a stable locale-aware collator, perform case-insensitive substring filtering across displayed columns, and clamp requested pages to a valid range.

### Grid interaction module — establish before grid implementation

- Component props extend the public API with optional getRowId; a documented fallback ID strategy is required if omitted.
- Selection is one stable row ID and is exposed on the selected row with aria-selected.
- The active cell is a pair of stable row ID and column accessor key. Exactly one visible data cell is in the tab sequence.
- Arrow keys move within currently rendered cells. Enter selects and calls onRowSelect. Space toggles selection. Native sort buttons keep their standard key behavior.
- Sorting and filtering preserve a still-visible active ID. Pagination or filtering that hides it moves focus to a valid visible cell. No-result state returns grid focus to the labelled search control.
- All user text is rendered as text. No position-based or random keys.

### Demo data module — establish before data implementation

    interface Employee {
      id: string;
      name: string;
      department: string;
      office: string;
      projects: number;
      utilization: number;
    }

Provide exactly 20 deterministic records; id is unique and stable, text columns support filtering, and numeric columns prove numeric sorting.

### Accessibility audit script — contract before audit implementation

`scripts/audit-accessibility.mjs` accepts `APP_URL` for a built production preview and writes a machine-readable record plus screenshots under `reports/verification/`. It independently checks the applicable visual and DOM-level criteria: the 320 CSS-pixel reflow case with a table-only horizontal scroller, text-spacing overrides, normal/hover/focus/selected contrast samples, focus visibility and viewport exposure, target dimensions, semantic names/roles/states, status updates, and a long-content layout stress case. Its axe checks cover populated, empty, and last-page states. It records browser/runtime versions and the tested source revision. The accessibility tree is supplementary evidence only; this script must never claim actual screen-reader speech or full WCAG conformance.

### Visual system — establish before CSS implementation

- Responsive content container with clear heading, short summary, labelled search, data table, pagination, selected-item feedback, and keyboard instructions.
- High-contrast text and visible focus rings. Table remains usable on narrow viewports through horizontal scrolling.
- Respect reduced-motion preference and do not convey state by color alone.

## Stage 3 — Atomic implementation and commits

- [x] Commit project rules/WBS before source code.
- [x] Commit the Vite/React/strict TypeScript scaffold and shared contracts.
- [x] Commit pure filtering, sorting, and pagination helpers with focused tests.
- [x] Commit grid semantics, keyboard interactions, stable selection, and focus recovery with interaction tests.
- [x] Commit the local demo and responsive CSS.
- [x] Commit verified documentation and real failure audit entries.
- [x] Fix defects found during verification in separate, focused Conventional Commits.

## Stage 4 — Independent verification

- [x] Strict typecheck passes.
- [x] All 18 unit and component tests pass for sorting, combined filtering and pagination, empty data, ID-preserved selection, all arrow directions, and pagination-boundary focus transfer.
- [x] Production build succeeds.
- [x] Browser review covers desktop and narrow viewports, sorting, search, pagination, empty state, selection, and keyboard focus. Chrome exercised Enter and Space in both directions at the first/last page, waited two animation frames after each update, confirmed focus-visible, and checked Tab/Shift+Tab.
- [x] Axe reports zero violations on the populated, no-results, and last-page states; Lighthouse also passes the contrast audit.
- [x] Production Lighthouse reports Accessibility 100 and Best Practices 100; JSON, HTML, and environment details are saved.
- [x] Chrome's accessibility tree was reviewed. Narrator is installed, but spoken interaction could not be checked in this session, so screen-reader speech remains unverified.
- [x] Git history uses Conventional Commits; the public repository has default branch main, and the working tree is clean after push.

