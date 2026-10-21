# Project Rules

## Scope and implementation contract

- Build only a reusable React + TypeScript Data Grid and the local demo page for MSIS207.R11.CTTT HW1.
- Use React, TypeScript strict mode, Vite, and plain CSS. Do not add CRUD, export, charts, authentication, backend, database, or website deployment.
- Implement the grid itself. Runtime dependencies are limited to React and React DOM; add development and verification tools only when the project needs them.
- Preserve the assignment API:
  
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
      }

- An optional getRowId may be added for stable item identity. Never use array position or randomness for React keys.
- Use semantic HTML table, thead, tbody, th scope=col, td, and button elements, with grid, row, columnheader, gridcell, and rowheader roles where needed.
- Render all untrusted or user-entered values as text. Never use dangerouslySetInnerHTML or raw innerHTML.
- Use React event handlers. Do not register unmanaged global listeners. Any effect that subscribes to a resource must clean it up.
- Keep the dependency flow one-way and component state explicit. Sorting, filtering, and pagination must compose in that order.

## Accessibility and behavior

- Target WCAG 2.2 AA. Check contrast for normal text at a minimum of 4.5:1, provide visible keyboard focus, labels and concise keyboard guidance, and useful live result/status announcements.
- Support sortable columns with ascending/descending comparison and aria-sort on the active column header.
- Filter displayed rows from one search field, reset to page one after a query change, and show a clear empty state.
- Paginate at 10 rows per page and expose previous/next controls and current page information.
- Use a roving tabindex for data cells, arrow-key navigation, Enter to select a row, and Space to toggle row selection. Tab must enter and leave the grid normally; sort buttons retain native Enter/Space behavior.
- Track selection and active focus by stable row ID, not current position. Keep them across reorderings; if the active row leaves the visible page or result set, move focus to a valid cell or the search field for an empty result.
- Keep the demo data local, with 20 records, stable IDs, string and numeric columns.

## Engineering workflow

- Decompose work into small functional slices. Define and record each module's type contract before implementing that module.
- Commit each completed slice with a Conventional Commit message.
- Verify the requested behavior with tests, typecheck, and production build. Inspect the rendered interface in a browser and run accessibility checks.
- Run Lighthouse against the production build and save the report and environment details. Only claim the scores actually measured.
- Check screen-reader behavior if a usable screen reader exists in the environment. Record exactly what was and was not verified.
- Record at least three real AI-generated defects discovered during implementation in AI_FAILURE_AUDIT.md. For every entry, provide a reproducible case, evidence, and correction. Never invent a defect or result.
- Keep node_modules, dist, credentials, and other secrets out of Git.
- Report unverified WCAG and assistive-technology criteria honestly. A Lighthouse score is not proof of full WCAG conformance.

## Source rules

Apply the common principles from Lab 2 slides 2, 3, 5, and 29: semantic HTML first; verify generated code deterministically; use atomic, contract-first implementation; avoid var, deprecated keypress/keyCode, inline HTML event attributes, raw HTML injection, unmanaged listeners, and unstable keys.
