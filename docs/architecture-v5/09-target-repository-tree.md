# 9. Полный целевой каркас репозитория

Это краткий, но полный target-tree, по которому мы будем делать рефакторинг. Он фиксирует **основные новые директории и обязательные точки входа**, а детальная миграция описана в документах 10–13.

## Принципы

1. Публичные URL и API на первых этапах не ломаем.
2. `app/` режется по FSD: `core -> shared -> entities -> features -> widgets -> pages`.
3. `server/` режется по DDD-lite: `api -> modules -> db -> utils`.
4. `shared/` становится единственным source of truth для DTO, констант и pure-utils.
5. `messenger/` и `services/communications-service` остаются отдельными runtime-контурами.

## Target tree

```text
dariakulchikhina/
├── app/
│   ├── core/
│   │   ├── api/
│   │   ├── auth/
│   │   ├── design-system/
│   │   ├── realtime/
│   │   └── state/
│   ├── shared/
│   │   ├── composables/
│   │   └── ui/
│   │       ├── buttons/
│   │       ├── feedback/
│   │       ├── forms/
│   │       ├── navigation/
│   │       ├── overlays/
│   │       └── surfaces/
│   ├── entities/
│   │   ├── admin-navigation/
│   │   ├── agents/
│   │   ├── app-blueprint/
│   │   ├── communications/
│   │   ├── contractors/
│   │   ├── design-system/
│   │   ├── designers/
│   │   ├── directories/
│   │   ├── gallery/
│   │   └── materials/
│   ├── features/
│   │   ├── admin-search/
│   │   ├── auth/
│   │   ├── entity-create/
│   │   ├── page-content/
│   │   └── ui-editor/
│   ├── widgets/
│   │   ├── cabinets/
│   │   ├── client-cabinet/
│   │   ├── documents/
│   │   ├── gallery/
│   │   ├── materials/
│   │   ├── phases/
│   │   ├── project-cabinet/
│   │   └── shells/
│   ├── layouts/
│   ├── middleware/
│   ├── pages/
│   └── plugins/
├── server/
│   ├── api/
│   │   ├── admin/
│   │   ├── ai/
│   │   ├── auth/
│   │   ├── chat/
│   │   ├── clients/
│   │   ├── contractors/
│   │   ├── designers/
│   │   ├── documents/
│   │   ├── gallery/
│   │   ├── managers/
│   │   ├── projects/
│   │   ├── sellers/
│   │   └── suggest/
│   ├── modules/
│   │   ├── admin/
│   │   ├── admin-settings/
│   │   ├── agent-registry/
│   │   ├── ai/
│   │   ├── auth/
│   │   ├── chat/
│   │   ├── clients/
│   │   ├── communications/
│   │   ├── contractors/
│   │   ├── designers/
│   │   ├── documents/
│   │   ├── gallery/
│   │   ├── managers/
│   │   ├── projects/
│   │   ├── sellers/
│   │   ├── suggest/
│   │   └── uploads/
│   ├── db/
│   │   ├── index.ts
│   │   ├── migrations/
│   │   └── schema/
│   ├── middleware/
│   ├── plugins/
│   └── utils/
├── shared/
│   ├── constants/
│   │   ├── design-system/
│   │   ├── navigation/
│   │   ├── profile/
│   │   └── system/
│   ├── types/
│   │   ├── agent-chat/
│   │   ├── auth/
│   │   ├── communications/
│   │   ├── contractor/
│   │   ├── design-system/
│   │   ├── designer/
│   │   ├── gallery/
│   │   ├── navigation/
│   │   └── project/
│   └── utils/
│       ├── communications/
│       ├── designer/
│       ├── project/
│       └── ui/
├── messenger/
│   ├── core/
│   │   └── src/
│   │       ├── agents/
│   │       ├── auth/
│   │       ├── calls/
│   │       ├── contacts/
│   │       ├── conversations/
│   │       ├── crypto/
│   │       ├── media/
│   │       ├── profile/
│   │       ├── project-engine/
│   │       ├── realtime/
│   │       └── transcription/
│   └── web/
│       └── app/
│           ├── core/
│           ├── shared/
│           ├── entities/
│           ├── features/
│           ├── widgets/
│           └── pages/
├── services/
│   └── communications-service/
│       └── src/
│           ├── auth/
│           └── store/
├── scripts/
├── docs/
│   ├── architecture-v5/
│   ├── messenger/
│   └── rag/
└── public/
```

## Обязательные новые файлы первого этапа

- `ecosystem.refactor.config.cjs`
- `messenger/ecosystem.refactor.config.cjs`
- `app/shared/ui/**`
- `app/entities/admin-navigation/**`
- `app/entities/design-system/**`
- `server/modules/auth/**`
- `server/modules/projects/**`
- `server/db/schema/relations.ts`
- `shared/constants/system/{roles,status-colors,websocket-events}.ts`

Если смотреть практично, этот target-tree уже достаточно точен, чтобы начать Wave 1 и Wave 2 без придумывания новых директорий на ходу.

## Current Status vs Target (2026-04-20)

- Status source: `15-target-alignment-audit.md` (статус: **Aligned**).
- Все контуры (`app`, `server`, `shared`, `messenger`, `services`) приведены к целевой раскладке.
- Правило интерпретации: этот файл фиксирует целевую структуру; фактический operational-log батчей ведётся в `14-refactor-roadmap.md`.
