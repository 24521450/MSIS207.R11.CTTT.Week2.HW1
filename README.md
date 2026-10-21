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

`verify:browser` checks the production preview in Chrome, runs axe-core on the populated and empty states, and saves browser results and screenshots. See [`reports/verification/browser-check.json`](reports/verification/browser-check.json). Lighthouse is run against that production preview; the saved desktop Accessibility and Best Practices reports, run conditions, and results are in [`reports/lighthouse/README.md`](reports/lighthouse/README.md).

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

Use `getRowId` when records do not have a string or number `id`; IDs must be unique and stable. The grid filters displayed values, sorts numbers numerically and text with locale collation, then paginates ten rows at a time. Arrow keys move between data cells; Enter selects; Space toggles selection; Tab moves through controls normally. Selection and active-cell identity follow row IDs across updates.

## Requirements and evidence

- Uses native table elements with grid roles, labelled search, sort controls, live result status, row selection, and focus recovery.
- Includes 20 deterministic local records with stable IDs, text and numeric columns, responsive horizontal table scrolling, visible focus, and keyboard instructions.
- Filtering, sorting, pagination, empty results, selection, focus movement, and recovery have automated tests. Browser automation also checks the production build at desktop and narrow viewports.
- Lighthouse Accessibility and Best Practices scores and environment are recorded in [`reports/lighthouse/README.md`](reports/lighthouse/README.md). Axe reported no violations in either tested state; its contrast audit requires manual review on these backgrounds, and Lighthouse's contrast audit passed. These checks do not establish full WCAG conformance. Chrome's accessibility tree was reviewed, but Narrator's spoken output remains unverified because this session has no interactive screen-reader audio channel.
- Observed generation and validation errors, reproduction steps, evidence, and fixes are documented in [`AI_FAILURE_AUDIT.md`](AI_FAILURE_AUDIT.md).

Project rules and task breakdown: [`project-rules.md`](project-rules.md) and [`TASK_DECOMPOSITION.md`](TASK_DECOMPOSITION.md).
