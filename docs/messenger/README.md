# Messenger

Отдельный продукт мессенджера внутри репозитория.

## Source Of Truth

Главные правила и технологический стек описаны в [../../.github/instructions/messenger.instructions.md](../../.github/instructions/messenger.instructions.md).

## Structure

- `messenger/web` — standalone Nuxt web client
- `messenger/core` — standalone Fastify realtime backend

## First Target

Собрать отдельный messenger shell, который не зависит от основного приложения и может развиваться как самостоятельный продукт.