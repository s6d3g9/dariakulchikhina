import assert from 'node:assert/strict'
import test from 'node:test'

import {
  NL_TOOLING_POLICY,
  evaluateNlToolingRuntime,
} from './nl-tooling-policy.mjs'

const validRuntime = {
  platform: NL_TOOLING_POLICY.platform,
  hostname: NL_TOOLING_POLICY.hostname,
  repositoryRoot: NL_TOOLING_POLICY.repositoryRoot,
  runAsUser: NL_TOOLING_POLICY.runAsUser,
}

test('canonical NL runtime is accepted', () => {
  assert.deepEqual(evaluateNlToolingRuntime(validRuntime), [])
})

test('macOS runtime is rejected even for the same repository name', () => {
  const violations = evaluateNlToolingRuntime({
    ...validRuntime,
    platform: 'darwin',
    repositoryRoot: '/Users/oxo/Documents/androidlouncher',
  })

  assert.deepEqual(violations.map(({ key }) => key), ['platform', 'repositoryRoot'])
})

test('a different Linux host is rejected', () => {
  const violations = evaluateNlToolingRuntime({
    ...validRuntime,
    hostname: 'developer-laptop',
  })

  assert.equal(violations.length, 1)
  assert.equal(violations[0].key, 'hostname')
})

test('a different user cannot launch canonical tooling', () => {
  const violations = evaluateNlToolingRuntime({
    ...validRuntime,
    runAsUser: 'adminm',
  })

  assert.equal(violations.length, 1)
  assert.equal(violations[0].key, 'runAsUser')
})
