import assert from 'node:assert/strict'
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import {
  SHELL_UI_GUARD_SCHEMA_VERSION,
  SHELL_UI_METRICS,
  compareShellUiArchitecture,
  scanShellUiArchitecture,
} from './shell-ui-architecture-guard.mjs'

async function fixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), 'shell-ui-guard-'))
  await mkdir(path.join(root, 'app'), { recursive: true })
  await writeFile(path.join(root, 'app', 'Example.vue'), `
<template><Teleport to="body"><div class="duplicate">menu</div></Teleport></template>
<script setup>
const isAdminMenu = ref(false)
document.addEventListener('keydown', () => {})
document.addEventListener('pointerdown', () => {})
const event = new CustomEvent('shell-menu-toggle')
element.getBoundingClientRect()
</script>
<style>
.duplicate { position: fixed; z-index: 12 !important; }
.duplicate { color: red; }
</style>
`)
  return root
}

test('scanner counts architecture debt deterministically', async t => {
  const root = await fixture()
  t.after(() => rm(root, { recursive: true, force: true }))
  const first = await scanShellUiArchitecture({ root, roots: ['app'] })
  const second = await scanShellUiArchitecture({ root, roots: ['app'] })
  assert.deepEqual(first, second)
  assert.equal(first.filesScanned, 1)
  for (const metric of SHELL_UI_METRICS) {
    assert.equal(first.metrics[metric], 1, metric)
  }
})

test('ratchet accepts equal or lower debt and rejects increases', () => {
  const baseline = {
    schemaVersion: SHELL_UI_GUARD_SCHEMA_VERSION,
    roots: ['app'],
    metrics: Object.fromEntries(SHELL_UI_METRICS.map(metric => [metric, 2])),
  }
  const equal = {
    schemaVersion: SHELL_UI_GUARD_SCHEMA_VERSION,
    roots: ['app'],
    metrics: { ...baseline.metrics },
  }
  assert.deepEqual(compareShellUiArchitecture(equal, baseline), [])

  const increased = {
    ...equal,
    metrics: { ...equal.metrics, teleports: 3 },
  }
  const failures = compareShellUiArchitecture(increased, baseline)
  assert.deepEqual(failures.map(failure => failure.metric), ['teleports'])
})

test('ratchet fails closed when a baseline metric is absent', () => {
  const metrics = Object.fromEntries(SHELL_UI_METRICS.map(metric => [metric, 0]))
  const baseline = {
    schemaVersion: SHELL_UI_GUARD_SCHEMA_VERSION,
    roots: ['app'],
    metrics: { ...metrics },
  }
  delete baseline.metrics.navigationCustomEvents
  const failures = compareShellUiArchitecture({
    schemaVersion: SHELL_UI_GUARD_SCHEMA_VERSION,

    roots: ['app'],
    metrics,
  }, baseline)
  assert.ok(failures.some(failure => failure.metric === 'navigationCustomEvents'))
})

test('scanner fails closed when a configured root is missing', async t => {
  const root = await fixture()
  t.after(() => rm(root, { recursive: true, force: true }))
  await assert.rejects(
    scanShellUiArchitecture({ root, roots: ['app', 'missing-client'] }),
    error => error?.code === 'ENOENT',
  )
})
