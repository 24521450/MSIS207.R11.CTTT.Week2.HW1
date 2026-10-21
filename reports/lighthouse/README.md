# Lighthouse verification record

## Result

Lighthouse reported **Accessibility 100/100** and **Best Practices 100/100** for the production build. Its `color-contrast` audit passed with no failing elements. The HTML and JSON reports are [`hw1.report.html`](hw1.report.html) and [`hw1.report.json`](hw1.report.json).

## Run conditions

- Run time: 2026-10-21 15:39 ICT (UTC+07:00; Lighthouse JSON `fetchTime`: `2026-10-21T08:39:39.179Z`).
- Target: local Vite production preview at `http://127.0.0.1:4174/`; the final site was built with `npm run build` and served with `npm run preview -- --host 127.0.0.1 --port 4174`.
- Lighthouse: 13.5.0, desktop preset; categories selected: Accessibility and Best Practices.
- Browser: Headless Chrome 155.0.8059.85.
- Runtime: Node.js 24.15.0, npm 12.0.2; Windows build 10.0.26300.
- Command:

  ```sh
  npx lighthouse http://127.0.0.1:4174/ --only-categories=accessibility,best-practices --preset=desktop --chrome-path="C:\Program Files\Google\Chrome\Application\chrome.exe" --chrome-flags="--headless=new" --output html --output json --output-path=reports/lighthouse/hw1 --logLevel=verbose
  ```

## Other accessibility evidence and limits

The Playwright browser check ran axe-core on the populated, no-results, and last-page states: each had 30 passing rules and zero reported violations. Axe marked `aria-prohibited-attr` and `color-contrast` as incomplete/manual-review items; Lighthouse independently passed its color-contrast audit. Browser checks covered responsive width, sorting, filter plus page reset, the empty state, four arrow-key directions, Enter/Space selection, callback feedback, and console/page errors. Chrome tested Enter and Space in both directions at the pagination boundaries, waited for the page and focus updates plus two animation frames, and confirmed the remaining button retained `:focus-visible`. Tab and Shift+Tab also retained visible focus through the roving data cell and enabled pagination button. Screenshots and machine-readable results are in [`../verification/`](../verification/).

Chrome's browser accessibility tree was reviewed. `Narrator.exe` exists on the machine, but this automation session exposes no interactive spoken output channel, so a real screen-reader speech check remains **unverified**. Lighthouse and axe results do not by themselves establish full WCAG 2.2 AA conformance.
