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
- StandaloneChatPanel.vue -> app/entities/communications/ui/StandaloneChatPanel.vue
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