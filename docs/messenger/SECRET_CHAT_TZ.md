# ТЗ: Secret Chat Для Messenger

## Статус

Документ фиксирует первую полную спецификацию режима secret chat для standalone messenger.

Цель документа:

- определить продуктовые правила secret chat;
- описать изменения backend и frontend;
- разделить обязательный MVP и последующие фазы;
- исключить ложную индикацию безопасности в интерфейсе.

## Цель

Добавить в messenger отдельный режим secret chat, который создаётся из контактов как самостоятельный тип разговора и поддерживает:

- E2EE для текстовых сообщений;
- E2EE для вложений и голосовых сообщений;
- отдельные правила показа preview и forwarding;
- возможность удаления любого сообщения любым участником в этом режиме;
- отдельный onboarding первого открытия;
- звонки в secret chat с честной индикацией режима безопасности;
- beta-путь для дополнительного E2EE звонков без ухудшения стабильности обычных звонков.

## Продуктовая модель

### Типы разговоров

В messenger должны существовать два типа личных разговоров:

- direct
- direct-secret

Secret chat не является визуальным флагом поверх direct. Это отдельная сущность со своей policy-моделью.

### Основные правила secret chat

Для direct-secret действуют правила:

- текстовые сообщения отправляются только в зашифрованном виде;
- plaintext preview последнего сообщения в списке чатов не показывается;
- вложения должны быть зашифрованы;
- голосовые сообщения должны быть зашифрованы;
- любой участник может удалить любое сообщение;
- пересылка сообщений из secret chat запрещена;
- onboarding-плашка показывается только при первом открытии и исчезает после первого отправленного сообщения;
- звонки в secret chat должны иметь явную маркировку режима безопасности:
  - WebRTC-only
  - beta E2EE

### Ограничения первой версии

В первой версии не входят:

- disappearing messages по таймеру;
- групповые secret chats;
- полноценный multi-device key recovery;
- обязательное включение дополнительного E2EE звонков по умолчанию;
- серверные media previews для зашифрованных вложений.

## UX-спецификация

### Создание secret chat из контактов

Экран: Contacts.

Поведение:

- при нажатии на карточку контакта остаётся текущее действие: открыть обычный чат;
- при hold или context menu на карточке контакта открывается меню действий;
- меню должно содержать:
  - Чат
  - Секретный чат
  - Удалить контакт

Если secret chat уже существует для этой пары пользователей, пункт Секретный чат открывает существующий разговор.

### Отображение secret chat в списке чатов

Экран: Chats.

Для direct-secret необходимо:

- визуально отличать карточку чата от обычного direct;
- показывать badge или метку Секретный чат;
- не показывать plaintext последнего сообщения;
- вместо последнего текста показывать безопасную подпись:
  - Секретное сообщение
  - Вложение зашифровано
  - Голосовое сообщение зашифровано
  - Сообщений пока нет

### Отображение secret chat в шапке разговора

Экран: Chat.

В шапке direct-secret должны быть:

- метка secret режима;
- явная security-индикация;
- отдельная copy для звонков:
  - WebRTC-only
  - Beta E2EE

### Onboarding-плашка первого открытия

При первом открытии direct-secret пользователь видит информационную плашку.

Текст плашки должен сообщать:

- сообщения зашифрованы;
- вложения зашифрованы;
- звонки beta или WebRTC-only;
- любой участник может удалить любое сообщение.

Правила показа:

- плашка показывается только один раз для конкретного пользователя в конкретном secret chat;
- если пользователь отправил первое сообщение в этом чате, плашка исчезает;
- после исчезновения плашка больше не должна показываться повторно в этом чате.

### Правила взаимодействия с сообщениями

Для direct-secret:

- удалить может любой участник;
- изменить может только автор сообщения;
- переслать нельзя;
- preview reply/comment не должны раскрывать plaintext за пределами правил secret mode;
- при ошибке расшифровки показывается безопасная заглушка, а не fallback plaintext.

## Backend-спецификация

### Изменения модели Conversation

Файл: messenger/core/src/conversation-store.ts

Требуется расширить MessengerConversationRecord.

Минимальные новые поля:

```ts
kind: 'direct' | 'direct-secret'
policy?: {
  secret: boolean
  allowMutualDelete: boolean
  encryptedMessages: boolean
  encryptedAttachments: boolean
  encryptedVoice: boolean
  callsSecurityMode: 'webrtc-only' | 'beta-e2ee'
  allowForwardOut: boolean
  hideListPreview: boolean
}
members?: Record<string, {
  introSeenAt?: string
  introDismissedAt?: string
  firstMessageSentAt?: string
}>
```

### Создание secret conversation

Файл: messenger/core/src/server.ts

Добавить новый endpoint:

- POST /conversations/secret

Body:

```json
{
  "peerUserId": "uuid"
}
```

Правила:

- разговор разрешён только между подтверждёнными контактами;
- если direct-secret для пары уже есть, вернуть существующий;
- если нет, создать новый;
- emit realtime events для обоих участников.

### Функция создания secret conversation

Файл: messenger/core/src/conversation-store.ts

Добавить отдельную функцию:

- findOrCreateSecretConversation(userId, peerUserId)

Правила:

- для пары пользователей допускается один active direct-secret;
- secret chat хранит policy с безопасными значениями по умолчанию.

### Изменения listConversationsForUser

Файл: messenger/core/src/conversation-store.ts

Conversation overview должен возвращать дополнительные поля:

```ts
kind: 'direct' | 'direct-secret'
secret: boolean
listPreviewMode: 'plain' | 'protected'
securityBadge: 'secret' | 'standard'
```

Для direct-secret plaintext preview скрывается.

### Изменения listMessagesForConversation

Файл: messenger/core/src/conversation-store.ts

Ответ messages endpoint должен возвращать сам conversation вместе с policy и member state, чтобы frontend мог:

- отличать direct от direct-secret;
- показывать onboarding;
- понимать delete policy;
- понимать rules для forwarding и call mode.

### Изменения удаления сообщений

Файл: messenger/core/src/conversation-store.ts

Сейчас deleteMessageFromConversation запрещает удаление чужих сообщений.

Новая логика:

- для direct: оставить текущее поведение;
- для direct-secret: любой участник может удалить любое сообщение;
- удаление должно оставлять безопасную запись о факте удаления;
- attachment и encryptedBody должны очищаться.

### Изменения редактирования сообщений

Файл: messenger/core/src/conversation-store.ts

Редактирование остаётся доступным только автору сообщения.

Для direct-secret дополнительно:

- plaintext body для новых сообщений не используется;
- encryptedBody обязателен для text messages.

### Изменения forwarding

Файл: messenger/core/src/server.ts
Файл: messenger/core/src/conversation-store.ts

Для direct-secret forwarding должен быть запрещён.

Правило первой версии:

- если source conversation или target conversation является direct-secret, вернуть ошибку FORWARD_FORBIDDEN_IN_SECRET_CHAT.

### Onboarding state

Файл: messenger/core/src/conversation-store.ts
Файл: messenger/core/src/server.ts

Нужны endpoints для member onboarding state.

Минимальный вариант:

- POST /conversations/:conversationId/secret-intro/seen

Body:

```json
{
  "dismissed": true
}
```

Но предпочтительнее обновлять это автоматически:

- при первой загрузке secret chat записать introSeenAt;
- при первой отправке сообщения автором записать firstMessageSentAt и introDismissedAt.

### Realtime

Текущих events достаточно:

- conversations.updated
- messages.updated
- call.signal

Но они должны корректно работать с direct-secret.

## Frontend-спецификация

### Contacts

Файл: messenger/web/app/components/messenger/MessengerContactsSection.vue

Нужно:

- расширить hold menu на карточке контакта;
- добавить действия:
  - открыть обычный чат;
  - открыть secret chat;
  - удалить контакт;
- при выборе secret chat вызывать новый метод composable.

### Conversations composable

Файл: messenger/web/app/composables/useMessengerConversations.ts

Нужно:

- расширить MessengerConversationItem полями kind, secret, policy, member state;
- добавить метод openSecretConversation(peerUserId);
- в loadMessages сохранять conversation policy из backend response;
- отключать forwarding для secret chat;
- учитывать mutual delete policy;
- учитывать onboarding state.

### Crypto composable

Файл: messenger/web/app/composables/useMessengerCrypto.ts

Нужно:

- ужесточить режим для direct-secret;
- не использовать plaintext fallback для новых secret text messages;
- подготовить отдельный encrypted media API для второй фазы;
- при необходимости хранить wrapped key и для собственного участника, чтобы уменьшить риск потери session state.

### Chats list

Файл: messenger/web/app/components/messenger/MessengerChatsSection.vue

Нужно:

- отрисовывать secret badge на карточке чата;
- скрывать plaintext preview;
- показывать безопасные status strings для secret chat.

### Chat screen

Файл: messenger/web/app/components/messenger/MessengerChatSection.vue

Нужно:

- показывать secret badge и policy state в header;
- показывать onboarding-плашку первого открытия;
- скрывать её после первого отправленного сообщения;
- не показывать кнопку forwarding в secret mode;
- разрешать удаление любого сообщения в secret mode;
- честно показывать call mode:
  - WebRTC-only
  - Beta E2EE

### Message thread

Файл: messenger/web/app/components/messenger/MessengerMessageThread.vue

Нужно:

- получать пропсы delete policy и forward policy;
- скрывать кнопку Переслать в secret mode;
- показывать кнопку Удалить для любого сообщения в secret mode;
- оставлять кнопку Изменить только для автора.

### Global styles

Файл: messenger/web/app/assets/css/main.css

Нужно:

- отдельный visual language для secret chat;
- стили onboarding-плашки;
- стили secret badge для chats list и chat header;
- стили security summary и call mode badge.

## Encrypted Media: Обязательная Вторая Фаза

### Почему это обязательно

Надпись вложения зашифрованы допустима только после реального encrypted attachment flow.

До реализации encrypted attachments onboarding-плашка не должна обещать то, чего система не делает.

Допустимые варианты до релиза второй фазы:

- либо не показывать фразу вложения зашифрованы;
- либо скрыть отправку вложений в secret chat;
- либо маркировать это как скоро будет доступно.

### Требования ко второй фазе

Нужно:

- шифровать файл на клиенте до upload;
- хранить ciphertext на сервере;
- расшифровывать на клиенте при просмотре;
- перевести voice messages на тот же поток;
- обновить attachment rendering и storage metadata.

## Secret Calls: Обязательная Бета-Фаза

### Текущее состояние

В messenger уже существует экспериментальный call E2EE слой, но он вызывал регрессию отсутствия звука и поэтому отключён по умолчанию.

### Требование к secret chat

Для первой версии direct-secret звонки должны работать так:

- базовый режим: обычный WebRTC call со штатным шифрованием;
- расширенный режим: beta E2EE only when supported.

### Правила UI для звонков

В шапке и onboarding нужно честно показывать одно из двух:

- WebRTC-only
- Beta E2EE

Emoji verification для звонков допустима только когда extra call E2EE действительно активно.

### Что нужно реализовать для beta E2EE calls

- feature detection по браузеру;
- включение только в secret chat;
- отдельный beta flag;
- fallback на обычный WebRTC без поломки аудио;
- security UI с verification emojis;
- тест-матрица по браузерам.

## Поэтапный план реализации

### Фаза 1: Secret Chat Foundation

Обязательный объём:

- новый kind direct-secret;
- новый endpoint создания secret chat;
- secret chat action в контактах;
- secret badge в chats list и header;
- onboarding-плашка первого открытия;
- исчезновение onboarding после первого отправленного сообщения;
- mutual delete only for secret chat;
- forwarding forbidden for secret chat;
- hide plaintext preview in chats list.

Результат:

- secret chat существует как отдельная сущность;
- onboarding работает корректно;
- UI не врёт о policy поведения сообщений.

### Фаза 2: Strict Text E2EE For Secret Mode

Обязательный объём:

- encryptedBody обязателен для новых text messages в secret chat;
- безопасная обработка decrypt failure;
- ужесточение preview logic;
- минимальная стабилизация key lifecycle.

Результат:

- text secret chat действительно работает как строгий защищённый режим.

### Фаза 3: Encrypted Attachments And Voice

Обязательный объём:

- encrypted file upload;
- encrypted voice messages;
- client-side decrypt on open;
- updated preview and rendering model.

Результат:

- onboarding может честно утверждать, что вложения зашифрованы.

### Фаза 4: Secret Calls Beta

Обязательный объём:

- secret-chat-specific call policy;
- WebRTC-only stable default;
- optional beta E2EE call path;
- emojis and verification UX;
- fallback without audio regressions.

Результат:

- звонки в secret chat работают стабильно и честно маркируются по уровню защиты.

## Acceptance Criteria

### Для Фазы 1

- из Contacts можно создать secret chat;
- secret chat отображается в Chats отдельно от обычного direct;
- при первом открытии показывается onboarding;
- после первого отправленного сообщения onboarding исчезает и не возвращается;
- в secret chat любой участник может удалить любое сообщение;
- в secret chat forwarding недоступен;
- plaintext preview последнего сообщения в списке не раскрывается.

### Для Фазы 2

- новые secret text messages не отправляются как plaintext;
- decrypt failure не раскрывает fallback body;
- relation preview obeys secret mode policy.

### Для Фазы 3

- attachments в secret chat хранятся на сервере только в зашифрованном виде;
- voice messages в secret chat шифруются;
- пользователь может открыть и расшифровать attachment только на клиенте.

### Для Фазы 4

- базовые звонки в secret chat работают стабильно;
- security badge честно показывает WebRTC-only или Beta E2EE;
- extra E2EE calls не ломают звук при fallback.

## Риски

Главные риски:

- encrypted attachments существенно меняют media pipeline;
- call E2EE остаётся технически рискованным из-за browser compatibility;
- отсутствие полноценного multi-device recovery может ломать UX secret chats при смене устройства;
- неверная UI copy может обещать уровень защиты, которого система ещё не достигла.

## Рекомендация по реализации

Не реализовывать весь объём одним большим проходом.

Рекомендуемый порядок:

1. Фаза 1
2. Фаза 2
3. Фаза 3
4. Фаза 4

Если нужно выпускать раньше, допустим только релиз Фазы 1 и Фазы 2 вместе, но без обещаний о зашифрованных вложениях и beta E2EE calls до завершения следующих фаз.