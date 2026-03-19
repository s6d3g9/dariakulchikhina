# Communications Service

Отдельный сервис для проектных чатов и signaling слоя аудио/видео звонков.

Сервис построен как zero-knowledge relay:

- текст сообщений хранится только в виде ciphertext;
- участники публикуют только публичные key bundles;
- signaling payload для звонков сервис не расшифровывает;
- аудио и видео не проходят через сервис вообще.

Сервис не занимается передачей медиа-потока. Он решает две задачи:

1. Хранение и раздача зашифрованных сообщений по комнатам.
2. Обмен публичными key bundles для E2EE.
3. Realtime signaling для WebRTC: offer, answer, ICE candidate, room-key, key-rotate, reject, hangup.

## Durable storage

Если задан `COMMUNICATIONS_DATABASE_URL`, сервис автоматически создаёт свои таблицы в PostgreSQL и сохраняет:

- комнаты;
- участников комнат;
- ciphertext сообщений;
- публичные key bundles;
- signal events для аудита и отладки.

Если `COMMUNICATIONS_DATABASE_URL` не задан, используется in-memory fallback.

## Почему отдельный сервис

- realtime-логика изолирована от основного Nuxt backend;
- later integration идёт через HTTP/SSE API и HMAC-токены;
- сервис можно масштабировать и развивать независимо.

## Протокол авторизации

Сервис ожидает Bearer token или query param `token`.

Формат токена:

1. `base64url(JSON payload)`
2. `.`, затем `base64url(hmac_sha256(payload, COMMUNICATIONS_AUTH_SECRET))`

Payload:

```json
{
  "actorId": "admin-1",
  "role": "admin",
  "displayName": "Дарья",
  "roomRefs": ["project:demo-flat"],
  "scopes": ["rooms:admin"],
  "exp": 1760000000
}
```

`roomRefs` позволяет дать токену доступ к конкретным внешним room reference, например `project:my-project-slug`.

## Основные маршруты

### Health

`GET /health`

### Dev token

`POST /v1/dev/token`

Работает только если `COMMUNICATIONS_ALLOW_DEV_TOKEN_ISSUE=true`.

### Комнаты

`POST /v1/rooms`

```json
{
  "externalRef": "project:demo-flat",
  "title": "Проект demo-flat",
  "kind": "project",
  "participants": [
    { "actorId": "admin-1", "role": "admin", "displayName": "Дарья" },
    { "actorId": "contractor-17", "role": "contractor", "displayName": "Игорь" }
  ]
}
```

`GET /v1/rooms/by-external?externalRef=project:demo-flat`

`GET /v1/rooms/:roomId`

`POST /v1/rooms/:roomId/participants`

`PUT /v1/rooms/:roomId/me/nickname`

```json
{
  "nickname": "daria_design"
}
```

Никнейм нормализуется к lowercase, хранится у участника комнаты и должен быть уникальным внутри комнаты.

### Публичные ключи участников

`GET /v1/rooms/:roomId/key-bundles`

`POST /v1/rooms/:roomId/key-bundles`

```json
{
  "keyId": "device-admin-macbook-01",
  "algorithm": "ECDH-P256",
  "publicKeyJwk": {
    "kty": "EC",
    "crv": "P-256",
    "x": "...",
    "y": "...",
    "ext": true,
    "key_ops": []
  },
  "deviceId": "admin-macbook"
}
```

### Сообщения

`GET /v1/rooms/:roomId/messages?limit=50`

`POST /v1/rooms/:roomId/messages`

```json
{
  "encrypted": {
    "version": "e2ee-v1",
    "algorithm": "AES-GCM-256",
    "ciphertext": "base64...",
    "iv": "base64...",
    "senderKeyId": "device-admin-macbook-01",
    "mimeType": "text/plain"
  }
}
```

Сервис не видит plaintext и не может восстановить сообщение без ключа комнаты, который распределяется клиентами напрямую.

### Realtime SSE

`GET /v1/rooms/:roomId/events`

Сервер отправляет события:

- `ready`
- `message.created`
- `key-bundle.published`
- `signal`
- `participant.joined`
- `participant.updated`

### Signaling для звонков

`POST /v1/rooms/:roomId/signals`

```json
{
  "kind": "offer",
  "callId": "call-demo-1",
  "targetActorKey": "contractor:contractor-17",
  "payload": {
    "sdp": "..."
  }
}
```

Поддерживаемые `kind`:

- `invite`
- `ringing`
- `offer`
- `answer`
- `ice-candidate`
- `room-key`
- `key-rotate`
- `call-key`
- `reject`
- `hangup`
- `mute`
- `unmute`

## E2EE модель

### Чаты

1. Каждый клиент генерирует локальную ECDH identity pair.
2. Публичный ключ публикуется в room key bundles.
3. Один из участников создаёт симметричный room key для AES-GCM.
4. Room key оборачивается отдельно для каждого участника через ECDH-derived wrapping key.
5. Обёрнутые ключи отправляются через signaling событие `room-key`.
6. Все сообщения отправляются только как `encrypted` envelope.

### Звонки

- signaling идёт через этот сервис;
- медиа идёт peer-to-peer по WebRTC;
- WebRTC уже использует DTLS-SRTP end-to-end между peers, поскольку сервис не работает как SFU или MCU;
- при необходимости app-level key rotation можно отправлять через `call-key` и `key-rotate`.

## Локальный запуск

```bash
cd services/communications-service
cp .env.example .env
node --watch --experimental-strip-types src/index.ts
```

Для локальной БД можно использовать контейнер из корневого [docker-compose.yml](docker-compose.yml):

```bash
docker compose up -d postgres
```

Или из корня репозитория:

```bash
pnpm comm:dev
```

## Как подключить к кабинетам позже

1. Основной Nuxt backend mint-ит HMAC-токен для текущего субъекта.
2. Кабинет генерирует локальную identity key pair и публикует public key bundle.
3. Кабинет получает или room по `externalRef=project:<slug>`, или создаёт его один раз.
4. UI открывает `EventSource` на `/v1/rooms/:roomId/events?token=...`.
5. Room key распределяется между участниками через signaling `room-key`.
6. Сообщения идут через `POST /messages` только в зашифрованном виде.
7. WebRTC signaling идёт через `POST /signals`, а медиа остаётся peer-to-peer.

## Ограничения текущего инкремента

- realtime fan-out пока process-local, без Redis;
- delivery best-effort для активных SSE-подписок;
- call state не оркестрируется, сервис только ретранслирует signaling-события;
- room key lifecycle реализуется клиентом; сервис хранит только публичные ключи и ciphertext.

Следующий логичный этап после этого — Redis fan-out для нескольких инстансов сервиса.