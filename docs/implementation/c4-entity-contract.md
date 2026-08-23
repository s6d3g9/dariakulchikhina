# С4 · Контракт Entity и провайдера (архитектор → Codex)

## Тип Entity (packages/shell-panels/entity.ts — НОВЫЙ, чистый TS, ноль Vue)

```ts
export interface EntityFieldValue { key: string; label: string; value: string | number | null; }
export interface EntitySection {
  key: string;                 // из sectionsSchema card-type
  title: string;
  role: 'identity'|'status'|'timeline'|'stream'|'actions'|'evidence'|'inversion';
  fields: EntityFieldValue[];
}
export interface Entity {
  id: string;
  kind: string;                       // card-type key, напр. 'person-profile'
  view: 'instance' | 'type';
  title: string; subtitle?: string;
  classId?: string;                   // entity class World Model
  axes?: Record<string, string[]>;    // axis facets из world-model API
  sections: EntitySection[];          // строго 6, порядок header→timeline→summary→actions→sections→footer
  panels: { top: PanelDescriptor; left: PanelDescriptor; right: PanelDescriptor; bottom: PanelDescriptor };
  modes: string[];                    // допустимые mode для текущего view
  linkedId?: string;                  // id парного view (instance⇄type)
}
export interface PanelDescriptor { title: string; contentKind: string; items: Array<{primary: string; secondary?: string}> }
```

## Провайдер (apps/shell-web/app/providers/refactor-provider.ts)

```ts
export interface EntityProvider {
  getEntity(kind: string, id: string, view: 'instance'|'type'): Promise<Entity>;
}
// Реализация refactorProvider:
// - instance: GET {apiBase}/agents/{id} → маппинг agentToEntity(agent, schema=person-profile schema.data.json):
//   заполнить sections.instance полями из фикстур-маппинга: header{name←agent.name, role←agent.role, project←agent.projectName},
//   timeline{создан, последняя активность}, summary{model, статус}, actions — ключи из схемы,
//   sections — счётчики если есть, footer{id-чипы}. Отсутствующее поле → value null (НЕ выдумывать).
// - type: person-profile type-view = данные из world-model API: GET {apiBase}/projects/{projectId}/world-model
//   → класс 'person' → axes → sections.type по схеме; панели из schema.data.json panels.{slot}.type.
// - JWT: Authorization Bearer из localStorage (те же ключи, что messenger-web; найти grep'ом по web/app: 'localStorage' + 'token'); нет токена → throw AuthRequiredError.
```

## Verify С4
unit-тест (vitest) agentToEntity на фикстуре fx-agent-1 из schema.data.json: 6 секций, порядок ролей как в схеме, null для отсутствующих полей; страница /debug/entity?id= рендерит JSON Entity (pre-тег достаточно).
