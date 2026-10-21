import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import os from 'node:os'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { chromium } from 'playwright'

const require = createRequire(import.meta.url)
const appUrl = process.env.APP_URL || 'http://127.0.0.1:4173/'
const chromePath =
  process.env.CHROME_PATH ||
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const outputDir = resolve('reports/verification')
const axeSource = await readFile(require.resolve('axe-core'), 'utf8')
const browser = await chromium.launch({
  headless: true,
  executablePath: chromePath,
})

const pageErrors = []
const consoleErrors = []
const checkResults = {}

async function runAxe(page) {
  return page.evaluate(async () => {
    const results = await window.axe.run(document, {
      runOnly: {
        type: 'tag',
        values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'],
      },
    })
    return {
      passes: results.passes.length,
      violations: results.violations.map((violation) => ({
        id: violation.id,
        impact: violation.impact,
        help: violation.help,
        nodes: violation.nodes.map((node) => ({
          target: node.target,
          summary: node.failureSummary,
        })),
      })),
      incomplete: results.incomplete.map((item) => item.id),
    }
  })
}

try {
  await mkdir(outputDir, { recursive: true })
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
    deviceScaleFactor: 1,
  })
  page.on('pageerror', (error) => pageErrors.push(error.message))
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text())
  })

  await page.goto(appUrl, { waitUntil: 'networkidle' })
  await page.addScriptTag({ content: axeSource })
  assert.match(await page.title(), /Fieldnotes — Team directory/)
  assert.equal(await page.getByRole('grid', { name: 'team directory' }).count(), 1)
  assert.equal(await page.locator('tbody tr[data-row-id]').count(), 10)
  assert.equal(await page.locator('tbody td[role="gridcell"][tabindex="0"]').count(), 1)
  assert.match(await page.locator('.data-grid__status').innerText(), /20 records/)
  await page.screenshot({
    path: resolve(outputDir, 'browser-desktop.png'),
    fullPage: true,
  })
  checkResults.desktop = {
    viewport: { width: 1440, height: 1000 },
    renderedDataRows: 10,
    totalRecords: 20,
  }
  checkResults.accessibilityDefault = await runAxe(page)
  assert.deepEqual(
    checkResults.accessibilityDefault.violations,
    [],
    'Default page state must pass axe WCAG 2.2 AA checks',
  )

  await page.setViewportSize({ width: 390, height: 844 })
  const mobileLayout = await page.evaluate(() => ({
    viewportWidth: window.innerWidth,
    documentWidth: document.documentElement.scrollWidth,
    tableViewportWidth: document.querySelector('.data-grid__table-wrap').clientWidth,
    tableContentWidth: document.querySelector('.data-grid__table-wrap').scrollWidth,
  }))
  assert.equal(
    mobileLayout.documentWidth,
    mobileLayout.viewportWidth,
    'The page must not have horizontal overflow at a narrow viewport',
  )
  assert.ok(
    mobileLayout.tableContentWidth > mobileLayout.tableViewportWidth,
    'The table should keep a horizontal scroll area on narrow screens',
  )
  await page.screenshot({
    path: resolve(outputDir, 'browser-mobile.png'),
    fullPage: true,
  })
  checkResults.mobile = mobileLayout

  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.reload({ waitUntil: 'networkidle' })
  await page.addScriptTag({ content: axeSource })

  await page.getByRole('button', { name: 'Sort by Projects' }).click()
  assert.equal(
    await page.locator('thead th[aria-colindex="4"]').getAttribute('aria-sort'),
    'ascending',
  )
  const projectValues = (
    await page.locator('tbody tr[data-row-id] td[aria-colindex="4"]').allTextContents()
  ).map(Number)
  assert.deepEqual(projectValues, [...projectValues].sort((left, right) => left - right))
  checkResults.numericSort = { ariaSort: 'ascending', firstPageValues: projectValues }

  await page.getByRole('button', { name: 'Go to next page' }).click()
  assert.equal(await page.locator('.data-grid__page-number').innerText(), 'Page 2 of 2')
  const search = page.getByRole('searchbox', { name: 'Filter team directory' })
  await search.fill('Engineering')
  assert.equal(await page.locator('.data-grid__page-number').innerText(), 'Page 1 of 1')
  assert.equal(await page.locator('tbody tr[data-row-id]').count(), 6)
  checkResults.filterAfterPagination = {
    query: 'Engineering',
    page: await page.locator('.data-grid__page-number').innerText(),
    matchingRows: 6,
  }

  await search.fill('no matching record')
  assert.match(
    await page.locator('tbody').innerText(),
    /No records match this search/,
  )
  checkResults.emptyState = await runAxe(page)
  assert.deepEqual(
    checkResults.emptyState.violations,
    [],
    'Empty state must pass axe WCAG 2.2 AA checks',
  )

  await search.fill('')
  const firstRow = page.locator('tbody tr[data-row-id]').first()
  await firstRow.locator('td[aria-colindex="1"]').focus()
  await page.keyboard.press('ArrowRight')
  assert.equal(
    await page.evaluate(() => document.activeElement.getAttribute('data-column-key')),
    'department',
  )
  await page.keyboard.press('ArrowDown')
  assert.equal(
    await page.evaluate(() => document.activeElement.getAttribute('data-column-key')),
    'department',
  )
  await page.keyboard.press('ArrowLeft')
  assert.equal(
    await page.evaluate(() => document.activeElement.getAttribute('data-column-key')),
    'name',
  )
  await page.keyboard.press('ArrowUp')
  assert.equal(
    await page.evaluate(() => document.activeElement.closest('tr').getAttribute('data-row-id')),
    await page.locator('tbody tr[data-row-id]').first().getAttribute('data-row-id'),
  )
  await page.keyboard.press('ArrowDown')
  assert.equal(
    await page.evaluate(() => document.activeElement.getAttribute('data-column-key')),
    'name',
  )
  await page.keyboard.press('Enter')
  let selectedRow = page.locator('tbody tr[data-row-id][aria-selected="true"]')
  assert.equal(await selectedRow.count(), 1)
  const selectedName = (await selectedRow.locator('td[aria-colindex="1"]').innerText()).split('✓')[0].trim()
  assert.match(await page.locator('.callback-note__value').innerText(), new RegExp(selectedName))
  await page.keyboard.press('Space')
  assert.equal(await page.locator('tbody tr[data-row-id][aria-selected="true"]').count(), 0)
  checkResults.keyboardAndCallback = {
    arrowNavigation: 'right, down, left, up, down',
    enterSelected: selectedName,
    spaceClearedSelection: true,
    callbackAnnounced: true,
  }

  assert.deepEqual(pageErrors, [])
  assert.deepEqual(consoleErrors, [])
  checkResults.browserErrors = { pageErrors, consoleErrors }
  checkResults.environment = {
    platform: process.platform,
    osRelease: os.release(),
    node: process.version,
    browser: await browser.version(),
    appUrl,
    checkedAt: new Date().toISOString(),
  }

  const reportPath = resolve(outputDir, 'browser-check.json')
  await writeFile(reportPath, JSON.stringify(checkResults, null, 2) + '\n', 'utf8')
  console.log(JSON.stringify({ reportPath, results: checkResults }, null, 2))
} finally {
  await browser.close()
}
