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

const ZONE_LAYOUT_CONTAINER_SELECTORS = [
  '.docs-registry',
  '.docs-list',
  '.docs-panel',
  '.docs-column',
  '.cab-inner',
  '.proj-main-inner',
  '.de-fields-grid',
  '.de-tpl-grid',
  '.de-sources',
].join(', ')

const PAGER_RAIL_SELECTORS = '.cv-pager-rail, .proj-pager-rail'
const GRID_ROWS_PER_PAGE = 8
const MIN_VISIBLE_HEIGHT = 24
const ROW_GROUP_GAP = 14
const ZONE_EDGE_GAP = 8
const MIN_ZONE_DELTA = 32
const ZONE_OFFSET_ATTR = 'data-cv-zone-offset'

function isRenderableNode(node: Element): node is HTMLElement {
  return node instanceof HTMLElement && node.offsetParent !== null && node.offsetHeight > MIN_VISIBLE_HEIGHT
}

function isPagerRail(node: HTMLElement) {
  return node.matches(PAGER_RAIL_SELECTORS)
}

function clearZoneOffsets(viewport: HTMLElement) {
  Array.from(viewport.querySelectorAll<HTMLElement>(`[${ZONE_OFFSET_ATTR}]`)).forEach((node) => {
    node.style.removeProperty('margin-top')
    node.removeAttribute(ZONE_OFFSET_ATTR)
  })
}

function applyZoneOffset(node: HTMLElement, offset: number) {
  if (offset < MIN_ZONE_DELTA) return
  node.style.marginTop = `${Math.round(offset)}px`
  node.setAttribute(ZONE_OFFSET_ATTR, '1')
}

function resolveZoneCarryOffset(zoneTop: number, childTop: number, viewportHeight: number) {
  const relativeTop = childTop - zoneTop
  if (relativeTop < MIN_ZONE_DELTA) return 0
  return Math.max(0, viewportHeight - relativeTop)
}

export function applyViewportZoneLayout(viewport: HTMLElement) {
  clearZoneOffsets(viewport)

  const viewportHeight = Math.max(viewport.clientHeight, 1)
  const containers = Array.from(viewport.querySelectorAll<HTMLElement>(ZONE_LAYOUT_CONTAINER_SELECTORS))
    .filter(isRenderableNode)

  containers.forEach((container) => {
    const children = Array.from(container.children)
      .filter(isRenderableNode)
      .filter((child) => !isPagerRail(child) && !child.classList.contains('admin-entity-hero'))

    if (children.length < 2) return

    let carriedOffset = 0
    let zoneTop = resolveTopRelativeToViewport(container, viewport)

    children.forEach((child) => {
      const childTop = resolveTopRelativeToViewport(child, viewport) + carriedOffset
      const childHeight = child.offsetHeight
      const childBottom = childTop + childHeight
      const zoneBottom = zoneTop + viewportHeight - ZONE_EDGE_GAP
      const carryOffset = resolveZoneCarryOffset(zoneTop, childTop, viewportHeight)

      if (childHeight >= viewportHeight - ZONE_EDGE_GAP) {
        if (carryOffset > 0) {
          applyZoneOffset(child, carryOffset)
          carriedOffset += carryOffset
          zoneTop = childTop + carryOffset
          return
        }

        if (childTop >= zoneTop + MIN_ZONE_DELTA) {
          zoneTop = childTop
        }
        return
      }

      if (childTop >= zoneTop + MIN_ZONE_DELTA && childBottom > zoneBottom) {
        const appliedOffset = carryOffset
        applyZoneOffset(child, appliedOffset)
        carriedOffset += appliedOffset
        zoneTop = childTop + appliedOffset
      }
    })
  })
}

export function resolveTopRelativeToViewport(node: HTMLElement, viewport: HTMLElement) {
  const viewportRect = viewport.getBoundingClientRect()
  const nodeRect = node.getBoundingClientRect()
  return Math.round(nodeRect.top - viewportRect.top + viewport.scrollTop)
}

function resolvePageBlocks(viewport: HTMLElement) {
  const directChildren = Array.from(viewport.children)
    .filter(isRenderableNode)
    .filter((node) => !isPagerRail(node))

  const shell = directChildren.find((node) => node.matches(BLOCK_SHELL_SELECTORS))
  const source = shell
    ? Array.from(shell.children)
    : directChildren.filter((node) => !node.classList.contains('admin-entity-hero'))

  return source.filter(isRenderableNode)
}

function collectAtomicUnits(node: HTMLElement, viewportHeight: number, depth = 0): HTMLElement[] {
  const directChildren = Array.from(node.children)
    .filter(isRenderableNode)
    .filter((child) => !isPagerRail(child) && !child.classList.contains('admin-entity-hero'))

  if (!directChildren.length || depth >= 4) {
    return [node]
  }

  const shouldSplit = node.matches(ATOMIC_UNIT_CONTAINER_SELECTORS)
    || node.matches(ROW_CONTAINER_SELECTORS)
    || node.offsetHeight > viewportHeight - ZONE_EDGE_GAP

  if (!shouldSplit) {
    return [node]
  }

  return directChildren.flatMap((child) => {
    const childCanSplit = child.children.length > 1 && (
      child.matches(ATOMIC_UNIT_CONTAINER_SELECTORS)
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

function resolveGridRows(block: HTMLElement, viewport: HTMLElement) {
  const items = collectRowItems(block, viewport)
  const rows: Array<{ top: number, bottom: number }> = []

  items.forEach((item) => {
    const top = resolveTopRelativeToViewport(item, viewport)
    const bottom = top + item.offsetHeight
    const current = rows[rows.length - 1]

    if (!current || top > current.bottom + ROW_GROUP_GAP) {
      rows.push({ top, bottom })
      return
    }

    current.bottom = Math.max(current.bottom, bottom)
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

function buildVisibleZonesForBlock(
  rows: Array<{ top: number, bottom: number }>,
  blockStart: number,
  blockMaxStart: number,
  viewportHeight: number,
) {
  const stops = [blockStart]
  if (!rows.length || blockMaxStart <= blockStart + 4) {
    return stops
  }

  let zoneStart = blockStart
  let zoneRows = 0

  rows.forEach((row) => {
    const rowTop = clampZoneStart(row.top, blockStart, blockMaxStart)
    const rowBottom = Math.max(rowTop + 1, row.bottom)
    const rowHeight = rowBottom - rowTop
    const rowFitsCurrentZone = rowBottom <= zoneStart + viewportHeight - ZONE_EDGE_GAP
    const rowLimitReached = zoneRows >= GRID_ROWS_PER_PAGE

    if (!rowFitsCurrentZone || rowLimitReached) {
      let nextStart = rowTop

      if (rowHeight > viewportHeight - ZONE_EDGE_GAP) {
        const oversizedStops: number[] = []
        let sliceStart = Math.max(zoneStart, rowTop)
        if (sliceStart > zoneStart + 4 || stops.length === 1) {
          pushStop(oversizedStops, clampZoneStart(sliceStart, blockStart, blockMaxStart))
        }

        while (rowBottom > sliceStart + viewportHeight - ZONE_EDGE_GAP) {
          sliceStart = clampZoneStart(sliceStart + viewportHeight - ZONE_EDGE_GAP, blockStart, blockMaxStart)
          if (sliceStart <= (oversizedStops[oversizedStops.length - 1] ?? zoneStart) + 4) break
          pushStop(oversizedStops, sliceStart)
        }

        oversizedStops.forEach((stop) => {
          pushStop(stops, stop)
        })

        zoneStart = oversizedStops[oversizedStops.length - 1] ?? rowTop
        zoneRows = 1
        return
      }

      nextStart = clampZoneStart(nextStart, blockStart, blockMaxStart)
      pushStop(stops, nextStart)
      zoneStart = nextStart
      zoneRows = 1
      return
    }

    zoneRows += 1
  })

  if (blockMaxStart > (stops[stops.length - 1] ?? blockStart) + 4) {
    pushStop(stops, blockMaxStart)
  }

  return stops
}

export function buildViewportPageStops(viewport: HTMLElement) {
  const viewportHeight = Math.max(viewport.clientHeight, 1)
  const maxTop = Math.max(0, viewport.scrollHeight - viewportHeight)
  const stops = [0]
  const hero = viewport.querySelector<HTMLElement>('.admin-entity-hero')
  let minimumContentStart = 0

  if (hero) {
    const heroBottom = resolveTopRelativeToViewport(hero, viewport) + hero.offsetHeight

    if (heroBottom > 24 && heroBottom < maxTop - 4) {
      pushStop(stops, heroBottom)
      minimumContentStart = heroBottom
    }
  }

  const blocks = resolvePageBlocks(viewport)

  if (blocks.length) {
    blocks.forEach((block) => {
      const rawStart = resolveTopRelativeToViewport(block, viewport)
      const blockStart = Math.max(minimumContentStart, Math.min(maxTop, rawStart))
      const blockHeight = block.offsetHeight
      const blockMaxStart = Math.max(blockStart, Math.min(maxTop, blockStart + blockHeight - viewportHeight))

      if (blockStart > 4) {
        pushStop(stops, blockStart)
      }

      const rows = resolveGridRows(block, viewport)
        .map((row) => ({
          top: Math.max(blockStart, Math.min(blockMaxStart, row.top)),
          bottom: Math.max(blockStart, Math.min(blockStart + blockHeight, row.bottom)),
        }))
        .filter((row) => row.top > blockStart + 4)

      const blockStops = buildVisibleZonesForBlock(
        rows.length ? rows : [{ top: blockStart, bottom: blockStart + blockHeight }],
        blockStart,
        blockMaxStart,
        viewportHeight,
      )

      blockStops.forEach((stop) => {
        pushStop(stops, stop)
      })

      if (!rows.length && blockHeight > viewportHeight + 8 && blockMaxStart > (stops[stops.length - 1] ?? blockStart) + 4) {
        pushStop(stops, blockMaxStart)
      }
    })
  } else {
    for (let cursor = viewportHeight; cursor < maxTop - 4; cursor += viewportHeight) {
      pushStop(stops, cursor)
    }
  }

  if (maxTop > 4) {
    pushStop(stops, maxTop)
  }

  return compressStops(Array.from(new Set(stops)).sort((left, right) => left - right))
}