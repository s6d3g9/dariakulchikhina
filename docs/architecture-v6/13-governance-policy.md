# 13. Governance и Policy-Engine

v6 работает в разных юрисдикциях, с разными возрастами и regulatorикой, одновременно. Вместо форков кода под каждую страну — **runtime policy evaluation**. Policy-engine — это сервис, к которому любой card-type, примитив или panel-provider обращается с вопросом: «можно ли этому пользователю сделать это действие здесь и сейчас?».

## 1. Три возможных ответа

```
allow   — действие разрешено
distill — действие разрешено частично (с маскировкой полей, скрытием опций, ограниченной функциональностью)
deny    — действие запрещено, причина объяснена
```

**Инвариант (I8)**: никакое geo/age/юрисдикционное ограничение не реализуется как `if (country === 'RU')`-разветвление в коде. Только через policy-engine.

## 2. Политика как декларативное правило

Формат — OPA (Rego) под капотом, но для авторов плагинов — более простой DSL:

```yaml
# policies/alcohol-purchase.yaml
id: alcohol-purchase
version: 1
description: Продажа алкогольных позиций

rules:
  - when:
      user.age: '< region.legalAlcoholAge'
    effect: deny
    reason: UNDERAGE

  - when:
      region.code: { in: ['SA', 'IR', 'KW', 'LY'] }   # dry states
    effect: deny
    reason: REGION_PROHIBITS

  - when:
      time.localHour: { between: [region.alcoholBan.from, region.alcoholBan.to] }
    effect: distill
    mask: ['alcohol-items']
    reason: LOCAL_HOUR_BAN

  - default: allow
```

## 3. Где policy-engine вклинивается

Четыре точки зацепления:

1. **Card-type rendering** — panel-provider вызывает `policy.evaluate(ctx)` → скрывает секции по `distill.mask`.
2. **Timeline gate-шаг** — `gate.require` резолвится policy-engine'ом (см. `10-timeline-engine.md` §8).
3. **Search и feed** — `recommendations` и `search` фильтруют результаты через policy (регион не видит товары, которые ему нельзя).
4. **API-middleware** — gateway + каждый сервис делают финальную serverside-проверку перед мутацией. Frontend distill — это UX, не security.

## 4. Context для evaluation

```ts
interface PolicyContext {
  user:   { id, age?, roles, kyc: { level }, credentials: Credential[] }
  region: { code, tz, language, lawProfile: LawProfile }
  action: { type, resource, meta }
  time:   { utc, local, hour, dayOfWeek }
  device: { platform, countryFromIP, vpnDetected }
  entity?: { kind, id, ownerId, tags }
  policyTags: string[]   // набор тегов политик, применимых к action
}
```

`region.lawProfile` — агрегат законов (минимальный возраст для разных действий, запрещённые категории, обязательные раскрытия). Хранится как data-pack в `platform/law-profiles/`, обновляется legal-командой, не разработчиками.

## 5. Distill — как маскируется контент

Distill — ключевая оптимизация, чтобы **одна и та же клиентская версия** обслуживала все регионы:

- Скрытие отдельных card-types в switcher'е (крипта в КНР — невидима).
- Скрытие отдельных card-items в feed (NSFW в SA — исключён).
- Замена CTA (в регионе, где запрещена продажа — показать только read-only).
- Переопределение defaults (минимальный возраст регистрации).
- Локализация evidence (тип документа — паспорт vs ID).

Distill описывается в политике полями:
```yaml
effect: distill
mask:        ['alcohol-items', 'gambling-*']
replace:
  'cta.buy': 'cta.info-only'
require:
  'disclosure.legal': 'ru-ad-disclaimer'
```

## 6. Age-gates

Age — один из самых частых триггеров. Policy-engine агрегирует:

- Возраст пользователя (из identity verified credentials).
- Минимальный возраст региона для action-type.
- Согласие родителя (если есть механизм — для подростковых сервисов).

Результат: card-type `dating` недоступен подростку в EU, но доступен совершеннолетнему; `event-ticket` на 18+ концерт — проверка возраста покупателя.

## 7. KYC-уровни как градиент

| Level | Проверено | Доступные действия |
|---|---|---|
| 0 | Email / phone | Browse, чаты, подписки бесплатные |
| 1 | Имя + DoB + страна | Бронь отеля, покупка билетов до N $ |
| 2 | Паспорт + selfie + liveness | Покупка недвижимости-просмотр, аренда авто, финансы до X $ |
| 3 | Адрес + доход + source-of-funds | Ипотека, крупные покупки, криптобиржа |
| 4 | Enhanced + on-site | Бизнес-аккаунт, высокие лимиты, банкинг |

Policy-engine применяет KYC-пороги per-action. Level — это не boolean, а градиент (инвариант «градиент, а не boolean» из исходного дизайна).

## 8. Credentials-vault + policy

`credentials-vault` хранит верифицированные документы:
- Водительские права (категории)
- IYT/ICC лицензии (яхты)
- PADI (дайвинг)
- Мед допуски (пилотаж, экстрим)
- Родословные (питомцы)
- Вакцинации (питомцы, путешествия)
- Образовательные сертификаты (учителя, фитнес-тренеры)

Policy-engine читает credentials при evaluation gate'ов: «можно арендовать яхту без капитана? — нужен IYT Coastal».

## 9. Audit каждого policy-решения

Каждый `evaluate()` → запись в `audit-log` через JetStream:

```
app.daria.governance.policy-evaluated.v1
{
  userId, action, resource, decision, reason, policyId, policyVersion, contextHash
}
```

Позволяет:
- Объяснить пользователю, почему отказано.
- Провести back-trace при споре.
- Provizовать compliance (регуляторы могут запросить доказательство).

## 10. Law-profiles как data, не код

`platform/law-profiles/` — один YAML на регион:

```yaml
# platform/law-profiles/RU.yaml
region: RU
legalAges:
  alcohol: 18
  gambling: 21
  marriage: 18
  drivingCategory:
    A: 18
    B: 18
    Motorcycle-A1: 16
prohibited:
  - 'crypto-exchange-retail'   # статус регулярки на дату
  - 'psychedelic-substances'
financialLimits:
  cross-border-remittance: { annual: 10000, currency: USD }
dataRetention:
  user-data:     '5y'
  financial-log: '5y'
  medical-data:  '10y'
disclosures:
  advertising:   'ru-ad-disclaimer'
  crypto:        'ru-crypto-warning'
```

Обновление law-profile — это PR **без кодовых изменений**, который проходит compliance-ревью и применяется через feature-flag roll-out.

## 11. Policy-authoring flow

1. Compliance-команда пишет/обновляет YAML.
2. CI валидирует синтаксис + сверяет с существующими политиками (no contradictions).
3. Политика деплоится через Argo CD, попадает в `policy-engine`.
4. Rolling-out через `feature-flags` (10% → 50% → 100%).
5. Metrics: сколько `deny` / `distill` vs `allow` по action-type. Алерты на аномалии.

## 12. Performance

- Evaluate — p99 < 5ms.
- Политики компилируются в in-memory WASM (OPA Wasm) один раз, reloaded on update.
- Кеш решений — только для detericer читающих политик (`action.type: 'view'`). Mutations — всегда свежее решение.
- Batch-evaluate API для списков (feed-фильтрация).

## 13. Composability и конфликт правил

- Политики композитны: action может попасть под несколько правил.
- Резолюция: **deny > distill > allow**. Если хоть одно правило — deny, действие запрещено.
- distill-маски **объединяются** (union).
- Все reasons возвращаются пользователю (transparent denial).

## 14. Антипаттерны

- ❌ Хардкод `if country === 'RU'` в card-type или сервисе.
- ❌ Распределение политик по микросервисам — только один policy-engine, single source of truth.
- ❌ Клиентский frontend-гейт без серверной проверки — это UX, не security.
- ❌ Использовать feature-flags для правовых ограничений. Flag — для A/B и постепенного выкатывания. Правовое — policy-engine.
- ❌ Обновлять law-profile без compliance-ревью.

## 15. Governance-стек целиком

```
audit-log (WORM)
   ↑
   │ policy-evaluated events, moderation decisions, dispute rulings
   │
policy-engine     ← law-profiles (data)
   ↑
   │ evaluate() calls
   │
moderation-ml     — контент-триаж (NSFW, spam, harmful)
moderation-review — human-in-the-loop (apellations, edge-cases)
disputes          — арбитраж (commerce, authorship claims, refunds)
trust-safety      — device fingerprint, anti-fraud, anti-bot
```

Все четыре governance-сервиса — **подписчики** на event-log. Card-types и примитивы о них не знают; только публикуют события и принимают решения через policy-engine (инвариант I18).
