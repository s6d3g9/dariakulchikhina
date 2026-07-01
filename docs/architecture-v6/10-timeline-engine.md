# 10. Timeline Engine

Единый механизм жизненного цикла **любого** действия в системе: от записи ко врачу до покупки дома, от бронирования поездки до ведения беременности. Всё — один формат, одни шаги, один визуальный контракт.

## 1. Зачем

Пользователь должен видеть **roadmap** любого своего дела: где начали, где сейчас, что впереди, что уже пройдено. Без отдельных UI под каждую вертикаль.

Требование UX: timeline — **всегда видим** как отдельная секция центральной карточки. У каждой активной Pattern-Card есть timeline, у завершённой — архивный timeline.

## 2. Базовый формат

```
[Initiation] → [Step 1] → [Step 2] → ... → [Step N] → [Completion]
                           ↓
                       [Sub-step 2.1 (nested Pattern-Card)]
                       [Sub-step 2.2]
```

Каждый узел timeline — это **TimelineStep** с жёсткой структурой:

```ts
interface TimelineStep {
  id: string
  kind: 'auto' | 'human' | 'external' | 'gate' | 'compound'
  status: 'pending' | 'active' | 'waiting' | 'done' | 'failed' | 'skipped' | 'cancelled'

  // Семантика
  title: string                      // "Оплата", "Подтверждение оператора", "Инспекция автомобиля"
  owner: 'user' | 'counterparty' | 'system' | 'regulator'
  eta?: { planned?: Date, expected?: Date, deadline?: Date }

  // Исполнение
  workflow?: { temporalRunId?: string }  // связь с Temporal
  handler?: string                        // service + endpoint для auto
  humanAction?: HumanActionSpec          // для human: "нажми кнопку", "подпиши документ"
  gate?: GateSpec                        // для gate: условие разблокировки

  // Композиция
  nested?: TimelineRef                   // если step — отдельная Pattern-Card
  compensate?: string                    // handler для rollback (saga)

  // Observability
  events: TimelineEvent[]                // лог того, что произошло в шаге
  evidence?: Evidence[]                  // артефакты: документы, фото, подписи, транзакции
}
```

## 3. Пять типов шагов

| Kind | Описание | Пример |
|---|---|---|
| `auto` | Выполняется сервисом без участия человека | Списание с wallet, отправка уведомления |
| `human` | Требует действия пользователя или контрагента | Подпись документа, загрузка паспорта, принятие оффера |
| `external` | Ждёт события из внешней системы | Подтверждение GDS, приход on-chain транзакции |
| `gate` | Условная точка: разблокирует следующие шаги при выполнении правил | KYC Level ≥ 2, совершеннолетие, проверка лицензии |
| `compound` | Вложенная Pattern-Card (rekurzivный timeline) | «Бронирование трансфера» внутри Travel-компаунда |

## 4. Runtime — Temporal

`services/timeline-engine` — обёртка над Temporal, которая:

1. Превращает декларативное описание timeline → Temporal workflow.
2. Хранит стейт в Postgres (durable + queryable для UI).
3. Публикует события в NATS JetStream на каждый переход статуса.
4. Переигрывает шаги идемпотентно (retry-safe, инвариант I16).
5. Поддерживает compensating actions (sagas) при откате.

Почему Temporal: durable execution из коробки, long-running процессы (беременность — 40 недель, mortgage — 20+ лет), history + replay для аудита.

## 5. Описание timeline у card-type

Каждый card-type декларирует **шаблон timeline** в `timeline.ts`:

```ts
// packages/card-types/flight-ticket/timeline.ts
import { defineTimeline } from '@daria/timeline-engine'

export default defineTimeline({
  kind: 'flight-ticket',
  steps: [
    { id: 'search',     kind: 'auto',     title: 'Поиск рейсов' },
    { id: 'select',     kind: 'human',    title: 'Выбор варианта' },
    { id: 'passengers', kind: 'human',    title: 'Данные пассажиров' },
    { id: 'kyc-gate',   kind: 'gate',     title: 'Идентификация',
                        gate: { require: 'kyc.level>=1' } },
    { id: 'payment',    kind: 'auto',     title: 'Оплата',
                        compensate: 'refund' },
    { id: 'booking',    kind: 'external', title: 'Бронирование в GDS',
                        compensate: 'gds-cancel' },
    { id: 'ticketing',  kind: 'external', title: 'Выписка билета' },
    { id: 'checkin',    kind: 'human',    title: 'Онлайн-регистрация',
                        eta: { deadline: 'departure - 24h' } },
    { id: 'boarding',   kind: 'external', title: 'Посадка',
                        eta: { expected: 'departure - 30m' } },
    { id: 'flight',     kind: 'external', title: 'Перелёт' },
    { id: 'arrival',    kind: 'auto',     title: 'Прилёт' },
  ],
  completion: { on: 'arrival.done' },
})
```

## 6. Композиция — travel-пример

`trip-compound` — Pattern-Card, чей timeline состоит из **вложенных** timelines других card-types:

```
Trip to Turkey
├── Initiation (planning)
├── flight-ticket.timeline         (compound step)
├── airport-transfer.timeline      (compound step)
├── hotel-room.timeline            (compound step, parallel with next)
├── restaurant-booking.timeline    (compound step, multiple)
├── car-rental-short.timeline      (compound step)
├── activities (many)              (compound steps)
└── Completion (return home)
```

Открыл Trip — видишь мастер-roadmap. Ткнул в любой compound step — раскрывается детальный timeline под-карточки (flight с посадкой, hotel с check-in'ом, etc.).

**Правило композиции**: `compound`-шаг хранит только **ссылку** на nested Pattern-Card (инвариант I7 sagas), а не копию данных. Это позволяет пересобирать компаунды без инвалидации вложенных карточек.

## 7. Long-running wellness и chronic-care

`pregnancy-tracker`:

```
Week 1 → ... → Week 12 (screening gate) → ... → Week 20 (ultrasound) → ...
→ Week 36 (readiness gate) → Week 40 → Birth (completion)
```

Timeline-engine не сгибается от длительности: Temporal replay гарантирует durable state. Для wellness дополнительно:

- **Milestone-шаги**: не привязаны к конкретной дате, а ждут событий (например, «прошло УЗИ»).
- **Notifications-хуки**: policy-engine определяет что и когда напомнить.
- **Privacy-scope**: медицинский timeline виден только владельцу + кого он явно добавил.

## 8. Gate'ы и governance

`gate`-шаг — интеграционная точка с `policy-engine`:

```ts
{ id: 'age-gate', kind: 'gate',
  gate: { require: 'user.age >= region.minimumAgeFor("alcohol-purchase")' } }
```

Policy-engine отвечает `allow | distill | deny`. Timeline переходит на следующий шаг только при `allow`. `distill` может попросить разблокировку частично (например, показать только некоторые опции). `deny` переводит timeline в `cancelled` с reason.

## 9. UX-контракт timeline (фрактальный)

Timeline — **одна и та же** секция `CardTimeline` из `packages/ui-react`, используется для машины, курса, беременности, покупки дома, форка шаблона. Отличается только данными.

- **Горизонтальная шкала**: слева pending, посередине active, справа done.
- **Цветовая семантика**: только семантические токены (neutral / in-progress / success / warning / danger — см. `17-fractal-ux.md` §8).
- **Нажатие на шаг**: раскрывает детали + evidence + events лог — в том же стиле `Section → Item → Field`.
- **Вложенные timelines** (compound): зум-ин навигирует к child-карточке, где её timeline — снова та же секция.
- **Timeline-switcher**: переключение active/archived — это `ModeToggle`, а не новый custom-компонент.
- **Расположение в CardView**: сразу под HEADER, выше SUMMARY (см. `17-fractal-ux.md` §5).

Инвариант I21: timeline **обязателен** для любого card-type. Если нет реального процесса — минимальный вариант `created → active → archived`. Отсутствие секции — CI-fail.

## 10. Evidence и audit

Каждый done-шаг может иметь `evidence[]`:

- Документы (паспорт, договор, справка)
- Фотографии (до/после ремонта, инспекция машины)
- Электронные подписи
- On-chain transaction hash (для NFT-mint'ов)
- PDF чеки, PNR-коды, подтверждения

Evidence хранится в `media-pipeline` (S3-compat), метаданные — в БД timeline-engine. Публикация в `audit-log` — автоматически при добавлении (инвариант I17, WORM).

## 11. API-контракт (для UI и других сервисов)

```
GET  /timeline/{id}                           # полный timeline с nested
GET  /timeline/{id}/stream                    # SSE-стрим изменений статуса
POST /timeline/{id}/steps/{stepId}/submit     # для human-шагов
POST /timeline/{id}/cancel                    # с compensating cascade
GET  /users/{id}/timelines?status=active      # список активных у пользователя
```

## 12. Антипаттерны

- ❌ Хранить бизнес-логику шагов в клиенте. Клиент — только trigger для `submit`.
- ❌ Skip шагов без `skipReason` + audit-записи.
- ❌ Разветвлять timeline по гео/возрасту хардкодом — только через `gate + policy-engine`.
- ❌ Копировать данные из nested timeline в родительский — всегда ссылка.
- ❌ Использовать обычные cron-джобы для timeline-шагов — только Temporal.
