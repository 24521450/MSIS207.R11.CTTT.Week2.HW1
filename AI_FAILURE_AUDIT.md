# AI Failure Audit

Audit date: 2026-10-21. This records errors observed while generating and verifying this project. Each item names the failed attempt, how it was reproduced, the evidence observed, and the correction. These draft/tooling errors were corrected before the final push.

## 1. Vite scaffold command did not create a project in the existing checkout

- **Generated attempt:** `npm create vite@latest . -- --template react-ts --no-interactive` from the new repository, which already contained the required rules and task-decomposition documents.
- **Reproduction/evidence:** Run that command in a non-empty target directory. `create-vite` printed `Operation cancelled`; no scaffold was created. The required documents remained intact.
- **Risk:** Treating a cancelled scaffold as success would leave the repository without the application and waste the later implementation steps.
- **Correction:** Generate the template in a temporary location and copy its project files into the checkout after preserving the required documents.

## 2. An absolute Windows destination was interpreted as a Vite project name

- **Generated attempt:** A Windows absolute path was supplied as the first project argument to `npm create vite@latest` while the current directory was already the checkout.
- **Reproduction/evidence:** In this repository the command created the unexpected `CUsersshadoAppDataLocalTemphw1-vite-template/` directory. Its generated `package.json` used the slug `cusersshadoappdatalocaltemphw1-vite-template` as the project name.
- **Risk:** Keeping that nested output would add a second, misleading Vite application to the submission and could cause someone to install or run the wrong project.
- **Correction:** Copy the generated template files to the intended repository root, verify the root package, and remove the accidental nested copy before committing.

## 3. The generated Vite TypeScript template was not strict by default

- **Generated omission:** The generated `tsconfig.app.json` did not set `compilerOptions.strict`.
- **Reproduction/evidence:** Inspecting the saved template at `CUsersshadoAppDataLocalTemphw1-vite-template/tsconfig.app.json` showed `noUnusedLocals` and `noUnusedParameters` but no `strict` setting. The repository requirement explicitly calls for strict TypeScript.
- **Risk:** A successful template build could be mistaken for strict type checking even though the compiler was accepting weaker null and implicit-type checks.
- **Correction:** Set `"strict": true` explicitly in the application tsconfig before scaffolding was committed. The final typecheck uses `tsc -b --pretty`.

## 4. The first browser accessibility harness did not load axe-core into the page

- **Generated omission:** The first version of `scripts/verify-browser.mjs` attempted to run `window.axe` without injecting the installed axe-core script into the browser page.
- **Reproduction/evidence:** Running that draft stopped at the accessibility step because the page had no `window.axe` object; consequently, it could not produce an accessibility result.
- **Risk:** Mistaking the harness failure for a page result could leave accessibility unchecked.
- **Correction:** Read the installed `axe-core` source and inject it with Playwright `page.addScriptTag` after each page navigation/reload, then assert the axe violations are empty for both normal and no-results states. The final JSON report records passes and any incomplete checks explicitly.

## 5. The first grid implementation mutated ID refs during render

- **Generated defect:** The initial ID fallback read and wrote a `WeakMap` and counter held in React refs while IDs were derived during rendering. The focus-recovery effect also synchronously updated React state when a cell disappeared.
- **Reproduction/evidence:** `npm run lint` reported `react(refs)` and `react(set-state-in-effect)` warnings in `src/components/DataGrid.tsx` on that draft.
- **Risk:** Render-time ref mutation can produce unstable behavior if React replays work; effect-driven state repair caused an unnecessary render and made focus behavior harder to reason about.
- **Correction:** Row identity now comes from the caller's `getRowId` or a string/number `id`, rejecting records without a stable identity. The visible roving cell is derived from current rows, and the layout effect only restores DOM focus. The final lint run is expected to be warning-free.

## 6. The first version of the arrow-key test redeclared local variables

- **Generated defect:** While adding coverage for ArrowUp and a stable-ID fallback, the new assertions redeclared `firstRow` and `firstName` in the same test block.
- **Reproduction/evidence:** `npm run typecheck`, `npm test`, and `npm run lint` all stopped on duplicate declarations before the new browser checks ran.
- **Risk:** The added keyboard coverage would not run, so a required direction could appear tested in source while the test suite failed to compile.
- **Correction:** Renamed the new bindings to `firstVisibleRow` and `firstVisibleName`; the corrected typecheck, lint, and test suite then passed.
