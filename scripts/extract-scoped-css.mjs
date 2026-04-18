#!/usr/bin/env node
// One-shot helper used for Wave 4 frontend slicing. Extracts the single
// `<style scoped>...</style>` block from each target SFC into a sibling
// `<Name>.scoped.css` file and replaces the block with
// `<style scoped src="./<Name>.scoped.css"></style>`.
//
// Safe only for SFCs with exactly one scoped block. Prints a warning
// otherwise.

import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const targets = [
  ['app/features/ui-editor/ui/UIDesignPanel.vue', 'UIDesignPanel'],
  ['app/pages/admin/projects/[slug].vue', 'AdminProjectSlugPage'],
  ['app/widgets/projects/control/ClientProjectControl.vue', 'ClientProjectControl'],
  ['app/widgets/documents/AdminDocumentEditor.vue', 'AdminDocumentEditor'],
  ['app/pages/contractor/[id]/index.vue', 'ContractorIndexPage'],
]

const repoRoot = process.argv[2] || process.cwd()

for (const [rel, name] of targets) {
  const full = path.join(repoRoot, rel)
  const src = readFileSync(full, 'utf8').split(/\r?\n/)
  let start = -1
  let end = -1
  for (let i = 0; i < src.length; i++) {
    if (start === -1 && src[i].trim() === '<style scoped>') {
      start = i
    } else if (start !== -1 && src[i].trim() === '</style>') {
      end = i
      break
    }
  }
  if (start === -1 || end === -1) {
    console.warn(`[skip] ${rel}: no single <style scoped> block`)
    continue
  }
  const css = src.slice(start + 1, end).join('\n')
  const cssPath = path.join(repoRoot, path.dirname(rel), `${name}.scoped.css`)
  writeFileSync(cssPath, css + '\n', 'utf8')

  const kept = src.slice(0, start)
  while (kept.length && kept[kept.length - 1].trim() === '') kept.pop()
  kept.push('')
  kept.push(`<style scoped src="./${name}.scoped.css"></style>`)
  kept.push('')
  writeFileSync(full, kept.join('\n'), 'utf8')
  console.log(`[ok] ${rel}: ${src.length - 1} -> ${kept.length - 1} lines, css ${end - start - 1} lines`)
}
