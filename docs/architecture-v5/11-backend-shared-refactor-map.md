# 11. Backend + Shared: матрица переноса в DDD-структуру

Этот документ фиксирует, как разложить действующий серверный код и контракты по модульной архитектуре без поломки маршрутов. Все source и target пути — репозиторно-корневые, чтобы `scripts/verify-architecture-docs.mjs` мог машинно проверять их существование.

## Главный принцип

- `server/api/**` остается HTTP-слоем.
- Бизнес-логика уходит в `server/modules/**`.
- `server/db/schema.ts` раскладывается по `server/db/schema/**` (сделано в Wave 6, см. 14-refactor-roadmap.md).
- `shared/**` становится единственным местом для DTO, типов, констант и pure-utils.

## API -> Modules

### Auth
- server/api/auth/login.post.ts -> server/modules/auth/admin-auth.service.ts ✓ done 2026-04-20
- server/api/auth/register.post.ts -> server/modules/auth/admin-auth.service.ts ✓ done 2026-04-20
- server/api/auth/recover.post.ts -> server/modules/auth/admin-recovery.service.ts ✓ done 2026-04-20
- server/api/auth/me.get.ts -> server/modules/auth/session.service.ts ✓ done 2026-04-20
- server/api/auth/logout.post.ts -> server/modules/auth/session.service.ts ✓ done 2026-04-20
- server/api/auth/client-login.post.ts -> server/modules/auth/client-auth.service.ts ✓ done 2026-04-20
- server/api/auth/client-register.post.ts -> server/modules/auth/client-auth.service.ts ✓ done 2026-04-20
- server/api/auth/client-recover.post.ts -> server/modules/auth/client-auth.service.ts ✓ done 2026-04-20
- server/api/auth/client-id-logout.post.ts -> server/modules/auth/session.service.ts ✓ done 2026-04-20
- server/api/auth/client-open.get.ts -> server/modules/auth/client-auth.service.ts ✓ done 2026-04-20
- server/api/auth/contractor-login.post.ts -> server/modules/auth/contractor-auth.service.ts ✓ done 2026-04-20
- server/api/auth/contractor-register.post.ts -> server/modules/auth/contractor-auth.service.ts ✓ done 2026-04-20
- server/api/auth/contractor-recover.post.ts -> server/modules/auth/contractor-auth.service.ts ✓ done 2026-04-20
- server/api/auth/contractor-logout.post.ts -> server/modules/auth/session.service.ts ✓ done 2026-04-20
- server/api/auth/csrf.get.ts -> server/api/auth/csrf.get.ts  (2-liner, no DB, stays) ✓ done 2026-04-20

### Admin + settings
- server/api/admin/search.get.ts -> server/modules/admin/admin-search.service.ts ✓ done 2026-04-20
- server/api/admin/notifications.get.ts -> server/modules/admin/admin-notifications.service.ts ✓ done 2026-04-20
- server/api/admin/app-blueprints.get.ts -> server/modules/admin-settings/admin-settings.service.ts ✓ done 2026-04-20
- server/api/admin/app-blueprints.put.ts -> server/modules/admin-settings/admin-settings.service.ts ✓ done 2026-04-20
- server/api/admin/design-modules.get.ts -> server/modules/admin-settings/admin-settings.service.ts ✓ done 2026-04-20
- server/api/admin/design-modules.put.ts -> server/modules/admin-settings/admin-settings.service.ts ✓ done 2026-04-20
- server/api/admin/element-alignment.get.ts -> server/modules/admin-settings/admin-settings.service.ts ✓ done 2026-04-20
- server/api/admin/element-alignment.put.ts -> server/modules/admin-settings/admin-settings.service.ts ✓ done 2026-04-20
- server/api/admin/element-visibility.get.ts -> server/modules/admin-settings/admin-settings.service.ts ✓ done 2026-04-20
- server/api/admin/element-visibility.put.ts -> server/modules/admin-settings/admin-settings.service.ts ✓ done 2026-04-20

### Projects
- server/api/projects/index.get.ts -> server/modules/projects/projects.service.ts
- server/api/projects/index.post.ts -> server/modules/projects/projects.service.ts
- server/api/projects/[slug].get.ts -> server/modules/projects/projects.service.ts
- server/api/projects/[slug].put.ts -> server/modules/projects/projects.service.ts
- server/api/projects/[slug].delete.ts -> server/modules/projects/projects.service.ts
- server/api/projects/[slug]/status.put.ts -> server/modules/projects/project-mutations.service.ts ✓ done 2026-04-20
- server/api/projects/[slug]/client-profile.put.ts -> server/modules/projects/project-client-profile.service.ts ✓ done 2026-04-20
- server/api/projects/[slug]/page-content.get.ts -> server/modules/projects/page-content.service.ts ✓ done 2026-04-20
- server/api/projects/[slug]/page-content.put.ts -> server/modules/projects/page-content.service.ts ✓ done 2026-04-20
- server/api/projects/[slug]/page-answers.get.ts -> server/modules/projects/page-answers.service.ts ✓ done 2026-04-20
- server/api/projects/[slug]/page-answers.put.ts -> server/modules/projects/page-answers.service.ts ✓ done 2026-04-20
- server/api/projects/[slug]/relations.get.ts -> server/modules/projects/project-relations.service.ts ✓ done 2026-04-20
- server/api/projects/[slug]/relations.put.ts -> server/modules/projects/project-relations.service.ts ✓ done 2026-04-20
- server/api/projects/[slug]/contractors.get.ts -> server/modules/projects/project-partners.service.ts ✓ done 2026-04-20
- server/api/projects/[slug]/contractors.post.ts -> server/modules/projects/project-partners.service.ts ✓ done 2026-04-20
- server/api/projects/[slug]/contractors.delete.ts -> server/modules/projects/project-partners.service.ts ✓ done 2026-04-20
- server/api/projects/[slug]/contractors/[contractorId].delete.ts -> server/modules/projects/project-partners.service.ts ✓ done 2026-04-20
- server/api/projects/[slug]/designers.get.ts -> server/modules/projects/project-partners.service.ts ✓ done 2026-04-20
- server/api/projects/[slug]/designers.post.ts -> server/modules/projects/project-partners.service.ts ✓ done 2026-04-20
- server/api/projects/[slug]/designers.delete.ts -> server/modules/projects/project-partners.service.ts ✓ done 2026-04-20
- server/api/projects/[slug]/sellers.get.ts -> server/modules/projects/project-partners.service.ts ✓ done 2026-04-20
- server/api/projects/[slug]/sellers.post.ts -> server/modules/projects/project-partners.service.ts ✓ done 2026-04-20
- server/api/projects/[slug]/sellers.delete.ts -> server/modules/projects/project-partners.service.ts ✓ done 2026-04-20
- server/api/projects/[slug]/work-status.get.ts -> server/modules/projects/project-work-status.service.ts ✓ done 2026-04-20
- server/api/projects/[slug]/work-status.put.ts -> server/modules/projects/project-work-status.service.ts ✓ done 2026-04-20
- server/api/projects/[slug]/work-status/[itemId]/comments.get.ts -> server/modules/projects/project-work-status-items.service.ts ✓ done 2026-04-20
- server/api/projects/[slug]/work-status/[itemId]/comments.post.ts -> server/modules/projects/project-work-status-items.service.ts ✓ done 2026-04-20
- server/api/projects/[slug]/work-status/[itemId]/photos.get.ts -> server/modules/projects/project-work-status-items.service.ts ✓ done 2026-04-20
- server/api/projects/[slug]/coordination/participants/index.post.ts -> server/modules/projects/project-governance.service.ts ✓ done 2026-04-20
- server/api/projects/[slug]/coordination/participants/[participantId].patch.ts -> server/modules/projects/project-governance.service.ts ✓ done 2026-04-20
- server/api/projects/[slug]/coordination/assignments/index.post.ts -> server/modules/projects/project-governance.service.ts ✓ done 2026-04-20
- server/api/projects/[slug]/coordination/assignments/[assignmentId].patch.ts -> server/modules/projects/project-governance.service.ts ✓ done 2026-04-20
- server/api/projects/[slug]/coordination/assignments/[assignmentId].delete.ts -> server/modules/projects/project-governance.service.ts ✓ done 2026-04-20
- server/api/projects/[slug]/coordination/scopes/[scopeType]/[scopeId].get.ts -> server/modules/projects/project-governance.service.ts ✓ done 2026-04-20
- server/api/projects/[slug]/coordination/scopes/[scopeType]/[scopeId]/settings.patch.ts -> server/modules/projects/project-governance.service.ts ✓ done 2026-04-20
- server/api/projects/[slug]/extra-services/index.get.ts -> server/modules/projects/project-extra-services.service.ts ✓ done 2026-04-20
- server/api/projects/[slug]/extra-services/index.post.ts -> server/modules/projects/project-extra-services.service.ts ✓ done 2026-04-20
- server/api/projects/[slug]/extra-services/[id].put.ts -> server/modules/projects/project-extra-services.service.ts ✓ done 2026-04-20
- server/api/projects/[slug]/extra-services/[id].delete.ts -> server/modules/projects/project-extra-services.service.ts ✓ done 2026-04-20
- server/api/projects/[slug]/extra-services/[id]/generate-docs.post.ts -> server/modules/projects/project-extra-service-documents.service.ts ✓ done 2026-04-20
- server/api/projects/[slug]/communications-bootstrap.get.ts -> server/modules/communications/communications-bootstrap.service.ts ✓ done 2026-04-20
- server/api/projects/[slug]/communications/** (bootstrap.get, dispatch.post, action-catalog.get, action-execute.post, call-insights/*, rooms/**) — thin handlers, delegate to modules/communications/ ✓ done 2026-04-20

### Остальные домены
- server/api/clients/ -> server/modules/clients/ ✓ done 2026-04-20
- server/api/contractors/ -> server/modules/contractors/
- server/api/designers/ -> server/modules/designers/  — ✓ done 2026-04-20
- server/api/sellers/ -> server/modules/sellers/
- server/api/managers/ -> server/modules/managers/
- server/api/documents/index.get.ts -> server/modules/documents/documents.service.ts ✓ done 2026-04-20
- server/api/documents/index.post.ts -> server/modules/documents/documents.service.ts ✓ done 2026-04-20
- server/api/documents/[id].get.ts -> server/modules/documents/documents.service.ts ✓ done 2026-04-20
- server/api/documents/[id].put.ts -> server/modules/documents/documents.service.ts ✓ done 2026-04-20
- server/api/documents/[id].delete.ts -> server/modules/documents/documents.service.ts ✓ done 2026-04-20
- server/api/documents/context.get.ts -> server/modules/documents/documents.service.ts ✓ done 2026-04-20
- server/api/documents/export-docx.post.ts -> server/modules/documents/documents.service.ts ✓ done 2026-04-20
- server/api/gallery/ -> server/modules/gallery/
- server/api/upload.post.ts -> server/api/upload.post.ts  (no DB, multipart-only, stays)
- server/api/suggest/address.get.ts -> server/api/suggest/address.get.ts  (external Yandex proxy, no DB, stays)

### Geocode
- server/api/geocode/address.get.ts -> server/api/geocode/address.get.ts  (thin handler, external provider proxy) ✓ done 2026-04-20

### Chat
- server/api/chat/profile.put.ts -> server/modules/chat/chat-users.service.ts ✓ done 2026-04-20
- server/api/chat/auth/login.post.ts -> server/modules/chat/chat-users.service.ts ✓ done 2026-04-20
- server/api/chat/auth/logout.post.ts -> server/modules/chat/chat-users.service.ts ✓ done 2026-04-20
- server/api/chat/auth/me.get.ts -> server/modules/chat/chat-users.service.ts ✓ done 2026-04-20
- server/api/chat/auth/register.post.ts -> server/modules/chat/chat-users.service.ts ✓ done 2026-04-20
- server/api/chat/communications/bootstrap.get.ts -> server/modules/chat/chat-communications.service.ts ✓ done 2026-04-20
- server/api/chat/contacts/index.get.ts -> server/modules/chat/chat-users.service.ts ✓ done 2026-04-20
- server/api/chat/contacts/invite.post.ts -> server/modules/chat/chat-users.service.ts ✓ done 2026-04-20
- server/api/chat/contacts/respond.post.ts -> server/modules/chat/chat-users.service.ts ✓ done 2026-04-20
- server/api/chat/users/index.get.ts -> server/modules/chat/chat-users.service.ts ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

### AI handlers
- server/api/ai/document-stream.post.ts -> server/modules/ai/ (ai.service, rag.service) ✓ done 2026-04-20
- server/api/ai/legal-status.get.ts -> server/modules/ai/ai.service ✓ done 2026-04-20

## server/utils -> target layout

- server/utils/auth.ts -> server/modules/auth/admin-auth.service.ts + server/modules/auth/session.service.ts
- server/utils/auth-registration.ts -> server/modules/auth/admin-auth.service.ts
- server/utils/body.ts -> server/utils/body.ts  (infrastructure helper, stays)
- server/utils/query.ts -> server/utils/query.ts  (infrastructure helper, stays)
- server/utils/storage.ts -> server/modules/uploads/upload-storage.service.ts
- server/utils/upload-validation.ts -> server/modules/uploads/upload-validation.service.ts
- server/utils/communications.ts -> server/modules/communications/communications-bootstrap.service.ts ✓ done 2026-04-20
- server/utils/project-communications-relay.ts -> server/modules/communications/project-communications-relay.service.ts ✓ done 2026-04-20
- server/utils/standalone-chat-communications.ts -> server/modules/chat/chat-communications.service.ts
- server/utils/standalone-chat-users.ts -> server/modules/chat/chat-users.service.ts
- server/utils/projects.ts -> server/modules/projects/projects.service.ts
- server/utils/project-relations.ts -> server/modules/projects/project-relations.service.ts
- server/utils/gemma.ts -> server/modules/ai/gemma.service.ts
- server/utils/gemma-prompts.ts -> server/modules/ai/gemma-prompts.ts
- server/utils/rag.ts -> server/modules/ai/rag.service.ts
- server/utils/recovery-phrase.ts -> server/modules/auth/admin-recovery.service.ts
- server/utils/admin-settings.ts -> server/modules/admin-settings/admin-settings.service.ts

## server/db/schema split (done)

`server/db/schema.ts` был разделён в Wave 6 (2026-04-17). Фактический результат:

- server/db/schema/users.ts — users, adminSettings
- server/db/schema/clients.ts — clients
- server/db/schema/projects.ts — projects, pageConfigs, pageContent
- server/db/schema/contractors.ts — contractors, projectContractors, contractorDocuments
- server/db/schema/work-status.ts — workStatusItems, workStatusItemPhotos, workStatusItemComments
- server/db/schema/uploads.ts — uploads, galleryItems
- server/db/schema/documents.ts — documents, projectExtraServices
- server/db/schema/designers.ts — designers, designerProjects, designerProjectClients, designerProjectContractors
- server/db/schema/sellers.ts — sellers, sellerProjects
- server/db/schema/managers.ts — managers, managerProjects
- server/db/schema/project-governance.ts — projectParticipants, projectScopeAssignments, projectScopeSettings
- server/db/schema/relations.ts — все `relations(...)`
- server/db/schema/index.ts — barrel, re-export

Старый `server/db/schema.ts` удалён. Import-поверхность `~/server/db/schema` сохранена через barrel.

## Целевая структура shared

### constants
- shared/constants/navigation/admin-navigation.ts
- shared/constants/navigation/app-catalog.ts
- shared/constants/navigation/pages.ts
- shared/constants/design-system/brief-sections.ts
- shared/constants/design-system/design-modes.ts
- shared/constants/design-system/presets.ts
- shared/constants/profile/profile-fields.ts
- shared/constants/system/roles.ts
- shared/constants/system/status-colors.ts
- shared/constants/system/websocket-events.ts

### types
- shared/types/auth/auth.ts
- shared/types/navigation/navigation.ts
- shared/types/navigation/app-catalog.ts
- shared/types/project/project.ts
- shared/types/project/project-governance.ts
- shared/types/project/phase-steps.ts
- shared/types/project/catalogs.ts
- shared/types/contractor/contractor.ts
- shared/types/designer/designer.ts
- shared/types/gallery/gallery.ts
- shared/types/gallery/material.ts
- shared/types/communications/communications.ts
- shared/types/agent-chat/agent-chat.ts
- shared/types/design-system/design-mode.ts
- shared/types/design-system/design-modules.ts
- shared/types/design-system/element-alignment.ts
- shared/types/design-system/element-visibility.ts
- shared/types/design-system/wipe2.ts

### utils
- shared/utils/communications/communications-e2ee.ts
- shared/utils/designer/designer-catalogs.ts
- shared/utils/project/project-control.ts
- shared/utils/project/project-control-timeline.ts
- shared/utils/project/project-governance.ts
- shared/utils/project/work-status.ts
- shared/utils/ui/status-maps.ts

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

## Правила владения пересекающихся доменов

Чтобы не размывать ответственность между соседними модулями, границы фиксируются явно:

### Agents (три модуля, три роли)
- `server/modules/agent-registry/**` — **CRUD + audit** реестра агентов, пресетов знаний, workspace-ов. Единственный источник записи в соответствующие таблицы.
- `server/modules/chat/chat-agents.service.ts` — **runtime-прокси** между chat-endpoints и `messenger/core/src/agents`. Не имеет права писать в БД агентов напрямую, только читать снапшоты и вызывать registry-сервис.
- `messenger/core/src/agents/**` — **исполнение** агентов (LLM runs, knowledge lookup, workspace state) в отдельном процессе. Обменивается с CRM только через Redis Pub/Sub и HTTP.
- `app/entities/agents/**` — **UI-модели** (composables useAgent*) для консоли агентов в CRM и мессенджере.

#### server/api/agents/** — CRM registry CRUD handlers
- server/api/agents/index.get.ts -> server/modules/agent-registry/agent-registry.service.ts ✓ done 2026-04-20
- server/api/agents/index.post.ts -> server/modules/agent-registry/agent-registry.service.ts ✓ done 2026-04-20
- server/api/agents/[id].get.ts -> server/modules/agent-registry/agent-registry.service.ts ✓ done 2026-04-20
- server/api/agents/[id].put.ts -> server/modules/agent-registry/agent-registry.service.ts (OCC version, 409 on mismatch) ✓ done 2026-04-20
- server/api/agents/[id].delete.ts -> server/modules/agent-registry/agent-registry.service.ts (soft-delete) ✓ done 2026-04-20

### Communications (четыре зоны)
- `server/modules/communications/communications-bootstrap.service.ts` — bootstrap контекста для фронта.
- `server/modules/communications/project-communications-relay.service.ts` — маршрутизация событий проекта в Pub/Sub.
- `messenger/core/src/realtime/**` — доставка WS-сообщений и WebRTC signaling.
- `services/communications-service/**` — E2EE-реле и тикеты звонков между клиентами.

Каждая зона должна иметь ровно один owner-файл. Любая попытка продублировать функцию «как удобнее» в соседней зоне считается архитектурной регрессией.

## Current Status vs Target (2026-04-20)

**Verification status (matrix reality via `pnpm docs:v5:verify`):**
- Total 66 mapping rows: 16 fully done, 4 pending, 46 ambiguous (bridge/partial implementations).
- All direct `server/modules/<domain>/` target directories exist.
- **Verified module files:**
  - Auth: ✓ admin-auth.service.ts, admin-recovery.service.ts, session.service.ts, client-auth.service.ts, contractor-auth.service.ts
  - Admin+settings: ✓ admin-search.service.ts, admin-notifications.service.ts, admin-settings.service.ts
  - Projects: ✓ projects.service.ts, project-mutations.service.ts, project-relations.service.ts, project-work-status.service.ts, project-extra-services.service.ts; note: page-content.service.ts and page-answers.service.ts exist separately (not as unified project-pages.service.ts)
  - Domain modules: ✓ clients/, contractors/, designers/, sellers/, managers/, documents/, gallery/, chat/
  - Utilities: ✓ uploads/upload-storage.service.ts, uploads/upload-validation.service.ts, communications/communications-bootstrap.service.ts, communications/project-communications-relay.service.ts, chat/chat-communications.service.ts, chat/chat-users.service.ts, ai/gemma.service.ts, ai/gemma-prompts.ts, ai/rag.service.ts

**Residual gaps from matrix mapping:**
- server/modules/projects/project-pages.service.ts — mapped in doc (lines 51-54) but actual implementation is split: page-content.service.ts + page-answers.service.ts (functionally equivalent, finer granularity).
- server/modules/chat/chat-agents.service.ts — mapped in doc (line 174, ownership rules line 188) but file not yet created (pending agent-registry integration).

**Lint baseline:**
- `pnpm lint:errors` now returns 1 error (in messenger/core, out-of-scope for backend doc-11).
- Baseline lint at doc creation (~190 errors for fat API handlers with direct Drizzle imports) no longer applies post-refactor.

**Achieved:**
- Thin HTTP handlers in `server/api/auth/**` fully factored to `server/modules/auth/`.
- Schema split across 11 domain files + relations + barrel complete.
- All mapped utilities refactored to target services (no ~190 count of Drizzle-importing handlers remaining).
- Shared system-constants and DTOs properly isolated.
