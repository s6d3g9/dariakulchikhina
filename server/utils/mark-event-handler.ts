import type { EventHandler } from 'h3'

type MarkedEventHandler<T extends EventHandler> = T & {
  __is_handler__?: true
}

export function markEventHandler<T extends EventHandler>(handler: T): T {
  ;(handler as MarkedEventHandler<T>).__is_handler__ = true
  return handler
}