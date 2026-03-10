-- Migration: Add designer_accounts table
-- Дата: 2025-01-01
-- Описание: Таблица для хранения логин-данных дизайнеров (email + пароль для ЛК)

CREATE TABLE IF NOT EXISTS designer_accounts (
  id            SERIAL PRIMARY KEY,
  designer_id   INTEGER NOT NULL UNIQUE REFERENCES designers(id) ON DELETE CASCADE,
  email         TEXT    NOT NULL UNIQUE,
  password_hash TEXT    NOT NULL,
  created_at    TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMP NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE designer_accounts IS 'Логин-данные дизайнеров для входа в личный кабинет /designer/login';
