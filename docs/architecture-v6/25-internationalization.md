# 25. Internationalization (i18n / l10n)

Платформа мультирегиональная по дизайну. i18n — не надстройка, а инвариант во всех слоях: shell, card-types, events, policy, errors, emails, push, audit.

Пять измерений:
1. **Language** (ru/en/tr/ar/fa/hi/...).
2. **Region** (RU/UZ/EU/TR/...) — влияет на law, currency, tax, compliance.
3. **Timezone** — всё в UTC internally, рендерим в локальной.
4. **Currency** — multi-currency wallet, display per user.
5. **Direction** (LTR / RTL) — арабский, иврит, персидский, урду.

## 1. Разделение концептов

Важно не смешивать:

| Концепт | Пример | Хранится в |
|---|---|---|
| **Language** (user-preference) | «читать на ru» | `identity.user.preferences.lang` |
| **Device locale** (system) | `tr-TR` | detected client-side |
| **Region** (user-primary) | «я резидент RU» | `identity.user.region`, KYC-verified |
| **Region** (physical) | IP-GeoLocation | derived, trust low |
| **Currency** (displayed) | «показывай в USD» | `identity.user.preferences.currency` |
| **Currency** (transaction) | tx in RUB | `wallet.transfer.currency` |
| **Timezone** | `Europe/Moscow` | `identity.user.preferences.tz` |

Policy-engine знает все пять; card-types получают готовый `ctx.i18n` и не сами детектят.

## 2. i18n в shell (apps/shell-*)

- **Translation files** — JSON per-language в `packages/i18n/<lang>.json`.
- **Translation runtime** — `react-intl` / `i18next`, SSR-ready в Next.js.
- **Fallback chain** — user-pref → region-default → `en` как last resort.
- **Missing keys** — dev-mode показывает `⚠ KEY_MISSING`, prod — fallback без warn'а.
- **Pluralization** — ICU MessageFormat (поддержка ru 4-х форм, ar 6 форм).
- **RTL**: CSS logical properties (`margin-inline-start` вместо `margin-left`), direction-aware components.
- **Fonts**: per-script fallback stack (Noto Sans CJK / Arabic / etc.).

## 3. i18n в card-types

Card-type **не хардкодит** строки:

```ts
// ❌ плохо
title: 'Моя машина',

// ✅ хорошо
title: t('car.instance.title'),
// где ключ определён в packages/card-types/car/i18n/ru.json, en.json, ...
```

`packages/card-types/<name>/i18n/` — обязательная директория. CI проверяет: для каждой строки, помеченной как i18n, существует хотя бы `en.json` и `ru.json`.

## 4. i18n в services (backend)

### Errors и denials

Сервис **не возвращает** переведённый текст. Возвращает **код + параметры**:

```json
{
  "error": {
    "code": "BOOKING_SLOT_TAKEN",
    "params": { "slotId": "s_123", "takenBy": "another_user" },
    "message_en": "slot already taken"     // fallback для логов
  }
}
```

Клиент (shell) переводит код через `i18n`. Почему: один и тот же error может показываться пользователю / логу / audit / регуляторским отчётам — каждый в своём языке.

### Emails / push / SMS

`services/notifications` — сам пользуется templates per-language:
- `packages/notification-templates/<type>/<lang>/<channel>.mjml`
- Rendering с user-preference-lang + fallback.

### Audit-log

Audit записывает **коды**, не переводы. Регуляторские отчёты переводятся на стороне compliance-tool.

## 5. Timezone discipline

**Железное правило**: internal — UTC, display — local.

- Postgres `timestamptz` (не `timestamp`).
- NATS events — ISO8601 UTC (`time` поле CloudEvent).
- Logs — UTC.
- Audit — UTC.
- UI — конвертация на клиенте с учётом `user.timezone`.
- Timeline steps — `{utc, local_tz}` pair в evidence.

Запрещено сохранять «наивный» datetime без TZ.

## 6. Currency discipline

### Wallet

- Счета per-currency (user.primary×USD, user.primary×RUB).
- Transfer — строго в одной currency (без неявной конвертации).
- Конвертация — отдельный `wallet.convert(from, to)` с чёткой rate-evidence.

### Display

- User выбирает display currency.
- Любое отображение цены — через `<Price amount fromCurrency userCurrency />`.
- Fallback: если конвертация недоступна — показываем в исходной с badge.

### Policy

`platform/law-profiles/<region>.yaml`:
```yaml
preferredCurrency: USD   # default для региона
taxIncluded: true        # цены должны быть с налогом (EU)
priceRounding: 0.99      # .99 стратегия
```

## 7. Region flow

User region:
1. Выбирается при регистрации (honest declaration).
2. KYC-verification (Фаза 4+) подтверждает по документам.
3. IP-geolocation — sanity check, не primary.

Policy-engine использует **verified region** для сильных ограничений (wallet, KYC-gated actions) и **declared / IP** для мягких (language, currency).

## 8. Intl в pattern-templates

Template может быть **локальным** (привязан к региону: «Стамбул-3дня» предполагает TR) или **универсальным** (план фитнеса).

- `template.locale` — опционально: {`language`, `region`, `tz`, `currency`}.
- При fork — user может override.
- При поиске в marketplace — фильтр по локали.

## 9. Multilingual entities

Некоторые entity-type-view (модель машины, курс, бренд) — имеют **многоязычный content**:

```ts
interface MultilingualText {
  default: string                      // en fallback
  ru?: string
  tr?: string
  // ...
}
```

Хранится в поле `Zod.record(ZLang, ZString)`. Rendering выбирает лучший match с fallback.

Автопереводы через `ai-assist` task `translate` — помечаются как `generatedBy: 'ai-assist'` + возможностью human-review.

## 10. RTL — системно

- **CSS**: только logical properties.
- **Icons / ArrowRight / ArrowLeft** — direction-aware.
- **Paragraph dir**: `dir="auto"` на user-generated контент (смешанные языки).
- **Typography**: Cascadia/Inter для LTR, Noto Sans Arabic для RTL + диакритики.
- **Numerals**: default Latin, но policy-engine может требовать Hindu-Arabic (например в AR regions).

Fractal-harness тестирует card-types в обоих направлениях (`dir=ltr` + `dir=rtl`).

## 11. Date / time / number formatting

Всё через Intl API (`Intl.DateTimeFormat`, `Intl.NumberFormat`, `Intl.RelativeTimeFormat`):

```ts
formatDate(utc, { user.locale, user.tz })
formatCurrency(amount, { user.currency, locale })
formatRelative(pastUtc, { user.locale })
```

Единые хелперы в `packages/i18n/helpers.ts`. Нет `moment` / `date-fns` в feature-коде.

## 12. Content moderation и язык

- `moderation-ml` — per-language модели (хотя multilingual LLM-ы покрывают базу).
- Confidence: для low-resource языков (казахский, узбекский) — fallback на human-review чаще.

## 13. Search и язык

- Meilisearch `synonyms` + `stopWords` per-language.
- Query expansion: пользователь ищет «машина» → expand до «car / авто / автомобиль».
- Script detection: Latin / Cyrillic / Arabic / CJK — index-per-script.

## 14. Acid-tests I18n

Добавляются в `21-acid-tests.md`:

- **T13**: смена языка пользователя перерисовывает все панели без reload.
- **T14**: RTL-пользователь видит правильно отражённый layout на `person-profile`, `car`, `trip-compound`.
- **T15**: покупка tpl в EUR пользователем с display=USD → audit в EUR, UI в USD.
- **T16**: timeline-шаги с `deadline` корректно показываются в разных TZ без сдвига.

## 15. Интеграция с fractal-harness

Fractal-harness прогоняет card-types в нескольких комбинациях:
- (lang=en, dir=ltr)
- (lang=ru, dir=ltr)
- (lang=ar, dir=rtl)
- (lang=hi, dir=ltr)

Структурный snapshot не должен меняться.

## 16. Фазы

- **Фаза 0**: `packages/i18n/` + `packages/i18n/helpers.ts`, minimum ru/en, Intl API, utc-discipline.
- **Фаза 3**: RTL-support в shell, первые 2 RTL-языка (ar/fa).
- **Фаза 4**: multilingual entities, auto-translate через ai-assist.
- **Фаза 5**: 10+ языков под mobility-расширение.
- **Фаза 7**: per-script search, voice i18n.

## 17. Антипаттерны

- ❌ Хардкод строк в коде.
- ❌ Сравнение дат/времени в локальном формате.
- ❌ Currency без explicit indication (просто «500» без валюты).
- ❌ CSS `left/right` вместо logical properties.
- ❌ Fallback всегда на English без indication «это не переведено».
- ❌ Автоперевод без badge «machine translated».
- ❌ Единая модель moderation без учёта языка.
