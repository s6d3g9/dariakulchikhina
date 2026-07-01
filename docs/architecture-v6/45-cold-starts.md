# 45. Cold Starts

Как v6 обрабатывает три вида «холодного старта»: новый пользователь, новая вертикаль, новый регион. Цель: быстрое time-to-value, корректные defaults, защитные мехаmism'ы от «пустого состояния».

## 1. Три типа cold starts

| Тип | Что «холодное» | Риск |
|---|---|---|
| **User cold start** | Нет истории, нет preferences | Bad recommendations, irrelevant content |
| **Vertical cold start** | Новая вертикаль без critical mass | Пустые feeds, demoralizing UX |
| **Region cold start** | Новый регион без local content | No locally-relevant templates/listings |

## 2. User cold start

### Day 0: onboarding

```
Signup → language + region + age selected
  ▼
Onboarding flow (3-5 steps):
  1. Language confirm (auto-detected; user can override)
  2. Interests selector: «What are you here for?»
     — Travel / Creative / Health / Shopping / Dating / Work / All
  3. Social-prior connection (opt-in): contacts / Google / Apple / SSO
     → finds friends already on platform
  4. First card-type recommendation based on interests
     (e.g. «Travel selected → open sample trip-compound to explore»)
  5. Optional: add payment method (если user приземлился с link на paid content)
  ▼
Shell opens с sensible defaults:
  - Bottom feed: popular-safe content from declared interests
  - Top stories: platform-wide trending (safe-for-new-user)
  - Left: empty shop with hint «Try creating your first template»
  - Right: empty messenger with «Connect contacts» CTA
  - Center: switcher with highlighted interest-matching card-types
```

### Week 1: warming up

Recommendations начинают personalizeить через:
- Explicit signals (likes, saves, follows).
- Implicit signals (dwell-time, scroll-depth).
- Declared interests (from onboarding).

**Fallback**: если user ничего не делает — show safe-popular content of declared interests + onboarding reminders.

### Month 1: feedback loop

- Re-engagement email / push: «Popular this week in your interests».
- Tutorial-cards для unused features.
- Referral bonus: «Invite a friend, get X».

## 3. Vertical cold start

Когда launch'им новую вертикаль (e.g. dating в Phase 7), первые недели — наслеживать пустоту.

### Strategy: seed content + anchor creators

1. **Seed content** — platform pre-creates templates / listings / examples (10-100 items) before launch.
2. **Anchor creators** — invite 10-20 known creators в category до public launch. Incentivize с revenue-guarantee для первых 3 мес.
3. **Early-adopter cohort** — invite-only for первых 2-4 weeks. Quality control.
4. **Public launch** — когда достаточно content + active users.

### Preventing «ghost town» UX

- Don't show «0 results» — show related from adjacent verticals.
- Don't show empty feeds — blended from popular across platform.
- «New vertical» badge — вместо рекламы «we just launched!».
- Tutorials / examples prominent.

### Acid-test

T21 (новая вертикаль не «пустая» после launch):
- Min 50 templates in first week.
- Min 100 DAU по vertical'e in first month.
- 0 «empty state» complaints в first 2 weeks.

## 4. Region cold start

Когда платформа expand'иtsia в новый регион (например, Turkey).

### Pre-launch prep

1. **Law-profile ready** (`platform/law-profiles/TR.yaml`) — age-gates, prohibited content, currency, tax.
2. **Localization**: UI translated, currency selected, timezone configured.
3. **Payment methods**: local PSP integrated.
4. **Support channels**: help center translated + local support team.
5. **Moderation capacity**: moderators speaking local language.

### Seed local content

1. Core translators + cultural-fit адаптация готового content.
2. Partnership с 5-10 local creators для initial templates.
3. Local market-specific templates (e.g. «Local transportation», «Regional holidays»).

### Soft launch

1. Wait-list + closed-beta 2-4 недели.
2. Feedback incorporated.
3. Public launch when ready.

### Cross-region bleed

- Users в new region могут видеть (distill) content из adjacent regions:
  - Language-match rooms.
  - Universal templates (travel-in-Europe from EU users).
- But primary feed / recommendations — local first.

## 5. Pattern-Card cold start (fractal!)

Отдельный case: **new template** published, but никто не fork'нул / не купил.

### Visibility boost for new

- «New creator» badge + boost в marketplace ranking (fair exposure).
- Platform featured «Discover» collection includes new.
- Limited-time notification to declared-interest-match users.

### Creator tools

- Creator dashboard shows early-metrics (views, dwell-time, exit-rate).
- Suggestions: «Add a video preview?», «Translate to English?».
- Community review: other creators can provide feedback pre-public.

## 6. Cold-start ML

Recommendations на bootstrap:

### User cold-start

```
Strategy:
  Day 0-3: content-based from declared interests + trending
  Day 3-14: hybrid (content-based + collaborative signals from similar users)
  Day 14+: full personalization
```

### Item cold-start (new template/listing)

```
Strategy:
  Day 0-7: content-based (similar to known items) + fair-exposure boost
  Day 7-30: collaborative signals from early engagers
  Day 30+: full ranking
```

### No cold-start allowed for critical categories

- Payments, identity, medical — no «learn by doing». Strict flows from day 0.

## 7. Device cold start

Fresh install:

```
1. First open → splash + spinner while:
   ├── Fetch feature-flags
   ├── Fetch latest bundle (if OTA update)
   ├── Fetch user state (if logged in) / show login screen
   ▼
2. Shell mounts with minimal loading state
3. Panels parallel-fetch initial data
4. Once panels resolved → interactive
```

Target: **Time-to-Interactive (TTI) < 2s** on mid-tier device with good network.

Offline-first means: if user был logged-in previously + cached data exists → open immediately из cache, sync in background.

## 8. Zero-state design

Fractal: все pagesзная-states обрабатываются через `<EmptyState>` component:

- **Empty timeline** — «Start your first step».
- **Empty feed** — «Try following some creators».
- **Empty shop** — «Try creating a template».
- **Empty messenger** — «Connect your contacts».
- **Empty search** — «Try a different query» + popular queries.

Never use «Sorry, nothing here» — always show **next action**.

## 9. Freshness indicators

- «New» badges на recent content (< 48h old).
- «Trending» indicators.
- «Popular this week» sections.
- «Recommended for you» как personalization kicks in.

## 10. Metrics

- `onboarding.completion-rate`
- `onboarding.time-to-complete`
- `day-1-retention{acquisition-source}`
- `time-to-first-meaningful-interaction`
- `day-7-retention` cohort
- `vertical.adoption-rate` (при launch'е)
- `region.adoption-rate` (при launch'е)

## 11. Antipatterns

- ❌ Dumping user в пустой главный экран без guidance.
- ❌ «Empty» screens без CTA.
- ❌ Требование payment info в onboarding (без контекста).
- ❌ Too many onboarding steps (>5) — abandonment.
- ❌ Launching vertical без seed content — «ghost town».
- ❌ Launching region без local PSP / language.
- ❌ Recommendations «random» без content-based fallback.
- ❌ Не tracking cold-start metrics → не улучшается.
