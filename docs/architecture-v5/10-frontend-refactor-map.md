# 10. Frontend: матрица переноса в FSD-структуру

Этот документ фиксирует, куда переносится текущий frontend без big bang rewrite.

## Правила переноса

1. Route-файлы в app/pages сохраняют текущие URL.
2. Layout-файлы сохраняются, но худеют и становятся shell.
3. Большие компоненты из app/components переезжают в widgets.
4. Инфраструктурные composable уходят в app/core или app/shared/composables.
5. Доменные composable уходят в entities/<domain>/model.
6. Повторно используемые мелкие UI-блоки уходят в app/shared/ui.

## Ключевые переносы

### Shared UI
- GlassSurface.vue -> app/shared/ui/surfaces/GlassSurface.vue
- GlassButton.vue -> app/shared/ui/buttons/GlassButton.vue
- GlassInput.vue -> app/shared/ui/forms/GlassInput.vue
- GlassModal.vue -> app/shared/ui/overlays/GlassModal.vue
- GlassNavigation.vue -> app/shared/ui/navigation/GlassNavigation.vue
- AppAddressInput.vue -> app/shared/ui/forms/AppAddressInput.vue
- AppAutocomplete.vue -> app/shared/ui/forms/AppAutocomplete.vue
- AppDatePicker.vue -> app/shared/ui/forms/AppDatePicker.vue
- CabAutosaveStatus.vue -> app/shared/ui/feedback/CabAutosaveStatus.vue
- CabSectionHeader.vue -> app/shared/ui/feedback/CabSectionHeader.vue

### Навигация и shell
- AdminNestedNav.vue -> app/entities/admin-navigation/ui/AdminNestedNav.vue
- useAdminNav.ts -> app/entities/admin-navigation/model/useAdminNav.ts
- AdminEntityCabinetShell.vue -> app/widgets/shells/AdminEntityCabinetShell.vue
- AdminEntityEmptyState.vue -> app/widgets/shells/AdminEntityEmptyState.vue
- AdminEntityHeader.vue -> app/widgets/shells/AdminEntityHeader.vue
- AdminEntityHero.vue -> app/widgets/shells/AdminEntityHero.vue
- AdminEntityPageShell.vue -> app/widgets/shells/AdminEntityPageShell.vue
- AdminEntityCreateCard.vue -> app/features/entity-create/ui/AdminEntityCreateCard.vue
- AdminPageContent.vue -> app/features/page-content/ui/AdminPageContent.vue
- ClientPageContent.vue -> app/features/page-content/ui/ClientPageContent.vue

### Design system
- UIDesignPanel.vue -> app/features/ui-editor/ui/UIDesignPanel.vue
- UIAppBlueprintBuilder.vue -> app/entities/app-blueprint/ui/UIAppBlueprintBuilder.vue
- UIDesignModulesMatrix.vue -> app/entities/design-system/ui/UIDesignModulesMatrix.vue
- UIDesignVisibilityRules.vue -> app/entities/design-system/ui/UIDesignVisibilityRules.vue
- Wipe2Renderer.vue -> app/entities/design-system/ui/Wipe2Renderer.vue
- useAppBlueprintCatalog.ts -> app/entities/app-blueprint/model/useAppBlueprintCatalog.ts
- useAppBlueprintRuntime.ts -> app/entities/app-blueprint/model/useAppBlueprintRuntime.ts
- useDesignModules.ts -> app/entities/design-system/model/useDesignModules.ts
- useDesignSystem.ts -> app/entities/design-system/model/useDesignSystem.ts
- useEditMode.ts -> app/entities/design-system/model/useEditMode.ts
- useElementAlignment.ts -> app/entities/design-system/model/useElementAlignment.ts
- useElementVisibility.ts -> app/entities/design-system/model/useElementVisibility.ts
- useUITheme.ts -> app/entities/design-system/model/useUITheme.ts
- useWipe2.ts -> app/entities/design-system/model/useWipe2.ts

### Галерея, материалы, коммуникации
- AdminGallery.vue -> app/widgets/gallery/AdminGallery.vue
- GalleryFilterBar.vue -> app/entities/gallery/ui/GalleryFilterBar.vue
- GalleryLightbox.vue -> app/entities/gallery/ui/GalleryLightbox.vue
- GalleryMasonry.vue -> app/entities/gallery/ui/GalleryMasonry.vue
- useGallery.ts -> app/entities/gallery/model/useGallery.ts
- AdminMaterials.vue -> app/widgets/materials/AdminMaterials.vue
- MaterialPropertyEditor.vue -> app/entities/materials/ui/MaterialPropertyEditor.vue
- MaterialPropertyPanel.vue -> app/entities/materials/ui/MaterialPropertyPanel.vue
- ProjectCommunicationsPanel.vue -> app/entities/communications/ui/ProjectCommunicationsPanel.vue
- useProjectCommunicationsBootstrap.ts -> app/entities/communications/model/useProjectCommunicationsBootstrap.ts
- useStandaloneCommunicationsBootstrap.ts -> app/entities/communications/model/useStandaloneCommunicationsBootstrap.ts
- useAgentRegistry.ts -> app/entities/agents/model/useAgentRegistry.ts
- useAgentSettings.ts -> app/entities/agents/model/useAgentSettings.ts

### Админские фазовые виджеты
- Все фазовые Admin-компоненты раскладываются в app/widgets/phases/{initiation,concept,working-project,procurement,construction,commissioning}/**

### Клиентский кабинет
- Все Client-компоненты раскладываются в app/widgets/client-cabinet/**

### Pages, layouts, middleware
- app/pages/** сохраняют маршруты, но становятся route-shell.
- app/layouts/admin.vue, contractor.vue и default.vue сохраняются как каркасы.
- app/middleware/admin.ts, project.ts, contractor.ts сохраняются и приводятся к единому guard-стилю.

## Новые frontend-файлы первого этапа

- app/widgets/admin-dashboard/AdminProjectsDashboard.vue
- app/widgets/registries/ClientsRegistryWorkspace.vue
- app/widgets/registries/ContractorsRegistryWorkspace.vue
- app/widgets/registries/DesignersRegistryWorkspace.vue
- app/widgets/registries/ManagersRegistryWorkspace.vue
- app/widgets/registries/SellersRegistryWorkspace.vue
- app/widgets/agents/AgentRegistryWorkspace.vue
- app/widgets/contractor-cabinet/ContractorCabinetShell.vue
- app/widgets/contractor-cabinet/ContractorProfileSection.vue
- app/widgets/contractor-cabinet/ContractorDocumentsSection.vue
- app/widgets/contractor-cabinet/ContractorWorkItemsSection.vue
- app/widgets/contractor-cabinet/ContractorStaffSection.vue
- app/features/auth/admin/ui/AdminLoginForm.vue
- app/features/auth/client/ui/ClientLoginForm.vue
- app/features/auth/client/ui/ClientRecoverForm.vue
- app/features/auth/client/ui/ClientRegisterForm.vue
- app/features/auth/contractor/ui/ContractorLoginForm.vue
- app/features/auth/contractor/ui/ContractorRecoverForm.vue
- app/features/auth/contractor/ui/ContractorRegisterForm.vue

Этот список и есть рабочая матрица фронтенд-миграции.

## Current Status vs Target (2026-04-16)

- Status source: `14-refactor-roadmap.md`.
- Что уже достигнуто: выполнен безопасный widget-shell cutover для ключевых CRM admin-страниц и создан базовый слой `app/widgets/**` для project/cabinets/gallery/documents.
- Что еще не доведено до полного match: системное наполнение `app/shared/ui/**`, перенос primary-flow в `app/features/**`, снятие оставшихся bridge-зависимостей на legacy `app/components/**`.
- Критерий завершения этого документа: страницы остаются route-shell, бизнес-UI живет в `features/widgets/entities/shared` без legacy fallback.

## Drift audit (2026-04-20)

Audit run against actual `app/` tree on 2026-04-20.

**Counts:** landed: 47 | pending: 19 | stale: 0

### Shared UI (10 rows)

| Target path | Status |
|---|---|
| `app/shared/ui/surfaces/GlassSurface.vue` | ✓ landed 2026-04-20 |
| `app/shared/ui/buttons/GlassButton.vue` | ✓ landed 2026-04-20 |
| `app/shared/ui/forms/GlassInput.vue` | ✓ landed 2026-04-20 |
| `app/shared/ui/overlays/GlassModal.vue` | ✓ landed 2026-04-20 |
| `app/shared/ui/navigation/GlassNavigation.vue` | ✓ landed 2026-04-20 |
| `app/shared/ui/forms/AppAddressInput.vue` | ✓ landed 2026-04-20 |
| `app/shared/ui/forms/AppAutocomplete.vue` | ✓ landed 2026-04-20 |
| `app/shared/ui/forms/AppDatePicker.vue` | ✓ landed 2026-04-20 |
| `app/shared/ui/feedback/CabAutosaveStatus.vue` | ✓ landed 2026-04-20 |
| `app/shared/ui/feedback/CabSectionHeader.vue` | ✓ landed 2026-04-20 |

### Навигация и shell (10 rows)

| Target path | Status |
|---|---|
| `app/entities/admin-navigation/ui/AdminNestedNav.vue` | ✓ landed 2026-04-20 |
| `app/entities/admin-navigation/model/useAdminNav.ts` | ✓ landed 2026-04-20 |
| `app/widgets/shells/AdminEntityCabinetShell.vue` | ✓ landed 2026-04-20 |
| `app/widgets/shells/AdminEntityEmptyState.vue` | ✓ landed 2026-04-20 |
| `app/widgets/shells/AdminEntityHeader.vue` | ✓ landed 2026-04-20 |
| `app/widgets/shells/AdminEntityHero.vue` | ✓ landed 2026-04-20 |
| `app/widgets/shells/AdminEntityPageShell.vue` | ✓ landed 2026-04-20 |
| `app/features/entity-create/ui/AdminEntityCreateCard.vue` | ✓ landed 2026-04-20 |
| `app/features/page-content/ui/AdminPageContent.vue` | ✓ landed 2026-04-20 |
| `app/features/page-content/ui/ClientPageContent.vue` | ✓ landed 2026-04-20 |

### Design system (14 rows)

| Target path | Status |
|---|---|
| `app/features/ui-editor/ui/UIDesignPanel.vue` | ✓ landed 2026-04-20 |
| `app/entities/app-blueprint/ui/UIAppBlueprintBuilder.vue` | ✓ landed 2026-04-20 |
| `app/entities/design-system/ui/UIDesignModulesMatrix.vue` | ✓ landed 2026-04-20 |
| `app/entities/design-system/ui/UIDesignVisibilityRules.vue` | ✓ landed 2026-04-20 |
| `app/entities/design-system/ui/Wipe2Renderer.vue` | ✓ landed 2026-04-20 |
| `app/entities/app-blueprint/model/useAppBlueprintCatalog.ts` | ✓ landed 2026-04-20 |
| `app/entities/app-blueprint/model/useAppBlueprintRuntime.ts` | ✓ landed 2026-04-20 |
| `app/entities/design-system/model/useDesignModules.ts` | ✓ landed 2026-04-20 |
| `app/entities/design-system/model/useDesignSystem.ts` | ✓ landed 2026-04-20 |
| `app/entities/design-system/model/useEditMode.ts` | ✓ landed 2026-04-20 |
| `app/entities/design-system/model/useElementAlignment.ts` | ✓ landed 2026-04-20 |
| `app/entities/design-system/model/useElementVisibility.ts` | ✓ landed 2026-04-20 |
| `app/entities/design-system/model/useUITheme.ts` | ✓ landed 2026-04-20 |
| `app/entities/design-system/model/useWipe2.ts` | ✓ landed 2026-04-20 |

### Галерея, материалы, коммуникации (13 rows)

| Target path | Status |
|---|---|
| `app/widgets/gallery/AdminGallery.vue` | ✓ landed 2026-04-20 |
| `app/entities/gallery/ui/GalleryFilterBar.vue` | ✓ landed 2026-04-20 |
| `app/entities/gallery/ui/GalleryLightbox.vue` | ✓ landed 2026-04-20 |
| `app/entities/gallery/ui/GalleryMasonry.vue` | ✓ landed 2026-04-20 |
| `app/entities/gallery/model/useGallery.ts` | ✓ landed 2026-04-20 |
| `app/widgets/materials/AdminMaterials.vue` | ✓ landed 2026-04-20 |
| `app/entities/materials/ui/MaterialPropertyEditor.vue` | ✓ landed 2026-04-20 |
| `app/entities/materials/ui/MaterialPropertyPanel.vue` | ✓ landed 2026-04-20 |
| `app/entities/communications/ui/ProjectCommunicationsPanel.vue` | ✓ landed 2026-04-20 |
| `app/entities/communications/model/useProjectCommunicationsBootstrap.ts` | ✓ landed 2026-04-20 |
| `app/entities/communications/model/useStandaloneCommunicationsBootstrap.ts` | ✓ landed 2026-04-20 |
| `app/entities/agents/model/useAgentRegistry.ts` | ✓ landed 2026-04-20 |
| `app/entities/agents/model/useAgentSettings.ts` | ✓ landed 2026-04-20 |

### Wildcard groups

| Doc target | Status |
|---|---|
| `app/widgets/phases/{initiation,concept,working-project,procurement,construction,commissioning}/**` | ✓ landed 2026-04-20 — all 6 subdirs present |
| `app/widgets/client-cabinet/**` | path drift — landed as `app/widgets/cabinets/client/` (not counted in pending/stale) |

### Новые frontend-файлы первого этапа (19 rows — pending)

These are net-new files (no legacy source). All 19 targets are absent.

| Target path | Status |
|---|---|
| `app/widgets/admin-dashboard/AdminProjectsDashboard.vue` | pending |
| `app/widgets/registries/ClientsRegistryWorkspace.vue` | pending |
| `app/widgets/registries/ContractorsRegistryWorkspace.vue` | pending |
| `app/widgets/registries/DesignersRegistryWorkspace.vue` | pending |
| `app/widgets/registries/ManagersRegistryWorkspace.vue` | pending |
| `app/widgets/registries/SellersRegistryWorkspace.vue` | pending |
| `app/widgets/agents/AgentRegistryWorkspace.vue` | pending |
| `app/widgets/contractor-cabinet/ContractorCabinetShell.vue` | pending |
| `app/widgets/contractor-cabinet/ContractorProfileSection.vue` | pending |
| `app/widgets/contractor-cabinet/ContractorDocumentsSection.vue` | pending |
| `app/widgets/contractor-cabinet/ContractorWorkItemsSection.vue` | pending |
| `app/widgets/contractor-cabinet/ContractorStaffSection.vue` | pending |
| `app/features/auth/admin/ui/AdminLoginForm.vue` | pending |
| `app/features/auth/client/ui/ClientLoginForm.vue` | pending |
| `app/features/auth/client/ui/ClientRecoverForm.vue` | pending |
| `app/features/auth/client/ui/ClientRegisterForm.vue` | pending |
| `app/features/auth/contractor/ui/ContractorLoginForm.vue` | pending |
| `app/features/auth/contractor/ui/ContractorRecoverForm.vue` | pending |
| `app/features/auth/contractor/ui/ContractorRegisterForm.vue` | pending |

### FSD import direction invariants

Verified in `eslint.config.mjs` (lines 367, 395, 417):

```
367: // FSD direction: entities cannot import from widgets/features/pages
395: // FSD direction: widgets cannot import from pages
417: // FSD direction: features cannot import from widgets/pages
```

Rules are present and enforced as hard errors. Wording unchanged from baseline.