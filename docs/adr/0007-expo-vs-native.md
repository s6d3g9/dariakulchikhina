# ADR-0007: Expo (React Native) vs native iOS/Android

- **Статус**: Accepted
- **Дата**: 2026-04-18
- **Решение**: Expo для всех mobile applications v6
- **Ответственный**: Mobile / frontend team, Architecture Office

## Контекст

v6 планирует mobile apps для всех основных verticals (с Phase 3 travel, обязательно для dating/video/banking).

Нужно выбрать подход:

## Альтернативы

### Expo (React Native)

Плюсы:
- **Same language** (TypeScript) as web / shell-core.
- **Code-sharing** через `packages/ui-react` (RN Web adapter).
- **OTA updates** через Expo — 90% changes без App Store review.
- **Hiring pool** — огромный (React devs).
- **Ecosystem** — большинство features have library.
- **Fast iteration**.
- **Fractal UX consistency** — shell-core same code.

Минусы:
- Native-performance ceiling чуть ниже.
- Some native APIs less mature.
- Sometimes native-module needed → custom dev work.

### Native iOS (Swift) + Android (Kotlin)

Плюсы:
- Peak performance.
- Platform-idiomatic UI.
- All native APIs available.
- Platform-specific features (CarPlay, Wear OS, Widget).

Минусы:
- **Two separate teams** essentially.
- No code-sharing с web.
- **Fractal-UX harder** — different implementations.
- Slower iteration.
- Hiring 2 pools.

### Flutter (Dart)

Плюсы:
- Good performance.
- Single codebase.
- Growing ecosystem.

Минусы:
- Dart — разделяет команду.
- Flutter Web слаб.
- Google-dependency (2024 layoffs = risk).
- Separate ecosystem from React.
- Rejected earlier (see `04-open-questions.md`).

### Hybrid (Ionic / Capacitor)

Плюсы:
- Web-in-shell.
- Same code.

Минусы:
- UX noticeably web-ish.
- Performance ceiling lower than RN.

## Решение

**Expo (React Native)** для всех mobile apps v6:

- Travel / creator / mobility / social / care — **Expo default**.
- **Banking**: Expo с возможным escape-hatch на Flutter (только если RN UX inadequate для 60/120fps brand-critical animations). Решать фактами во время Phase 8.
- **Crypto**: Expo.

Code-sharing `packages/ui-react` (RN Web), `packages/shell-core`, `packages/card-types`.

## Последствия

### Положительные

- Fast iteration.
- One language across stack.
- Fractal UX natural.
- OTA-updates reduce App Store friction.
- Larger hiring pool.

### Отрицательные

- Native-performance ceiling (if critical, escape to native components).
- Some platform-specific (CarPlay, Wear) требует native work.
- Expo updates Apple/Google limited (platform rules).

### Mitigations

- Native modules when truly needed (Expo supports via EAS).
- Performance monitoring per-critical-flow.
- Escape-hatch to native для critical components if proven needed.

## Revisit

Phase 8 (banking): evaluate RN performance vs native for premium UX. If gap too large для brand, consider Flutter for mobile-banking-only (web remain React).

Phase 10+ (wear / CarPlay / VR): evaluate per-platform — native modules или full native twin.
