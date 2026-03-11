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

const PAGER_RAIL_SELECTORS = '.cv-pager-rail, .proj-pager-rail'
const GRID_ROWS_PER_PAGE = 8
const MIN_VISIBLE_HEIGHT = 24
const ROW_GROUP_GAP = 14
const ZONE_EDGE_GAP = 8
const MIN_ZONE_DELTA = 32

function isRenderableNode(node: Element): node is HTMLElement {
  return node instanceof HTMLElement && node.offsetParent !== null && node.offsetHeight > MIN_VISIBLE_HEIGHT
}

function isPagerRail(node: HTMLElement) {
  return node.matches(PAGER_RAIL_SELECTORS)
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

function collectRowItems(block: HTMLElement) {
  const candidates = new Set<HTMLElement>()
  const containers = [
    block,
    ...Array.from(block.querySelectorAll(ROW_CONTAINER_SELECTORS)).filter(isRenderableNode),
  ]

  containers.forEach((container) => {
    Array.from(container.children)
      .filter(isRenderableNode)
      .forEach((child) => {
        if (isPagerRail(child)) return
        candidates.add(child)
      })
  })

  let items = Array.from(candidates)
    .filter((item) => item !== block)
    .filter((item) => !item.classList.contains('admin-entity-hero'))

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
  const items = collectRowItems(block)
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