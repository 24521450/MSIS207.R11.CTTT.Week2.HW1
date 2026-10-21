# AI Failure Audit

Audit date: 2026-10-21. This records errors observed while generating and verifying this project. Each item names the failed attempt, how it was reproduced, the evidence observed, and the correction. Items 1–7 were corrected before the initial push. Items 8–10 were found during the follow-up accessibility review and corrected or contained in the follow-up evidence.

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

## 7. Pagination dropped keyboard focus when its active button became disabled

- **Generated defect:** The pagination handler changed the page while focus remained on the activated native button. At either edge, the resulting render disabled that button, and Chrome removed it from focus without moving focus elsewhere.
- **Reproduction/evidence:** On baseline commit `89df459`, use Tab to reach Next on page 1 of 2 and press Enter. Wait until the page indicator reads `Page 2 of 2`, then wait two animation frames. `document.activeElement` was `BODY` while Next was disabled. From page 2, focus Previous and press Enter; after the page indicator returned to `Page 1 of 2` and two animation frames, `document.activeElement` was again `BODY` while Previous was disabled. The captured observations are in [`reports/verification/pagination-focus-before.json`](reports/verification/pagination-focus-before.json).
- **Risk:** Keyboard and assistive-technology users lost their location after a page change and had no visible focus indicator.
- **Correction:** When an activated pagination button becomes disabled, the layout effect moves focus to the opposite enabled button. Page updates remain clamped and native disabled buttons cannot activate past either boundary. A component regression test covers Enter and Space both ways. The Chrome regression report confirms all four transitions retain `:focus-visible` after two animation frames and that Tab/Shift+Tab returns through the roving grid cell and enabled pagination control; see [`reports/verification/browser-check.json`](reports/verification/browser-check.json).

## 8. Default search and pagination borders missed non-text contrast

- **Generated defect:** The search field border was `#afc0bb` on white and the enabled page-button border was `#bacbc5` on white. Both provide less than the WCAG 2.2 AA 3:1 non-text contrast needed to identify these controls against the white card surface.
- **Reproduction/evidence:** Build and serve the production preview, then run `node scripts/audit-accessibility.mjs` with `APP_URL` set to the preview. At source revision `a13e5c9f70fafff1a10fad6e1e43f8626d52a7ef`, the browser computed ratios of 1.90:1 and 1.69:1 respectively. The exact colors and measurements are retained in [`reports/verification/accessibility-audit-before-contrast-fix.json`](reports/verification/accessibility-audit-before-contrast-fix.json).
- **Risk:** People with low vision may not see where to enter a search or identify the pagination button boundaries in their normal state.
- **Correction:** Darken only these two default borders to `#7c918a`; keep the existing distinct hover and focus styling. The audit now asserts at least 3:1 for both default boundaries and the page-button hover border. The final measurements are in [`reports/verification/accessibility-audit-final.json`](reports/verification/accessibility-audit-final.json).

## 9. The new accessibility audit initially selected an ambiguous status locator

- **Generated defect:** The first `scripts/audit-accessibility.mjs` draft queried `[role="status"]` as a single node even though the page correctly has both a grid-result status and a callback status.
- **Reproduction/evidence:** Run the audit with the production preview. The empty-result step failed with Playwright strict-mode error because two elements matched `[role="status"]`; no accessibility result was written by that run.
- **Risk:** A helper failure could be mistaken for an application accessibility result or stop the requested checks early.
- **Correction:** Select `.data-grid__status` for the grid result message; keep the callback region separate. The corrected script completes and produces the final JSON report.

## 10. A verification command targeted the wrong local preview

- **Generated mistake:** The PowerShell invocation assigned `APP_URL` without the `$env:` prefix, so the browser scripts ignored it and used their default URL.
- **Reproduction/evidence:** The failed browser verification inspected `http://127.0.0.1:4173/` and reported the page title `FIFO Audio Queue — MSIS207 HW2` where it expected `Fieldnotes — Team directory`; the audit also failed its initial populated-grid assertion. This happened before either report was written. The invocation and observed output are recorded in [`reports/verification/wrong-preview-command-attempt.md`](reports/verification/wrong-preview-command-attempt.md).
- **Risk:** Results from the unrelated HW2 app could have been mistaken for HW1 verification.
- **Correction:** Set `$env:APP_URL='http://127.0.0.1:4178/'` in PowerShell, rerun both scripts, and confirm the result files identify `http://127.0.0.1:4178/` and source commit `55276613bc181f9fe8365778d48b98756d57cbc3`. The corrected outputs are [`reports/verification/browser-check.json`](reports/verification/browser-check.json) and [`reports/verification/accessibility-audit-final.json`](reports/verification/accessibility-audit-final.json).
