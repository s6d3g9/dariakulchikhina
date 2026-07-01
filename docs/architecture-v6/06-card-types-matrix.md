# 06. Card-types — каталог и матрица

Вертикали v6 реализуются как **type-plugins** (`packages/card-types/*`) поверх горизонтальных примитивов. Этот документ — каталог card-types с обязательной разметкой по двум видам (instance / type — см. `05-shell-entity-model.md`) и используемым примитивам.

Сервисом становится только горизонтальный примитив. Вертикаль — всегда плагин.

## 1. Горизонтальные примитивы (используются card-types)

| Primitive | Что даёт |
|---|---|
| `pattern-engine` | Композиция Pattern-Card, форки, версии, templates |
| `timeline-engine` | Durable workflows (Temporal) — инициация → шаги → завершение |
| `identity` + `credentials-vault` | Auth + проверяемые лицензии/сертификаты (водительские, IYT, PADI, KYC-уровни) |
| `booking` | Слоты, календари, overbooking-контроль, OCC |
| `inventory` | Каталоги товаров/мест/единиц |
| `location` | Geo-поиск, маршруты, geofence |
| `payments` | Платёжные шлюзы, валюты |
| `wallet` | Банк + крипта + внутренние балансы |
| `escrow-service` | Удержание средств/активов до выполнения условий |
| `financing-service` | Кредиты/лизинг/ипотека/BNPL |
| `auction-engine` | Bidding, reserve-price, anti-sniping |
| `ownership-registry` | Граф владения: VIN, кадастр, digital-authorship |
| `authorship-registry` | Подмножество ownership для цифровых активов: кто автор, лицензии, royalty |
| `subscription-engine` | Подписки на людей/курсы/продукты/компании/паттерн-бандлы |
| `moderation-ml` + `moderation-review` | ML + human-in-the-loop |
| `policy-engine` | Geo/age/compliance runtime-ограничения (allow / distill / deny) |
| `messenger` | 1:1, групповые, threads, presence |
| `feed` | Twitter-lite / stories / reels |
| `media-pipeline` | Транскод, CDN, галереи |
| `search` | Meilisearch/OpenSearch |
| `recommendations` | ML-feed, ranking |
| `reviews-ratings` | Общий рейтинговый сервис |
| `disputes` | Разбор конфликтов + арбитраж |

## 2. Матрица card-types

Легенда колонок:
- **Primitives** — какие примитивы обязаны быть включены.
- **Instance** — что видит владелец/пользователь своего экземпляра.
- **Type** — что видит потребитель при инверсии.
- **Sub** — возможна подписка (`subscription-engine`).
- **NFT** — может быть поднят в `authorship-registry` как шаблон с royalty.

### 2.1 Люди и сообщества

| Card-type | Primitives | Instance | Type | Sub | NFT |
|---|---|---|---|---|---|
| `person-profile` | identity, feed, messenger, media | Мой профиль, мои stories, мои посты | Роль/профессия: сообщества, фан-контент | ✅ | — |
| `company-profile` | identity, feed, messenger | Внутренние процессы компании | Бренд: магазин, сервисы, каналы | ✅ | — |
| `community` | feed, messenger, moderation | Мой участник-вид | Публичная витрина сообщества | ✅ | — |

### 2.2 Mobility — движение

| Card-type | Primitives | Instance | Type | Sub | NFT |
|---|---|---|---|---|---|
| `taxi-ride` | booking, location, payments, identity | Моя поездка, tracking | Тариф / компания / бренд такси | — | — |
| `ride-share-pool` | booking, location, payments | Моя поездка pool | Сервис (BlaBlaCar) | — | — |
| `flight-ticket` | booking, inventory(GDS), payments, identity | Мой перелёт, PNR, посадочный | Авиакомпания / маршрут / модель ВС | ✅* | — |
| `train-ticket` | booking, inventory, identity, payments | Мой билет | Направление / перевозчик | — | — |
| `bus-ticket` | booking, inventory, payments | Мой билет | Перевозчик / маршрут | — | — |
| `ferry-cruise` | booking, inventory, identity | Моя каюта / круиз | Судно / круизная линия | — | — |
| `chartered-flight` | booking, escrow, payments | Мой чартер | Оператор, модель ВС | — | — |
| `chartered-boat` | booking, escrow, identity | Мой чартер яхты | Яхта-модель / оператор | — | — |

`*` — подписки типа «безлимит внутренних рейсов»; пока редко.

### 2.3 Rental — краткосрочный

| Card-type | Primitives | Instance | Type | Sub | NFT |
|---|---|---|---|---|---|
| `car-rental-short` | booking, payments, escrow, identity, credentials | Моя бронь | Модель авто / прокатная компания | ✅ | — |
| `motorbike-rental` | booking, credentials(A), escrow | Моя бронь | Модель / оператор | — | — |
| `bike-rental` / `kick-scooter-rental` | booking, location(geofence), payments | Активная поездка | Оператор / тариф | ✅ | — |
| `boat-rental-bareboat` | booking, credentials(IYT/ICC), escrow | Моя бронь яхты | Модель яхты / марина | — | — |
| `yacht-rental-crewed` | booking, escrow, payments | Моя бронь | Яхта / оператор | — | — |
| `jetski-pwc-rental` | booking, identity, escrow | Бронь | Модель | — | — |
| `kayak-sup-rental` | booking, payments | Бронь | Школа / локация | — | — |
| `rv-campervan-rental` | booking, credentials, escrow | Бронь | Модель RV / оператор | — | — |
| `camping-gear-rental` | booking, escrow | Бронь комплекта | Модель/бренд снаряжения | — | — |
| `ski-snowboard-rental` | booking, inventory | Бронь | Бренд/модель | — | — |
| `diving-gear-rental` | booking, credentials(PADI), escrow | Бронь | Дайв-центр / бренд | — | — |
| `photo-video-gear-rental` | booking, escrow, identity | Бронь камеры | Модель камеры/объектива | — | — |
| `instrument-rental` | booking, escrow | Бронь | Модель инструмента | — | — |
| `construction-equipment-rental` | booking, escrow, credentials | B2B-бронь | Модель техники / парк | — | — |
| `event-equipment-rental` | booking, escrow | Бронь комплекта | Поставщик / комплект-шаблон | — | ✅ (шаблон комплекта) |
| `clothing-rental` | booking, escrow | Бронь платья | Модель / бренд | ✅ | — |
| `tool-rental` | booking | Бронь | Модель инструмента / магазин | — | — |

### 2.4 Rental — долгосрочный и stay

| Card-type | Primitives | Instance | Type | Sub | NFT |
|---|---|---|---|---|---|
| `apartment-short-let` | booking, payments, escrow, reviews | Моё бронирование | Объект / ЖК / район | — | — |
| `hotel-room` | booking, inventory | Моя бронь | Отель / сеть / класс номера | ✅ (loyalty) | — |
| `hostel-bed` | booking | Моя бронь кровати | Хостел | — | — |
| `house-villa-short-let` | booking, escrow, reviews | Моё бронирование | Вилла-объект | — | — |
| `apartment-long-let` | booking(contract), escrow, identity | Моя аренда | ЖК / район / рынок | — | — |
| `room-in-shared-flat` | booking, identity, reviews | Моя комната | Квартира / roommates | — | — |
| `office-coworking-day` | booking | Моя бронь | Пространство / сеть | ✅ | — |
| `office-long-lease` | booking(B2B), financing | Мой контракт | Здание / владелец | — | — |
| `warehouse-storage` | booking, inventory | Мой склад-юнит | Комплекс | ✅ | — |
| `parking-spot` | booking, location | Моё место | Паркинг / район | ✅ | — |
| `timeshare-slot` | booking, ownership | Моя доля + слот | Объект / программа | — | ✅ (slot-share) |
| `boat-club-membership` | subscription, booking | Моя подписка | Клуб | ✅ | — |
| `car-subscription` | subscription, booking, credentials | Моя подписка | Программа / модельный ряд | ✅ | — |

### 2.5 Purchase — переход владения

| Card-type | Primitives | Instance | Type | Sub | NFT |
|---|---|---|---|---|---|
| `car-purchase-new` | payments, financing, ownership, escrow | Моя покупка | Модель / дилер | — | — |
| `car-purchase-used` | ownership, escrow, inspection | Моя покупка | Модель | — | — |
| `motorbike-purchase` | ownership, financing | Моя покупка | Модель | — | — |
| `boat-yacht-purchase` | ownership, escrow, inspection(survey) | Моя покупка | Модель яхты | — | — |
| `rv-camper-purchase` | ownership, financing | Моя покупка | Модель | — | — |
| `real-estate-purchase-primary` | ownership(кадастр), escrow, financing(mortgage) | Моя квартира | ЖК / застройщик | — | — |
| `real-estate-purchase-secondary` | ownership, escrow, financing | Моя квартира | Район / дом | — | — |
| `land-plot-purchase` | ownership(кадастр), escrow | Мой участок | Локация / КП | — | — |
| `commercial-re-purchase` | ownership, financing, escrow | Мой объект | Район / класс | — | — |
| `auction-listing` | auction-engine, escrow | Моя ставка / моя продажа | Лот / аукцион-дом | — | — |
| `equipment-purchase-b2b` | financing(leasing), ownership | Моя техника | Модель / производитель | — | — |
| `collectibles-purchase` | ownership, authorship, escrow | Моя коллекция-предмет | Выпуск / автор | — | ✅ |

### 2.6 Content / creator economy

| Card-type | Primitives | Instance | Type | Sub | NFT |
|---|---|---|---|---|---|
| `photo-asset` | authorship, media | Моё фото | Шаблон / стиль / автор | ✅ | ✅ |
| `video-asset` | authorship, media, moderation | Моё видео | Канал / шоу | ✅ | ✅ |
| `music-track` | authorship, media | Моя запись | Трек / артист | ✅ | ✅ |
| `code-module` | authorship, licensing | Моё использование | Пакет / автор | ✅ | ✅ |
| `game-mini-app` | authorship, sandbox | Моя сессия/прогресс | Игра / студия | ✅ | ✅ |
| `course` | authorship, subscription, timeline | Мой прогресс | Курс / автор | ✅ | ✅ |
| `pattern-template` | pattern-engine, authorship | Моя инстанциация | Шаблон / автор | ✅ | ✅ |

### 2.7 Care / живые сущности

| Card-type | Primitives | Instance | Type | Sub | NFT |
|---|---|---|---|---|---|
| `pet` | ownership, credentials(pedigree/vax), booking | Мой питомец | Порода / заводчики | ✅ | — |
| `livestock` | ownership, credentials | Моё животное | Порода / рынок | — | — |
| `plant-garden` | ownership, timeline | Мой сад / растение | Вид / сорт | — | — |

### 2.8 Health / wellness

| Card-type | Primitives | Instance | Type | Sub | NFT |
|---|---|---|---|---|---|
| `pregnancy-tracker` | timeline, identity, privacy | Моя беременность | Программа наблюдения | — | — |
| `chronic-care-plan` | timeline, identity, credentials | Мой план | Программа / клиника | ✅ | — |
| `fitness-plan` | timeline, subscription | Мой план | Программа / тренер | ✅ | ✅ (шаблон плана) |
| `medical-appointment` | booking, credentials | Мой приём | Клиника / специалист | — | — |

### 2.9 Services / household

| Card-type | Primitives | Instance | Type | Sub | NFT |
|---|---|---|---|---|---|
| `home-cleaning` | booking, escrow, reviews | Моя заявка | Сервис / исполнитель | ✅ | — |
| `repair-request` | booking, escrow, reviews, credentials | Моя заявка | Категория работ / мастер | — | — |
| `food-delivery` | booking, location, payments | Мой заказ | Ресторан / кухня | ✅ | — |
| `grocery-delivery` | booking, inventory, location | Мой заказ | Магазин / бренд | ✅ | — |
| `laundry-service` | booking | Моя заявка | Сервис | ✅ | — |

### 2.10 Work / economic activity

| Card-type | Primitives | Instance | Type | Sub | NFT |
|---|---|---|---|---|---|
| `job-posting` | identity, credentials, messenger | Моя заявка на вакансию | Компания / роль | — | — |
| `freelance-gig` | booking, escrow, reviews, timeline | Мой проект | Специализация / исполнитель | — | ✅ (шаблон услуги) |
| `contract-deal` | escrow, timeline, disputes | Мой контракт | Шаблон сделки | — | ✅ |

### 2.11 Events / tickets

| Card-type | Primitives | Instance | Type | Sub | NFT |
|---|---|---|---|---|---|
| `event-ticket` | booking, inventory, identity | Мой билет | Событие / площадка / артист | — | ✅ (edition-tickets) |
| `festival-pass` | subscription, booking | Мой pass | Фестиваль | ✅ | ✅ |
| `sports-match-ticket` | booking, inventory | Мой билет | Команда / лига | ✅ | ✅ |

## 3. Как это читать

- Каждая строка таблицы = ровно **один** `packages/card-types/<name>/` плагин.
- Каждый плагин обязан реализовать **instance.view**, **type.view** и 8 panel-providers (см. `05-shell-entity-model.md` §7).
- **Primitives** — закрытый список сервисов Layer-2/3. Если card-type просит что-то, чего нет в списке, — это сигнал вынести новый **примитив**, а не лепить его внутрь card-type.
- **Sub** ✅ означает, что card-type умеет быть объектом подписки (пользователь может подписаться на type или на instance-провайдера).
- **NFT** ✅ означает, что type-представление может быть поднято в `authorship-registry` / `ownership-registry` как шаблон с royalty и публичным авторством.

## 4. Что из этого вытекает для каталога сервисов

Новые примитивы, которые обязаны появиться (выделены из первоначального каталога v6):

- `services/auction-engine` — bidding, anti-sniping, reserve-price.
- `services/escrow-service` — holding funds/assets до выполнения условий.
- `services/financing-service` — loans/lease/mortgage/BNPL.
- `services/ownership-registry` — универсальный граф владения (физическое + цифровое), обобщение `authorship-registry`.
- `services/credentials-vault` — лицензии, сертификаты, медицинские допуски, KYC-уровни.
- `services/inspection-service` — timeline-step-provider для survey / инспекции (used-car, boat-survey, real-estate, art).
- `services/policy-engine` — runtime geo/age/compliance ограничения (allow / distill / deny).
- `services/subscription-engine` — универсальные подписки.
- `services/reviews-ratings` — рейтинги как сервис.
- `services/disputes` — разбор конфликтов (rental damage, purchase claims, freelance).

Итого ~10 новых Layer-2/3 сервисов сверх initial v6-списка. Ни один из них не vertical-specific.

## 5. Фрактальность card-type'ов

Каждый card-type, независимо от вертикали, **обязан**:

- Реализовать 6 секций CardView в каноничном порядке (HEADER / TIMELINE / SUMMARY / ACTIONS / SECTIONS / FOOTER — см. `17-fractal-ux.md` §5).
- Реализовать 3 секции PanelView для каждой из 8 panel-providers (см. `17-fractal-ux.md` §6).
- Не вводить новых жестов, переключателей, цветов (I19).
- Использовать только layout-компоненты из `packages/ui-react` (I20).
- Покрываться fractal-harness тестом (I23).

Следствие: сравнение `packages/card-types/car/` и `packages/card-types/clothing-rental/` на уровне структуры кода должно быть **почти идентичным** — меняются только Zod-схемы, источники данных и копирайт-строки.

## 6. Инвариант

> **Новая вертикаль = новый `packages/card-types/<name>` + (если повезёт) zero новых сервисов. Если вертикаль требует нового сервиса — это horizontal primitive, а не vertical-service.**
>
> **Новая вертикаль НЕ вводит новых UI-правил. Только новые данные в существующую фрактальную грамматику.**
