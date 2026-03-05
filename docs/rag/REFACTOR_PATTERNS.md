# REFACTOR_PATTERNS — шаблоны замен для рефакторинга

> RAG-файл. Копируй паттерны «БЫЛО → СТАЛО» при рефакторинге компонентов.
> Каждый паттерн проверен на совместимость с UIDesignPanel и useDesignSystem.

---

## Паттерн 1. Карточка с жёсткими цветами → glass-card

### БЫЛО (hardcoded)
```css
.my-card {
  background: #1a1a1a;
  border: 1px solid #2d2d2d;
  border-radius: 10px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.1);
  color: #f2f2f2;
  padding: 16px;
}
html.dark .my-card {
  background: #151517;
  border-color: #2a2a2a;
}
```

### СТАЛО (токены)
```css
.my-card {
  background: var(--glass-bg);
  border: var(--ds-border-w, 1px) var(--ds-border-style, solid)
          color-mix(in srgb, var(--glass-text) 10%, transparent);
  border-radius: var(--card-radius, 14px);
  box-shadow: var(--ds-shadow);
  color: var(--glass-text);
  padding: calc(var(--ds-spacing-unit, 4px) * 4);
}
/* html.dark правило НЕ НУЖНО — токены инвертируются автоматически */
```

---

## Паттерн 2. Кнопка с инлайн-стилями → классы + токены

### БЫЛО
```html
<button style="background:#4a80f0; color:#fff; border:none; border-radius:6px;
  padding:8px 20px; font-size:.8rem; cursor:pointer;">
  Сохранить
</button>
```

### СТАЛО
```html
<button class="a-btn-save">Сохранить</button>
```

Если `a-btn-save` не подходит семантически, используй токены:
```css
.my-btn {
  background: var(--btn-bg, var(--ds-accent));
  color: var(--btn-color, #fff);
  border: 1px solid var(--btn-border, transparent);
  border-radius: var(--btn-radius, 0px);
  padding: var(--btn-py, 9px) var(--btn-px, 22px);
  font-size: var(--btn-font-size, .8rem);
  font-weight: var(--btn-weight, 400);
  text-transform: var(--btn-transform, none);
  letter-spacing: var(--btn-tracking, .03em);
  cursor: pointer;
  transition: all var(--ds-anim-duration, 200ms) var(--ds-anim-easing, ease);
}
```

---

## Паттерн 3. Инпут → glass-input

### БЫЛО
```css
.my-input {
  background: #f5f5f5;
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 10px 14px;
  font-size: .82rem;
  color: #333;
}
html.dark .my-input {
  background: #1f1f1f;
  border-color: #3a3a3a;
  color: #e0e0e0;
}
```

### СТАЛО
```html
<input class="glass-input" />
```

Или через токены:
```css
.my-input {
  background: color-mix(in srgb, var(--glass-text) calc(var(--input-bg-opacity, 0.04) * 100%), transparent);
  border: 1px solid color-mix(in srgb, var(--glass-text) calc(var(--input-border-opacity, 0.1) * 100%), transparent);
  border-radius: var(--input-radius, 8px);
  padding: var(--input-padding-v, 12px) var(--input-padding-h, 16px);
  font-size: var(--input-font-size, var(--ds-text-sm, .833rem));
  color: var(--glass-text);
}
```

---

## Паттерн 4. Текст с цветовой иерархией

### БЫЛО
```css
.section-title { color: #888; font-size: .72rem; text-transform: uppercase; letter-spacing: .06em; }
.item-name     { color: #f2f2f2; font-size: .82rem; }
.item-desc     { color: #666; font-size: .7rem; }
```

### СТАЛО
```css
.section-title {
  color: color-mix(in srgb, var(--glass-text) 55%, transparent);
  font-size: var(--ds-text-xs, .694rem);
  text-transform: uppercase;
  letter-spacing: var(--ds-letter-spacing, .03em);
}
.item-name {
  color: var(--glass-text);
  font-size: var(--ds-text-sm, .833rem);
}
.item-desc {
  color: color-mix(in srgb, var(--glass-text) 42%, transparent);
  font-size: var(--ds-text-xs, .694rem);
}
```

---

## Паттерн 5. Чип/тег → glass-chip

### БЫЛО
```css
.my-tag {
  background: rgba(100,108,255,0.12);
  color: #646cff;
  border-radius: 999px;
  padding: 3px 10px;
  font-size: .68rem;
}
```

### СТАЛО
```html
<span class="glass-chip">Тег</span>
```

Или через токены:
```css
.my-tag {
  background: color-mix(in srgb, var(--glass-text) calc(var(--chip-bg-opacity, 0.06) * 100%), transparent);
  color: var(--glass-text);
  border-radius: var(--chip-radius, 999px);
  padding: var(--chip-py, 3px) var(--chip-px, 10px);
  font-size: var(--ds-text-xs, .694rem);
}
```

---

## Паттерн 6. Статус-пилюля

### БЫЛО
```css
.status-done    { background: rgba(34,197,94,0.15); color: #22c55e; }
.status-pending { background: rgba(100,100,100,0.12); color: #888; }
.status-error   { background: rgba(220,38,38,0.12); color: #dc2626; }
```

### СТАЛО
```css
.status-done    { background: var(--rm-bg-done);     color: var(--ds-success); }
.status-pending { background: var(--rm-bg-pending);   color: var(--glass-text); }
.status-error   { background: var(--ws-bg-cancelled); color: var(--ds-error); }
```

Или используй классы-утилиты:
```html
<span class="ws-status--done">Выполнено</span>
<span class="ws-status--pending">Ожидание</span>
<span class="ws-status--cancelled">Отмена</span>
```

---

## Паттерн 7. Выпадающий список / dropdown

### БЫЛО
```css
.dropdown {
  background: #fff;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  box-shadow: 0 4px 24px rgba(0,0,0,0.08);
}
```

### СТАЛО
```css
.dropdown {
  background: var(--dropdown-bg);
  border: 1px solid var(--dropdown-border);
  border-radius: var(--card-radius, 14px);
  box-shadow: var(--dropdown-shadow);
  backdrop-filter: blur(var(--dropdown-blur, 0px)) saturate(var(--glass-saturation, 100%));
}
```

Или просто `class="glass-dropdown"`.

---

## Паттерн 8. Sidebar-навигация → ent-nav-item

### БЫЛО
```css
.nav-link {
  padding: 8px 16px;
  border-radius: 6px;
  color: #888;
  font-size: .78rem;
}
.nav-link.active {
  background: rgba(100,108,255,0.1);
  color: #6366f1;
}
```

### СТАЛО
```css
.nav-link {
  padding: var(--nav-item-padding-v, 12px) var(--nav-item-padding-h, 16px);
  border-radius: var(--nav-item-radius, 8px);
  color: color-mix(in srgb, var(--glass-text) 55%, transparent);
  font-size: var(--ds-text-sm, .833rem);
}
.nav-link.active {
  background: color-mix(in srgb, var(--ds-accent) 15%, transparent);
  color: var(--ds-accent);
}
```

---

## Паттерн 9. Таблица

### БЫЛО
```css
th { background: #f5f5f5; border-bottom: 1px solid #e0e0e0; }
tr:hover { background: #fafafa; }
td { border-bottom: 1px solid #eee; }
```

### СТАЛО
```css
th {
  background: color-mix(in srgb, var(--glass-text) calc(var(--table-header-opacity, 0.04) * 100%), transparent);
  border-bottom: 1px solid color-mix(in srgb, var(--glass-text) calc(var(--table-border-opacity, 0.08) * 100%), transparent);
}
tr:hover {
  background: color-mix(in srgb, var(--glass-text) calc(var(--table-row-hover-opacity, 0.03) * 100%), transparent);
}
td {
  border-bottom: 1px solid color-mix(in srgb, var(--glass-text) calc(var(--table-border-opacity, 0.08) * 100%), transparent);
}
```

---

## Паттерн 10. Модальное окно

### БЫЛО
```css
.overlay { background: rgba(0,0,0,0.5); }
.modal {
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 16px 48px rgba(0,0,0,0.15);
}
```

### СТАЛО
```css
.overlay { background: rgba(0,0,0, var(--modal-overlay-opacity, 0.4)); }
.modal {
  background: var(--glass-bg);
  border-radius: var(--modal-radius, 14px);
  box-shadow: var(--ds-shadow-lg);
  backdrop-filter: blur(calc(var(--glass-blur, 0px) * 1.5)) saturate(var(--glass-saturation, 100%));
}
```

---

## Паттерн 11. Scrollbar

### БЫЛО
```css
::-webkit-scrollbar { width: 8px; }
::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.2); border-radius: 4px; }
```

### СТАЛО
```css
/* Уже есть в main.css глобально, НЕ дублируй.
   Управляется через --scrollbar-w и --scrollbar-opacity. */
```

---

## Паттерн 12. Dark mode — ЗАПРЕЩЁННЫЙ подход

### ЗАПРЕЩЕНО
```css
.card { background: #fff; color: #333; }
html.dark .card { background: #1a1a1a; color: #e0e0e0; }
```

### ПРАВИЛЬНО
```css
.card { background: var(--glass-bg); color: var(--glass-text); }
/* Dark инверсия происходит автоматически через :root / html.dark в main.css */
```

**Правило:** если ты используешь `var(--glass-*)` и `var(--ds-*)`, тебе НЕ НУЖНЫ `html.dark` правила. Они переопределяются глобально в `:root` / `html.dark`.

---

## Паттерн 13. Поверхность glass

### БЫЛО
```css
.panel {
  background: rgba(255,255,255,0.8);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255,255,255,0.3);
}
```

### СТАЛО
```html
<div class="glass-surface">...</div>
```

Или через токены:
```css
.panel {
  background: var(--glass-bg);
  backdrop-filter: blur(var(--glass-blur, 0px)) saturate(var(--glass-saturation, 100%));
  border: var(--ds-border-w, 1px) var(--ds-border-style, solid) var(--glass-border);
  border-radius: var(--card-radius, 14px);
  box-shadow: var(--ds-shadow);
}
```

---

## Контрольный чек-лист при рефакторинге файла

```
□ Нет ни одного #hex — всё через var(--)
□ Нет ни одного rgba() — всё через color-mix() или var(--)
□ border-radius → var(--card-radius) / var(--input-radius) / var(--chip-radius)
□ font-size → var(--ds-text-{xs|sm|base|lg|xl|2xl|3xl})
□ font-family → var(--ds-font-family)
□ box-shadow → var(--ds-shadow) / var(--ds-shadow-sm) / var(--ds-shadow-lg)
□ Нет html.dark {} дубликатов — тема автоматическая
□ Кнопки — используют классы a-btn-* или var(--btn-*)
□ Инпуты — class="glass-input" или var(--input-*)
□ transition → var(--ds-anim-duration) var(--ds-anim-easing)
```
