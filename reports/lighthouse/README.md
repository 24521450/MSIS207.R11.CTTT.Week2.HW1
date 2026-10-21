# Lighthouse verification record

## Final follow-up run

The follow-up Lighthouse run against the production build scored **Accessibility 100/100** and **Best Practices 100/100**. The Lighthouse `color-contrast` audit passed with zero failing elements.

- Application source checked: `55276613bc181f9fe8365778d48b98756d57cbc3` (`fix(a11y): improve control border contrast`).
- Run time recorded in Lighthouse JSON: `2026-10-21T16:08:06.703Z`.
- Target: `http://127.0.0.1:4178/`, served from `dist/` after `npm run build`.
- Lighthouse `13.5.0`, desktop preset; Accessibility and Best Practices categories.
- Headless Chrome `155.0.0.0`; runtime Chrome `155.0.8059.85` (Windows `10.0.26300`).
- Node.js `v24.15.0`; npm `12.0.2`.
- Reports: [`hw1-final-20261021.report.html`](hw1-final-20261021.report.html) and [`hw1-final-20261021.report.json`](hw1-final-20261021.report.json).
- Command:

  ```sh
  npx lighthouse http://127.0.0.1:4178/ --only-categories=accessibility,best-practices --preset=desktop --chrome-path="C:\Program Files\Google\Chrome\Application\chrome.exe" --chrome-flags="--headless=new" --output html --output json --output-path=reports/lighthouse/hw1-final-20261021 --logLevel=verbose
  ```

## Earlier report retained

The original report from before the follow-up contrast correction remains unchanged at [`hw1.report.html`](hw1.report.html) and [`hw1.report.json`](hw1.report.json). It recorded Accessibility 100/100 and Best Practices 100/100 at `2026-10-21T08:39:39.179Z`, targeting `http://127.0.0.1:4174/` with Lighthouse 13.5.0 and Headless Chrome 155. Its score did not reveal the weak search and pagination borders; those were found by computing their WCAG non-text contrast directly. The before/after measurements are retained in the verification JSON files.

## Other accessibility evidence and limits

The production browser check ran axe-core `4.14.0` on populated, no-results, and last-page states: each reported 30 passing rules and zero violations. Axe retained `aria-prohibited-attr` and `color-contrast` as incomplete/manual-review items; the color samples and relevant control boundaries were checked separately. Browser checks cover sorting, combined filtering and pagination, the empty state, four arrow-key directions, Enter/Space selection, callback feedback, all four pagination-boundary transitions, Tab/Shift+Tab, visible focus, responsive width and runtime errors. See [`../verification/browser-check.json`](../verification/browser-check.json) and the [requirements matrix](../verification/accessibility-matrix.md).

Chrome's accessibility tree was reviewed as supplementary evidence. NVDA was not installed and the user requested not to use Narrator, so spoken interaction with a real screen reader remains **unverified**. The [manual checklist](../verification/screen-reader-manual-checklist.md) records how to gather that evidence. Lighthouse 100/100 and axe results do not establish full WCAG 2.2 AA conformance.
