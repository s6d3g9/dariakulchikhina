# COMPONENT_AUDIT — состояние каждого файла

> RAG-файл. Перед рефакторингом компонента — найди его здесь и оцени объём работы.
> Отсортировано по приоритету: сначала самые проблемные.

---

## Легенда

| Колонка | Значение |
|---------|----------|
| **HC**  | Hardcoded hex-цвета (`#xxx`) |
| **RGB** | Hardcoded `rgba()` / `rgb()` |
| **TK**  | Token vars (`var(--…)`) — уже используются |
| **DK**  | Dark-mode rules (`html.dark`) |
| **GL**  | Glass-классы (`glass-*`) |
| **Статус** | 🔴 критичный / 🟡 средний / 🟢 ок |

---

## Приоритет 1 — Критичные (0 токенов, много хардкода) 🔴

| Файл | Строк | HC | RGB | TK | DK | GL | Статус |
|------|-------|----|-----|----|----|----|--------|
| [AdminConstructionPlan.vue](../app/components/AdminConstructionPlan.vue) | 567 | **80** | 1 | 0 | 0 | 15 | 🔴 полный хардкод |
| [ClientExtraServices.vue](../app/components/ClientExtraServices.vue) | 470 | **58** | 2 | 0 | 0 | 0 | 🔴 полный хардкод |
| [AdminExtraServices.vue](../app/components/AdminExtraServices.vue) | 587 | **53** | 2 | 0 | 0 | 15 | 🔴 полный хардкод |
| [AdminPunchList.vue](../app/components/AdminPunchList.vue) | 365 | **44** | 2 | 0 | 0 | 6 | 🔴 полный хардкод |
| [AdminWorkLog.vue](../app/components/AdminWorkLog.vue) | 358 | **39** | 2 | 0 | 0 | 7 | 🔴 полный хардкод |
| [ClientTimeline.vue](../app/components/ClientTimeline.vue) | 190 | **36** | 2 | 34 | 0 | 0 | 🔴 хардкод + нет dark |
| [ClientInitiation.vue](../app/components/ClientInitiation.vue) | 374 | **38** | 0 | 38 | 0 | 4 | 🔴 хардкод без dark |
| [ClientDesignAlbum.vue](../app/components/ClientDesignAlbum.vue) | 281 | **19** | 8 | 17 | 0 | 0 | 🔴 нет glass-классов |

---

## Приоритет 2 — Средние (есть токены, но много хардкода) 🟡

| Файл | Строк | HC | RGB | TK | DK | GL | Статус |
|------|-------|----|-----|----|----|----|--------|
| [AdminDocumentEditor.vue](../app/components/AdminDocumentEditor.vue) | 2593 | **87** | 8 | 127 | 6 | 62 | 🟡 смешанный |
| [contractor/[id]/index.vue](../app/pages/contractor/[id]/index.vue) | 2872 | **57** | 85 | 70 | 4 | 116 | 🟡 смешанный |
| [admin/projects/[slug].vue](../app/pages/admin/projects/[slug].vue) | 1465 | **48** | 1 | 66 | 1 | 40 | 🟡 смешанный |
| [AdminGallery.vue](../app/components/AdminGallery.vue) | 1144 | **42** | 17 | 68 | 0 | 61 | 🟡 нет dark |
| [MaterialPropertyPanel.vue](../app/components/MaterialPropertyPanel.vue) | 442 | **34** | 0 | 34 | 0 | 30 | 🟡 50/50 |
| [MaterialPropertyEditor.vue](../app/components/MaterialPropertyEditor.vue) | 618 | **28** | 0 | 27 | 0 | 33 | 🟡 50/50 |
| [ClientSelfProfile.vue](../app/components/ClientSelfProfile.vue) | 554 | **25** | 0 | 25 | 0 | 36 | 🟡 50/50 |
| [AdminToRContract.vue](../app/components/AdminToRContract.vue) | 540 | **25** | 0 | 35 | 0 | 20 | 🟡 |
| [AdminDesignerCabinet.vue](../app/components/AdminDesignerCabinet.vue) | 1567 | **25** | 2 | 44 | 0 | 91 | 🟡 |
| [AdminSellerCabinet.vue](../app/components/AdminSellerCabinet.vue) | 468 | **19** | 2 | 12 | 0 | 41 | 🟡 |
| [GalleryLightbox.vue](../app/components/GalleryLightbox.vue) | 555 | **4** | 28 | 1 | 0 | 0 | 🟡 много rgba |
| [admin/pages/index.vue](../app/pages/admin/pages/index.vue) | 191 | **18** | 0 | 28 | 0 | 19 | 🟡 |
| [admin/index.vue](../app/pages/admin/index.vue) | 242 | **16** | 8 | 35 | 6 | 27 | 🟡 |
| [AppDatePicker.vue](../app/components/AppDatePicker.vue) | 306 | **14** | 3 | 20 | 0 | 12 | 🟡 |
| [admin/contractors/index.vue](../app/pages/admin/contractors/index.vue) | 478 | **13** | 4 | 29 | 4 | 44 | 🟡 |
| [AdminWorkStatus.vue](../app/components/AdminWorkStatus.vue) | 506 | **13** | 6 | 39 | 0 | 35 | 🟡 |
| [ClientContracts.vue](../app/components/ClientContracts.vue) | 401 | **13** | 0 | 36 | 0 | 21 | 🟡 |
| [GalleryFilterBar.vue](../app/components/GalleryFilterBar.vue) | 362 | **12** | 18 | 21 | 6 | 11 | 🟡 |
| [AdminContractorsProfile.vue](../app/components/AdminContractorsProfile.vue) | 214 | **12** | 0 | 19 | 2 | 9 | 🟡 |
| [ClientContractorsProfile.vue](../app/components/ClientContractorsProfile.vue) | 91 | **11** | 0 | 11 | 0 | 1 | 🟡 мало glass |
| [AdminConceptApproval.vue](../app/components/AdminConceptApproval.vue) | 304 | **11** | 2 | 9 | 0 | 7 | 🟡 |
| [AdminMoodboard.vue](../app/components/AdminMoodboard.vue) | 280 | **11** | 3 | 15 | 0 | 17 | 🟡 |
| [AdminSiteSurvey.vue](../app/components/AdminSiteSurvey.vue) | 337 | **11** | 0 | 26 | 0 | 21 | 🟡 |

---

## Приоритет 3 — Почти готовы (мало хардкода) 🟢

| Файл | Строк | HC | RGB | TK | DK | GL | Статус |
|------|-------|----|-----|----|----|----|--------|
| [AdminClientProfile.vue](../app/components/AdminClientProfile.vue) | 545 | 9 | 0 | 31 | 0 | 40 | 🟢 |
| [AdminTZ.vue](../app/components/AdminTZ.vue) | 285 | 9 | 0 | 16 | 0 | 21 | 🟢 |
| [AdminSmartBrief.vue](../app/components/AdminSmartBrief.vue) | 479 | 8 | 0 | 15 | 0 | 19 | 🟢 |
| [AdminMaterials.vue](../app/components/AdminMaterials.vue) | 292 | 8 | 0 | 16 | 0 | 21 | 🟢 |
| [ClientPageContent.vue](../app/components/ClientPageContent.vue) | 542 | 8 | 0 | 36 | 0 | 9 | 🟢 |
| [contractor.vue](../app/layouts/contractor.vue) | 184 | 8 | 1 | 11 | 0 | 10 | 🟢 |
| [AdminSearch.vue](../app/components/AdminSearch.vue) | 437 | 7 | 4 | 28 | 0 | 22 | 🟢 |
| [AdminSitePhotos.vue](../app/components/AdminSitePhotos.vue) | 133 | 7 | 0 | 7 | 0 | 3 | 🟢 |
| [AdminFirstContact.vue](../app/components/AdminFirstContact.vue) | 299 | 13 | 0 | 14 | 0 | 14 | 🟢 |
| [GalleryMasonry.vue](../app/components/GalleryMasonry.vue) | 305 | 6 | 12 | 10 | 4 | 8 | 🟢 |
| [project/[slug]/index.vue](../app/pages/project/[slug]/index.vue) | 472 | 6 | 9 | 11 | 0 | 9 | 🟢 |
| [AdminWorkingDrawings.vue](../app/components/AdminWorkingDrawings.vue) | 179 | 6 | 0 | 6 | 0 | 6 | 🟢 |
| [AdminSuppliers.vue](../app/components/AdminSuppliers.vue) | 144 | 6 | 0 | 6 | 0 | 8 | 🟢 |
| [AdminSpecifications.vue](../app/components/AdminSpecifications.vue) | 204 | 6 | 0 | 6 | 0 | 10 | 🟢 |
| [AdminProcurementStatus.vue](../app/components/AdminProcurementStatus.vue) | 155 | 6 | 0 | 6 | 0 | 9 | 🟢 |
| [admin/settings/index.vue](../app/pages/admin/settings/index.vue) | 625 | 5 | 8 | 2 | 0 | 20 | 🟢 |
| [admin/documents/index.vue](../app/pages/admin/documents/index.vue) | 1142 | 5 | 5 | 40 | 0 | 35 | 🟢 |
| [ClientTZ.vue](../app/components/ClientTZ.vue) | 127 | 5 | 0 | 10 | 0 | 6 | 🟢 |

---

## Полностью чистые (0 хардкода) ✅

| Файл | Строк | TK | GL |
|------|-------|----|-----|
| [AdminContractorCabinet.vue](../app/components/AdminContractorCabinet.vue) | 901 | 6 | 70 |
| [AdminProjectStatusBar.vue](../app/components/AdminProjectStatusBar.vue) | 417 | 26 | 30 |
| [AdminPhaseDetail.vue](../app/components/AdminPhaseDetail.vue) | 364 | 28 | 13 |
| [ClientOverview.vue](../app/components/ClientOverview.vue) | 184 | 19 | 21 |
| [ClientWorkStatus.vue](../app/components/ClientWorkStatus.vue) | 91 | 16 | 8 |
| [AdminDesignAlbumFinal.vue](../app/components/AdminDesignAlbumFinal.vue) | 267 | 24 | 28 |
| [AdminProjectOverview.vue](../app/components/AdminProjectOverview.vue) | 246 | 20 | 26 |
| [admin/clients/index.vue](../app/pages/admin/clients/index.vue) | 326 | 8 | 25 |
| [admin.vue](../app/layouts/admin.vue) | 701 | 23 | 14 |
| [NavChipTab.vue](../app/components/admin/NavChipTab.vue) | 186 | 12 | 12 |
| [UIThemePicker.vue](../app/components/UIThemePicker.vue) | 189 | 11 | 5 |

---

## Файлы-заглушки (< 10 строк, делегируют)

| Файл | Строк |
|------|-------|
| client/login.vue | 7 |
| client/[slug]/index.vue | 7 |
| ClientBrief.vue | 7 |
| gallery/interiors.vue | 6 |
| gallery/furniture.vue | 6 |
| gallery/art.vue | 6 |
| gallery/materials.vue | 6 |
| gallery/moodboards.vue | 6 |

---

## Сводка

| Категория | Кол-во файлов | Хардкоды (hex) | Задача |
|-----------|---------------|----------------|--------|
| 🔴 Критичные | 8 | ~367 | Полная замена |
| 🟡 Средние | 23 | ~434 | Замена hex, добавление dark |
| 🟢 Почти готовы | 18 | ~118 | Финишная чистка |
| ✅ Чистые | 11 | 0 | Контроль не нужен |
| 📄 Заглушки | 8 | 0 | Пропустить |
| **Итого** | **68** (без UIDesignPanel) | **~919** | — |

---

## Порядок рефакторинга (рекомендация)

```
1. main.css — 527 hex → var()              [основа для всех]
2. Layouts: contractor.vue, default.vue     [подключить applyToDOM]
3. 🔴 AdminConstructionPlan.vue (80 hex)   [самый тяжёлый]
4. 🔴 ClientExtraServices.vue (58 hex)
5. 🔴 AdminExtraServices.vue (53 hex)
6. 🔴 AdminPunchList.vue (44 hex)
7. 🔴 AdminWorkLog.vue (39 hex)
8. 🔴 ClientTimeline.vue (36 hex)
9. 🔴 ClientInitiation.vue (38 hex)
10. 🟡 AdminDocumentEditor.vue (87 hex)    [большой, но уже 127 TK]
11. 🟡 contractor/[id]/index.vue (57 hex)  [большой, уже 70 TK]
12. 🟡 admin/projects/[slug].vue (48 hex)
13. Остальные 🟡 по убыванию HC
14. 🟢 финишная чистка
```
