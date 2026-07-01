/**
 * packages/card-types/person-profile/schemas.ts
 *
 * Zod схемы для instance и type. Используются:
 * - UI для рендера view + panels
 * - Contract-harness (I23) для проверки data-shape
 * - SDK генерации (contracts-domain)
 *
 * NOTE: zod добавляется в workspace в Фазе 0. Сейчас — декларативный skeleton.
 */

// Импорт zod будет активирован в Фазе 0.
// import { z } from 'zod'

// ─── Instance (конкретный человек) ────────────────────────────
export interface PersonInstance {
  id: string
  kind: 'person-profile'
  view: 'instance'
  mode?: 'consumer' | 'provider'

  // Identity
  displayName: string
  avatarUrl?: string
  verified: boolean
  badges: string[]

  // Locality
  region?: string          // country code
  timezone?: string
  languages?: string[]

  // Role / provider
  primaryRoleId?: string   // ссылка на type-view
  isProvider?: boolean

  // Privacy
  visibility: 'public' | 'discoverable' | 'private'

  // System
  version: number
  createdAt: string        // ISO UTC
  updatedAt: string
  deletedAt?: string
}

// ─── Type (публичная роль) ────────────────────────────────────
export interface PersonType {
  id: string
  kind: 'person-profile'
  view: 'type'

  title: string            // "Musician", "Yoga teacher", "Company: Tesla"
  description: string
  avatarUrl?: string
  brandSkin?: {
    tokens: Record<string, string>   // overlay на design-tokens
  }

  categories: string[]     // каталог
  languages?: string[]

  // Кто представляет эту роль (один или multi)
  representatives: string[]   // person-instance IDs

  // System
  version: number
  createdAt: string
  updatedAt: string
}

// ─── Panel payloads (типы для panel-provider'ов) ──────────────

export interface PanelPayload_Top_Instance {
  stories: Array<{
    id: string
    thumbnail: string
    createdAt: string
  }>
  galleryCount: number
}

export interface PanelPayload_Left_Instance {
  shopItems: Array<{
    id: string
    kind: 'template' | 'subscription' | 'service'
    title: string
    priceCents: number
    currency: string
  }>
}

export interface PanelPayload_Right_Instance {
  conversations: Array<{
    id: string
    kind: 'dm' | 'entity-thread'
    title: string
    unreadCount: number
  }>
}

export interface PanelPayload_Bottom_Instance {
  posts: Array<{
    id: string
    text: string
    createdAt: string
    reactionsCount: number
  }>
}

export interface PanelPayload_Top_Type {
  officialChannels: Array<{ id: string; title: string; url: string }>
  fanContent: Array<{ id: string; thumbnail: string }>
}

export interface PanelPayload_Left_Type {
  magazine: Array<{
    id: string
    title: string
    category: string
    priceCents?: number
  }>
}

export interface PanelPayload_Right_Type {
  communities: Array<{
    id: string
    title: string
    memberCount: number
    joinPolicy: 'open' | 'request' | 'invite-only'
  }>
}

export interface PanelPayload_Bottom_Type {
  feed: Array<{
    id: string
    authorId: string
    text: string
    isOfficial: boolean
    createdAt: string
  }>
}

/**
 * Zod схемы (placeholders). Будут активированы в Фазе 0:
 *
 * export const ZPersonInstance = z.object({ ... })
 * export const ZPersonType     = z.object({ ... })
 * export const ZPanelPayload_Top_Instance = z.object({ ... })
 * ... и т.д.
 */
