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

function pushViewportSlices(stops: number[], blockStart: number, blockMaxStart: number, viewportHeight: number) {
  if (blockMaxStart <= blockStart + 4) return

  const lastStop = stops[stops.length - 1] ?? blockStart
  for (let cursor = Math.max(blockStart + viewportHeight, lastStop + viewportHeight); cursor < blockMaxStart - 4; cursor += viewportHeight) {
    stops.push(Math.round(cursor))
  }

  stops.push(Math.round(blockMaxStart))
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
      stops.push(Math.round(heroBottom))
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
        stops.push(Math.round(blockStart))
      }

      const rows = resolveGridRows(block, viewport)
        .map((row) => ({
          top: Math.max(blockStart, Math.min(blockMaxStart, row.top)),
          bottom: Math.max(blockStart, Math.min(blockStart + blockHeight, row.bottom)),
        }))
        .filter((row) => row.top > blockStart + 4)

      if (rows.length > 1) {
        let cursor = 0
        let pageStart = blockStart

        while (cursor < rows.length) {
          let rowCount = 0
          let nextIndex = cursor
          const viewportLimit = pageStart + viewportHeight - 8

          while (
            nextIndex < rows.length
            && rowCount < GRID_ROWS_PER_PAGE
            && rows[nextIndex].bottom <= viewportLimit + ROW_GROUP_GAP
          ) {
            nextIndex += 1
            rowCount += 1
          }

          if (nextIndex >= rows.length) break

          const nextStart = Math.max(blockStart, Math.min(blockMaxStart, rows[nextIndex].top))
          if (nextStart <= pageStart + 4) break

          stops.push(Math.round(nextStart))
          pageStart = nextStart
          cursor = nextIndex
        }
      }

      if (blockHeight > viewportHeight + 8) {
        pushViewportSlices(stops, blockStart, blockMaxStart, viewportHeight)
      }
    })
  } else {
    for (let cursor = viewportHeight; cursor < maxTop - 4; cursor += viewportHeight) {
      stops.push(Math.round(cursor))
    }
  }

  if (maxTop > 4) {
    stops.push(Math.round(maxTop))
  }

  return Array.from(new Set(stops)).sort((left, right) => left - right)
}