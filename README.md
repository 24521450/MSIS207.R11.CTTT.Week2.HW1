# MSIS207.R11.CTTT — Week 2 · HW1

A small React + strict TypeScript + Vite demo of a keyboard-accessible, client-side Data Grid. Rows are local sample data; the page has no backend or deployment.

## Run and verify

Requires Node.js 24+ and npm. From the repository root:

```sh
npm ci
npm run dev
```

```sh
npm run typecheck
npm test
npm run lint
npm run build
npm run preview -- --host 127.0.0.1 --port 4173
npm run verify:browser
```

`verify:browser` checks the production preview in Chrome, runs axe-core on populated, empty, and last-page states, and saves browser results and screenshots. It also exercises Enter and Space on both pagination controls, waits for the browser update to settle before checking focus, and checks Tab/Shift+Tab with visible focus. See [`reports/verification/browser-check.json`](reports/verification/browser-check.json). The reproduced pre-fix focus loss is recorded in [`reports/verification/pagination-focus-before.json`](reports/verification/pagination-focus-before.json). Run `node scripts/audit-accessibility.mjs` against a production preview for the WCAG-focused DOM, contrast, reflow, text-spacing, focus, target-size, axe, and accessibility-tree evidence. The requirements matrix and screen-reader manual checklist are in [`reports/verification/accessibility-matrix.md`](reports/verification/accessibility-matrix.md) and [`reports/verification/screen-reader-manual-checklist.md`](reports/verification/screen-reader-manual-checklist.md). Lighthouse reports and run conditions are in [`reports/lighthouse/README.md`](reports/lighthouse/README.md).

For the audit script, set `APP_URL` to the preview: in PowerShell use `$env:APP_URL='http://127.0.0.1:4173/'; node scripts/audit-accessibility.mjs`; in a POSIX shell use `APP_URL=http://127.0.0.1:4173/ node scripts/audit-accessibility.mjs`.

## DataGrid API

```ts
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
```

Use `getRowId` when records do not have a string or number `id`; IDs must be unique and stable. The grid filters displayed values, sorts numbers numerically and text with locale collation, then paginates ten rows at a time. Arrow keys move between data cells; Enter selects; Space toggles selection; Tab moves through controls normally. If paging disables the active pagination button at either boundary, focus moves to the opposite enabled button. Selection and active-cell identity follow row IDs across updates.

## Requirements and evidence

- Uses native table elements with grid roles, labelled search, sort controls, live result status, row selection, and focus recovery.
- Includes 20 deterministic local records with stable IDs, text and numeric columns, responsive horizontal table scrolling, visible focus, and keyboard instructions.
- Filtering, sorting, pagination, empty results, selection, focus movement, and recovery have 18 automated tests. Browser automation also checks the production build at desktop and narrow viewports, including all four Enter/Space transitions at pagination boundaries and focus after two animation frames.
- Lighthouse Accessibility and Best Practices scores and environment are recorded in [`reports/lighthouse/README.md`](reports/lighthouse/README.md). Axe reported no violations on the populated, no-results, and last-page states, while retaining two incomplete manual-review items. Contrast samples and other applicable checks are recorded in the accessibility matrix; these checks do not establish full WCAG conformance. Chrome's accessibility tree was reviewed as supplementary evidence. NVDA is not installed, and the user requested that Narrator not be used, so real screen-reader speech remains unverified. The manual checklist describes how to record that evidence without treating the accessibility tree as speech output.
- Observed generation and validation errors, reproduction steps, evidence, and fixes are documented in [`AI_FAILURE_AUDIT.md`](AI_FAILURE_AUDIT.md).

Project rules and task breakdown: [`project-rules.md`](project-rules.md) and [`TASK_DECOMPOSITION.md`](TASK_DECOMPOSITION.md).
