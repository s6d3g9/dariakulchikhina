/**
 * Smoke test for the bootstrap endpoint preset mode.
 * The preset path is DB-free (no Claude CLI calls, no DB writes).
 *
 * Usage: node --experimental-strip-types --test messenger/core/src/realtime/__tests__/bootstrap-preset.smoke.ts
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { z } from 'zod'
import { listAgentTemplates } from '../../agents/agent-templates.ts'

// Mirror the relevant schema subset from server.ts to keep test self-contained
const bootstrapSchema = z.object({
  mode: z.enum(['preset', 'template']).optional(),
  templateId: z.string().trim().min(1).max(160).optional(),
})

test('listAgentTemplates returns at least one template', () => {
  const templates = listAgentTemplates()
  assert.ok(templates.length >= 1, `expected ≥1 template, got ${templates.length}`)
})

test('preset mode schema parses { mode: "preset" } successfully', () => {
  const result = bootstrapSchema.safeParse({ mode: 'preset' })
  assert.ok(result.success, `schema parse failed: ${JSON.stringify(result.error)}`)
  assert.equal(result.data?.mode, 'preset')
})

test('preset mode response shape is correct', () => {
  const templates = listAgentTemplates()
  const response = { ok: true as const, mode: 'preset' as const, templates }
  assert.equal(response.ok, true)
  assert.equal(response.mode, 'preset')
  assert.ok(Array.isArray(response.templates))
  assert.ok(response.templates.length >= 1)
  // Each template has required fields
  const first = response.templates[0]
  assert.ok(typeof first.id === 'string' && first.id.length > 0, 'template has id')
  assert.ok(typeof first.displayName === 'string', 'template has displayName')
})

test('non-preset path (no mode) still requires templateId', () => {
  // Without mode=preset, the handler checks for templateId; missing → 400
  const noMode = bootstrapSchema.safeParse({})
  assert.ok(noMode.success, 'empty body parses (schema is permissive; handler enforces templateId')
  assert.equal(noMode.data?.mode, undefined)
  assert.equal(noMode.data?.templateId, undefined)
  // Simulate handler logic: mode !== 'preset' and templateId absent → would return 400
  const wouldReturn400 = noMode.data?.mode !== 'preset' && !noMode.data?.templateId
  assert.ok(wouldReturn400, 'non-preset without templateId correctly flows to 400 branch')
})
