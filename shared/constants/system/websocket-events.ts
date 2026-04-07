export const WEBSOCKET_EVENT_VALUES = [
  'project-updated',
  'project-room-message',
  'project-room-signal',
  'project-room-key-rotate',
  'chat-contact-invite',
  'chat-contact-update',
  'chat-message',
  'chat-agent-update',
] as const

export type WebsocketEvent = typeof WEBSOCKET_EVENT_VALUES[number]
