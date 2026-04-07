# 11. Backend + Shared: матрица переноса в DDD-структуру

Этот документ фиксирует, как разложить действующий серверный код и контракты по модульной архитектуре без поломки маршрутов.

## Главный принцип

- server/api/** остается HTTP-слоем.
- Бизнес-логика уходит в server/modules/**.
- server/db/schema.ts раскладывается по server/db/schema/**.
- shared/** становится единственным местом для DTO, типов, констант и pure-utils.

## API -> Modules

### Auth
- server/api/auth/login.post.ts -> server/modules/auth/auth.service.ts
- server/api/auth/logout.post.ts -> server/modules/auth/session.service.ts
- server/api/auth/me.get.ts -> server/modules/auth/session.service.ts
- server/api/auth/recover.post.ts -> server/modules/auth/recovery.service.ts
- server/api/auth/register.post.ts -> server/modules/auth/auth.service.ts
- client/contractor auth endpoints раскладываются аналогично в auth.service.ts, contractor-auth.service.ts, session.service.ts и csrf.service.ts

### Admin + settings
- server/api/admin/search.get.ts -> server/modules/admin/admin-search.service.ts
- server/api/admin/notifications.get.ts -> server/modules/admin/admin-notifications.service.ts
- app-blueprints/design-modules/element-alignment/element-visibility endpoints -> server/modules/admin-settings/**
- agent-registry endpoints -> server/modules/agent-registry/**

### Projects
- CRUD проектов -> server/modules/projects/projects.service.ts
- status -> project-status.service.ts
- client-profile -> project-client-profile.service.ts
- page-content -> page-content.service.ts
- page-answers -> page-answers.service.ts
- relations -> project-relations.service.ts
- contractors/designers/sellers links -> отдельные services внутри projects
- work-status -> project-work-status.service.ts
- extra-services -> project-extra-services.service.ts
- communications bootstrap -> server/modules/communications/communications-bootstrap.service.ts

### Остальные домены
- server/api/clients/** -> server/modules/clients/**
- server/api/contractors/** -> server/modules/contractors/**
- server/api/designers/** -> server/modules/designers/**
- server/api/sellers/** -> server/modules/sellers/**
- server/api/managers/** -> server/modules/managers/**
- server/api/documents/** -> server/modules/documents/**
- server/api/gallery/** -> server/modules/gallery/**
- server/api/upload.post.ts -> server/modules/uploads/upload.service.ts
- server/api/suggest/** -> server/modules/suggest/**
- server/api/chat/** -> server/modules/chat/**

## server/utils -> целевая раскладка

- auth.ts -> modules/auth/auth.service.ts + session.service.ts
- auth-registration.ts -> modules/auth/auth.service.ts
- body.ts и query.ts остаются инфраструктурными utils
- storage.ts -> modules/uploads/upload-storage.service.ts
- upload-validation.ts -> modules/uploads/upload-validation.service.ts
- communications.ts -> modules/communications/communications-bootstrap.service.ts
- project-communications-relay.ts -> modules/communications/project-communications-relay.service.ts
- standalone-communications-relay.ts -> modules/communications/standalone-communications-relay.service.ts
- standalone-chat-communications.ts -> modules/chat/chat-communications.service.ts
- standalone-chat-users.ts -> modules/chat/chat-users.service.ts
- projects.ts -> modules/projects/projects.service.ts
- project-relations.ts -> modules/projects/project-relations.service.ts
- gemma.ts -> modules/ai/gemma.service.ts
- gemma-prompts.ts -> modules/ai/gemma-prompts.ts
- rag.ts -> modules/ai/rag.service.ts
- recovery-phrase.ts -> modules/auth/recovery.service.ts
- agent-chat.ts -> modules/chat/chat-agents.service.ts
- agent-chat-audit.ts -> modules/agent-registry/agent-registry-audit.service.ts
- admin-settings.ts -> modules/admin-settings/**

## Разбиение server/db/schema.ts

- users -> server/db/schema/users.ts
- adminSettings -> server/db/schema/admin-settings.ts
- projects -> server/db/schema/projects.ts
- pageConfigs -> server/db/schema/page-configs.ts
- pageContent -> server/db/schema/page-content.ts
- clients -> server/db/schema/clients.ts
- contractors -> server/db/schema/contractors.ts
- projectContractors -> server/db/schema/project-relations.ts
- workStatusItems -> server/db/schema/work-status-items.ts
- workStatusItemPhotos -> server/db/schema/work-status-item-photos.ts
- workStatusItemComments -> server/db/schema/work-status-item-comments.ts
- uploads -> server/db/schema/uploads.ts
- galleryItems -> server/db/schema/gallery-items.ts
- documents -> server/db/schema/documents.ts
- projectExtraServices -> server/db/schema/project-extra-services.ts
- contractorDocuments -> server/db/schema/contractor-documents.ts
- designers and links -> server/db/schema/designers.ts
- sellers -> server/db/schema/sellers.ts
- sellerProjects -> server/db/schema/seller-projects.ts
- managers -> server/db/schema/managers.ts
- managerProjects -> server/db/schema/manager-projects.ts
- all relations(...) -> server/db/schema/relations.ts

## Целевая структура shared

### constants
- navigation/admin-navigation.ts
- navigation/app-catalog.ts
- navigation/pages.ts
- design-system/brief-sections.ts
- design-system/design-modes.ts
- design-system/presets.ts
- profile/profile-fields.ts
- system/roles.ts
- system/status-colors.ts
- system/websocket-events.ts

### types
- auth/auth.ts
- navigation/navigation.ts
- navigation/app-catalog.ts
- project/project.ts
- project/phase-steps.ts
- project/catalogs.ts
- contractor/contractor.ts
- designer/designer.ts
- gallery/gallery.ts
- gallery/material.ts
- communications/communications.ts
- agent-chat/agent-chat.ts
- design-system/{design-mode,design-modules,element-alignment,element-visibility,wipe2}.ts

### utils
- communications/communications-e2ee.ts
- designer/designer-catalogs.ts
- project/project-control.ts
- project/project-control-timeline.ts
- project/work-status.ts
- ui/status-maps.ts

## Новые backend/shared-файлы первого этапа

- server/modules/admin/admin-search.service.ts
- server/modules/admin/admin-notifications.service.ts
- server/modules/agent-registry/agent-registry.service.ts
- server/modules/agent-registry/agent-registry-audit.service.ts
- server/modules/projects/page-content.service.ts
- server/modules/projects/page-answers.service.ts
- server/modules/projects/project-client-profile.service.ts
- server/modules/projects/project-relations.service.ts
- server/modules/projects/project-extra-services.service.ts
- server/modules/communications/project-communications-relay.service.ts
- server/modules/communications/standalone-communications-relay.service.ts
- server/modules/chat/chat-communications.service.ts
- server/modules/chat/chat-agents.service.ts
- server/db/schema/relations.ts
- shared/constants/system/roles.ts
- shared/constants/system/websocket-events.ts
- shared/constants/system/status-colors.ts

Это и есть реальный серверный каркас: сначала сервисы и схемы, потом чистка legacy-импортов.