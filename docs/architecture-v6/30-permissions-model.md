# 30. Permissions Model

Разрешения в v6 — **данные**, а не код. Одна унифицированная модель для всех ресурсов: entities, Pattern-Cards, templates, conversations, assets. Evaluation через `policy-engine` (runtime), storage — per-ресурс через `permissions` поле. Никаких ad-hoc `if (user.id === item.ownerId)` — это нарушение I8.

## 1. Модель

Каждый ресурс хранит **список grants**:

```ts
type Permission = {
  subject:    Subject               // кому
  action:     Action                // что можно
  condition?: PolicyExpr            // опционально — runtime-условие
  grantedBy:  UserId | 'system'
  grantedAt:  Timestamp
  expiresAt?: Timestamp
}

type Subject =
  | { kind: 'user',   id: UserId }
  | { kind: 'role',   id: RoleId }            // 'moderator', 'compliance'
  | { kind: 'group',  id: GroupId }           // конкретная group-conversation
  | { kind: 'public' }                         // все (в т.ч. анонимные)
  | { kind: 'authed' }                         // любой authenticated user
  | { kind: 'owners' }                         // derive из ownership-registry
  | { kind: 'community', id: CommunityId }

type Action =
  // CRUD
  | 'read'  | 'write'  | 'delete'  | 'list'
  // Pattern-Card
  | 'fork'  | 'publish-as-template'  | 'materialize'
  // Money
  | 'purchase' | 'subscribe' | 'receive-royalty'
  // Messaging
  | 'send-message' | 'invite' | 'remove-member'
  // Admin
  | 'moderate' | 'audit-view'
  // …расширяется per-resource
```

## 2. Принципы

### P1. Owner ≠ automatic permission

Ownership (из `ownership-registry`) — это **факт** владения. Permissions — **отдельный слой**. По умолчанию owner имеет все действия, но это выражено через permission:
```json
{ "subject": {"kind":"owners"}, "action": "*" }
```
Можно убрать (co-владелец с ограниченными правами) или расширить.

### P2. Least privilege

Default: только owner. Всё остальное — явные grants.

### P3. Permissions — append-only в audit

Каждый grant / revoke пишется в `audit-log` WORM (I17). Через 2 года понятно, когда и кто открыл доступ.

### P4. Policy-engine evaluation

```
authorize(user, action, resource) =
  permissions(resource) has matching (subject, action, condition? evaluated true)
  AND policy-engine.evaluate(user, action, context) ≠ deny
```

Оба должны пройти. Permission разрешает «в принципе», policy-engine — «здесь и сейчас» (regional / KYC / time).

### P5. Condition — power без произвола

`condition` — policy-expression (подмножество policy DSL). Примеры:
- `user.kyc.level >= 2`
- `time.hour in [9..18]`
- `user.region == resource.region`
- `user.credentials has 'iyt.coastal'`

Это **те же** выражения, что в law-profiles — одна система.

## 3. Стандартные presets

Чтобы не писать custom permissions на каждую мелочь, есть presets per-resource-kind:

### Pattern-Card (instance)

| Preset | Permissions |
|---|---|
| `private` | owners: * |
| `shared-with-list` | owners: *, users[..]: read |
| `link-shareable` | owners: *, public: read (read-only, no write) |
| `editable-by-collaborators` | owners: *, users[..]: read+write |

### Template

| Preset | Permissions |
|---|---|
| `cc0` | owners: *, public: read+fork+materialize |
| `cc-by` | owners: *, public: read+fork+materialize (attribution condition) |
| `royalty-fork` | owners: *, public: read+fork+materialize (royalty-split applies) |
| `commercial-1x` | owners: *, public: read, authed: purchase → grants materialize |
| `private` | owners: * |

### Conversation

| Preset | Permissions |
|---|---|
| `dm` | participants: read+send-message |
| `group-open` | participants: * + invite, authed: read+request-to-join |
| `group-invite-only` | participants: * |
| `entity-thread` | entity-owner: *, invited: read+send-message |
| `community-open` | moderators: *, authed: read+send-message+join (policy-engine может применить moderation) |

Presets — лишь UI-shortcut. Под капотом всегда — список permission-объектов.

## 4. Разрешения vs roles

| Тип | Уровень | Пример |
|---|---|---|
| **Permission** | per-ресурс | «Алиса может читать timeline моего проекта» |
| **Role** | глобальный | «модератор», «компliance», «security» |
| **Scope** (из Zitadel) | AuthN-level | `domain:wallet:transfer` — API-level |

Три независимых слоя. Для конкретного action:
1. Zitadel scope есть? (API может быть вызван вообще).
2. Role подходит? (e.g. moderator → моделирует любую conversation без явной invitation).
3. Permission разрешает? (per-resource grant).

## 5. Специальные role-based shortcuts

Ряд actions доступен ролям вне per-resource permissions:

```yaml
role: moderator
  auto-grants:
    - conversation.moderate (любая community с policy-tag 'moderation-open')
    - message.redact
    - report.review

role: compliance
  auto-grants:
    - audit.view.any
    - user.view-pii (для compliance запросов)

role: security
  auto-grants:
    - audit.view.any
    - secret.rotate
    - incident.respond

role: admin (platform)
  auto-grants:
    - policy.edit
    - feature-flag.flip
    - service.deploy
```

Role assignment **всегда** требует 4-eyes (двое утверждают) + пишется в audit. Никакого self-assignment.

## 6. Derivations

Некоторые permissions derive-яется из ownership/relationship:

| Derived | Источник |
|---|---|
| `owners` | `ownership-registry.findOwnersOf(resource.id)` |
| `co-authors` | `authorship-registry.findLineageSiblings(template.id)` |
| `participants` | `messenger.findParticipants(conversation.id)` |
| `subscribers` | `subscription-engine.findSubscribersOf(template.id)` |

Evaluation получает эти list'ы при check (может быть cached per-user-per-resource на 5 мин).

## 7. Sharing flow (UX фрактально)

Кнопка «Share» в ActionBar'е любой Pattern-Card открывает **один и тот же** bottom-sheet:

- Copy link (если link-shareable).
- Add people / groups.
- Choose preset (Public view-only / Collaborative edit / Subscribe-gated / Private).
- Duration / expiry.
- Notify added (opt-in).

Under the hood — POST `/permissions` с grant'ами. Никакого «кастомного share» на картинки/видео/timelines/projects — всё через один flow.

## 8. Visibility

Visibility ≠ permission, но связан:

- `public` — любой может найти в search, открыть, увидеть non-restricted секции.
- `discoverable` — показывается в search при явном совпадении (полное имя, точный slug), но не в рекомендациях.
- `private` — виден только owner'у и явно добавленным.
- `hidden` — не виден никому, кроме owner'а (для archived).

Visibility — `resource.visibility`, поле отдельно от permissions. Permissions регулируют **что делать**, visibility — **можно ли найти вообще**.

## 9. Per-field permissions

Некоторые ресурсы имеют **поля разной чувствительности**:

```
Pattern-Card:
  id, title, summary                        — public (visibility depends)
  timeline[*].evidence                      — private by default
  params.budget                             — share-with-collaborators
  params.paymentMethod                      — owner-only always
```

Реализуется через `fieldPolicies` — аналог permissions, но per-field:

```ts
fieldPolicies: {
  'params.budget':        { reveal: ['owners', 'collaborators'] },
  'params.paymentMethod': { reveal: ['owners'] },
  'timeline.evidence':    { reveal: ['owners', 'inspector-role'] },
}
```

Client получает объект с уже маскированными полями (`null` или placeholder `***`).

## 10. Pattern-Card composition: permissions inheritance

Child Pattern-Card (в compound'е) **не** наследует permissions автоматически:

- Child имеет свой список permissions.
- Compound имеет свой.
- Доступ к compound ≠ доступ к child (можно показать roadmap, скрыть детали бронирования).

Так сделано потому что child может быть независимой сущностью (ты шерил compound, но hotel-бронь — твой private).

Exception: при `fork` compound'а — permissions children копируются (если fork'аемые).

## 11. Subscription-gated access

Есть особенность для `Commercial-Subscription` template'ов:

```ts
permission.action: 'materialize'
permission.subject: { kind: 'authed' }
permission.condition: 'user.subscriptions has template.id active'
```

Динамически: subscription active → condition true → permission granted. Expiry — revokes (condition → false).

## 12. Audit

Каждый check пишется в `audit-log` (выборочно — для mutation-actions, чтобы не завалить логи):

```
app.daria.permissions.granted.v1
app.daria.permissions.revoked.v1
app.daria.permissions.checked.v1 { userId, action, resource, result, policyDecision, reason }
```

## 13. UX-видимость permissions

В Pattern-Card / entity / conversation — отдельная SECTION «Доступ»:

- Кто имеет access (список subjects + permissions).
- Когда был grant (с audit-link).
- CTA «изменить», «добавить», «отозвать».

Shell использует тот же `<Section>` с `role='permissions'`. Фрактально.

## 14. Антипаттерны

- ❌ `if (user.id === resource.ownerId)` в коде — используй `authorize()`.
- ❌ Permissions в Redis без source-of-truth в Postgres.
- ❌ Роль «super-admin» с unlimited permissions — нет такой.
- ❌ Share-link без expiry (по умолчанию — 30 дней, можно extend).
- ❌ Grant'ы без audit.
- ❌ Role assignment одним человеком.
- ❌ Permissions, дублирующие visibility (если resource private, не нужно grantить «public: read»).
- ❌ Check на клиенте без server-side повторной проверки.
