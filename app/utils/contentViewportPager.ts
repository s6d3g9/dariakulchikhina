const BLOCK_SHELL_SELECTORS = '.proj-main-inner, .cab-inner, .docs-registry, .docs-editor-stage'
const ROW_CONTAINER_SELECTORS = [
  '.u-grid-2',
  '.docs-field-grid',
  '.docs-meta-grid',
  '.docs-list',
  '.docs-grid',
  '.docs-panel',
  '.docs-column',
  '.docs-registry-head',
  '.docs-registry-controls',
  '.dash-stats',
  '.cab-projects-grid',
  '.agal-grid',
  '.de-fields-grid',
  '.de-tpl-grid',
  '.de-sources',
].join(', ')

const ATOMIC_UNIT_CONTAINER_SELECTORS = [
  '.u-grid-2',
  '.docs-grid',
  '.docs-list',
  '.docs-column',
  '.docs-panel',
  '.docs-field-grid',
  '.docs-meta-grid',
  '.docs-registry-head',
  '.docs-registry-controls',
  '.cab-inner',
  '.cab-projects-grid',
  '.dash-stats',
  '.agal-grid',
  '.de-fields-grid',
  '.de-tpl-grid',
  '.de-sources',
].join(', ')

const SEMANTIC_GROUP_CONTAINER_SELECTORS = [
  '[data-cv-unit="group"]',
  '[data-cv-unit="list"]',
  '[data-cv-unit="section"]',
  '.u-form-section',
  '.apo-section',
  '.apo-entity-group',
  '.apo-phases',
].join(', ')

const SEMANTIC_ATOMIC_UNIT_SELECTORS = [
  '[data-cv-unit="atomic"]',
  '[data-cv-unit="item"]',
  '[data-cv-unit="field"]',
  '.u-field',
  '.apo-welcome',
  '.apo-quick-nav',
  '.apo-entity-card',
  '.apo-phase-row',
].join(', ')

const PAGER_RAIL_SELECTORS = '.cv-pager-rail, .proj-pager-rail'
const MIN_VISIBLE_HEIGHT = 24
const ROW_GROUP_GAP = 14
const ZONE_EDGE_GAP = 8
const MIN_ZONE_DELTA = 32
const ZONE_OFFSET_ATTR = 'data-cv-zone-offset'
const MIN_ZONE_DENSITY_BUDGET = 3.6
const MAX_ZONE_DENSITY_BUDGET = 7.4
const MIN_ZONE_FILL_RATIO = 0.52
const HERO_TO_CONTENT_MIN_DELTA_RATIO = 0.28
const MIN_ZONE_TOP_INSET = 28
const MAX_ZONE_TOP_INSET = 72
const MIN_ZONE_BOTTOM_INSET = 28
const MAX_ZONE_BOTTOM_INSET = 180
const ZONE_SPACER_ATTR = 'data-cv-zone-spacer'

type DensityRow = {
  top: number
  bottom: number
  density: number
  preserveBoundary: boolean
}

function isRenderableNode(node: Element): node is HTMLElement {
  return node instanceof HTMLElement && node.offsetParent !== null && node.offsetHeight > MIN_VISIBLE_HEIGHT
}

function getRenderableChildren(node: HTMLElement) {
  return Array.from(node.children)
    .filter(isRenderableNode)
    .filter((child) => !isPagerRail(child) && !isZoneSpacer(child) && !child.classList.contains('admin-entity-hero'))
}

function isPagerRail(node: HTMLElement) {
  return node.matches(PAGER_RAIL_SELECTORS)
}

function isZoneSpacer(node: HTMLElement) {
  return node.getAttribute(ZONE_SPACER_ATTR) === '1'
}

function clearZoneOffsets(viewport: HTMLElement) {
  Array.from(viewport.querySelectorAll<HTMLElement>(`[${ZONE_OFFSET_ATTR}]`)).forEach((node) => {
    node.style.removeProperty('margin-top')
    node.removeAttribute(ZONE_OFFSET_ATTR)
  })

  Array.from(viewport.querySelectorAll<HTMLElement>(`[${ZONE_SPACER_ATTR}]`)).forEach((node) => {
    node.remove()
  })
}

function applyZoneOffset(node: HTMLElement, offset: number) {
  if (offset < MIN_ZONE_DELTA) return
  node.style.marginTop = `${Math.round(offset)}px`
  node.setAttribute(ZONE_OFFSET_ATTR, '1')
}

/** Wipe-mode offset with a lower threshold — even small pushes matter for strict page boundaries. */
function applyWipeOffset(node: HTMLElement, offset: number) {
  if (offset < 4) return
  node.style.marginTop = `${Math.round(offset)}px`
  node.setAttribute(ZONE_OFFSET_ATTR, '1')
}

function resolveZoneCarryOffset(zoneTop: number, childTop: number, visibleHeight: number) {
  const relativeTop = childTop - zoneTop
  if (relativeTop < MIN_ZONE_DELTA) return 0
  return Math.max(0, visibleHeight - relativeTop)
}

function parseCssPixels(value: string | null | undefined) {
  const parsed = Number.parseFloat(value || '')
  return Number.isFinite(parsed) ? parsed : 0
}

export function resolveViewportPagerRailInset(viewport: HTMLElement | null) {
  if (!viewport) return 0

  const rail = viewport.querySelector<HTMLElement>(PAGER_RAIL_SELECTORS)
  if (!rail || rail.offsetParent === null) return 0

  const railStyle = getComputedStyle(rail)
  const stickyBottom = parseCssPixels(railStyle.bottom)
  const marginBottom = parseCssPixels(railStyle.marginBottom)

  return Math.round(rail.offsetHeight + stickyBottom + marginBottom)
}

function resolveZoneInsets(viewportHeight: number, reservedBottomInset = 0) {
  const top = clampNumber(Math.round(viewportHeight * 0.075), MIN_ZONE_TOP_INSET, MAX_ZONE_TOP_INSET)
  const baseBottom = clampNumber(Math.round(viewportHeight * 0.1), MIN_ZONE_BOTTOM_INSET, MAX_ZONE_BOTTOM_INSET)
  const bottom = clampNumber(Math.max(baseBottom, reservedBottomInset), MIN_ZONE_BOTTOM_INSET, MAX_ZONE_BOTTOM_INSET)
  return {
    top,
    bottom,
    visibleHeight: Math.max(120, viewportHeight - top - bottom),
  }
}

export function resolveViewportSheetInsets(viewportHeight: number, reservedBottomInset = 0) {
  return resolveZoneInsets(viewportHeight, reservedBottomInset)
}

function isFlowDisplay(display: string) {
  return display === 'block' || display === 'grid' || display === 'flex' || display === 'table' || display === 'flow-root'
}

function isSemanticGroupContainer(node: HTMLElement) {
  return node.matches(SEMANTIC_GROUP_CONTAINER_SELECTORS)
}

function isSemanticAtomicUnit(node: HTMLElement) {
  return node.matches(SEMANTIC_ATOMIC_UNIT_SELECTORS)
}

function shouldTreatAsLayoutContainer(node: HTMLElement, viewport: HTMLElement) {
  const children = getRenderableChildren(node)
  if (children.length < 2) return false

  if (isSemanticGroupContainer(node)) return true

  const style = getComputedStyle(node)
  if (!isFlowDisplay(style.display)) return false

  const nodeTop = resolveTopRelativeToViewport(node, viewport)
  const viewportHeight = Math.max(viewport.clientHeight, 1)
  const nodeBottom = nodeTop + node.offsetHeight

  if (nodeBottom > nodeTop + viewportHeight - ZONE_EDGE_GAP) {
    return true
  }

  return children.some((child) => {
    const childTop = resolveTopRelativeToViewport(child, viewport)
    return childTop - nodeTop >= MIN_ZONE_DELTA
  })
}

function resolvePrimaryLayoutContainer(node: HTMLElement, viewport: HTMLElement, depth = 0): HTMLElement[] {
  const children = getRenderableChildren(node)

  if (!children.length || depth >= 4) {
    return []
  }

  if (children.length === 1) {
    const [onlyChild] = children
    const wrapperSlack = Math.abs(node.offsetHeight - onlyChild.offsetHeight)

    if (wrapperSlack <= MIN_ZONE_DELTA) {
      return resolvePrimaryLayoutContainer(onlyChild, viewport, depth + 1)
    }
  }

  if (shouldTreatAsLayoutContainer(node, viewport)) {
    return [node]
  }

  return children.flatMap((child) => resolvePrimaryLayoutContainer(child, viewport, depth + 1))
}

function collectZoneLayoutContainers(viewport: HTMLElement) {
  const blocks = resolvePageBlocks(viewport)
  const commonParent = blocks.length >= 2
    ? blocks[0]?.parentElement
    : null

  if (
    commonParent instanceof HTMLElement
    && blocks.every((block) => block.parentElement === commonParent)
    && isFlowDisplay(getComputedStyle(commonParent).display)
  ) {
    return [commonParent]
  }

  const seen = new Set<HTMLElement>()

  return blocks
    .flatMap((block) => resolvePrimaryLayoutContainer(block, viewport))
    .filter((node) => {
      if (seen.has(node)) return false
      seen.add(node)
      return true
    })
    .sort((left, right) => resolveTopRelativeToViewport(left, viewport) - resolveTopRelativeToViewport(right, viewport))
}

function resolvePageBlockSource(viewport: HTMLElement) {
  const directChildren = Array.from(viewport.children)
    .filter(isRenderableNode)
    .filter((node) => !isPagerRail(node) && !isZoneSpacer(node))

  const shell = directChildren.find((node) => node.matches(BLOCK_SHELL_SELECTORS))
  const source = shell ?? viewport

  return {
    shell,
    source,
  }
}

function ensureViewportBottomSpacer(viewport: HTMLElement, height: number) {
  const normalizedHeight = Math.max(0, Math.round(height))
  if (!normalizedHeight) return

  const { source } = resolvePageBlockSource(viewport)
  const spacer = document.createElement('div')
  spacer.setAttribute(ZONE_SPACER_ATTR, '1')
  spacer.setAttribute('aria-hidden', 'true')
  spacer.style.height = `${normalizedHeight}px`
  spacer.style.flex = '0 0 auto'
  spacer.style.pointerEvents = 'none'
  source.appendChild(spacer)
}

function applyViewportZoneLayoutPass(viewport: HTMLElement) {
  let applied = false

  const viewportHeight = Math.max(viewport.clientHeight, 1)
  const zoneInsets = resolveZoneInsets(viewportHeight, resolveViewportPagerRailInset(viewport))
  const containers = collectZoneLayoutContainers(viewport)

  containers.forEach((container) => {
    const children = getRenderableChildren(container)

    if (children.length < 2) return

    let carriedOffset = 0
    let zoneTop = resolveTopRelativeToViewport(container, viewport)

    children.forEach((child, index) => {
      let childTop = resolveTopRelativeToViewport(child, viewport) + carriedOffset
      const minimumVisibleTop = zoneTop + zoneInsets.top

      if (index === 0 && childTop < minimumVisibleTop) {
        const leadingOffset = minimumVisibleTop - childTop
        applyZoneOffset(child, leadingOffset)
        carriedOffset += leadingOffset
        childTop += leadingOffset
        applied = true
      }

      const childHeight = child.offsetHeight
      const childBottom = childTop + childHeight
      const visibleTop = zoneTop + zoneInsets.top
      const visibleBottom = zoneTop + viewportHeight - zoneInsets.bottom
      const carryOffset = resolveZoneCarryOffset(visibleTop, childTop, zoneInsets.visibleHeight)

      if (childHeight >= zoneInsets.visibleHeight - ZONE_EDGE_GAP) {
        if (carryOffset > 0) {
          applyZoneOffset(child, carryOffset)
          carriedOffset += carryOffset
          zoneTop = childTop + carryOffset - zoneInsets.top
          applied = true
          return
        }

        if (childTop >= visibleTop + MIN_ZONE_DELTA) {
          zoneTop = childTop - zoneInsets.top
        }
        return
      }

      if (childTop >= visibleTop + MIN_ZONE_DELTA && childBottom > visibleBottom) {
        const appliedOffset = carryOffset
        applyZoneOffset(child, appliedOffset)
        carriedOffset += appliedOffset
        zoneTop = childTop + appliedOffset - zoneInsets.top
        applied = true
      }
    })
  })

  return applied
}

/**
 * Heading-like element detection for keep-with-next rules.
 * Returns true for section titles, group labels, and HTML headings.
 */
const WIPE_HEADING_SELECTORS = [
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  '.apo-section-title',
  '.apo-entity-label',
  '[role="heading"]',
].join(', ')

function isWipeHeading(el: HTMLElement): boolean {
  if (el.matches(WIPE_HEADING_SELECTORS)) return true
  // Short first-child of a semantic container (label/title pattern)
  const parent = el.parentElement
  if (parent && el === parent.firstElementChild && el.offsetHeight < 60) {
    if (parent.matches('.apo-section, .apo-entity-group, .u-form-section, [data-cv-unit="section"], [data-cv-unit="group"]')) {
      if (!el.querySelector('input, textarea, select, button, img, video')) return true
    }
  }
  return false
}

type WipeItem = {
  el: HTMLElement
  naturalTop: number
  height: number
  keepWithNext: boolean
  minCompanionHeight: number
}

/**
 * Build a flat list of items with semantic keep-together awareness.
 *
 * Headings (section titles, group labels) are marked with keepWithNext=true
 * and carry a minCompanionHeight — the minimum height of content that MUST
 * appear on the same page below the heading to prevent orphaning.
 *
 * NOTE: isRenderableNode filters elements < 24px, so short headings like
 * .apo-section-title (19px) and .apo-entity-label (19px) are invisible to
 * collectRowItems. We explicitly scan for them via querySelectorAll.
 */
function buildWipeItemList(viewport: HTMLElement): WipeItem[] {
  const blocks = resolvePageBlocks(viewport)
  const result: WipeItem[] = []
  const seen = new Set<HTMLElement>()

  for (const block of blocks) {
    const children = collectRowItems(block, viewport)

    // Explicitly find headings that might be smaller than MIN_VISIBLE_HEIGHT
    const headings = Array.from(block.querySelectorAll<HTMLElement>(WIPE_HEADING_SELECTORS))
      .filter((el) => el.offsetParent !== null && el.offsetHeight > 0)

    // Merge headings into the items list, deduplicating
    const merged: HTMLElement[] = []
    for (const h of headings) {
      if (!seen.has(h)) { seen.add(h); merged.push(h) }
    }
    for (const c of children) {
      if (!seen.has(c)) { seen.add(c); merged.push(c) }
    }

    if (merged.length < 2 && children.length < 2) {
      if (!seen.has(block)) {
        seen.add(block)
        result.push({
          el: block,
          naturalTop: resolveTopRelativeToViewport(block, viewport),
          height: block.offsetHeight,
          keepWithNext: false,
          minCompanionHeight: 0,
        })
      }
      continue
    }

    // Sort merged items by position
    const sorted = merged.sort(
      (a, b) => resolveTopRelativeToViewport(a, viewport) - resolveTopRelativeToViewport(b, viewport),
    )

    for (let i = 0; i < sorted.length; i++) {
      const child = sorted[i]
      const heading = isWipeHeading(child)
      const next = sorted[i + 1]

      result.push({
        el: child,
        naturalTop: resolveTopRelativeToViewport(child, viewport),
        height: child.offsetHeight,
        keepWithNext: heading && !!next,
        minCompanionHeight: heading && next ? Math.min(next.offsetHeight, 120) + 12 : 0,
      })
    }
  }

  // Final dedup + sort by natural position
  const finalSeen = new Set<HTMLElement>()
  return result
    .filter((u) => { if (finalSeen.has(u.el)) return false; finalSeen.add(u.el); return true })
    .sort((a, b) => a.naturalTop - b.naturalTop)
}

/**
 * Content-aware page breaks for wipe (book-like) mode.
 *
 * Works like a typesetting engine with three rules:
 * 1. Cross-boundary: items sliced at a page boundary → push to next page
 * 2. Keep-with-next: headings must share a page with companion content
 * 3. Fill budget: respect the configurable page fill ratio
 *
 * Large elements that cannot fit on a single page are left in place.
 * All offsets are calculated sequentially but applied via a single
 * accumulated offset tracker to avoid interleaved DOM reads/writes.
 */
function applyWipeContentBreaks(viewport: HTMLElement) {
  const viewportHeight = Math.max(viewport.clientHeight, 1)
  const vpStyle = getComputedStyle(viewport)
  const sheetTop = parseCssPixels(vpStyle.getPropertyValue('--cv-sheet-top')) || 48
  const sheetBottom = parseCssPixels(vpStyle.getPropertyValue('--cv-sheet-bottom')) || 106
  const pageFill = clampNumber(Number.parseFloat(vpStyle.getPropertyValue('--wipe-page-fill')) || 0.85, 0.3, 1)
  const step = Math.max(120, viewportHeight - sheetTop - sheetBottom)
  const fillBudget = step * pageFill

  const hero = viewport.querySelector<HTMLElement>('.admin-entity-hero')
  const heroBottom = hero ? resolveTopRelativeToViewport(hero, viewport) + hero.offsetHeight : 0

  let firstContentStop = step
  if (heroBottom > sheetTop + step) {
    firstContentStop = heroBottom - sheetTop
  }

  const pageStart0 = sheetTop + firstContentStop // top of first content page
  const heroPageEnd = sheetTop + step // bottom of hero page

  const items = buildWipeItemList(viewport)
  if (!items.length) return

  let accOffset = 0

  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    const effectiveTop = item.naturalTop + accOffset
    const effectiveBottom = effectiveTop + item.height

    // Skip items that fit entirely within the hero page
    if (effectiveBottom <= heroPageEnd) continue

    // Determine which content page this item falls on
    const contentRel = effectiveTop - pageStart0
    const pageIdx = Math.max(0, Math.floor(contentRel / step))
    const pageTop = pageStart0 + pageIdx * step
    const pageBottom = pageStart0 + (pageIdx + 1) * step
    const usedOnPage = effectiveTop - pageTop
    const remainingOnPage = pageBottom - effectiveTop

    // Rule 1: Item crosses page boundary — push to next page if it fits on one
    if (effectiveBottom > pageBottom + ZONE_EDGE_GAP) {
      if (item.height < step - ZONE_EDGE_GAP * 2) {
        const pushOffset = pageBottom - effectiveTop
        if (pushOffset > 0 && pushOffset < step) {
          applyWipeOffset(item.el, pushOffset)
          accOffset += pushOffset
        }
      }
      continue
    }

    // Rule 2: Keep-with-next — heading must share page with companion content
    if (item.keepWithNext) {
      const neededHeight = item.height + item.minCompanionHeight
      if (remainingOnPage < neededHeight && usedOnPage > ZONE_EDGE_GAP) {
        const pushOffset = pageBottom - effectiveTop
        if (pushOffset > 0 && pushOffset < step) {
          applyWipeOffset(item.el, pushOffset)
          accOffset += pushOffset
        }
        continue
      }
    }

    // Rule 3: Fill budget — only for non-heading items
    if (!item.keepWithNext && usedOnPage > fillBudget && effectiveTop > pageTop + MIN_ZONE_DELTA) {
      const pushOffset = pageBottom - effectiveTop
      if (pushOffset > 0 && pushOffset < step && item.height < step - ZONE_EDGE_GAP * 2) {
        applyWipeOffset(item.el, pushOffset)
        accOffset += pushOffset
      }
    }
  }
}

export function applyViewportZoneLayout(viewport: HTMLElement) {
  const preservedScrollTop = viewport.scrollTop
  clearZoneOffsets(viewport)

  const zoneInsets = resolveZoneInsets(Math.max(viewport.clientHeight, 1), resolveViewportPagerRailInset(viewport))
  ensureViewportBottomSpacer(viewport, zoneInsets.visibleHeight)

  // In wipe/book mode, apply content-aware page breaks
  if (viewport.dataset.cvMode === 'wipe') {
    applyWipeContentBreaks(viewport)
    return
  }

  const nextMaxTop = Math.max(0, viewport.scrollHeight - viewport.clientHeight)
  const targetTop = Math.min(preservedScrollTop, nextMaxTop)

  if (Math.abs(viewport.scrollTop - targetTop) > 1) {
    viewport.scrollTo({ top: targetTop, behavior: 'auto' })
  }
}

export function resolveTopRelativeToViewport(node: HTMLElement, viewport: HTMLElement) {
  const viewportRect = viewport.getBoundingClientRect()
  const nodeRect = node.getBoundingClientRect()
  return Math.round(nodeRect.top - viewportRect.top + viewport.scrollTop)
}

function resolvePageBlocks(viewport: HTMLElement) {
  const { shell, source } = resolvePageBlockSource(viewport)
  const directChildren = Array.from(viewport.children)
    .filter(isRenderableNode)
    .filter((node) => !isPagerRail(node) && !isZoneSpacer(node))
  let blocks = (shell
    ? Array.from(shell.children)
    : directChildren.filter((node) => !node.classList.contains('admin-entity-hero')))
    .filter(isRenderableNode)
    .filter((node) => !isZoneSpacer(node))

  for (let depth = 0; depth < 4 && blocks.length === 1; depth += 1) {
    const [onlyBlock] = blocks
    const children = getRenderableChildren(onlyBlock)
    const style = getComputedStyle(onlyBlock)

    if (children.length === 1) {
      const [onlyChild] = children
      blocks = [onlyChild]
      continue
    }

    if (children.length < 2 || !isFlowDisplay(style.display)) {
      break
    }

    blocks = children
  }

  return blocks
}

function collectAtomicUnits(node: HTMLElement, viewportHeight: number, depth = 0): HTMLElement[] {
  if (isSemanticAtomicUnit(node)) {
    return [node]
  }

  const directChildren = getRenderableChildren(node)

  if (!directChildren.length || depth >= 4) {
    return [node]
  }

  if (directChildren.length === 1) {
    const [onlyChild] = directChildren
    const wrapperSlack = Math.abs(node.offsetHeight - onlyChild.offsetHeight)
    if (wrapperSlack <= MIN_ZONE_DELTA) {
      return collectAtomicUnits(onlyChild, viewportHeight, depth + 1)
    }
  }

  const style = getComputedStyle(node)
  const isDynamicContainer = directChildren.length > 1 && isFlowDisplay(style.display)

  const shouldSplit = isSemanticGroupContainer(node)
    || node.matches(ATOMIC_UNIT_CONTAINER_SELECTORS)
    || node.matches(ROW_CONTAINER_SELECTORS)
    || isDynamicContainer
    || node.offsetHeight > viewportHeight - ZONE_EDGE_GAP

  if (!shouldSplit) {
    return [node]
  }

  return directChildren.flatMap((child) => {
    const childCanSplit = child.children.length > 1 && (
      isSemanticGroupContainer(child)
      || child.matches(ATOMIC_UNIT_CONTAINER_SELECTORS)
      || child.matches(ROW_CONTAINER_SELECTORS)
      || child.offsetHeight > viewportHeight - ZONE_EDGE_GAP
    )

    if (!childCanSplit) {
      return [child]
    }

    return collectAtomicUnits(child, viewportHeight, depth + 1)
  })
}

function collectRowItems(block: HTMLElement, viewport: HTMLElement) {
  let items = collectAtomicUnits(block, viewport.clientHeight)
    .filter((item) => item !== block)

  if (items.length >= 2) {
    items = items.filter((item) => !items.some((other) => other !== item && item.contains(other)))
  }

  if (items.length < 2) {
    items = Array.from(block.children)
      .filter(isRenderableNode)
      .filter((item) => !isPagerRail(item) && !item.classList.contains('admin-entity-hero'))
  }

  return items.sort((left, right) => left.getBoundingClientRect().top - right.getBoundingClientRect().top)
}

function clampNumber(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function shouldPreserveRowBoundary(node: HTMLElement) {
  if (isSemanticAtomicUnit(node) || isSemanticGroupContainer(node)) {
    return true
  }

  if (node.tagName === 'SECTION' || node.tagName === 'ARTICLE' || node.tagName === 'FORM' || node.tagName === 'FIELDSET') {
    return true
  }

  const style = getComputedStyle(node)
  const children = getRenderableChildren(node)
  const hasHeading = !!node.querySelector('h1, h2, h3, h4, h5, h6, legend')
  const hasControls = node.querySelectorAll('input, textarea, select, button, [role="button"]').length >= 2
  const ownMargin = (Number.parseFloat(style.marginTop) || 0) + (Number.parseFloat(style.marginBottom) || 0)

  if (children.length > 1 && isFlowDisplay(style.display) && (hasHeading || hasControls)) {
    return true
  }

  return ownMargin >= ROW_GROUP_GAP
}

function resolveLineHeightPx(style: CSSStyleDeclaration, fontSize: number) {
  const raw = Number.parseFloat(style.lineHeight)
  if (Number.isFinite(raw)) return raw
  return fontSize * 1.45
}

function measureNodeDensity(node: HTMLElement, viewport: HTMLElement) {
  const viewportHeight = Math.max(viewport.clientHeight, 1)
  const style = getComputedStyle(node)
  const fontSize = Number.parseFloat(style.fontSize) || 16
  const lineHeight = resolveLineHeightPx(style, fontSize)
  const textLength = (node.textContent || '').replace(/\s+/g, ' ').trim().length
  const headingCount = node.matches('h1, h2, h3, h4, h5, h6') ? 1 : node.querySelectorAll('h1, h2, h3, h4, h5, h6').length
  const buttonCount = node.matches('button, [role="button"]') ? 1 : node.querySelectorAll('button, [role="button"], .a-btn-sm, .admin-entity-hero__action').length
  const inputCount = node.matches('input, textarea, select') ? 1 : node.querySelectorAll('input, textarea, select, [contenteditable="true"]').length
  const badgeCount = node.querySelectorAll('.doc-badge, .docs-stat, .docs-meta-card, [class*="badge"], [class*="chip"]').length
  const mediaCount = node.querySelectorAll('img, video, iframe, canvas, svg').length
  const paragraphCount = node.querySelectorAll('p, li, pre, blockquote').length
  const areaWeight = clampNumber((node.offsetHeight / viewportHeight) * 2.2, 0.35, 2.8)
  const textWeight = clampNumber(textLength / 420, 0, 1.9)
  const typographyWeight = clampNumber((fontSize / 16 - 1) * 0.7 + (lineHeight / Math.max(fontSize, 1) - 1.35) * 0.35, 0, 0.9)
  const headingWeight = headingCount * 0.24
  const actionWeight = buttonCount * 0.16 + inputCount * 0.3
  const supportingWeight = badgeCount * 0.06 + paragraphCount * 0.04 + mediaCount * 0.4

  return clampNumber(
    areaWeight + textWeight + typographyWeight + headingWeight + actionWeight + supportingWeight,
    0.4,
    3.6,
  )
}

function resolveViewportDensityBudget(viewport: HTMLElement, visibleHeight = Math.max(viewport.clientHeight, 1)) {
  const style = getComputedStyle(viewport)
  const fontSize = Number.parseFloat(style.fontSize) || 16
  const lineHeight = resolveLineHeightPx(style, fontSize)
  const visibleLines = visibleHeight / Math.max(lineHeight, 1)
  const rawBudget = visibleLines / 7.5 - Math.max(0, fontSize - 16) * 0.08
  return clampNumber(rawBudget, MIN_ZONE_DENSITY_BUDGET, MAX_ZONE_DENSITY_BUDGET)
}

function resolveDensityRows(block: HTMLElement, viewport: HTMLElement): DensityRow[] {
  const items = collectRowItems(block, viewport)
  const rows: DensityRow[] = []

  items.forEach((item) => {
    const top = resolveTopRelativeToViewport(item, viewport)
    const bottom = top + item.offsetHeight
    const density = measureNodeDensity(item, viewport)
    const current = rows[rows.length - 1]
    const preserveBoundary = shouldPreserveRowBoundary(item)
    const shouldKeepSeparate = current?.preserveBoundary && preserveBoundary

    if (!current || shouldKeepSeparate || top > current.bottom + ROW_GROUP_GAP) {
      rows.push({ top, bottom, density, preserveBoundary })
      return
    }

    current.bottom = Math.max(current.bottom, bottom)
    current.density += density
  })

  return rows
}

function clampZoneStart(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Math.round(value)))
}

function pushStop(stops: number[], value: number) {
  const normalized = Math.round(value)
  const previous = stops[stops.length - 1]
  if (previous == null || normalized - previous >= MIN_ZONE_DELTA) {
    stops.push(normalized)
  }
}

function compressStops(stops: number[]) {
  return stops.reduce<number[]>((acc, stop) => {
    const previous = acc[acc.length - 1]
    if (previous == null || stop - previous >= MIN_ZONE_DELTA) {
      acc.push(stop)
    }
    return acc
  }, [])
}

function pruneCoveredStops(stops: number[], visibleHeight: number) {
  const minimumFreshArea = Math.max(MIN_ZONE_DELTA, Math.round(visibleHeight * 0.7))

  return stops.reduce<number[]>((acc, stop, index) => {
    if (index === 0) {
      acc.push(stop)
      return acc
    }

    const previous = acc[acc.length - 1] ?? 0
    if (stop <= previous + minimumFreshArea) {
      return acc
    }

    acc.push(stop)
    return acc
  }, [])
}

function buildVisibleZonesForBlock(
  rows: DensityRow[],
  blockStart: number,
  blockMaxStart: number,
  viewportHeight: number,
  densityBudget: number,
  reservedBottomInset = 0,
) {
  const zoneInsets = resolveZoneInsets(viewportHeight, reservedBottomInset)
  const stops = [blockStart]
  if (!rows.length || blockMaxStart <= blockStart + 4) {
    return stops
  }

  let zoneStart = blockStart
  let zoneDensity = 0
  const minimumZoneFill = zoneInsets.visibleHeight * MIN_ZONE_FILL_RATIO
  const minimumInitialStopDelta = Math.max(120, Math.round(viewportHeight * HERO_TO_CONTENT_MIN_DELTA_RATIO))

  rows.forEach((row) => {
    const rowTop = clampZoneStart(row.top, blockStart, blockMaxStart)
    const rowBottom = Math.max(rowTop + 1, row.bottom)
    const rowHeight = rowBottom - rowTop
    const currentVisibleTop = zoneStart + zoneInsets.top
    const currentVisibleBottom = zoneStart + viewportHeight - zoneInsets.bottom
    const rowFitsCurrentZone = rowBottom <= currentVisibleBottom
    const rowStartsNearZoneTop = rowTop - currentVisibleTop < minimumInitialStopDelta
    const consumedHeight = rowTop - currentVisibleTop
    const rowOverloadsZone = zoneDensity > 0
      && zoneDensity + row.density > densityBudget
      && consumedHeight >= minimumZoneFill

    if (!rowFitsCurrentZone || rowOverloadsZone) {
      let nextStart = rowTop - zoneInsets.top
      const tinyInitialStop = stops.length === 1 && nextStart - blockStart < minimumInitialStopDelta
      const splitOnlyBecauseShortPrelude = !rowFitsCurrentZone
        && rowHeight <= zoneInsets.visibleHeight - ZONE_EDGE_GAP
        && rowStartsNearZoneTop

      if (tinyInitialStop && rowFitsCurrentZone) {
        zoneDensity += row.density
        return
      }

      if (splitOnlyBecauseShortPrelude) {
        zoneDensity += row.density
        return
      }

      if (rowHeight > zoneInsets.visibleHeight - ZONE_EDGE_GAP) {
        const oversizedStops: number[] = []
        let sliceStart = Math.max(zoneStart + zoneInsets.top, rowTop)
        if (sliceStart > zoneStart + 4 || stops.length === 1) {
          pushStop(oversizedStops, clampZoneStart(sliceStart - zoneInsets.top, blockStart, blockMaxStart))
        }

        while (rowBottom > sliceStart + zoneInsets.visibleHeight - ZONE_EDGE_GAP) {
          sliceStart = clampZoneStart(sliceStart + zoneInsets.visibleHeight - ZONE_EDGE_GAP, blockStart + zoneInsets.top, blockMaxStart + zoneInsets.top)
          const normalizedSliceStart = clampZoneStart(sliceStart - zoneInsets.top, blockStart, blockMaxStart)
          if (normalizedSliceStart <= (oversizedStops[oversizedStops.length - 1] ?? zoneStart) + 4) break
          pushStop(oversizedStops, normalizedSliceStart)
        }

        oversizedStops.forEach((stop) => {
          pushStop(stops, stop)
        })

        zoneStart = oversizedStops[oversizedStops.length - 1] ?? Math.max(blockStart, rowTop - zoneInsets.top)
        zoneDensity = Math.max(row.density, densityBudget * 0.55)
        return
      }

      nextStart = clampZoneStart(nextStart, blockStart, blockMaxStart)
      pushStop(stops, nextStart)
      zoneStart = nextStart
      zoneDensity = row.density
      return
    }

    zoneDensity += row.density
  })

  if (blockMaxStart > (stops[stops.length - 1] ?? blockStart) + 4) {
    pushStop(stops, blockMaxStart)
  }

  return stops
}

export function buildViewportPageStops(viewport: HTMLElement) {
  const viewportHeight = Math.max(viewport.clientHeight, 1)
  const isWipeMode = viewport.dataset.cvMode === 'wipe'
  const reservedBottomInset = resolveViewportPagerRailInset(viewport)

  // For wipe mode, read actual CSS variable insets set by the design tokens
  let zoneInsets: { top: number; bottom: number; visibleHeight: number }
  if (isWipeMode) {
    const vpStyle = getComputedStyle(viewport)
    const top = parseCssPixels(vpStyle.getPropertyValue('--cv-sheet-top')) || 48
    const bottom = parseCssPixels(vpStyle.getPropertyValue('--cv-sheet-bottom')) || 106
    zoneInsets = { top, bottom, visibleHeight: Math.max(120, viewportHeight - top - bottom) }
  } else {
    zoneInsets = resolveZoneInsets(viewportHeight, reservedBottomInset)
  }

  const maxTop = Math.max(0, viewport.scrollHeight - viewportHeight)
  const densityBudget = resolveViewportDensityBudget(viewport, zoneInsets.visibleHeight)
  const heroToContentMinimumDelta = Math.max(120, Math.round(viewportHeight * HERO_TO_CONTENT_MIN_DELTA_RATIO))
  const stops = [0]
  const hero = viewport.querySelector<HTMLElement>('.admin-entity-hero')
  let minimumContentStart = 0
  let heroBottom = 0

  if (hero) {
    heroBottom = resolveTopRelativeToViewport(hero, viewport) + hero.offsetHeight

    if (!isWipeMode && heroBottom > 24 && heroBottom < maxTop - 4) {
      pushStop(stops, heroBottom)
      minimumContentStart = heroBottom
    }
  }

  const blocks = resolvePageBlocks(viewport)

  if (isWipeMode) {
    // Book-like pagination for wipe mode:
    // Each page is a fixed-height window (visibleHeight).
    // Pages tile without overlap: stop[N+1] = stop[N] + visibleHeight.
    // Content that doesn't fit is clipped at the bottom and continues
    // at the top of the next page — exactly like a printed book.
    const step = zoneInsets.visibleHeight

    // If the hero extends past the first visible page, align the second
    // stop so that main content starts at the top of the card area.
    let firstContentStop = step
    if (heroBottom > zoneInsets.top + step) {
      firstContentStop = heroBottom - zoneInsets.top
    }

    // Find where real content ends (excluding spacers) to avoid empty trailing pages
    const realContentBottom = blocks.reduce(
      (max, b) => Math.max(max, resolveTopRelativeToViewport(b, viewport) + b.offsetHeight),
      heroBottom,
    )

    if (step > 0 && maxTop > 0) {
      for (let cursor = firstContentStop; cursor < maxTop; cursor += step) {
        const stop = Math.min(cursor, maxTop)
        if (stop > (stops[stops.length - 1] ?? 0) + MIN_ZONE_DELTA) {
          pushStop(stops, stop)
        }
      }
      // Only add final maxTop stop if the last page doesn't already cover all content
      const lastStop = stops[stops.length - 1] ?? 0
      const lastVisibleEnd = lastStop + zoneInsets.top + zoneInsets.visibleHeight
      if (realContentBottom > lastVisibleEnd + ZONE_EDGE_GAP && maxTop > lastStop + MIN_ZONE_DELTA) {
        pushStop(stops, maxTop)
      }
    }
  } else if (blocks.length) {
    blocks.forEach((block) => {
      const rawStart = resolveTopRelativeToViewport(block, viewport)
      const contentStart = Math.max(minimumContentStart, Math.min(maxTop, rawStart))
      const blockStart = clampZoneStart(
        contentStart - zoneInsets.top,
        minimumContentStart > 0 ? minimumContentStart : 0,
        maxTop,
      )
      const blockHeight = block.offsetHeight
      const blockBottom = contentStart + blockHeight
      const blockMaxStart = Math.max(blockStart, Math.min(maxTop, blockBottom - (viewportHeight - zoneInsets.bottom)))

      const followsHeroTooClosely = minimumContentStart > 0
        && contentStart - minimumContentStart < heroToContentMinimumDelta

      if (blockStart > 4 && !followsHeroTooClosely) {
        pushStop(stops, blockStart)
      }

      const rows = resolveDensityRows(block, viewport)
        .map((row) => ({
          top: Math.max(blockStart, Math.min(blockMaxStart, row.top)),
          bottom: Math.max(blockStart, Math.min(contentStart + blockHeight, row.bottom)),
          density: row.density,
          preserveBoundary: row.preserveBoundary,
        }))
        .filter((row) => row.top > blockStart + 4)

      const blockStops = buildVisibleZonesForBlock(
        rows.length ? rows : [{ top: blockStart, bottom: blockStart + blockHeight, density: Math.max(1, blockHeight / zoneInsets.visibleHeight), preserveBoundary: true }],
        blockStart,
        blockMaxStart,
        viewportHeight,
        densityBudget,
        reservedBottomInset,
      )

      blockStops.forEach((stop) => {
        pushStop(stops, stop)
      })

      if (!rows.length && blockHeight > zoneInsets.visibleHeight + 8 && blockMaxStart > (stops[stops.length - 1] ?? blockStart) + 4) {
        pushStop(stops, blockMaxStart)
      }
    })
  } else {
    for (let cursor = zoneInsets.visibleHeight; cursor < maxTop - 4; cursor += zoneInsets.visibleHeight) {
      pushStop(stops, cursor)
    }
  }

  if (!(isWipeMode && blocks.length) && maxTop > 4) {
    pushStop(stops, maxTop)
  }

  const normalizedStops = compressStops(Array.from(new Set(stops)).sort((left, right) => left - right))

  if (isWipeMode) {
    return normalizedStops
  }

  return pruneCoveredStops(normalizedStops, zoneInsets.visibleHeight)
}