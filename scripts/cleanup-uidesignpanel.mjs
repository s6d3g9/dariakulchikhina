#!/usr/bin/env node
// One-shot cleanup of UIDesignPanel.vue — removes dead constants,
// presets, recipes, handlers, and computeds that are now owned by the
// per-tab child components extracted in Wave 4 batches 11-26.
//
// The ranges below are line numbers in the current state of the file
// (as of commit 4316236, right after Grid tab extraction). Run once.

import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const target = path.join(repoRoot, 'app/features/ui-editor/ui/UIDesignPanel.vue')
const src = readFileSync(target, 'utf8').split(/\r?\n/)

// Ranges are inclusive, 1-based — keep blank lines outside so the file
// reads cleanly after deletions. Delete highest-numbered first.
const ranges = [
  // Preview/sample style computeds no longer referenced in parent
  // template (all moved into tab sub-components). Lines ~1539..end of
  // surfaceStyle block.
  // Covered below via per-block sed-like removal.
]

// Drop-by-marker: remove a whole `const NAME = ...` or `function NAME(...) { ... }`
// block by scanning from its declaration line down to the matching closer.
const deadNames = new Set([
  // Option lists / presets (all now inside tab components)
  'btnStyles', 'btnSizes', 'textTransforms', 'btnHoverAnims', 'cardHoverAnims',
  'archDensities', 'archHeadingCases', 'archDividers', 'archPageEnters',
  'archLinkAnims', 'contentViewModes', 'wipeTransitions', 'archSectionStyles',
  'archNavStyles', 'archCardChromes', 'archHeroScales', 'archContentReveals',
  'archTextReveals', 'archNavTransitions', 'archTransitionPresets',
  'contentLayoutPresets', 'contentCardPresets', 'contentScenePresets',
  'contentLayoutRecipes', 'contentCardRecipes', 'contentSceneRecipes',
  'navLayoutPresets', 'navLayoutRecipes', 'BORDER_STYLE_OPTIONS',
  // Picker helpers (unused)
  'PickerOption', 'selectedDesignOptions', 'availableDesignOptions',
  'colorInputValue', 'pct',
  // Type scale / font helpers (moved to type/typeScale tabs)
  'selectedScaleOptions', 'availableScaleOptions', 'currentFontId',
  'typeScaleSizes', 'currentScaleLabel', 'pickFont',
  // Accent color (only consumed by palette tab now)
  'accentColor',
  // Arch / content / nav state (all in respective tabs)
  'activeContentLayoutId', 'activeContentCardPresetId',
  'activeContentScenePresetId', 'activeContentLayout',
  'activeContentLayoutLabel', 'activeContentLayoutDescription',
  'contentPreviewCards', 'contentPreviewStyle', 'menuPreviewItems',
  'activeNavLayout', 'activeNavLayoutLabel', 'activeNavLayoutDescription',
  'menuPreviewStyle',
  // Handlers (in tabs now)
  'applyNavLayoutPreset', 'generateNavLayout',
  'applyContentLayoutPreset', 'generateContentLayout',
  'applyContentCardPreset', 'applyContentScenePreset',
  'generateContentScene', 'generateFullDesignScene',
  'applyArchitectureTransitionPreset', 'formatTransitionDuration',
  // Preview styles (in type/buttons/surface/inputs tabs)
  'previewBtnStyle', 'previewSmBtnStyle', 'previewGhostBtnStyle',
  'previewBtnTypeStyle', 'previewInputStyle', 'typeSampleStyle',
  'surfaceStyle',
  // Local state moved to type tab
  'typeCtx',
])

const output = []
let i = 0
while (i < src.length) {
  const line = src[i]
  // Match: const X = [   |   const X = computed(   |   const X = ref   |   const X: TypeAnnotation = {
  //         const X = '...'   |   function X(...) {
  //         type X = ...
  const declMatch = line.match(/^(?:const|let|var)\s+([A-Za-z_$][\w$]*)\b.*$|^function\s+([A-Za-z_$][\w$]*)\s*[<(].*$|^type\s+([A-Za-z_$][\w$]*)\s*=.*$/)
  const name = declMatch ? (declMatch[1] || declMatch[2] || declMatch[3]) : null

  if (name && deadNames.has(name)) {
    // Skip this block — find the end.
    // Strategy: balance braces/brackets/parens starting from this line;
    // a top-level declaration ends when all balances hit zero and we
    // cross a line terminator (i.e. we reach a line that closes to 0).
    let depth = 0
    let started = false
    while (i < src.length) {
      const cur = src[i]
      for (const ch of cur) {
        if (ch === '{' || ch === '[' || ch === '(') { depth++; started = true }
        else if (ch === '}' || ch === ']' || ch === ')') { depth-- }
      }
      i++
      // Single-line constants (e.g. `const X = ref('')`) never entered a
      // block — terminate immediately after consuming the line.
      if (started && depth <= 0) break
      if (!started) break
    }
    // Eat a single trailing blank line for cosmetic compactness.
    if (i < src.length && src[i].trim() === '') i++
    continue
  }

  output.push(line)
  i++
}

writeFileSync(target, output.join('\n'), 'utf8')
console.log(`[cleanup-uidesignpanel] ${src.length} -> ${output.length} lines`)
