# 27. Wave 11 — app/** FSD Depth Audit

Audit date: 2026-04-20. Scope: `app/entities/**`, `app/features/**`, `app/widgets/**`, `app/shared/**`, `app/pages/**`. Does **not** cover `messenger/web/` (separate runtime).

---

## 1. File Inventory

### 1.1 entities/ — 9 slices, 34 files, ~13 456 LOC

| Slice | Files | Notable sizes |
|---|---|---|
| admin-navigation | `model/useAdminNav.ts` (743), `ui/AdminNestedNav.vue` (430) | model oversize |
| agents | `model/useAgentRegistry.ts` (48), `model/useAgentSettings.ts` (46) | small, orphaned |
| app-blueprint | `model/useAppBlueprintCatalog.ts` (248), `model/useAppBlueprintRuntime.ts` (156), `ui/UIAppBlueprintBuilder.vue` (706) | UI oversize |
| communications | `model/useProjectCommunicationsBootstrap.ts` (20), `model/useStandaloneCommunicationsBootstrap.ts` (8), `ui/CommChatsDirectory.vue` (71), `ui/CommContactsDirectory.vue` (64), **`ui/ProjectCommunicationsPanel.vue` (1 734)** | UI critically oversize |
| contractors | `model/useContractorCabinet.ts` (786) | model oversize |
| design-system | `model/useDesignSystem.core.ts` (403), **`model/useDesignSystem.data.ts` (1 652)**, **`model/useDesignSystem.runtime.ts` (894)**, **`model/useUITheme.ts` (1 089)**, `model/useDesignModules.ts` (250), `model/useElementAlignment.ts` (245), `model/useElementVisibility.ts` (221), `ui/UIDesignModulesMatrix.vue` (312), `ui/UIDesignVisibilityRules.vue` (100), **`ui/Wipe2Renderer.vue` (517)** | multiple oversize |
| designers | `model/useDesignerCabinet.ts` (455) | orphaned |
| gallery | `model/useGallery.ts` (246), `ui/GalleryFilterBar.vue` (362), `ui/GalleryLightbox.vue` (323), `ui/GalleryMasonry.vue` (305) | healthy |
| materials | `ui/MaterialPropertyEditor.vue` (388), `ui/MaterialPropertyPanel.vue` (442) | orphaned (no model) |

### 1.2 features/ — 3 slices, 27 files, ~5 586 LOC

| Slice | Files | Notable sizes |
|---|---|---|
| entity-create | `ui/AdminEntityCreateCard.vue` (55) | stub |
| page-content | `ui/AdminPageContent.vue` (81), `ui/ClientPageContent.vue` (326) | healthy |
| ui-editor | 24 files, **`ui/UIDesignPanel.vue` (2 204)**, `ui/UIDesignTabArch.vue` (562), `ui/UIDesignTabGrid.vue` (435), `ui/UIDesignTabType.vue` (318), and 20 smaller tab files | UIDesignPanel critically oversize |

### 1.3 widgets/ — 7 slices, 95 files, ~31 904 LOC

| Slice | Sub-slices | Critical files |
|---|---|---|
| cabinets | client, contractor, designer, manager, seller | **`AdminContractorCabinet.vue` (1 259)**, `CabinetServicesSection.vue` (984), **`AdminDesignerCabinet.vue` (780)** |
| documents | — | **`AdminDocumentEditor.vue` (1 625)**, **`AdminDocumentsSection.vue` (709)** |
| gallery | — | `AdminGallery.vue` (638) |
| materials | — | healthy range |
| phases | commissioning, concept, construction, initiation, procurement, working-project | — |
| projects | board, control, entity-panel, phases | **`ClientControlTimelineSection.vue` (3 192)**, **`ControlTimelineSection.vue` (1 836)**, `AdminProjectControl.vue` (651), `ControlCommunicationsSection.vue` (636) |
| shells | — | — |

### 1.4 shared/ — 1 slice, 15 files, ~1 491 LOC

All under `ui/` sub-directory. Organised by category:

| Category | Files |
|---|---|
| buttons | `GlassButton.vue` (93), `GlassBadge.vue` (38) |
| feedback | `CabAutosaveStatus.vue` (51), `CabSectionHeader.vue` (86) |
| forms | `AppAddressInput.vue` (162), `AppAutocomplete.vue` (194), **`AppDatePicker.vue` (307)**, `GlassInput.vue` (93), `GlassSelect.vue` (102), `GlassTextarea.vue` (78) |
| navigation | `GlassNavigation.vue` (42), `GlassTabs.vue` (41), `GlassToggle.vue` (56) |
| overlays | `GlassModal.vue` (89) |
| surfaces | `GlassSurface.vue` (59) |

All sizes within limit. No violations.

### 1.5 pages/ — ~47 files, ~8 211 LOC

| Path | LOC |
|---|---|
| `admin/projects/[slug].vue` | **1 715** |
| `contractor/[id]/index.vue` | **836** |
| `contractor/[id]/ContractorTasksSection.vue` | **569** |
| `client/[slug]/index.vue` | **536** |
| `admin/contractors/index.vue` | 492 |
| `admin/clients/index.vue` | 460 |
| `login.vue` | 397 |
| `admin/index.vue` | 347 |
| Remaining ~39 files | < 350 each |

---

## 2. FSD Violations

> ESLint `no-upward-imports` rules are enforced at `pnpm lint:errors`. This section confirms the runtime state matches.

**Result: ZERO violations.**

| Check | Result |
|---|---|
| `entities/**` → features / widgets / pages | ✓ 0 violations |
| `features/**` → widgets / pages | ✓ 0 violations |
| `widgets/**` → pages | ✓ 0 violations (3 apparent matches are `~~/shared/constants/pages` — valid shared path) |
| `shared/**` → entities / features / widgets / pages | ✓ 0 violations |

False-positive detail: three files in `widgets/projects/` import `~~/shared/constants/pages`. The `~~` alias resolves to the repo root; this is a shared-layer import, **not** a pages-layer import.

Files involved:
- `widgets/projects/ClientOverview.vue:98`
- `widgets/projects/AdminProjectOverview.vue:137`
- `widgets/projects/AdminProjectSettings.vue:91`

---

## 3. Oversize Files

Threshold: 500 LOC. Files in `pages/` and `widgets/` are the primary concern; entity-level composables are also flagged.

### Critical (> 1 500 LOC) — immediate split candidates

| File | LOC | Suggested split |
|---|---|---|
| `widgets/projects/control/sections/ClientControlTimelineSection.vue` | 3 192 | Extract timeline-item row, timeline-filter bar, timeline-stats panel into separate components |
| `features/ui-editor/ui/UIDesignPanel.vue` | 2 204 | Already has tab components; move tab orchestration into per-tab sub-slices and keep panel as thin router |
| `widgets/projects/control/sections/ControlTimelineSection.vue` | 1 836 | Share logic with ClientControlTimelineSection via entity composable; extract admin vs client variants |
| `entities/communications/ui/ProjectCommunicationsPanel.vue` | 1 734 | Extract message-thread, thread-list, and compose-bar into separate entity UI components |
| `pages/admin/projects/[slug].vue` | 1 715 | Delegate sections to `widgets/projects/control/**`; page should be ≤ 200 LOC orchestration |
| `entities/design-system/model/useDesignSystem.data.ts` | 1 652 | Split into per-domain token modules (typography, color, spacing, …) |
| `widgets/documents/AdminDocumentEditor.vue` | 1 625 | Extract toolbar, document-body, sidebar-panel |

### Large (1 000–1 500 LOC)

| File | LOC |
|---|---|
| `entities/design-system/model/useUITheme.ts` | 1 089 |
| `entities/design-system/model/useDesignSystem.runtime.ts` | 894 |
| `pages/contractor/[id]/index.vue` | 836 |
| `entities/contractors/model/useContractorCabinet.ts` | 786 |
| `widgets/cabinets/designer/AdminDesignerCabinet.vue` | 780 |
| `widgets/cabinets/designer/sections/CabinetServicesSection.vue` | 984 |
| `widgets/cabinets/contractor/AdminContractorCabinet.vue` | 1 259 |

### Medium (500–1 000 LOC)

| File | LOC |
|---|---|
| `entities/admin-navigation/model/useAdminNav.ts` | 743 |
| `entities/app-blueprint/ui/UIAppBlueprintBuilder.vue` | 706 |
| `widgets/documents/AdminDocumentsSection.vue` | 709 |
| `widgets/gallery/AdminGallery.vue` | 638 |
| `widgets/projects/control/sections/ControlCommunicationsSection.vue` | 636 |
| `widgets/projects/control/AdminProjectControl.vue` | 651 |
| `pages/contractor/[id]/ContractorTasksSection.vue` | 569 |
| `features/ui-editor/ui/UIDesignTabArch.vue` | 562 |
| `pages/client/[slug]/index.vue` | 536 |
| `entities/design-system/ui/Wipe2Renderer.vue` | 517 |

**Total files > 500 LOC: 26**

---

## 4. Orphaned Slices

"Orphaned" = no import of the slice from pages/ or any higher layer was found.

| Slice | Type | Status | Notes |
|---|---|---|---|
| `entities/agents` | entity | **Orphaned** | `useAgentRegistry.ts` and `useAgentSettings.ts` exported but not imported by any page or widget. May be consumed via Pinia store at runtime; verify before deletion. |
| `entities/designers` | entity | **Potentially orphaned** | `useDesignerCabinet.ts` not imported. Designer UI lives entirely in `widgets/cabinets/designer/AdminDesignerCabinet.vue` which seems to own its own data-fetching. |
| `entities/materials` | entity | **Potentially orphaned** | Only `ui/` components — no model file. Not imported by any page. `widgets/materials` exists but appears self-contained. |

### Slices confirmed as used

| Slice | Imported by |
|---|---|
| `entities/admin-navigation` | `widgets/cabinets/designer/sections/**`, `pages/admin/projects/**` |
| `entities/app-blueprint` | `features/ui-editor/**` |
| `entities/communications` | `pages/client/[slug]/index.vue` |
| `entities/contractors` | `widgets/cabinets/contractor/**`, `pages/contractor/[id]/**` |
| `entities/design-system` | `pages/admin/**`, `features/ui-editor/**` |
| `entities/gallery` | `widgets/gallery/**` |
| `features/entity-create` | `pages/admin/**` (stub, used sparingly) |
| `features/page-content` | `pages/admin/**`, `pages/client/**` |
| `features/ui-editor` | `pages/admin/**` |
| All `widgets/**` | `pages/**` (direct component usage) |

---

## 5. Layer Maturity Summary

| Layer | Slices | Files | LOC | Maturity |
|---|---|---|---|---|
| entities | 9 | 34 | 13 456 | Mixed — design-system is deep and battle-tested; agents/designers/materials are shallow or orphaned |
| features | 3 | 27 | 5 586 | Partial — ui-editor is mature but monolithic; entity-create is a stub |
| widgets | 7 | 95 | 31 904 | Mature but over-sized; projects/control timeline sections are critical debt |
| shared | 1 | 15 | 1 491 | Healthy — all components small and focused |
| pages | ~47 | ~47 | 8 211 | Fair — admin/projects/[slug].vue is the main fat-page offender |

---

## 6. Recommended Next Steps

Priority order for the next waves:

1. **Split `ClientControlTimelineSection.vue` (3 192 LOC)** — highest-impact single file. Extract row, filter, and stats into sibling components inside `widgets/projects/control/sections/`.
2. **Thin `pages/admin/projects/[slug].vue` (1 715 LOC)** — delegate all section rendering to `widgets/projects/control/**`; keep only routing/layout logic.
3. **Break `UIDesignPanel.vue` (2 204 LOC)** — it already delegates to tab components, but the orchestration logic is still too heavy. Move per-tab logic into `features/ui-editor/model/` composables.
4. **Audit `entities/agents` orphan** — confirm whether the agent-registry composables are consumed at runtime (e.g. lazy-loaded plugins) before removing.
5. **Merge or delete `entities/designers`** — absorb into `widgets/cabinets/designer/` model subfolder if the composable is truly local to that widget.
