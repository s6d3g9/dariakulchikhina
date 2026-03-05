# RAG-03: Компоненты Vue

## Соглашения именования

- `Admin*` — компоненты для роли Admin/Designer
- `Client*` — компоненты для роли Client
- `App*` — переиспользуемые UI-примитивы
- `Gallery*` — компоненты галереи
- `UI*` — компоненты дизайн-системы

## Admin-компоненты (рабочая зона проекта)

| Компонент | Страница workspace | Назначение |
|-----------|-------------------|-----------|
| `AdminWorkStatus` | `work_status` | Список задач и работ с подрядчиками, статусами, фото |
| `AdminClientProfile` | `profile_customer` | Профиль клиента: контакты, бриф, параметры |
| `AdminFirstContact` | `first_contact` | Первичный контакт, звонок, заявка |
| `AdminSmartBrief` | `brief` / `self_profile` | Умный опросник-бриф проекта |
| `AdminSiteSurvey` | `site_survey` | Замеры и обследование объекта |
| `AdminToRContract` | `tor_contract` | Техзадание и договор |
| `AdminSpacePlanning` | `space_planning` | Планировка: чертежи, варианты расстановки |
| `AdminMoodboard` | `moodboard` | Мудборд: изображения, стиль, атмосфера |
| `AdminConceptApproval` | `concept_approval` | Согласование концепции дизайна |
| `AdminWorkingDrawings` | `working_drawings` | Рабочая документация |
| `AdminSpecifications` | `specifications` | Спецификации материалов и изделий |
| `AdminMepIntegration` | `mep_integration` | Интеграция с инженерными системами (MEP) |
| `AdminDesignAlbumFinal` | `design_album_final` | Финальный альбом дизайн-проекта |
| `AdminProcurementList` | `procurement_list` | Список закупок и позиций |
| `AdminSuppliers` | `suppliers` | Поставщики и контакты |
| `AdminProcurementStatus` | `procurement_status` | Статус закупок и доставки |
| `AdminConstructionPlan` | `construction_plan` | График строительных работ |
| `AdminWorkLog` | `work_log` | Журнал выполненных работ |
| `AdminSitePhotos` | `site_photos` | Фотоотчёт с объекта |
| `AdminPunchList` | `punch_list` | Список замечаний и правок |
| `AdminCommissioningAct` | `commissioning_act` | Акт ввода в эксплуатацию |
| `AdminClientSignOff` | `client_sign_off` | Финальное согласование с клиентом |
| `AdminPageContent` | (fallback) | Произвольное HTML-содержимое страницы |

## Admin-компоненты (управление)

| Компонент | Назначение |
|-----------|-----------|
| `AdminContractorCabinet` | Кабинет подрядчика (в контексте workspace) |
| `AdminContractorsProfile` | Профиль подрядчика в реестре |
| `AdminDesignerCabinet` | Кабинет дизайнера |
| `AdminDocumentEditor` | Редактор документов (шаблоны, WYSIWYG) |
| `AdminGallery` | CRUD галереи (upload, категории, теги, свойства) |
| `AdminMaterials` | База материалов проекта |
| `AdminPhaseDetail` | Детальный просмотр этапа roadmap |
| `AdminProjectOverview` | Сводка по проекту |
| `AdminProjectStatusBar` | Глобальный статус-бар (фиксированный низ admin layout) |
| `AdminSearch` | Глобальный поиск (модал, Ctrl+K) |
| `AdminTZ` | Техническое задание |

## Client-компоненты

| Компонент | Назначение |
|-----------|-----------|
| `ClientBrief` | Бриф клиента (просмотр/заполнение) |
| `ClientContactDetails` | Контактные данные |
| `ClientContractorsProfile` | Профиль подрядчика (вид клиента) |
| `ClientContracts` | Договоры |
| `ClientDesignAlbum` | Альбом дизайна (просмотр) |
| `ClientInitiation` | Инициация проекта |
| `ClientOverview` | Обзор проекта (клиент) |
| `ClientPageContent` | Содержимое страницы (клиент) |
| `ClientPassport` | Паспорт проекта |
| `ClientSelfProfile` | Профиль клиента (самозаполнение) |
| `ClientTimeline` | Хронология проекта |
| `ClientTZ` | Техническое задание (вид клиента) |
| `ClientWorkProgress` | Прогресс работ |
| `ClientWorkStatus` | Статус работ (клиент) |

## App (переиспользуемые примитивы)

| Компонент | Назначение |
|-----------|-----------|
| `AppAddressInput` | Поле адреса с автодополнением (Yandex Maps API) |
| `AppAutocomplete` | Универсальный autocomplete dropdown |
| `AppDatePicker` | Выбор даты (кастомный) |

## Gallery-компоненты

| Компонент | Назначение |
|-----------|-----------|
| `GalleryFilterBar` | Фильтры галереи (категория, теги, поиск) |
| `GalleryLightbox` | Полноэкранный просмотр изображения |
| `GalleryMasonry` | Масонри-сетка изображений |

## Material-компоненты

| Компонент | Назначение |
|-----------|-----------|
| `MaterialPropertyEditor` | Редактор свойств позиции материала |
| `MaterialPropertyPanel` | Панель просмотра свойств |

## UI/Design-компоненты

| Компонент | Назначение |
|-----------|-----------|
| `UIDesignPanel` | Панель редактора дизайн-системы (только в admin layout) |
| `UIThemePicker` | Быстрый переключатель тем (встроен в UIDesignPanel) |

## Вложенные компоненты (admin/*)

Находятся в `app/components/admin/`:

| Компонент | Назначение |
|-----------|-----------|
| `AdminRoadmap` | Дорожная карта проекта |

## Паттерны компонентов

### Структура workspace-компонента

```vue
<script setup lang="ts">
const props = defineProps<{ projectSlug: string }>()
const { data, pending, error } = useFetch(`/api/...`)
</script>

<template>
  <div class="component-wrap">
    <div v-if="pending" class="skeleton" />
    <div v-else-if="error">ошибка</div>
    <div v-else><!-- контент --></div>
  </div>
</template>
```

### Загрузка данных

- `useFetch` — для серверного + клиентского фетчинга (SSR-safe)
- `$fetch` — для мутаций (POST, PUT, DELETE)
- `useAsyncData` — для сложной логики с ключом

### Стили компонентов

Все компоненты используют `<style scoped>` + CSS custom properties дизайн-системы:

```css
.wrap {
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: var(--card-radius, 12px);
  color: var(--glass-text);
}
```
