#!/usr/bin/env node

import { readFile } from 'node:fs/promises'

const VIEWS = ['instance', 'type']
const SLOTS = ['top', 'left', 'right', 'bottom']
const ALLOWED_ROLES = new Set([
  'identity',
  'status',
  'timeline',
  'stream',
  'actions',
  'evidence',
  'inversion',
])

let hasFailure = false

function pass(rule, detail) {
  console.log(`PASS ${rule}: ${detail}`)
}

function fail(rule, detail) {
  hasFailure = true
  console.log(`FAIL ${rule}: ${detail}`)
}

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function keysEqual(actual, expected) {
  return (
    actual.length === expected.length &&
    actual.every((key, index) => key === expected[index])
  )
}

function sectionKeys(schema, view) {
  const sections = schema.sectionsSchema?.[view]
  return Array.isArray(sections) ? sections.map((section) => section?.key) : []
}

function fieldKeys(schema, view) {
  const sections = schema.sectionsSchema?.[view]
  if (!Array.isArray(sections)) return new Set()

  return new Set(
    sections.flatMap((section) => {
      if (!Array.isArray(section?.fields)) return []
      return section.fields
        .map((field) => field?.key)
        .filter((key) => typeof key === 'string' && key.length > 0)
    }),
  )
}

function checkSectionCounts(schema) {
  for (const view of VIEWS) {
    const sections = schema.sectionsSchema?.[view]
    if (!Array.isArray(sections)) {
      fail(`sections.${view}.count`, 'sectionsSchema view is missing or not an array')
      continue
    }

    if (sections.length === 6) {
      pass(`sections.${view}.count`, '6 sections')
    } else {
      fail(`sections.${view}.count`, `expected 6, got ${sections.length}`)
    }
  }
}

function checkSectionOrder(schema) {
  const instanceKeys = sectionKeys(schema, 'instance')
  const typeKeys = sectionKeys(schema, 'type')

  if (keysEqual(instanceKeys, typeKeys)) {
    pass('sections.order', instanceKeys.join(','))
  } else {
    fail(
      'sections.order',
      `instance=[${instanceKeys.join(',')}] type=[${typeKeys.join(',')}]`,
    )
  }
}

function checkSectionRoles(schema) {
  const invalid = []

  for (const view of VIEWS) {
    const sections = schema.sectionsSchema?.[view]
    if (!Array.isArray(sections)) continue

    for (const section of sections) {
      if (!ALLOWED_ROLES.has(section?.role)) {
        invalid.push(`${view}.${section?.key ?? '<missing-key>'}=${section?.role}`)
      }
    }
  }

  if (invalid.length === 0) {
    pass('sections.roles', [...ALLOWED_ROLES].join(','))
  } else {
    fail('sections.roles', invalid.join('; '))
  }
}

function checkPanels(schema) {
  const panels = schema.panels
  const invalid = []

  if (!isRecord(panels)) {
    fail('panels.shape', 'panels is missing or not an object')
    return
  }

  const panelSlots = Object.keys(panels)
  if (!keysEqual(panelSlots, SLOTS)) {
    invalid.push(`slots=[${panelSlots.join(',')}]`)
  }

  for (const slot of SLOTS) {
    const slotDef = panels[slot]
    if (!isRecord(slotDef)) {
      invalid.push(`${slot}=missing`)
      continue
    }

    const viewKeys = Object.keys(slotDef)
    if (!keysEqual(viewKeys, VIEWS)) {
      invalid.push(`${slot}.views=[${viewKeys.join(',')}]`)
    }

    for (const view of VIEWS) {
      const panel = slotDef[view]
      if (!isRecord(panel)) {
        invalid.push(`${slot}.${view}=missing`)
        continue
      }

      if (typeof panel.title_ru !== 'string' || panel.title_ru.length === 0) {
        invalid.push(`${slot}.${view}.title_ru`)
      }
      if (
        typeof panel.content_kind !== 'string' ||
        panel.content_kind.length === 0
      ) {
        invalid.push(`${slot}.${view}.content_kind`)
      }
    }
  }

  if (invalid.length === 0) {
    pass('panels', 'top/left/right/bottom x instance/type')
  } else {
    fail('panels', invalid.join('; '))
  }
}

function checkModes(schema) {
  const modes = schema.modes
  const invalid = []

  if (!isRecord(modes)) {
    fail('modes.shape', 'modes is missing or not an object')
    return
  }

  for (const view of VIEWS) {
    const viewModes = modes[view]
    if (!Array.isArray(viewModes) || viewModes.length === 0) {
      invalid.push(`${view}=empty`)
      continue
    }

    const badMode = viewModes.find(
      (mode) => typeof mode !== 'string' || mode.length === 0,
    )
    if (badMode !== undefined) {
      invalid.push(`${view}=contains non-empty string violation`)
    }
  }

  if (invalid.length === 0) {
    pass(
      'modes',
      VIEWS.map((view) => `${view}=${modes[view].join(',')}`).join(' '),
    )
  } else {
    fail('modes', invalid.join('; '))
  }
}

function checkFixtures(schema) {
  const fixtures = schema.fixtures
  const invalid = []

  if (!Array.isArray(fixtures)) {
    fail('fixtures.count', 'fixtures is missing or not an array')
    return
  }

  if (fixtures.length >= 1) {
    pass('fixtures.count', `${fixtures.length} fixture(s)`)
  } else {
    fail('fixtures.count', 'expected at least 1 fixture')
  }

  const fieldsByView = Object.fromEntries(
    VIEWS.map((view) => [view, fieldKeys(schema, view)]),
  )

  for (const fixture of fixtures) {
    const view = fixture?.view
    if (!VIEWS.includes(view)) {
      invalid.push(`${fixture?.id ?? '<missing-id>'}.view=${view}`)
      continue
    }

    if (!isRecord(fixture.values)) {
      invalid.push(`${fixture?.id ?? '<missing-id>'}.values=missing`)
      continue
    }

    for (const key of Object.keys(fixture.values)) {
      if (!fieldsByView[view].has(key)) {
        invalid.push(`${fixture.id ?? '<missing-id>'}.${key}`)
      }
    }
  }

  if (invalid.length === 0) {
    pass('fixtures.keys', 'all value keys exist in their view field set')
  } else {
    fail('fixtures.keys', invalid.join('; '))
  }
}

async function main() {
  const schemaPath = process.argv[2]

  if (!schemaPath) {
    fail('cli.usage', 'node harness.mjs <schema.json>')
    process.exitCode = 1
    return
  }

  let schema
  try {
    schema = JSON.parse(await readFile(schemaPath, 'utf8'))
    pass('schema.load', schemaPath)
  } catch (error) {
    fail('schema.load', error instanceof Error ? error.message : String(error))
    process.exitCode = 1
    return
  }

  checkSectionCounts(schema)
  checkSectionOrder(schema)
  checkSectionRoles(schema)
  checkPanels(schema)
  checkModes(schema)
  checkFixtures(schema)

  process.exitCode = hasFailure ? 1 : 0
}

await main()
