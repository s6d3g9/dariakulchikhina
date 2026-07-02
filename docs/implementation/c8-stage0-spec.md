# С8 · Этап 0 World Model — спецификация для реализации (архитектор → Codex)

Целевой репозиторий исполнения: /srv/messenger-refactor/core (прод, без git — правки с .bak).
Репетиция: локальный клон core + дамп прод-БД. Эта спека — источник истины пакета С8.

## 1. Таблицы (Drizzle, PostgreSQL 16) — аддитивно, префикс world_model_

```ts
// core/src/db/schema/world-model-store.ts (НОВЫЙ файл; существующие схемы не трогать)
worldModelRecords: {
  id: text PK,                    // "wm:<level>:<scopeSegment>:<key>" — детерминированный
  level: text NOT NULL,           // entity_class|catalog_type|category_family|attribute_definition|relationship_definition|lifecycle|axis_value_extension|unit
  scope: text NOT NULL,           // global|pack|project
  projectId: uuid NULL,           // NULL для global/pack
  key: text NOT NULL,             // PROJECT_WORLD_MODEL_KEY_PATTERN (существующий)
  classId: text NULL, familyKey: text NULL,
  payload: jsonb NOT NULL,        // канонический конверт WorldModelCanonicalRecord
  fingerprint: text NOT NULL,     // sha256(classId|normalize(labels.default)|sortedIdentifiers)
  version: integer NOT NULL DEFAULT 1,
  batchId: text NOT NULL,
  status: text NOT NULL DEFAULT 'draft',        // draft|active|archived|merged
  reviewStatus: text NOT NULL DEFAULT 'staged', // staged|normalized|deduplicated|review_required|approved|runtime_ready
  createdAt, updatedAt: timestamptz
}
// УНИКАЛЬНЫЙ ИНДЕКС: (scope, coalesce(projectId,'00000000-0000-0000-0000-000000000000'), level, key)
// ИНДЕКСЫ: GIN(payload), btree(fingerprint), btree(batchId)

worldModelIdentifiers: { recordId FK→records.id ON DELETE CASCADE, scheme text, value text, PK(recordId,scheme,value), INDEX(scheme,value) }
worldModelBatches: { batchId text PK, familyKey text NULL, manifest jsonb, result jsonb NULL, appliedAt timestamptz NULL, createdAt }
worldModelReviewTasks: { id uuid PK default, recordId FK, kind text, // approve_entry|merge|duplicate_suspect|sample_check
  status text default 'open', decision text NULL, decidedBy text NULL, decidedAt NULL, evidenceRefs jsonb, createdAt }
worldModelMergeRecords: { id uuid PK, survivorId text, mergedId text, score numeric, survivorship jsonb, decidedBy text, decidedAt }
worldModelAuditEvents: { id bigserial PK, recordId text, fromStatus text NULL, toStatus text, actor text, batchId text NULL, at timestamptz default now() }
// audit: append-only — REVOKE UPDATE, DELETE ON world_model_audit_events, world_model_records-постинги не трогаем (их нет), merge/records мутируются только через сервис
```

## 2. Ворота (scripts/world-model-batch-lint.mjs) — G1/G2/G3-точное/G4-минимум

Вход: `node scripts/world-model-batch-lint.mjs <dir>` где dir содержит manifest.json + records.jsonl.
Выход: exit 0 + отчёт JSON в stdout `{ok, checked, rejected:[{key, gate, reason}]}`; exit 1 если rejected>0.

- G1 (схема): zod-валидация конверта: {id, level∈enum, key соответствует паттерну, labels.default непустой, для scope=global labels.ru И labels.en непустые, meta{version:int≥1, fingerprint:hex64, batchId, generator∈fable|human|import|glm, sources:[]≥1, provenance{method,actor}}}; classId/familyKey/relations[].targetKey обязаны резолвиться: в реестр констант core (WORLD_MODEL_* экспорты), в текущий батч, или быть объявлены в manifest.pendingRefs[].
- G2 (семантика): payload.axisDefaults: каждый ключ ∈ WORLD_MODEL_AXES[].key И каждое значение ∈ values этой оси; identifiers[].scheme ∈ {gtin,sku,etim,vin,cadastral,isbn,ifc_guid}; gtin — контрольная цифра.
- G3 (дедуп, точная часть): (a) совпадение (scheme,value) c worldModelIdentifiers → reject reason 'duplicate_identifier' (авто-merge в С8 НЕ реализуем — только reject с указанием existingId); (b) fingerprint совпал и payload идентичен → пометить skippedNoop (не reject); fingerprint совпал, payload отличается → 'needs_new_version' (аплаер сделает version++). Trigram-каскад — СЛЕДУЮЩИЙ этап, в С8 не делать.
- G4 (минимум): meta.sources[].confidence ∈ {low,medium,high}; при всех low → reviewStatus остаётся staged (не approve).

## 3. Эндпоинт (core, новый роут; существующие 3 world-model роута НЕ трогать)

POST /projects-admin/world-model/import/batches   // глобальный admin (роль admin), НЕ project-scoped
Body: { manifest: {batchId, familyKey?, recordLevels[], count, pendingRefs?[], generator, schemaVersion:1}, records: NDJSON-строкой ИЛИ массивом }
Правила: batchId ОБЯЗАН == sha256(канонизированного records-содержимого) — сервер пересчитывает и сверяет (mismatch → 400 machine-readable);
повторный POST существующего batchId → 200 с сохранённым result (no-op);
транзакция на весь батч; upsert по (scope,projectId,level,key): fingerprint не изменился → skippedNoop; изменился → version++, status='draft', reviewStatus='staged';
каждый insert/update → строка в audit_events; ответ: {applied, skippedNoop, rejected:[{key,gate,reason}], reviewQueued}.

## 4. Фикс override-дыры

В существующем пути create/update project override: если override.status==='active' → readiness проставлять 'mapped' (НЕ 'runtime_ready') + создать worldModelReviewTasks(kind='approve_entry'). Смоук это не проверяет (он смотрит layer/kind/domain/pack) — менять его assert'ы ЗАПРЕЩЕНО.

## 5. Verify пакета (обязательные, в этом порядке)

1) локально: pnpm typecheck (core); 2) node scripts/world-model-batch-lint.mjs test-batches/etalon → 10 valid pass, 10 битых reject с разными gate; 3) POST батча дважды → второй раз no-op; 4) pnpm ui:studio-crm-contract:check; 5) scripts/world-model-project-smoke.sh — зелёный БЕЗ правок его assert'ов.

## 6. Красные линии С8
Не переписывать buildProjectWorldModelState; не менять форму его агрегата; catalog_types в толстый GET не добавлять; timestamps как batchId запрещены; миграции только аддитивные; в Drizzle-запросах inArray, НЕ ANY(...::uuid[]).
