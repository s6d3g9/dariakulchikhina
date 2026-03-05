# UI_COMPACT — Краткая выжимка интерфейса

> Источник: `docs/UI_INTERFACE.md` · Версия: 1.0 · 2026-03-05

---

## Роли и маршруты

| Роль | Вход | Зона |
|------|------|------|
| Admin | `/admin/login` | `/admin/**` |
| Client | `/client/login` | `/client/:slug` |
| Contractor | `/contractor/login` | `/contractor/:id` |

---

## Admin: шапка

`[бренд]` `[поиск Ctrl+K]` `[○ тема]` `[сайт /]` `[выйти]`

**Табы:** `проекты` · `подрядчики` · `клиенты` · `галерея` · `документы` · `дизайнеры` · `страницы` · `шаблоны roadmap`

Каждый таб = NuxtLink + dropdown-чип (список последних записей).

---

## Алгоритм переходов (кратко)

```
login form  →  POST /api/auth/*  →  cookie  →  redirect home

/admin  →  клик проект  →  detail  →  "открыть"  →  /admin/projects/:slug
/admin/projects/:slug  →  sidebar пункт  →  activePage ref  →  fade компонент

/client/:slug  →  клик страницы  →  /client/:slug/:page
/contractor/:id  →  activeTab ref  →  без смены URL
```

---

## Workspace: pageComponentMap (23 компонента)

`work_status` `profile_customer` `first_contact` `brief` `site_survey`  
`tor_contract` `space_planning` `moodboard` `concept_approval` `working_drawings`  
`specifications` `mep_integration` `design_album_final` `procurement_list` `suppliers`  
`procurement_status` `construction_plan` `work_log` `site_photos` `punch_list`  
`commissioning_act` `client_sign_off`

---

## CSS-классы: шаблоны

```
Страница:    glass-page
Поверхность: glass-surface
Карточка:    glass-card
Инпут:       glass-input
Чип:         glass-chip
Навигация:   std-nav · std-sidenav
Кнопки:      a-btn · a-btn-sm
Активный:    *--active suffix
```

---

## Темы (6)

`cloud` · `linen` · `stone` · `noir` · `garden` · `copper`  
Переключение: `UIDesignPanel` → вкладка "темы" → клик свотча.

---

## UIDesignPanel (admin only)

Открывается кнопкой `[дизайн ≡]` в топ-баре.  
Вкладки: `темы` · `цвета` · `типографика` · `кнопки` · `пространство` · `анимация` · `экспорт`

---

## Middleware → redirect

| Путь | Redirect если нет сессии |
|------|--------------------------|
| `/admin/**` | `/admin/login` |
| `/client/**` | `/client/login` |
| `/contractor/**` | `/contractor/login` |
