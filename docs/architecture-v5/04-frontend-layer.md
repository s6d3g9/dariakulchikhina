# 4. Слой Фронтенда (app/ - Feature-Sliced Design)

> Фактическое выравнивание FSD-слоёв подтверждено в `15-target-alignment-audit.md`. Слой `app/core/` пока не создан — используется напрямую через `app/shared/composables` и `app/entities/**`. Operational-log — в `14-refactor-roadmap.md`.

Главный Nuxt-app распиливается по FSD, чтобы крупные виджеты и cabinets не зависели от конкретных страниц, а страницы становились тонкими route-shell.

```text
app/
├── core/                       # СЛОЙ 0: Инфраструктура фронтенда
│   ├── api.client.ts
│   ├── ws.client.ts
│   ├── crypto.client.ts
│   ├── offline.db.ts
│   └── theme.injector.ts       
│
├── shared/                     # СЛОЙ 1: Универсальные UI и утилиты
│   └── ui/                     # AppButton, AppModal (зависят от var(--ds-*))
│
├── entities/                   # СЛОЙ 2: Бизнес-сущности
│   ├── project/
│   ├── design-system/          # СУЩНОСТЬ: Дизайн-система (useThemeStore)
│   └── message/
│
├── features/                   # СЛОЙ 3: Бизнес-действия
│   ├── project-phases/
│   ├── ui-editor/              # ФИЧА: Визуальное редактирование интерфейса
│   ├── webrtc-call/
│   └── e2ee-encryption/
│
├── widgets/                    # СЛОЙ 4: Крупные блоки
│   ├── AdminSidebar.vue
│   ├── ProjectWorkspace.vue
│   ├── ChatMessenger.vue
│   └── UIDesignPanel.vue       
│
├── layouts/                    # СЛОЙ 5: Каркасы
│   ├── admin.vue               
│   └── default.vue
│
└── pages/                      # СЛОЙ 6: Роутинг
```