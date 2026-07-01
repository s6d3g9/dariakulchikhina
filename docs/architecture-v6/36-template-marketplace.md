# 36. Template Marketplace

Templates в v6 — это publishable Pattern-Card'ы (рецепты поездок, готовые компоненты, курсы, планы, игровые сценарии). Marketplace — **плоскость discovery + curation + ranking**. Не отдельный сервис, а **mode type-view** для templates.

См. также: `11-creator-economy.md`, `12-pattern-composition.md`, `32-authorship-algorithms.md`, `16-search-and-navigation.md`, `23-ai-assistance.md`.

## 1. Что это не

- Не отдельный сервис (используется `pattern-engine` + `authorship-registry` + `search` + `recommendations`).
- Не отдельный shell-экран. Mode=`marketplace` у type-view template'ов.
- Не замена catalog-listing — любой template доступен через search, marketplace — куратed подборка.

## 2. Что это

Marketplace-mode type-view `pattern-template` карточки, который показывает:

- **Discovery** — trending / new / editorial-pick / по категориям.
- **Curation** — staff-picks + community-curated лист.
- **Quality signals** — rating, reviews, usage-stats, royalty-volume.
- **Social proof** — количество fork'ов, subscribers, покупок.
- **Author profile** — mini-card автора с inversion'ом в его full profile.

## 3. Discovery-правила

Единый ranking-алгоритм через `services/recommendations`:

### Signals (weighted)

```
final_score = 
    0.25 * quality_score        // ratings × reviews-verified × refund-rate^-1
  + 0.20 * engagement           // log(purchases + forks + subscriptions)
  + 0.15 * recency              // recency-boost (newer = +, decay 90 дней)
  + 0.15 * personalization      // user-embedding × template-embedding
  + 0.10 * diversity            // anti-filter-bubble penalty
  + 0.10 * editorial            // manually curated boost
  + 0.05 * creator-tier         // verified / senior creators boost
```

Boosts:
- Новые авторы (first 10 templates) — получают fair exposure (+10% в первые 30 days).
- Local relevance: user-region × template-locale = +5%.
- Language match: user-lang in template-lang = +5%.

Penalties:
- Negative reviews burst → temp down-rank until moderated.
- Policy-flagged content → не показывается (deny).
- Refund-rate > 15% → penalty.

## 4. Категории и теги

- **Верхнеуровневые категории**: Travel / Fitness / Education / Home / Creative / Business / Personal-dev / Gaming / ... (ограниченный список, ~30).
- **Теги** — свободные ключевые слова (moderated).
- **Kind-filter**: per-card-type (только `trip-compound`, только `course`, ...).
- **Price-filter**: free / paid / subscription.
- **License-filter**: CC0 / Royalty-Fork / Commercial / ...

Категории — managed metadata, теги — user-generated (с moderation на spam).

## 5. Editorial curation

Специальная role **editor** может:
- Назначить template «staff pick» (boost).
- Собрать **collection** (curated list): «Top путеводители по Стамбулу», «Лучшие Python-кодomodules для ML».
- Поставить badge (`staff-pick`, `trending`, `new-voice`).
- Комментировать: add editorial review blurb.

Editorial decisions — через `disputes`-подобный flow с audit (I17). Нельзя вручную menthрежи ranking без записи.

## 6. Quality signals

### Ratings & reviews

- Post-use rating (5-star) + text review.
- **Только verified users** (у кого есть purchase/subscription/fork этого template).
- Reviews модерируются (`33-content-moderation.md`).
- Spam-reviews / brigading detected через trust-safety.

### Usage stats (public)

- Total forks / purchases / subscribers (округлённо).
- Active users last 30d.
- Average completion rate timeline'а (для process-templates).

### Refund rate (private, внутренний)

- Используется в ranking penalty, не показывается public'но (unless > 20%).
- Threshold detection — alert в moderation для review.

## 7. Attribution и fork-graph визуализация

На marketplace-mode:
- **Lineage breadcrumbs**: «This is forked from `<parent-template>` by `<author>`».
- **Forks count**: «142 forks»
- **Descendants graph** (optional popup): визуальный граф fork-дерева.
- **Royalty flow** (для верифицированных creators): показывает автору, куда уходит его royalty при fork'ах.

## 8. Acquisition flows

### For free (CC0/CC-BY/MIT)

1. Tap CTA «Use» → materialize template → new instance Pattern-Card в user'а.
2. Нет charge.
3. Attribution auto-added (если license требует).

### For fork-with-royalty

1. Tap CTA «Fork» → materialize как fork с lineage-link на parent.
2. Royalty будет распределяться при любой будущей monetization fork'а.
3. User предупреждается о policy при fork.

### For purchase (Commercial-1x)

1. Tap CTA «Purchase» ($X).
2. Payment через `payments` + `wallet`.
3. Royalty distribution (`32-authorship-algorithms.md`).
4. Materialize.

### For subscription

1. Tap CTA «Subscribe» ($X/month).
2. Subscription created (`31-subscription-lifecycle.md`).
3. Access till expires.
4. Can materialize during subscription.

## 9. Anti-abuse

- **Self-buying** (автор покупает свой template для ranking-манипуляции) — detected через velocity + same-device.
- **Fake fork-chains** (boost lineage-royalty) — limited rules: fork должен иметь значимые changes, иначе flag.
- **Review bombing** — rate-limit + trust-safety signals.
- **Stolen content** (другой autor без credit) — detected через content-hash matching, dispute process.

## 10. Marketplace как Pattern-Card mode

Когда user нажимает «browse templates» из switcher'а:
- Shell opens focus = `{kind: 'pattern-template', view: 'type', mode: 'marketplace'}`.
- Это **тот же** `type-view` template'а, но с mode-specific секциями:
  - Top: featured / editorial.
  - Left: categories filters.
  - Right: recommendations.
  - Bottom: activity feed (new publishes, trending).
  - Center: grid of templates.
- Click на template → focus switches to конкретному template, view=`type`, mode=`marketplace`.

Fractal: marketplace — это **режим**, не новый экран.

## 11. Creator dashboard mode

Когда автор открывает свой template (instance-view owner):
- Mode=`creator`.
- Left: royalty-dashboard, breakdown по времени.
- Right: reviews queue, appeals.
- Top: performance metrics (views, conversions).
- Bottom: tips для improvement.

Тот же CardView, другой mode. Не отдельный admin-экран.

## 12. Metrics

- `marketplace.views{category,template}` — browse-rate.
- `marketplace.conversion{action=fork|purchase|subscribe,template}`.
- `marketplace.time-to-first-purchase` от discovery до acquisition.
- `marketplace.creator-concentration` — Gini coefficient (wealth distribution среди creators).
- `marketplace.new-creator-debut-to-first-sale` — how fast new creators monetize.

Goals — не cconcentrate 80% revenue у top-20 creators. Exposure rules прописаны в ranking.

## 13. Compliance

- **VAT / tax** обрабатывается в `payments` + `wallet` на момент purchase.
- **Tax reporting** для creators: threshold notifications для 1099 / 2-НДФЛ equivalents.
- **Withholding** для cross-border payouts — per-jurisdiction.
- **Digital goods** — per-EU legal disclosure требования.

## 14. Антипаттерны

- ❌ Отдельный marketplace-service. Это mode существующих card-types.
- ❌ Ranking-переопределения admin'ом без audit.
- ❌ Hidden boosts для paid placements без disclosure (regulator, UX integrity).
- ❌ Reviews от unverified users.
- ❌ No fair-exposure для новых creators — winner-takes-all dynamics.
- ❌ Ranking не объяснимый (нельзя aнализировать, почему template вверху).
- ❌ Marketplace UI не фрактальный (свой layout vs `CardView`).
