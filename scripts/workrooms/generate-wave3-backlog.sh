#!/usr/bin/env bash
# Generate Wave 3 backlog (atomic TASK.md files for god-file decomposition)
# into ~/state/queue/pending/.
#
# Each task is a single, non-overlapping extraction. They can run in parallel
# because no two tasks touch the same file regions.
#
# Run once. Idempotent: existing files are overwritten.

set -euo pipefail

QUEUE_PENDING="$HOME/state/queue/pending"
mkdir -p "$QUEUE_PENDING"

# -----------------------------------------------------------------------------
# Helper: emit a task file with frontmatter + body
# -----------------------------------------------------------------------------
emit() {
  local id="$1" model="$2" priority="$3"
  local file="$QUEUE_PENDING/${id}.md"
  cat > "$file" <<FRONTMATTER
---
id: $id
model: $model
base_branch: main
priority: $priority
auto_push: true
---

FRONTMATTER
  cat >> "$file"
  echo "  ✓ $id (model=$model priority=$priority)"
}

# ═══════════════════════════════════════════════════════════════════════════════
# useMessengerCalls.ts (3281 lines) — 7 sub-composables, low→high risk
# ═══════════════════════════════════════════════════════════════════════════════

emit "wave3-calls-e2ee" sonnet 10 <<'EOT'
# Extract `use-call-e2ee-security` from useMessengerCalls.ts

## Scope

Extract the E2EE security primitives from
`messenger/web/app/entities/calls/model/useMessengerCalls.ts` (~3281 LOC)
into a new sibling composable `use-call-e2ee-security.ts`.

**What belongs here:** ECDH P-256 keypair generation, HKDF derivation,
AES-CTR insertable-stream transforms (`applySenderSecurity`,
`applyReceiverSecurity`), verification-emoji computation, the
`callSecurityContext` state. Zero dependencies on peer connection,
signaling, media, or transcription code — this is the first, safest extract.

## Acceptance

- New file: `messenger/web/app/entities/calls/model/use-call-e2ee-security.ts`
- Facade `useMessengerCalls.ts` imports and delegates to it. **Public API of
  `useMessengerCalls()` must not change.**
- `pnpm lint:errors` → 0 in `messenger/web/**`.
- `pnpm exec vue-tsc --noEmit 2>&1 | grep "entities/calls"` → clean.
- One commit titled `refactor(messenger/calls): extract E2EE security composable`.
- TASK.md deleted before final commit.
EOT

emit "wave3-calls-media-access" sonnet 11 <<'EOT'
# Extract `use-call-media-access` from useMessengerCalls.ts

## Scope

Extract media-permission and `getUserMedia` logic from
`messenger/web/app/entities/calls/model/useMessengerCalls.ts` into
`use-call-media-access.ts`.

**Covers:** `initMedia()`, `ensureMediaAccess()`, `refreshMediaPermissions()`,
`openSitePermissions()`, device-enumeration, browser-capability detection,
`mediaPermissionState` / `requestingPermissions` refs, `supported` /
`deviceCaps` computeds.

## Acceptance

- New file: `messenger/web/app/entities/calls/model/use-call-media-access.ts`
- Facade imports and re-uses it. Public API of `useMessengerCalls()`
  unchanged.
- `pnpm lint:errors` → 0 in `messenger/web/**`.
- `pnpm exec vue-tsc --noEmit 2>&1 | grep "entities/calls"` → clean.
- One commit: `refactor(messenger/calls): extract media access composable`.
- Delete TASK.md before final commit.
EOT

emit "wave3-calls-ui-state" sonnet 12 <<'EOT'
# Extract `use-call-ui` from useMessengerCalls.ts

## Scope

Move UI-only reactive state + handlers out of
`messenger/web/app/entities/calls/model/useMessengerCalls.ts` into a new
`use-call-ui.ts` composable.

**Covers:** controls (muted, camVideoOff, speakerOff), `viewMode` (speaker /
grid / floating), camera cycling, `networkQuality`, incomingCall / activeCall
shapes, call timer. **Does NOT touch** peer connection, signaling, media,
transcription.

## Acceptance

- New file: `messenger/web/app/entities/calls/model/use-call-ui.ts`.
- Facade delegates. Public API unchanged.
- Lint + tsc clean in `messenger/web/**`.
- One commit: `refactor(messenger/calls): extract UI state composable`.
- Delete TASK.md before final commit.
EOT

emit "wave3-calls-review-analysis" sonnet 13 <<'EOT'
# Extract `use-call-review-analysis` from useMessengerCalls.ts

## Scope

Move post-call review + analysis logic out of useMessengerCalls.ts into
`use-call-review-analysis.ts`.

**Covers:** `finalize()`, `syncCallReviewToProject`, `applyCallReviewToProjectSprint`,
`runAnalysisTool`, `runAiAnalysisTool`, the `callReview` state. Accepts
dependencies (transcriptionEntries, activeCall) as explicit parameters —
no direct coupling to peer/signaling.

## Acceptance

- New file: `messenger/web/app/entities/calls/model/use-call-review-analysis.ts`.
- Facade delegates. Public API unchanged.
- Lint + tsc clean in `messenger/web/**`.
- One commit: `refactor(messenger/calls): extract review+analysis composable`.
- Delete TASK.md before final commit.
EOT

# Medium/high-risk — lower priority so low-risk commits land first
emit "wave3-calls-peer-connection" sonnet 30 <<'EOT'
# Extract `use-call-peer-connection` from useMessengerCalls.ts

## Scope

Move WebRTC PeerConnection lifecycle (builder + teardown + track handlers)
into `use-call-peer-connection.ts`. **Depends on** the E2EE security composable
(wave3-calls-e2ee) and media access composable (wave3-calls-media-access) —
wait for those to merge before running this one.

## Acceptance

- New file: `messenger/web/app/entities/calls/model/use-call-peer-connection.ts`.
- Facade delegates. Public API unchanged.
- Lint + tsc clean in `messenger/web/**`.
- One commit: `refactor(messenger/calls): extract peer-connection composable`.
- Delete TASK.md before final commit.
EOT

emit "wave3-calls-signaling" sonnet 31 <<'EOT'
# Extract `use-call-signaling` from useMessengerCalls.ts

## Scope

Move signal-event dispatcher (invite / offer / answer / ice / reject / hangup)
into `use-call-signaling.ts`. **Depends on** wave3-calls-peer-connection.

## Acceptance

- New file: `messenger/web/app/entities/calls/model/use-call-signaling.ts`.
- Facade delegates. Public API unchanged.
- Lint + tsc clean in `messenger/web/**`.
- One commit: `refactor(messenger/calls): extract signaling composable`.
- Delete TASK.md before final commit.
EOT

emit "wave3-calls-transcription" sonnet 40 <<'EOT'
# Extract `use-call-transcription` from useMessengerCalls.ts

## Scope

Move transcription logic (MediaRecorder + Web Speech API + datachannel sync +
energy sampling + draft/entries) into `use-call-transcription.ts`. This is the
highest-risk extract because of reactive chains. **Run last** among the calls
extracts.

## Acceptance

- New file: `messenger/web/app/entities/calls/model/use-call-transcription.ts`.
- Facade delegates. Public API unchanged.
- Lint + tsc clean in `messenger/web/**`.
- If size >500 LOC, split into `use-call-transcription-sync.ts` helper.
- One or two commits under `refactor(messenger/calls): extract transcription …`.
- Delete TASK.md before final commit.
EOT

# ═══════════════════════════════════════════════════════════════════════════════
# MessengerChatSection.vue (2753 lines) — composables-first, one widget-local child
# ═══════════════════════════════════════════════════════════════════════════════

emit "wave3-chat-audio-draft" sonnet 15 <<'EOT'
# Extract `useAudioDraft` composable from MessengerChatSection.vue

## Scope

Move audio-recording + trimming + waveform + send logic out of
`messenger/web/app/widgets/chat/MessengerChatSection.vue` into
`messenger/web/app/widgets/chat/model/use-audio-draft.ts`.

**Covers:** `audioDraft`, `isRecording`, `recordingSeconds`, `recordingLevels`,
`toggleAudioRecording`, `startRecordingVisualizer`, `decodeAudioFile`,
`extractWaveformLevels`, `encodeTrimmedAudioToWav`.

## Acceptance

- New file with composable; parent uses `useAudioDraft()`.
- Parent LOC count drops by ~200.
- Lint + tsc clean.
- One commit: `refactor(messenger/chat): extract audio-draft composable`.
- Delete TASK.md before final commit.
EOT

emit "wave3-chat-klipy-search" haiku 16 <<'EOT'
# Extract `useKlipySearch` composable from MessengerChatSection.vue

## Scope

Move Klipy search + category + catalog load logic into
`messenger/web/app/widgets/chat/model/use-klipy-search.ts`.

Targets ~150 LOC of search scheduling, catalog loading, audience toggle.

## Acceptance

- New file; parent uses `useKlipySearch()`.
- Lint + tsc clean.
- One commit: `refactor(messenger/chat): extract klipy search composable`.
- Delete TASK.md before final commit.
EOT

emit "wave3-chat-klipy-paging" haiku 16 <<'EOT'
# Extract `useKlipyFeedPaging` composable from MessengerChatSection.vue

## Scope

Move looped carousel scroll + pagination state into
`messenger/web/app/widgets/chat/model/use-klipy-feed-paging.ts`
(~90 LOC: buildLoopedFeed, handleLoopedRailScroll, handleLoopedFeedScroll,
resetKlipyFeedPaging).

## Acceptance

- New file; parent uses `useKlipyFeedPaging()`.
- Lint + tsc clean.
- One commit: `refactor(messenger/chat): extract klipy feed paging composable`.
- Delete TASK.md before final commit.
EOT

emit "wave3-chat-shared-content" haiku 17 <<'EOT'
# Extract `useSharedContent` composable from MessengerChatSection.vue

## Scope

Move shared-content aggregation (photos, stickers, docs, links from messages)
into `messenger/web/app/widgets/chat/model/use-shared-content.ts` (~100 LOC).

## Acceptance

- New file; parent uses `useSharedContent()`.
- Lint + tsc clean.
- One commit: `refactor(messenger/chat): extract shared-content composable`.
- Delete TASK.md before final commit.
EOT

emit "wave3-chat-security-summary" haiku 17 <<'EOT'
# Extract `useSecuritySummary` composable from MessengerChatSection.vue

## Scope

Move security-summary fetch + format (~70 LOC) into
`messenger/web/app/widgets/chat/model/use-security-summary.ts`.

## Acceptance

- New file; parent uses `useSecuritySummary()`.
- Lint + tsc clean.
- One commit: `refactor(messenger/chat): extract security summary composable`.
- Delete TASK.md before final commit.
EOT

emit "wave3-chat-composer-metrics" haiku 18 <<'EOT'
# Extract `useComposerMetrics` composable from MessengerChatSection.vue

## Scope

Move composer height sync + ResizeObserver (~80 LOC) into
`messenger/web/app/widgets/chat/model/use-composer-metrics.ts`.

## Acceptance

- New file; parent uses `useComposerMetrics()`.
- Lint + tsc clean.
- One commit: `refactor(messenger/chat): extract composer metrics composable`.
- Delete TASK.md before final commit.
EOT

emit "wave3-chat-forward-picker" haiku 19 <<'EOT'
# Extract `MessengerChatSectionForwardPicker.vue` sub-component

## Scope

Extract the forward-picker modal (state + template, ~150 LOC) from
`MessengerChatSection.vue` into a new
`messenger/web/app/widgets/chat/MessengerChatSectionForwardPicker.vue`.

Emits: `@forward` with selected target, `@close`.

## Acceptance

- New Vue component; parent renders `<MessengerChatSectionForwardPicker>` conditionally.
- Lint + tsc clean.
- One commit: `refactor(messenger/chat): extract forward picker sub-component`.
- Delete TASK.md before final commit.
EOT

# ═══════════════════════════════════════════════════════════════════════════════
# MessengerProjectActionsPanel.vue (2421 lines) — panel split, display-only first
# ═══════════════════════════════════════════════════════════════════════════════

emit "wave3-actions-project-picker" haiku 20 <<'EOT'
# Extract `ProjectPicker.vue` sub-component from MessengerProjectActionsPanel

## Scope

Extract project-selection pane (~80 LOC) from
`messenger/web/app/features/project-engine/ui/MessengerProjectActionsPanel.vue`
into `features/project-engine/ui/project-picker/ProjectPicker.vue`.

Props: `projects`, `selectedSlug`, `pending`, `error`, `notice`. Emits: `@select`.
Display-only — no side effects.

## Acceptance

- New component under `project-engine/ui/project-picker/`.
- Parent renders `<ProjectPicker>` in place of the inline pane.
- Lint + tsc clean.
- One commit: `refactor(messenger/project-engine): extract ProjectPicker`.
- Delete TASK.md before final commit.
EOT

emit "wave3-actions-timeline-pane" haiku 20 <<'EOT'
# Extract `TimelinePane.vue` sub-component

## Scope

Extract mini-timeline + phase selector (~50 LOC) from
`MessengerProjectActionsPanel.vue` into
`features/project-engine/ui/overview/TimelinePane.vue`.

Props: `catalog`, `selectedPhaseKey`, `pending`. Emits: `@selectPhase`.

## Acceptance

- New component; parent renders `<TimelinePane>`.
- Lint + tsc clean.
- One commit: `refactor(messenger/project-engine): extract TimelinePane`.
- Delete TASK.md before final commit.
EOT

emit "wave3-actions-sprints-pane" haiku 21 <<'EOT'
# Extract `SprintsPane.vue` sub-component

## Scope

Extract sprint overview pane (~50 LOC) from
`MessengerProjectActionsPanel.vue` into
`features/project-engine/ui/overview/SprintsPane.vue`. Display-only.

## Acceptance

- New component; parent renders `<SprintsPane>`.
- Lint + tsc clean.
- One commit: `refactor(messenger/project-engine): extract SprintsPane`.
- Delete TASK.md before final commit.
EOT

emit "wave3-actions-subjects-pane" haiku 22 <<'EOT'
# Extract `SubjectsPane.vue` sub-component

## Scope

Extract subject cards + action menus (~80 LOC) from
`MessengerProjectActionsPanel.vue` into
`features/project-engine/ui/overview/SubjectsPane.vue`.

## Acceptance

- New component; parent renders `<SubjectsPane>`.
- Lint + tsc clean.
- One commit: `refactor(messenger/project-engine): extract SubjectsPane`.
- Delete TASK.md before final commit.
EOT

emit "wave3-actions-action-search" haiku 22 <<'EOT'
# Extract `ActionSearch.vue` sub-component

## Scope

Extract action search bar + category chips (~60 LOC) from
`MessengerProjectActionsPanel.vue` into
`features/project-engine/ui/action-search/ActionSearch.vue`.

## Acceptance

- New component; parent renders `<ActionSearch>`.
- Lint + tsc clean.
- One commit: `refactor(messenger/project-engine): extract ActionSearch`.
- Delete TASK.md before final commit.
EOT

emit "wave3-actions-range-selector" haiku 23 <<'EOT'
# Extract `RangeSelector.vue` sub-component

## Scope

Extract date-range picker (~60 LOC) from
`MessengerProjectActionsPanel.vue` into
`features/project-engine/ui/builder/RangeSelector.vue`.

## Acceptance

- New component; parent renders `<RangeSelector>`.
- Lint + tsc clean.
- One commit: `refactor(messenger/project-engine): extract RangeSelector`.
- Delete TASK.md before final commit.
EOT

emit "wave3-actions-task-selector" haiku 24 <<'EOT'
# Extract `TaskSelector.vue` sub-component

## Scope

Extract task selection widget (existing / new mode toggle, ~100 LOC) from
`MessengerProjectActionsPanel.vue` into
`features/project-engine/ui/builder/TaskSelector.vue`.

## Acceptance

- New component; parent renders `<TaskSelector>`.
- Lint + tsc clean.
- One commit: `refactor(messenger/project-engine): extract TaskSelector`.
- Delete TASK.md before final commit.
EOT

emit "wave3-actions-scope-participant-form" sonnet 50 <<'EOT'
# Extract `ScopeParticipantForm.vue` sub-component

## Scope

Extract participant-add form (~70 LOC) from
`MessengerProjectActionsPanel.vue` into
`features/project-engine/ui/scope-detail/ScopeParticipantForm.vue`.

Includes form state, validation, emit `@submit`.

## Acceptance

- New component; parent renders `<ScopeParticipantForm>`.
- Lint + tsc clean.
- One commit: `refactor(messenger/project-engine): extract ScopeParticipantForm`.
- Delete TASK.md before final commit.
EOT

emit "wave3-actions-scope-settings-grid" sonnet 50 <<'EOT'
# Extract `ScopeSettingsGrid.vue` sub-component

## Scope

Extract settings-grid component (dynamic grid + edit, ~80 LOC) from
`MessengerProjectActionsPanel.vue` into
`features/project-engine/ui/scope-detail/ScopeSettingsGrid.vue`.

## Acceptance

- New component; parent renders `<ScopeSettingsGrid>`.
- Lint + tsc clean.
- One commit: `refactor(messenger/project-engine): extract ScopeSettingsGrid`.
- Delete TASK.md before final commit.
EOT

# High-risk complex extracts — lowest priority, run last
emit "wave3-actions-builder" sonnet 60 <<'EOT'
# Extract `ActionBuilder.vue` sub-component

## Scope

Extract the main action-form component (~300 LOC) from
`MessengerProjectActionsPanel.vue` into
`features/project-engine/ui/builder/ActionBuilder.vue`.

Complex — integrates TaskSelector + RangeSelector + many selects. **Depends on**
wave3-actions-task-selector and wave3-actions-range-selector (run after those merge).

## Acceptance

- New component; parent renders `<ActionBuilder>`.
- Lint + tsc clean.
- One commit: `refactor(messenger/project-engine): extract ActionBuilder`.
- Delete TASK.md before final commit.
EOT

emit "wave3-actions-scope-detail-pane" sonnet 70 <<'EOT'
# Extract `ScopeDetailPane.vue` orchestrator sub-component

## Scope

Extract the scope-detail pane (~200 LOC) from
`MessengerProjectActionsPanel.vue` into
`features/project-engine/ui/scope-detail/ScopeDetailPane.vue`. Orchestrates
ScopeParticipantForm + ScopeSettingsGrid. **Run last** — depends on both.

## Acceptance

- New component; parent renders `<ScopeDetailPane>`.
- Lint + tsc clean.
- One commit: `refactor(messenger/project-engine): extract ScopeDetailPane`.
- Delete TASK.md before final commit.
EOT

echo
echo "─── Generated $(ls "$QUEUE_PENDING"/wave3-*.md 2>/dev/null | wc -l) Wave 3 tasks in $QUEUE_PENDING ───"
