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
const packageJson = JSON.parse(await readFile(resolve('package.json'), 'utf8'))
const browser = await chromium.launch({ headless: true, executablePath: chromePath })
const output = {
  scope: 'WCAG 2.2 A/AA evidence for the HW1 Data Grid demo; not a conformance claim',
  appUrl,
  checkedAt: new Date().toISOString(),
  checks: {},
}

function contrastRatio(foreground, background) {
  const channels = (color) =>
    color.match(/[\d.]+/g).slice(0, 3).map((value) => Number(value) / 255)
  const luminance = (color) => {
    const [red, green, blue] = channels(color).map((channel) =>
      channel <= 0.04045
        ? channel / 12.92
        : ((channel + 0.055) / 1.055) ** 2.4,
    )
    return red * 0.2126 + green * 0.7152 + blue * 0.0722
  }
  const first = luminance(foreground)
  const second = luminance(background)
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05)
}

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
        targets: violation.nodes.map((node) => node.target),
      })),
      incomplete: results.incomplete.map((item) => item.id),
    }
  })
}

try {
  await mkdir(outputDir, { recursive: true })
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    deviceScaleFactor: 1,
  })
  const page = await context.newPage()
  const pageErrors = []
  const consoleErrors = []
  page.on('pageerror', (error) => pageErrors.push(error.message))
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text())
  })

  await page.goto(appUrl, { waitUntil: 'networkidle' })
  await page.addScriptTag({ content: axeSource })
  assert.equal(await page.getByRole('grid', { name: 'team directory' }).count(), 1)
  assert.equal(await page.locator('table[role="grid"] thead th[scope="col"]').count(), 5)
  assert.equal(await page.locator('tbody tr[data-row-id]').count(), 10)

  output.checks.semanticRelationships = await page.evaluate(() => {
    const grid = document.querySelector('table[role="grid"]')
    const search = document.querySelector('input[type="search"]')
    const label = search?.labels?.[0]
    const descriptions = search?.getAttribute('aria-describedby')
    const status = grid?.parentElement?.parentElement?.querySelector('[role="status"]')
    const headers = [...(grid?.querySelectorAll('thead th') ?? [])].map((header) => ({
      tag: header.tagName,
      scope: header.getAttribute('scope'),
      role: header.getAttribute('role'),
      columnIndex: header.getAttribute('aria-colindex'),
      text: header.textContent?.trim(),
      sort: header.getAttribute('aria-sort'),
    }))
    const firstCell = grid?.querySelector('tbody td[role="gridcell"]')
    return {
      title: document.title,
      language: document.documentElement.lang,
      grid: {
        tag: grid?.tagName,
        role: grid?.getAttribute('role'),
        name: grid?.getAttribute('aria-label'),
      },
      nativeTableParts: {
        thead: Boolean(grid?.querySelector('thead')),
        tbody: Boolean(grid?.querySelector('tbody')),
        headers,
        rowRole: firstCell?.closest('tr')?.getAttribute('role'),
        cellRole: firstCell?.getAttribute('role'),
        cellColumnIndex: firstCell?.getAttribute('aria-colindex'),
        cellHeaderOrderMatches:
          headers[0]?.scope === 'col' &&
          headers[0]?.columnIndex === firstCell?.getAttribute('aria-colindex'),
      },
      search: {
        nativeLabel: label?.textContent?.trim(),
        accessibleDescriptionIds: descriptions?.split(' ') ?? [],
        descriptionText: [...(descriptions ? descriptions.split(' ') : [])]
          .map((id) => document.getElementById(id)?.textContent?.trim() ?? '')
          .join(' '),
      },
      status: {
        role: status?.getAttribute('role'),
        live: status?.getAttribute('aria-live'),
        atomic: status?.getAttribute('aria-atomic'),
        text: status?.textContent?.trim(),
      },
    }
  })
  assert.equal(output.checks.semanticRelationships.grid.name, 'team directory')
  assert.equal(output.checks.semanticRelationships.search.nativeLabel, 'Filter team directory')
  assert.equal(output.checks.semanticRelationships.status.role, 'status')
  assert.equal(output.checks.semanticRelationships.status.live, 'polite')
  output.checks.axePopulated = await runAxe(page)
  assert.deepEqual(output.checks.axePopulated.violations, [])

  const accessibilitySession = await context.newCDPSession(page)
  const accessibilityTree = await accessibilitySession.send('Accessibility.getFullAXTree')
  output.checks.accessibilityTreeSupplement = accessibilityTree.nodes
    .filter((node) => ['grid', 'row', 'columnheader', 'gridcell', 'searchbox', 'status'].includes(node.role?.value))
    .slice(0, 30)
    .map((node) => ({
      role: node.role?.value,
      name: node.name?.value,
      selected: node.properties?.find((property) => property.name === 'selected')?.value?.value,
      sort: node.properties?.find((property) => property.name === 'sort')?.value?.value,
    }))
  assert.ok(
    output.checks.accessibilityTreeSupplement.some(
      (node) => node.role === 'grid' && node.name === 'team directory',
    ),
    'The browser accessibility tree must expose the labelled grid',
  )

  const search = page.getByRole('searchbox', { name: 'Filter team directory' })
  await search.fill('Engineering')
  output.checks.filteredStatus = await page.evaluate(() => ({
    activeElementLabel: document.activeElement?.labels?.[0]?.textContent?.trim() ?? null,
    rowCount: document.querySelectorAll('tbody tr[data-row-id]').length,
    page: document.querySelector('.data-grid__page-number')?.textContent?.trim(),
    status: document.querySelector('[role="status"]')?.textContent?.trim(),
  }))
  assert.equal(output.checks.filteredStatus.activeElementLabel, 'Filter team directory')
  assert.match(output.checks.filteredStatus.status, /6 records/)
  await search.fill('no matching record')
  output.checks.axeEmpty = await runAxe(page)
  output.checks.emptyStatus = await page.locator('.data-grid__status').innerText()
  assert.deepEqual(output.checks.axeEmpty.violations, [])
  assert.match(output.checks.emptyStatus, /No records match/)
  assert.equal(await page.evaluate(() => document.activeElement?.type), 'search')

  await search.fill('')
  await page.getByRole('button', { name: 'Go to next page' }).click()
  output.checks.axeLastPage = await runAxe(page)
  assert.deepEqual(output.checks.axeLastPage.violations, [])
  assert.equal(await page.locator('.data-grid__page-number').innerText(), 'Page 2 of 2')
  await page.keyboard.press('Shift+Tab')
  const focusedCell = page.locator('td[role="gridcell"][tabindex="0"]')
  await focusedCell.focus()
  await page.keyboard.press('Enter')
  output.checks.selectionAndDynamicStatus = {
    selectedRows: await page.locator('tbody tr[aria-selected="true"]').count(),
    status: await page.locator('.data-grid__status').innerText(),
  }
  assert.equal(output.checks.selectionAndDynamicStatus.selectedRows, 1)
  assert.match(output.checks.selectionAndDynamicStatus.status, /Selected:/)
  await page.keyboard.press('Space')
  assert.equal(await page.locator('tbody tr[aria-selected="true"]').count(), 0)

  await page.reload({ waitUntil: 'networkidle' })
  await page.addScriptTag({ content: axeSource })
  await page.getByRole('searchbox', { name: 'Filter team directory' }).focus()
  await page.keyboard.press('Tab')
  const focusSample = await page.evaluate(() => {
    const element = document.activeElement
    const rect = element?.getBoundingClientRect()
    const style = element ? getComputedStyle(element) : null
    const hit = rect ? document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2) : null
    return {
      tag: element?.tagName,
      label: element?.getAttribute('aria-label'),
      focusVisible: element?.matches(':focus-visible') ?? false,
      outline: style?.outline,
      outlineColor: style?.outlineColor,
      outlineWidth: style?.outlineWidth,
      boundsInsideViewport: Boolean(rect && rect.left >= 0 && rect.top >= 0 && rect.right <= innerWidth && rect.bottom <= innerHeight),
      centerNotCovered: Boolean(element && hit && (hit === element || element.contains(hit))),
    }
  })
  output.checks.focusVisibleAndNotObscured = focusSample
  assert.equal(focusSample.focusVisible, true)
  assert.ok(Number.parseFloat(focusSample.outlineWidth) >= 3)
  assert.equal(focusSample.boundsInsideViewport, true)
  assert.equal(focusSample.centerNotCovered, true)
  await page.screenshot({ path: resolve(outputDir, 'accessibility-focus-sample.png') })

  const targetSizes = await page.locator('button, input[type="search"], tbody td[role="gridcell"]').evaluateAll((elements) =>
    elements.map((element) => {
      const rect = element.getBoundingClientRect()
      return {
        tag: element.tagName,
        name: element.getAttribute('aria-label') ?? element.textContent?.trim().slice(0, 40) ?? '',
        width: Math.round(rect.width * 100) / 100,
        height: Math.round(rect.height * 100) / 100,
        disabled: element.matches(':disabled'),
      }
    }),
  )
  output.checks.targetSizes = {
    minimumWidth: Math.min(...targetSizes.map((target) => target.width)),
    minimumHeight: Math.min(...targetSizes.map((target) => target.height)),
    belowTwentyFourPixels: targetSizes.filter((target) => target.width < 24 || target.height < 24),
    samples: targetSizes,
  }
  assert.deepEqual(output.checks.targetSizes.belowTwentyFourPixels, [])

  const contrastSamples = []
  const addContrast = async (selector, label, pseudo = null) => {
    const sample = await page.locator(selector).first().evaluate((element, pseudoElement) => {
      const parse = (color) => {
        const values = color.match(/[\d.]+/g)?.map(Number) ?? []
        return { red: values[0] ?? 0, green: values[1] ?? 0, blue: values[2] ?? 0, alpha: values[3] ?? 1 }
      }
      const mix = (foreground, background) => {
        const alpha = foreground.alpha
        return `rgb(${Math.round(foreground.red * alpha + background.red * (1 - alpha))}, ${Math.round(foreground.green * alpha + background.green * (1 - alpha))}, ${Math.round(foreground.blue * alpha + background.blue * (1 - alpha))})`
      }
      const chain = []
      for (let current = element; current; current = current.parentElement) chain.unshift(current)
      let background = { red: 245, green: 246, blue: 243, alpha: 1 }
      for (const current of chain) {
        const color = parse(getComputedStyle(current).backgroundColor)
        if (color.alpha > 0) background = parse(mix(color, background))
      }
      const style = getComputedStyle(element, pseudoElement)
      return {
        foreground: style.color,
        background: `rgb(${background.red}, ${background.green}, ${background.blue})`,
        border: getComputedStyle(element).borderTopColor,
        outline: getComputedStyle(element).outlineColor,
      }
    }, pseudo)
    contrastSamples.push({
      label,
      ...sample,
      ratio: Math.round(contrastRatio(sample.foreground, sample.background) * 100) / 100,
    })
  }

  await addContrast('.page-intro__description', 'Intro description over base page surface')
  await addContrast('.data-grid__search label', 'Search label')
  await addContrast('.data-grid__instructions', 'Keyboard instructions')
  await addContrast('input[type="search"]', 'Search input value')
  await addContrast('input[type="search"]', 'Search placeholder', '::placeholder')
  await addContrast('thead th', 'Column header')
  await addContrast('tbody tr[data-row-id] td', 'Data cell')
  await addContrast('.data-grid__status', 'Live status')
  await addContrast('.data-grid__page-button:not(:disabled)', 'Pagination button')
  await page.getByRole('button', { name: 'Sort by Team member' }).hover()
  await addContrast('.data-grid__sort-button', 'Sort button hover')
  await page.getByRole('button', { name: 'Go to next page' }).hover()
  await addContrast('.data-grid__page-button:not(:disabled)', 'Pagination button hover')
  await page.mouse.move(0, 0)
  const direction = page.locator('tbody tr[data-row-id]').first().locator('td[role="gridcell"]').first()
  await direction.focus()
  await page.keyboard.press('Enter')
  await page.waitForFunction(() => {
    const row = document.querySelector('tbody tr[aria-selected="true"]')
    return row && getComputedStyle(row).backgroundColor === 'rgb(234, 244, 239)'
  })
  await addContrast('tbody tr[aria-selected="true"] td:first-child', 'Selected row text')
  await addContrast('.data-grid__selected-badge', 'Selected badge text')
  await page.getByRole('button', { name: 'Sort by Projects' }).focus()
  await page.keyboard.press('Enter')
  const ascendingSort = await page.evaluate(() => ({
    sort: document.querySelector('thead th[aria-colindex="4"]')?.getAttribute('aria-sort'),
    pressed: document.querySelector('thead th[aria-colindex="4"] button')?.getAttribute('aria-pressed'),
    indicator: document.querySelector('thead th[aria-colindex="4"] .data-grid__sort-indicator')?.textContent?.trim(),
  }))
  await page.getByRole('button', { name: 'Sort by Projects, currently ascending' }).focus()
  await page.keyboard.press('Space')
  const descendingSort = await page.evaluate(() => ({
    sort: document.querySelector('thead th[aria-colindex="4"]')?.getAttribute('aria-sort'),
    pressed: document.querySelector('thead th[aria-colindex="4"] button')?.getAttribute('aria-pressed'),
    indicator: document.querySelector('thead th[aria-colindex="4"] .data-grid__sort-indicator')?.textContent?.trim(),
  }))
  await addContrast('.data-grid__sort-indicator', 'Active sort indicator')
  const focusContrast = await page.evaluate(() => {
    const focused = document.activeElement
    const style = focused ? getComputedStyle(focused) : null
    const adjacent = focused?.closest('th')?.parentElement?.parentElement ?? focused?.parentElement
    return {
      focusedRole: focused?.getAttribute('role') ?? focused?.tagName ?? null,
      outlineColor: style?.outlineColor ?? null,
      outlineWidth: style?.outlineWidth ?? null,
      visible: focused?.matches(':focus-visible') ?? false,
      adjacentBackground: adjacent ? getComputedStyle(adjacent).backgroundColor : null,
    }
  })
  output.checks.contrast = {
    textSamples: contrastSamples,
    minimumTextRatio: Math.min(...contrastSamples.map((sample) => sample.ratio)),
    textSamplesAtLeastFourPointFive: contrastSamples.every((sample) => sample.ratio >= 4.5),
    focusRing: focusContrast,
    focusRingOnWhiteRatio: Math.round(contrastRatio(focusContrast.outlineColor, 'rgb(255, 255, 255)') * 100) / 100,
    focusRingOnAdjacentRatio: Math.round(contrastRatio(focusContrast.outlineColor, focusContrast.adjacentBackground) * 100) / 100,
    components: await page.evaluate(() => {
      const input = document.querySelector('input[type="search"]')
      const button = document.querySelector('.data-grid__page-button:not(:disabled)')
      return {
        searchBorder: { color: input ? getComputedStyle(input).borderTopColor : null, background: input ? getComputedStyle(input).backgroundColor : null },
        paginationBorder: { color: button ? getComputedStyle(button).borderTopColor : null, background: button ? getComputedStyle(button).backgroundColor : null },
        selectedCue: document.querySelector('.data-grid__selected-badge')?.textContent?.trim() ?? null,
        sortCue: document.querySelector('thead th[aria-sort] .data-grid__sort-indicator')?.textContent?.trim() ?? null,
      }
    }),
    sortingState: { ascendingSort, descendingSort },
  }
  for (const component of ['searchBorder', 'paginationBorder']) {
    const pair = output.checks.contrast.components[component]
    const ratio = contrastRatio(pair.color, pair.background)
    output.checks.contrast.components[component].ratioAgainstFill = Math.round(ratio * 100) / 100
  }
  const pageButtonHover = contrastSamples.find((sample) => sample.label === 'Pagination button hover')
  output.checks.contrast.components.paginationHoverBorderRatio = Math.round(
    contrastRatio(pageButtonHover.border, pageButtonHover.background) * 100,
  ) / 100
  assert.equal(output.checks.contrast.textSamplesAtLeastFourPointFive, true)
  assert.equal(focusContrast.visible, true)
  assert.ok(Number.parseFloat(focusContrast.outlineWidth) >= 3)
  assert.ok(output.checks.contrast.focusRingOnWhiteRatio >= 3)
  assert.ok(output.checks.contrast.focusRingOnAdjacentRatio >= 3)
  assert.ok(output.checks.contrast.components.searchBorder.ratioAgainstFill >= 3)
  assert.ok(output.checks.contrast.components.paginationBorder.ratioAgainstFill >= 3)
  assert.ok(output.checks.contrast.components.paginationHoverBorderRatio >= 3)
  assert.equal(ascendingSort.sort, 'ascending')
  assert.equal(ascendingSort.pressed, 'true')
  assert.equal(ascendingSort.indicator, '↑')
  assert.equal(descendingSort.sort, 'descending')
  assert.equal(descendingSort.pressed, 'true')
  assert.equal(descendingSort.indicator, '↓')

  await page.reload({ waitUntil: 'networkidle' })
  await page.addScriptTag({ content: axeSource })
  await page.setViewportSize({ width: 320, height: 900 })
  const reflow = await page.evaluate(() => ({
    viewportWidth: innerWidth,
    documentWidth: document.documentElement.scrollWidth,
    tableViewportWidth: document.querySelector('.data-grid__table-wrap')?.clientWidth ?? 0,
    tableContentWidth: document.querySelector('.data-grid__table-wrap')?.scrollWidth ?? 0,
  }))
  assert.equal(reflow.documentWidth, reflow.viewportWidth)
  assert.ok(reflow.tableContentWidth > reflow.tableViewportWidth)
  output.checks.reflowAt320CssPixels = reflow
  await page.screenshot({
    path: resolve(outputDir, 'accessibility-reflow-320px.png'),
    fullPage: true,
  })

  const longText = 'VeryLongUnbrokenDirectoryValue'.repeat(10)
  await page.locator('tbody tr[data-row-id]').first().locator('td[role="gridcell"]').first().evaluate((cell, value) => {
    cell.textContent = value
  }, longText)
  const longContentLayout = await page.evaluate(() => ({
    injectedCharacters: document.querySelector('tbody tr[data-row-id] td[role="gridcell"]')?.textContent?.length ?? 0,
    viewportWidth: innerWidth,
    documentWidth: document.documentElement.scrollWidth,
    tableViewportWidth: document.querySelector('.data-grid__table-wrap')?.clientWidth ?? 0,
    tableContentWidth: document.querySelector('.data-grid__table-wrap')?.scrollWidth ?? 0,
  }))
  assert.equal(longContentLayout.documentWidth, longContentLayout.viewportWidth)
  assert.ok(longContentLayout.tableContentWidth > longContentLayout.tableViewportWidth)
  output.checks.longContentStress = {
    method: 'Injected a long unbroken string into an existing production-preview cell to stress rendered table layout; this is a visual CSS check, not an application data-path test.',
    ...longContentLayout,
  }
  await page.screenshot({
    path: resolve(outputDir, 'accessibility-long-content-320px.png'),
    fullPage: true,
  })

  await page.reload({ waitUntil: 'networkidle' })
  await page.addScriptTag({ content: axeSource })
  await page.setViewportSize({ width: 320, height: 900 })
  await page.addStyleTag({
    content: `
      html *, html *::before, html *::after {
        line-height: 1.5 !important;
        letter-spacing: 0.12em !important;
        word-spacing: 0.16em !important;
      }
      p { margin-block-end: 2em !important; }
    `,
  })
  const textSpacing = await page.evaluate(() => ({
    viewportWidth: innerWidth,
    documentWidth: document.documentElement.scrollWidth,
    tableViewportWidth: document.querySelector('.data-grid__table-wrap')?.clientWidth ?? 0,
    tableContentWidth: document.querySelector('.data-grid__table-wrap')?.scrollWidth ?? 0,
    instructionsLineHeight: getComputedStyle(document.querySelector('.data-grid__instructions')).lineHeight,
  }))
  assert.equal(textSpacing.documentWidth, textSpacing.viewportWidth)
  assert.ok(textSpacing.tableContentWidth > textSpacing.tableViewportWidth)
  output.checks.textSpacingOverride = textSpacing
  await page.screenshot({
    path: resolve(outputDir, 'accessibility-text-spacing-320px.png'),
    fullPage: true,
  })

  const zoomContext = await browser.newContext({
    viewport: { width: 720, height: 1000 },
    deviceScaleFactor: 2,
  })
  const zoomPage = await zoomContext.newPage()
  await zoomPage.goto(appUrl, { waitUntil: 'networkidle' })
  const zoomEquivalent = await zoomPage.evaluate(() => ({
    viewportCssWidth: innerWidth,
    documentCssWidth: document.documentElement.scrollWidth,
    devicePixelRatio,
    tableViewportWidth: document.querySelector('.data-grid__table-wrap')?.clientWidth ?? 0,
    tableContentWidth: document.querySelector('.data-grid__table-wrap')?.scrollWidth ?? 0,
  }))
  assert.equal(zoomEquivalent.documentCssWidth, zoomEquivalent.viewportCssWidth)
  assert.ok(zoomEquivalent.tableContentWidth > zoomEquivalent.tableViewportWidth)
  output.checks.twoHundredPercentZoomEquivalent = {
    method: '720 CSS-pixel viewport at DPR 2, matching the layout viewport produced by 200% zoom from a 1440 CSS-pixel wide window; browser chrome zoom control was not automated.',
    ...zoomEquivalent,
  }
  await zoomPage.screenshot({
    path: resolve(outputDir, 'accessibility-200-percent-zoom-equivalent.png'),
    fullPage: true,
  })
  await zoomContext.close()

  assert.deepEqual(pageErrors, [])
  assert.deepEqual(consoleErrors, [])
  output.checks.runtimeErrors = { pageErrors, consoleErrors }
  output.environment = {
    platform: process.platform,
    osRelease: os.release(),
    node: process.version,
    browser: await browser.version(),
    axeCore: packageJson.devDependencies['axe-core'],
    playwright: packageJson.devDependencies.playwright,
    sourceRevision: process.env.SOURCE_REVISION || null,
    appUrl,
  }
  const reportPath = resolve(outputDir, 'accessibility-audit-final.json')
  await writeFile(reportPath, JSON.stringify(output, null, 2) + '\n', 'utf8')
  console.log(JSON.stringify({ reportPath, output }, null, 2))
} finally {
  await browser.close()
}
