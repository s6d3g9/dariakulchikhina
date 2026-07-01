# 40. Accessibility (A11y)

Доступность в v6 — **не add-on**, а часть фрактальной грамматики. WCAG 2.1 AA — минимум; AAA — там, где разумно (медицинские / банковские / государственные interactions).

## 1. Принципы

- **Одна реализация на всех**. Accessible shell по умолчанию; card-types наследуют.
- **Опираемся на semantic HTML** (web) / **RN accessibility props** (mobile) / **Tauri + platform APIs** (desktop).
- **Не imitateем** native screen-reader поведение — используем нативные APIs.
- **Тестируется инструментами** (axe, Lighthouse) и **людьми** (контракт с users с инвалидностью).

## 2. 4 опоры WCAG (POUR)

### Perceivable

- **Alt text** обязательно на всех не-декоративных images.
- **Captions** на всех videos (auto-captioning + manual review + edit).
- **Audio descriptions** для video (Фаза 7+).
- **Color contrast** ≥ 4.5:1 (normal text), ≥ 3:1 (large). Нас tokens уже подобраны — `packages/design-tokens/contrast-validator`.
- **Text resize up to 200%** без потери функциональности.
- **Не только цвет** — каждый color-coded state имеет icon / label.

### Operable

- **Keyboard navigation**: tab-order логичный, skip-links to main content.
- **Focus indicator** — явный (3px outline с 3:1 contrast).
- **No keyboard-traps** (user всегда может выйти из модального).
- **Skip repetitive** — skip-nav, skip-to-search.
- **Timeouts** — user может extend / отключить (критично для формов с sensitive данными).
- **Motion reduce**: respects `prefers-reduced-motion`.
- **Gestures alternative**: swipe-инверсия имеет button-alternative (`⇄`).

### Understandable

- **Clear language** (не overly-jargony).
- **Error messages** — identify error + suggest correction.
- **Consistent navigation** (fractal UX § 17).
- **Predictable behavior** — same action same result.
- **Form labels** — association `<label for>` или `aria-labelledby`.

### Robust

- **Valid HTML / semantic markup**.
- **ARIA** только где native не хватает (principle «first rule of ARIA: don't use ARIA»).
- **Screen-reader testing**: VoiceOver (iOS / macOS), NVDA (Windows), TalkBack (Android).

## 3. A11y-tokens in design-system

`packages/design-tokens/accessibility/*`:

- `contrast.normal`, `contrast.large` — target ratios.
- `focus.ring.width`, `focus.ring.color`.
- `motion.duration.default` (auto-reduced при prefers-reduced-motion).
- `touch.target.min` (44×44 pt на mobile — Apple HIG).
- `icon.size.min-accessible` (16 pt minimum).

## 4. Per-layer обязательства

### Shell (apps/shell-*)

- Skip links в begin of page.
- Landmark roles: `<main>`, `<nav>`, `<aside>` для панелей.
- Focus management при focus-switch (focus → on new center).
- Inversion-button accessible: `aria-label`, `aria-pressed`.
- Panels — landmark `<aside aria-label="Left panel: shop">`.

### CardView (packages/ui-react)

- HEADER — `<header>`.
- TIMELINE — `<ol aria-label="Timeline">` с правильными states (`aria-current="step"`).
- ACTIONS — `<menu>` или просто buttons.
- SECTIONS — `<section aria-labelledby="...">`.

### Panel (packages/ui-react)

- `<aside role="complementary">` per-slot с ясным `aria-label`.
- STREAM — `<ul role="list">` для списков.
- Items — tabbable, с `aria-describedby` для metadata.

### Form inputs

- `<label>` always associated.
- Required field: `aria-required="true"` + visible `*`.
- Error: `aria-invalid` + `aria-describedby="error-id"`.
- Help text: `aria-describedby="help-id"`.

### Dialogs / Modals

- `role="dialog"` + `aria-modal="true"`.
- Focus trapped внутри.
- ESC — closes.
- Return focus к triggered element после close.

## 5. Screen-reader announcements

`<LiveRegion>` component в `packages/ui-react`:

- **Polite** (ARIA `aria-live="polite"`) — non-urgent updates.
- **Assertive** — urgent (error messages).

Announcements:
- «Timeline step completed» после action.
- «New message from X» при incoming chat.
- «Sync completed» после offline reconnect.

Не спамим — throttle (≤ 1 announce / 2 sec).

## 6. Mobile accessibility (RN)

RN `AccessibilityInfo` + `accessibility*` props:

- `accessible={true}` на interactive elements.
- `accessibilityLabel`, `accessibilityHint`, `accessibilityRole`.
- Dynamic Type support (user's preferred font size).
- Hi-contrast mode detection (iOS 13+, Android 10+).
- TalkBack/VoiceOver gestures documented в онбординге.

## 7. Desktop (Tauri)

- Use native menu-bar (не custom).
- Keyboard shortcuts documented.
- Windows screen-reader (NVDA / JAWS) tested.
- macOS VoiceOver tested.

## 8. Content accessibility

### User-generated

- **Image uploads** prompt для alt-text (с skip-option).
- **Video uploads** prompt для caption (auto-generated + user can edit).
- **Auto-captions** через ML (Фаза 7+, Whisper-based).

### Platform-generated

- Все icons имеют labels.
- Charts — data-table alternative.
- Animations — pause/stop available.

## 9. I18n + a11y

RTL languages (`25-internationalization.md §10`):

- Screen-reader announcements в user-language.
- RTL layout не ломает focus order (reading direction preserved for screen-reader).
- Date / number formats accessible.

## 10. Testing

### Automated

- **Axe** (CI) — runs on every PR touching UI.
- **Lighthouse CI** — accessibility score > 95.
- **Pa11y** — full-site sweep weekly.
- **Percy** (visual regression) — includes high-contrast + zoomed-150% snapshots.

### Manual

- **Screen-reader flows** — quarterly test with real users.
- **Keyboard-only flows** — per-release test.
- **Low-vision simulation** — с контраст-reducer tools.

### Fractal-harness integration

Each card-type tested в a11y-mode:
- Tab-navigation comprehensive.
- Screen-reader announces correct structure.
- All CTAs reachable.

## 11. A11y в permissions

Сотрудник role='a11y-reviewer' может:
- Review PR flagged as «touches UI».
- Approve / block based on a11y-check.

## 12. User-side settings

Accessibility settings page:

- **Font size** (overrides system if needed).
- **High contrast** mode toggle.
- **Reduce motion** toggle.
- **Audio descriptions** preference.
- **Captions** default on/off.
- **Screen-reader mode** hint (informs UI — slightly more verbose labels).

Applied через design-tokens runtime modulation + media-pipeline defaults.

## 13. Compliance

- **ADA** (US) — mandatory для digital services.
- **EAA** (EU) — 2025 Accessibility Act обязывает.
- **RU GOST Р 52872-2012** — accessibility норматив.
- **WCAG 2.1 AA** — industry standard → мы закрываем.
- **Accessibility statement** — public page, per-region.

## 14. Metrics

- `a11y.audit.score` — Axe / Lighthouse result.
- `a11y.user-reports.count{category}` — от реальных users.
- `a11y.screen-reader-usage-rate` (proxy for users с need).
- `a11y.keyboard-navigation-rate` (traces-based).

## 15. Антипаттерны

- ❌ Accessibility как after-thought (в конце фичи).
- ❌ Custom form controls без proper ARIA.
- ❌ Click-only UI (no keyboard alternative).
- ❌ Animations без reduced-motion respect.
- ❌ Color-only state indication.
- ❌ Alt-text generated auto без review (wrong alt = хуже чем empty).
- ❌ Only-mouse interactions (hover-only menus).
- ❌ Tiny touch targets на mobile (< 44×44pt).
- ❌ Modal без focus trap.
- ❌ Auto-focus без user-trigger (screen-reader interference).
