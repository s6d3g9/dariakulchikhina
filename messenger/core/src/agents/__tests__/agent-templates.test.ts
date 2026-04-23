import { strict as assert } from 'node:assert'
import { describe, it } from 'node:test'
import { AGENT_TEMPLATES, getAgentTemplate, listAgentTemplates } from '../agent-templates.ts'

describe('agent-templates', () => {
  it('has at least 12 templates', () => {
    assert.ok(AGENT_TEMPLATES.length >= 12, `expected >= 12 templates, got ${AGENT_TEMPLATES.length}`)
  })

  it('all templates have non-empty id and displayName', () => {
    for (const t of AGENT_TEMPLATES) {
      assert.ok(t.id && t.id.length > 0, `template missing id: ${JSON.stringify(t)}`)
      assert.ok(t.displayName && t.displayName.length > 0, `template ${t.id} missing displayName`)
    }
  })

  it('getAgentTemplate returns the correct template for a known id', () => {
    const known = AGENT_TEMPLATES[0]!
    const result = getAgentTemplate(known.id)
    assert.ok(result !== null, `expected template for id "${known.id}", got null`)
    assert.strictEqual(result.id, known.id)
    assert.strictEqual(result.displayName, known.displayName)
  })

  it('getAgentTemplate returns null for unknown id', () => {
    const result = getAgentTemplate('bogus-id-that-does-not-exist')
    assert.strictEqual(result, null)
  })

  it('listAgentTemplates returns the full array', () => {
    const list = listAgentTemplates()
    assert.strictEqual(list.length, AGENT_TEMPLATES.length)
  })
})
