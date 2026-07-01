# 11. Creator Economy

Система, в которой **любой пользователь** может:

- Опубликовать свою фотографию, видео, музыку, код, игру, шаблон-паттерн, курс как **asset** с чётким авторством.
- Получать **royalty** за каждое использование — в том числе рекурсивно, если его asset форкнул кто-то другой, а форк форкнули снова.
- Превратить asset в **подписку** (Unlock-like): подписчики получают доступ, автор получает регулярный доход.
- Вести всё это **off-chain** как дефолт, опционально **mint'ить on-chain** на Polygon/Base для публичной верифицируемости.

Это не «NFT-фича» сбоку. Это отдельный слой-примитив, через который идёт **любой** монетизируемый контент.

## 1. Три уровня абстракции

| Уровень | Суть | Пример | NFT-mintable |
|---|---|---|---|
| **Type** | Категория без автора | «автомобиль», «песня», «алгоритм сортировки» | — |
| **Template** | Конкретный authored artifact, форкаемый | «Мой маршрут Стамбул-3дня», «трек X», «modulе кода Y» | ✅ |
| **Instance** | Использование template (ре-композиция, подписка, покупка) | «Я купил этот трек», «я форкнул маршрут и изменил» | Опц. |

Регулируется инвариант: **Type — не mintable.** Нельзя запатентовать «жанр маршрута» или «способ варки борща». Template — можно.

## 2. Два регистра

### `services/authorship-registry` — кто автор и как делится

- Хранит граф Template → Fork(Template) → Fork(Fork) → …
- Каждый template имеет **split-policy**: как распределяется доход.
- Каждый fork наследует split-policy родителя + добавляет свою долю форкера.
- Итог: доход от instance рекурсивно расщепляется через весь lineage.

### `services/ownership-registry` — кто владеет

- Для **физических активов**: VIN, кадастр, судовой реестр (Фазы 5+).
- Для **цифровых** (`collectibles`, `photo-asset`, `music-track` edition, `game-mini-app` copy): кто купил, кому продал, провенанс-цепочка.
- Обобщает authorship: **authorship** — это particular case ownership для «первого автора».

Граница: **authorship = кто создал**, **ownership = кто сейчас держит**. Royalty платится по authorship (автору), покупка/передача прав — по ownership.

## 3. Split policy

Декларативное описание, как доход расщепляется:

```ts
{
  splits: [
    { party: 'author:u_123', share: 0.70 },           // автор
    { party: 'platform',     share: 0.10 },           // комиссия
    { party: 'tag:music-fund', share: 0.05 },         // общий фонд
    { party: 'forks-lineage', share: 0.15 },          // цепочка апстрим-форков
  ],
  forksLineageRule: 'geometric',  // 1/2, 1/4, 1/8, ...
  currency: 'USDT' | 'RUB' | 'points',
  minDistribution: 0.01,           // не распределять меньше 1 цента
  dustPolicy: 'accumulate',        // dust → автору следующего payout
}
```

**forksLineageRule**:
- `equal` — 15% делится поровну между всеми апстрим-форками.
- `geometric` — ближайший форк-родитель получает 1/2 от лениджа, его родитель 1/4, и т.д.
- `linear` — пропорционально глубине.
- `custom` — lambda через `pattern-engine` (редко).

## 4. Recursive royalty routing (инвариант I10)

Пример: Алиса опубликовала маршрут «Стамбул-3дня» как template. Боб его форкнул, поменял дни 2-3 и опубликовал «Стамбул-с-Босфором». Карина форкнула Боба и поменяла отель. Дима купил маршрут Карины за $20.

```
Template chain:   Алиса → Боб → Карина
Покупатель:       Дима (через Карину)

Split @ Карина:   {author: 70%, platform: 10%, tag: 5%, lineage: 15%}
Lineage geometric: [Боб: 7.5%, Алиса: 3.75%]   (остаток 3.75% — platform-fund)

Итог $20:
  Карина  $14.00
  Platform $2.00
  Tag-fund $1.00
  Боб     $1.50
  Алиса   $0.75
  Fund    $0.75
```

Распределение — атомарная транзакция в `wallet` (TigerBeetle после Фазы 6) + событие `app.daria.authorship.royalty-distributed.v1` в `financial-audit` JetStream stream (5 лет retention).

## 5. Licenses и защита

Template при публикации получает **license** из фиксированного таксономического списка:

| License | Форк разрешён | Коммерческое использование | Royalty форку |
|---|---|---|---|
| `CC0` | ✅ | ✅ | ❌ (автор отказался) |
| `CC-BY` | ✅ | ✅ | ❌ (только атрибуция) |
| `CC-BY-SA` | ✅ (с той же лицензией) | ✅ | ❌ |
| `CC-BY-NC` | ✅ | ❌ | ❌ |
| `MIT` | ✅ | ✅ | ❌ |
| `GPL` | ✅ (форк под GPL) | ✅ | ❌ |
| `Commercial-1x` | ❌ | Только через покупку | — |
| `Commercial-Subscription` | ❌ | Только через подписку | — |
| `Royalty-Fork` | ✅ с отчислениями | ✅ | **✅** |
| `Private` | ❌ | ❌ (только автор) | — |

**Default для нового template** — `Royalty-Fork` (платформа поощряет форкать, автор получает долю).

## 6. Similar-by-scheme (копирайт, не патент)

Правило авторского права, не патентного: **нельзя запретить другому создать похожий по схеме template**, если он написан независимо.

- Если пользователь создаёт template «Стамбул-3дня» **без форка** чужого (with sufficient originality) — это новый template с отдельной split-policy. Никаких royalty в чужую сторону.
- Чтобы получить royalty, нужно показать **lineage** (fork-ссылка). Без fork-edge — lineage нет.
- Подтверждение «копирования без форка» — DMCA-like процесс через `services/moderation-review` + `services/disputes`.

## 7. Subscription-as-NFT (подписки)

`services/subscription-engine` интегрируется с `authorship-registry`. Подписка на template = владение «ключом доступа» на период:

```
subscription:
  template: tpl_music_album_42
  holder:   u_456
  valid:    { from: 2026-05-01, until: 2027-05-01 }
  status:   active | expired | cancelled | refunded
  source:   { paymentTx: 'tx_abc', mintTx?: 'eth_0x...' }
```

**Правила:**
- Владелец подписки видит asset, пока статус `active`. Timeline автоматически завершает «access-window» по `until`.
- Подписка может быть **переуступлена** (resale) — переход регистрируется в `ownership-registry` + royalty автору через split-policy.
- Групповые подписки (семья, команда) — один holder + list of members.
- Подписки на людей/компании/bundle'ы — то же самое, template = `person-subscription-template`.

## 8. Off-chain default, on-chain optional

**Default: off-chain.**
- Authorship хранится в Postgres `authorship_registry` как append-only log с hash-chain.
- Evidence (автограф, timestamp, hash контента) фиксируется в `audit-log` (WORM).
- Проверка авторства — через publicly verifiable audit-endpoint.

**Optional: on-chain mint.**
- Автор может **по желанию** опубликовать template на Polygon/Base (дешёвые чейны).
- Mint включает: `template_id`, `content_hash`, `split_policy_hash`, `timestamp`, `author_address`.
- Mint — это дополнительный evidence; **не меняет** royalty-логику (та остаётся off-chain).
- Полезно для дорогого контента, где нужна глобальная верификация провенанса (искусство, music-royalties пулы).

**Никогда не требуем on-chain для базового функционала.** Чейны — опциональный «штамп нотариуса».

## 9. Cards-types, задействующие creator economy

Из `06-card-types-matrix.md`:

- `photo-asset`, `video-asset`, `music-track` — медиа
- `code-module`, `game-mini-app` — код и игры
- `pattern-template` — рецепты и шаблоны процессов
- `course`, `fitness-plan` — образовательные/wellness-пакеты
- `event-equipment` (шаблоны комплектов), `contract-deal` (шаблоны сделок), `freelance-gig` (шаблоны услуг)
- `collectibles`, `timeshare-slot`, `event-ticket`, `festival-pass`, `sports-match-ticket` — Edition-based

Каждый из них в `type-view` показывает:
- Автора / лицензию / split-policy
- Цепочку форков (lineage graph визуально)
- Кнопку «fork» или «подписаться» или «купить»
- Живой поток royalty-распределений (если автор)

## 10. Антипаттерны

- ❌ Использовать уникальный ID template как «патент» на идею. Similar-by-scheme разрешён.
- ❌ Менять split-policy template'а ретроспективно — split фиксируется на момент purchase/subscription.
- ❌ Писать royalty в обычную Postgres-таблицу балансов. Только через `wallet` + TigerBeetle (Фаза 6+).
- ❌ Скрывать lineage от пользователя — граф форков публичен для всех `Royalty-Fork` / `CC-*` лицензий.
- ❌ Считать off-chain authorship «второсортным» — это основной режим. On-chain — optional layer.

## 11. Чеклист внедрения (Фаза 2 + Фаза 4)

**Фаза 2 (primitive):**
- [ ] `authorship-registry` сервис + API
- [ ] Split-policy evaluator + payout orchestrator
- [ ] Lineage graph storage + geometric/equal/linear rules
- [ ] License taxonomy в `packages/contracts-domain`
- [ ] Append-only audit в WORM

**Фаза 4 (первая боевая):**
- [ ] `pattern-template` + `photo-asset` + `code-module` как card-types
- [ ] `subscription-engine` с subscription-as-NFT моделью
- [ ] Similar-by-scheme процесс в `disputes` + `moderation-review`
- [ ] UI: lineage-graph в type-view, live royalty stream
- [ ] End-to-end тест рекурсивного payout на fork→fork→fork→purchase
