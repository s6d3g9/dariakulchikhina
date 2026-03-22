<script setup lang="ts">
type MessengerIconName =
  | 'access'
  | 'chat'
  | 'chats'
  | 'clock'
  | 'close'
  | 'comment'
  | 'copy'
  | 'contacts'
  | 'delete'
  | 'device'
  | 'edit'
  | 'forward'
  | 'hangup'
  | 'key'
  | 'logout'
  | 'microphone'
  | 'paperclip'
  | 'peer'
  | 'refresh'
  | 'reply'
  | 'send'
  | 'settings'
  | 'shield'
  | 'smile'
  | 'video'
  | 'phone'

type IconShapeTag = 'circle' | 'path' | 'polyline' | 'rect'

interface IconShape {
  tag: IconShapeTag
  attrs: Record<string, number | string>
}

interface IconDefinition {
  viewBox?: string
  shapes: IconShape[]
}

const props = withDefaults(defineProps<{
  name: MessengerIconName
  size?: number
}>(), {
  size: 18,
})

const settingsModel = useMessengerSettings()
const theme = computed(() => settingsModel.theme?.value || settingsModel.settings.value.themes)

function strokePath(d: string, strokeWidth = 1.75): IconShape {
  return {
    tag: 'path',
    attrs: {
      d,
      fill: 'none',
      stroke: 'currentColor',
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
      'stroke-width': strokeWidth,
    },
  }
}

function fillPath(d: string): IconShape {
  return {
    tag: 'path',
    attrs: {
      d,
      fill: 'currentColor',
    },
  }
}

function strokeRect(x: number, y: number, width: number, height: number, rx: number, strokeWidth = 1.75): IconShape {
  return {
    tag: 'rect',
    attrs: {
      x,
      y,
      width,
      height,
      rx,
      fill: 'none',
      stroke: 'currentColor',
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
      'stroke-width': strokeWidth,
    },
  }
}

function strokeCircle(cx: number, cy: number, r: number, strokeWidth = 1.75): IconShape {
  return {
    tag: 'circle',
    attrs: {
      cx,
      cy,
      r,
      fill: 'none',
      stroke: 'currentColor',
      'stroke-width': strokeWidth,
    },
  }
}

const liquidIcons: Record<MessengerIconName, IconDefinition> = {
  access: {
    shapes: [
      strokePath('M12 4.75 18.25 7.5v4.12c0 3.7-2.46 7.05-6.25 8.13-3.79-1.08-6.25-4.43-6.25-8.13V7.5L12 4.75Z'),
      strokePath('m9.5 12 1.6 1.6 3.4-3.45'),
    ],
  },
  chat: {
    shapes: [strokePath('M7.5 18.25 4.75 19l.75-2.55V8.25A2.5 2.5 0 0 1 8 5.75h8A2.5 2.5 0 0 1 18.5 8.25v5.5a2.5 2.5 0 0 1-2.5 2.5H9.45l-1.95 2Z')],
  },
  chats: {
    shapes: [
      strokePath('M6.75 6.75h10.5A1.75 1.75 0 0 1 19 8.5v5A1.75 1.75 0 0 1 17.25 15.25H6.75A1.75 1.75 0 0 1 5 13.5v-5a1.75 1.75 0 0 1 1.75-1.75Z'),
      strokePath('M8.25 15.25v1a1.75 1.75 0 0 0 1.75 1.75h7.25A1.75 1.75 0 0 0 19 16.25v-5.5'),
    ],
  },
  clock: {
    shapes: [strokeCircle(12, 12, 8.5), strokePath('M12 7.5v4.75l3.2 1.9')],
  },
  close: {
    shapes: [strokePath('m7 7 10 10M17 7 7 17', 1.9)],
  },
  comment: {
    shapes: [strokePath('M7.5 18.25 4.75 19l.75-2.55V8.25A2.5 2.5 0 0 1 8 5.75h8A2.5 2.5 0 0 1 18.5 8.25v5.5a2.5 2.5 0 0 1-2.5 2.5H9.45l-1.95 2Z')],
  },
  copy: {
    shapes: [strokeRect(8, 7, 9.25, 11.25, 2.1, 1.75), strokeRect(5.5, 4.75, 9.25, 11.25, 2.1, 1.75)],
  },
  contacts: {
    shapes: [
      strokePath('M9 11.25a2.75 2.75 0 1 0 0-5.5 2.75 2.75 0 0 0 0 5.5Z'),
      strokePath('M15.75 12.25a2.25 2.25 0 1 0 0-4.5 2.25 2.25 0 0 0 0 4.5Z'),
      strokePath('M4.75 17a4.25 4.25 0 0 1 8.5 0'),
      strokePath('M13.25 17a3.5 3.5 0 0 1 7 0'),
    ],
  },
  delete: {
    shapes: [
      strokePath('M8 8.5h8'),
      strokePath('M9.25 8.5V7a1.25 1.25 0 0 1 1.25-1.25h3a1.25 1.25 0 0 1 1.25 1.25v1.5'),
      strokePath('M7.25 8.5l.55 8.1A1.5 1.5 0 0 0 9.3 18h5.4a1.5 1.5 0 0 0 1.5-1.4l.55-8.1'),
    ],
  },
  device: {
    shapes: [strokeRect(7.25, 3.75, 9.5, 16.5, 2.25), strokePath('M10 6.75h4M11.1 17.75h1.8')],
  },
  edit: {
    shapes: [strokePath('m8 16 6.8-6.8 1.95 1.95L10 17.95H8V16Z'), strokePath('M13.7 7.25 15 5.95a1.38 1.38 0 1 1 1.95 1.95l-1.3 1.3')],
  },
  forward: {
    shapes: [strokePath('M13.25 5.75 18.5 11l-5.25 5.25'), strokePath('M5.5 11H18')],
  },
  hangup: {
    shapes: [strokePath('M15.8 8.2a9.3 9.3 0 0 0-7.6 0l-1.7-1.7a1 1 0 0 0-1.1-.23 7.2 7.2 0 0 0-2.03 1.37 1 1 0 0 0-.05 1.41l3.02 3.2a1 1 0 0 0 1.2.2l1.96-1.07a6.3 6.3 0 0 1 5.08 0l1.96 1.07a1 1 0 0 0 1.2-.2l3.02-3.2a1 1 0 0 0-.05-1.4 7.2 7.2 0 0 0-2.03-1.38 1 1 0 0 0-1.1.23L15.8 8.2Z')],
  },
  key: {
    shapes: [strokePath('M14.5 8.75a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z'), strokePath('M11 11.5l7.25 7.25M15.5 15.5h2.25v2.25')],
  },
  logout: {
    shapes: [strokePath('M10 7.75V6.5A1.75 1.75 0 0 1 11.75 4.75h5.75A1.75 1.75 0 0 1 19.25 6.5v11a1.75 1.75 0 0 1-1.75 1.75h-5.75A1.75 1.75 0 0 1 10 17.5v-1.25'), strokePath('M13.75 12H5.25M8.5 8.75 5.25 12l3.25 3.25')],
  },
  microphone: {
    shapes: [strokePath('M12 15.25a3.25 3.25 0 0 0 3.25-3.25V7.5a3.25 3.25 0 1 0-6.5 0V12A3.25 3.25 0 0 0 12 15.25Z'), strokePath('M6.75 11.75a5.25 5.25 0 0 0 10.5 0M12 17v2.5M9 19.5h6')],
  },
  paperclip: {
    shapes: [strokePath('M9.1 12.9 15.8 6.2a3.35 3.35 0 1 1 4.74 4.73l-8.1 8.1a5.2 5.2 0 1 1-7.35-7.36l7.05-7.05', 1.85)],
  },
  peer: {
    shapes: [strokePath('M8.25 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z'), strokePath('M15.75 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z'), strokePath('M4.75 18a4.5 4.5 0 0 1 7 0M12.75 18a3.75 3.75 0 0 1 6 0')],
  },
  phone: {
    shapes: [strokePath('M7.42 5.25h2.12c.32 0 .61.2.72.5l1.06 2.87a.78.78 0 0 1-.18.82l-1.62 1.63a12.8 12.8 0 0 0 5.4 5.4l1.63-1.62a.78.78 0 0 1 .82-.18l2.87 1.06c.3.11.5.4.5.72v2.12a1.9 1.9 0 0 1-2.05 1.9c-7.92-.5-14.2-6.78-14.7-14.7a1.9 1.9 0 0 1 1.9-2.05Z', 1.8)],
  },
  refresh: {
    shapes: [strokePath('M19.25 8.5A7.25 7.25 0 0 0 6.6 6.12M4.75 8.25V5.5h2.75M4.75 15.5A7.25 7.25 0 0 0 17.4 17.88M19.25 15.75v2.75H16.5')],
  },
  reply: {
    shapes: [strokePath('M10 8.25 5.5 12 10 15.75'), strokePath('M6 12h6.75a5.75 5.75 0 0 1 5.75 5.75')],
  },
  send: {
    shapes: [
      fillPath('M4.95 11.8 18.84 5.65c1.08-.48 2.16.6 1.69 1.69l-6.15 13.89c-.45 1.03-1.93 1.06-2.42.05l-1.9-3.98a1.75 1.75 0 0 0-.86-.86l-3.98-1.9c-1.01-.49-.98-1.97.05-2.42Z'),
      strokePath('M9.78 16.3 20.1 5.98', 1.5),
    ],
  },
  settings: {
    shapes: [strokePath('m12 4.75 1.11 1.78 2.06.35.56 2.02 1.9.91-.37 2.05 1.37 1.57-1.37 1.57.37 2.05-1.9.91-.56 2.02-2.06.35L12 19.25l-1.11 1.78-2.06-.35-.56-2.02-1.9-.91.37-2.05-1.37-1.57 1.37-1.57-.37-2.05 1.9-.91.56-2.02 2.06-.35L12 4.75Z', 1.6), strokeCircle(12, 12, 2.5, 1.6)],
  },
  shield: {
    shapes: [strokePath('M12 3.75c2.18 1.53 4.7 2.37 7.35 2.45v5.05c0 4.18-2.47 7.94-6.3 9.58l-1.05.45-1.05-.45c-3.83-1.64-6.3-5.4-6.3-9.58V6.2c2.65-.08 5.17-.92 7.35-2.45Z', 1.7)],
  },
  smile: {
    shapes: [strokeCircle(8.25, 9.5, 2.9, 1.65), strokeCircle(15.75, 9.5, 2.9, 1.65), strokePath('M6.2 17.4c1-.95 2.23-1.4 3.55-1.4 1.33 0 2.55.45 3.55 1.4M13.7 17.4c.62-.58 1.42-.93 2.3-1.03', 1.65)],
  },
  video: {
    shapes: [strokePath('M4.75 8A2.75 2.75 0 0 1 7.5 5.25h6A2.75 2.75 0 0 1 16.25 8v1.33l3.1-1.76c.58-.33 1.3.09 1.3.76v7.34c0 .67-.72 1.09-1.3.76l-3.1-1.76V16a2.75 2.75 0 0 1-2.75 2.75h-6A2.75 2.75 0 0 1 4.75 16V8Z', 1.8)],
  },
}

const materialIcons: Record<MessengerIconName, IconDefinition> = {
  access: {
    shapes: [strokePath('M12 5.1 17.8 7.6v4.02c0 3.38-2.13 6.29-5.8 7.4-3.67-1.11-5.8-4.02-5.8-7.4V7.6L12 5.1Z', 1.9), strokePath('m9.2 12.1 1.65 1.65 3.95-4.05', 1.9)],
  },
  chat: {
    shapes: [strokeRect(5.25, 5.5, 13.5, 10.25, 3.25, 1.9), strokePath('M9.5 15.75 6.25 18.5v-2.75', 1.9)],
  },
  chats: {
    shapes: [strokeRect(4.75, 6.25, 11.75, 8.75, 2.75, 1.9), strokeRect(7.5, 9, 11.75, 8.75, 2.75, 1.9)],
  },
  clock: {
    shapes: [strokeCircle(12, 12, 8.2, 1.9), strokePath('M12 8.3v4.4l2.95 1.75', 1.9)],
  },
  close: {
    shapes: [strokePath('M7.5 7.5 16.5 16.5M16.5 7.5l-9 9', 2)],
  },
  comment: {
    shapes: [strokeRect(5.25, 5.5, 13.5, 10.25, 3.25, 1.9), strokePath('M9.5 15.75 6.25 18.5v-2.75', 1.9)],
  },
  copy: {
    shapes: [strokeRect(8.15, 7.15, 9, 11, 2.25, 1.9), strokeRect(5.8, 4.85, 9, 11, 2.25, 1.9)],
  },
  contacts: {
    shapes: [strokeCircle(9, 9, 2.5, 1.9), strokeCircle(16.15, 10.1, 2.1, 1.9), strokePath('M4.9 17.3c.45-2.48 2.45-4.05 4.1-4.05 1.66 0 3.65 1.57 4.1 4.05', 1.9), strokePath('M13.5 17.3c.4-1.9 1.86-3.1 3.45-3.1 1.58 0 3.05 1.2 3.45 3.1', 1.9)],
  },
  delete: {
    shapes: [strokePath('M8 8h8', 1.9), strokePath('M9.6 8V6.75c0-.8.65-1.45 1.45-1.45h1.9c.8 0 1.45.65 1.45 1.45V8', 1.9), strokePath('M7.7 8.1 8.25 17c.06.95.84 1.7 1.8 1.7h3.9c.96 0 1.74-.75 1.8-1.7l.55-8.9', 1.9)],
  },
  device: {
    shapes: [strokeRect(7.1, 3.75, 9.8, 16.5, 2.6, 1.9), strokePath('M10.2 6.75h3.6M10.9 17.65h2.2', 1.9)],
  },
  edit: {
    shapes: [strokePath('m7.9 16.1 6.55-6.55 2 2-6.6 6.55H7.9v-2Z', 1.9), strokePath('M13.95 8.6 15.2 7.3a1.45 1.45 0 1 1 2.05 2.05L16 10.6', 1.9)],
  },
  forward: {
    shapes: [strokePath('M12.6 6.25 18 11.65 12.6 17.05', 1.9), strokePath('M6 11.65h11.6', 1.9)],
  },
  hangup: {
    shapes: [fillPath('M8.25 7.95a9.7 9.7 0 0 1 7.5 0l1.65-1.55c.3-.28.74-.35 1.1-.18a7.1 7.1 0 0 1 2.06 1.45c.3.32.3.82 0 1.14l-3.1 3.18a.92.92 0 0 1-1.08.18l-2.04-1.02a6.7 6.7 0 0 0-4.68 0l-2.04 1.02a.92.92 0 0 1-1.08-.18L3.44 8.81a.82.82 0 0 1 0-1.14A7.1 7.1 0 0 1 5.5 6.22c.36-.17.8-.1 1.1.18l1.65 1.55Z')],
  },
  key: {
    shapes: [strokeCircle(10.4, 9.2, 3.3, 1.9), strokePath('M12.85 11.65 18.8 17.6M15.2 14h2.3v2.25', 1.9)],
  },
  logout: {
    shapes: [strokePath('M9.75 7.6V6.45c0-.94.76-1.7 1.7-1.7h5.15c.94 0 1.7.76 1.7 1.7v11.1c0 .94-.76 1.7-1.7 1.7h-5.15c-.94 0-1.7-.76-1.7-1.7V16.4', 1.9), strokePath('M13.5 12H5.4M8.1 9.15 5.25 12 8.1 14.85', 1.9)],
  },
  microphone: {
    shapes: [strokeRect(9.15, 4.8, 5.7, 8.8, 2.85, 1.9), strokePath('M6.85 11.7a5.15 5.15 0 0 0 10.3 0M12 16.85v2.35M9.2 19.2h5.6', 1.9)],
  },
  paperclip: {
    shapes: [strokePath('M8.95 13.1 15.35 6.7a3.15 3.15 0 1 1 4.45 4.45l-7.95 7.95a5 5 0 1 1-7.1-7.05l6.85-6.85', 1.95)],
  },
  peer: {
    shapes: [strokeCircle(8.4, 8.5, 2.7, 1.9), strokeCircle(15.9, 9.85, 2.25, 1.9), strokePath('M4.9 17.4c.5-2.35 2.2-3.85 3.5-3.85 1.31 0 3 1.5 3.5 3.85', 1.9), strokePath('M12.65 17.4c.45-1.8 1.72-2.95 3.25-2.95 1.52 0 2.8 1.15 3.25 2.95', 1.9)],
  },
  phone: {
    shapes: [strokePath('M7.55 5.6h1.9c.28 0 .53.18.63.44l.95 2.5a.8.8 0 0 1-.18.84l-1.42 1.47a11.7 11.7 0 0 0 4.72 4.72l1.47-1.42a.8.8 0 0 1 .84-.18l2.5.95c.26.1.44.35.44.63v1.9a1.8 1.8 0 0 1-1.95 1.8c-7.1-.45-12.75-6.1-13.2-13.2a1.8 1.8 0 0 1 1.8-1.95Z', 1.95)],
  },
  refresh: {
    shapes: [strokePath('M18.8 8.6a6.95 6.95 0 0 0-11.7-2.1M5.2 8.35v-3h3', 1.9), strokePath('M5.2 15.4a6.95 6.95 0 0 0 11.7 2.1M18.8 15.65v3h-3', 1.9)],
  },
  reply: {
    shapes: [strokePath('M9.9 8.35 5.8 12l4.1 3.65', 1.9), strokePath('M6.2 12h6.45A5.35 5.35 0 0 1 18 17.35', 1.9)],
  },
  send: {
    shapes: [fillPath('M4.55 11.95 19.05 5.5c.9-.4 1.8.5 1.4 1.4l-6.45 14.5c-.37.83-1.56.85-1.95.04l-1.7-3.6a1.6 1.6 0 0 0-.78-.78l-3.6-1.7c-.8-.39-.79-1.58.03-1.95Z')],
  },
  settings: {
    shapes: [strokePath('M12 5.15 13 6.7l1.9.3.5 1.85 1.75.85-.35 1.9 1.25 1.4-1.25 1.45.35 1.85-1.75.85-.5 1.85-1.9.3L12 18.85l-1 .55-1.9-.3-.5-1.85-1.75-.85.35-1.85-1.25-1.45 1.25-1.4-.35-1.9 1.75-.85.5-1.85 1.9-.3 1-.55Z', 1.85), strokeCircle(12, 12, 2.15, 1.85)],
  },
  shield: {
    shapes: [strokePath('M12 4.2c2.15 1.45 4.5 2.22 6.95 2.3v4.7c0 3.95-2.28 7.38-5.9 8.95l-1.05.45-1.05-.45c-3.62-1.57-5.9-5-5.9-8.95V6.5c2.45-.08 4.8-.85 6.95-2.3Z', 1.9)],
  },
  smile: {
    shapes: [strokeCircle(8.2, 9.4, 2.65, 1.85), strokeCircle(15.8, 9.4, 2.65, 1.85), strokePath('M6.1 17.2c.95-.8 2.18-1.2 3.65-1.2 1.46 0 2.7.4 3.65 1.2M13.45 17.2c.55-.47 1.28-.78 2.15-.9', 1.85)],
  },
  video: {
    shapes: [strokeRect(4.75, 6.2, 11.8, 11.1, 2.9, 1.95), strokePath('M16.55 9.4 20.1 7.45c.52-.3 1.15.08 1.15.68v7.74c0 .6-.63.98-1.15.68l-3.55-1.95', 1.95)],
  },
}

const liquidIconOverrides: Partial<Record<MessengerIconName, IconDefinition>> = {
  access: {
    shapes: [
      strokePath('M12 4.95 18.05 7.5v4.1c0 3.45-2.18 6.46-6.05 7.6-3.87-1.14-6.05-4.15-6.05-7.6V7.5L12 4.95Z', 1.72),
      strokePath('m9.15 12.15 1.7 1.7 4-4.12', 1.72),
    ],
  },
  close: {
    shapes: [strokePath('M7.4 7.4 16.6 16.6M16.6 7.4l-9.2 9.2', 1.82)],
  },
  chat: {
    shapes: [
      strokePath('M6.35 7.65A1.9 1.9 0 0 1 8.25 5.75h7.5a1.9 1.9 0 0 1 1.9 1.9v4.85a1.9 1.9 0 0 1-1.9 1.9h-4.7l-3.95 3.05v-3.05h1.15a1.9 1.9 0 0 1-1.9-1.9V7.65', 1.68),
    ],
  },
  chats: {
    shapes: [
      strokePath('M4.95 7.85A1.7 1.7 0 0 1 6.65 6.15h6.7a1.7 1.7 0 0 1 1.7 1.7v3.95a1.7 1.7 0 0 1-1.7 1.7H9.05l-2.4 1.95V13.5a1.7 1.7 0 0 1-1.7-1.7V7.85', 1.68),
      strokePath('M9.35 10.3A1.7 1.7 0 0 1 11.05 8.6h6.3a1.7 1.7 0 0 1 1.7 1.7v3.65a1.7 1.7 0 0 1-1.7 1.7h-4.05l-1.95 1.85v-1.85a1.7 1.7 0 0 1-1.7-1.7V10.3', 1.68),
    ],
  },
  comment: {
    shapes: [
      strokePath('M6.35 7.65A1.9 1.9 0 0 1 8.25 5.75h7.5a1.9 1.9 0 0 1 1.9 1.9v4.85a1.9 1.9 0 0 1-1.9 1.9h-4.7l-3.95 3.05v-3.05h1.15a1.9 1.9 0 0 1-1.9-1.9V7.65', 1.68),
    ],
  },
  contacts: {
    shapes: [
      strokeCircle(8.55, 9.05, 2.45, 1.68),
      strokeCircle(15.8, 9.95, 2.05, 1.68),
      strokePath('M4.95 17.35c.56-2.08 2.2-3.42 3.6-3.42 1.4 0 3.03 1.34 3.6 3.42', 1.68),
      strokePath('M13.1 17.35c.44-1.5 1.58-2.46 2.7-2.46 1.13 0 2.27.96 2.71 2.46', 1.68),
    ],
  },
  copy: {
    shapes: [
      strokeRect(8.05, 7.15, 9, 10.8, 2.55, 1.68),
      strokeRect(5.7, 4.8, 9, 10.8, 2.55, 1.68),
    ],
  },
  delete: {
    shapes: [
      strokePath('M8.15 7.85h7.7', 1.72),
      strokePath('M9.6 7.85V6.65c0-.76.61-1.37 1.37-1.37h2.06c.76 0 1.37.61 1.37 1.37v1.2', 1.72),
      strokePath('M7.55 8.1 8.08 17a1.6 1.6 0 0 0 1.6 1.5h4.64a1.6 1.6 0 0 0 1.6-1.5l.53-8.9', 1.72),
    ],
  },
  forward: {
    shapes: [
      strokePath('M8.1 6.55 15 12l-6.9 5.45', 1.72),
      strokePath('M5.9 12H14.8', 1.72),
    ],
  },
  logout: {
    shapes: [
      strokePath('M10.15 7.15v-.9a1.55 1.55 0 0 1 1.55-1.55h5.1a1.55 1.55 0 0 1 1.55 1.55v11.5a1.55 1.55 0 0 1-1.55 1.55h-5.1a1.55 1.55 0 0 1-1.55-1.55v-.9', 1.72),
      strokePath('M13.55 12H5.75', 1.72),
      strokePath('M8.7 8.9 5.6 12l3.1 3.1', 1.72),
    ],
  },
  microphone: {
    shapes: [
      strokeRect(9.15, 4.8, 5.7, 8.75, 2.85, 1.68),
      strokePath('M6.85 11.9a5.15 5.15 0 0 0 10.3 0', 1.68),
      strokePath('M12 17.05v2.25', 1.68),
      strokePath('M9.25 19.3h5.5', 1.68),
    ],
  },
  paperclip: {
    shapes: [
      strokePath('M8.85 12.9 15.4 6.35a3.08 3.08 0 1 1 4.36 4.35l-7.55 7.55a4.78 4.78 0 1 1-6.76-6.76l6.3-6.3', 1.72),
    ],
  },
  phone: {
    shapes: [
      strokePath('M7.45 5.55h2.02c.29 0 .54.18.65.45l.92 2.42a.8.8 0 0 1-.17.84l-1.42 1.45a11.73 11.73 0 0 0 4.74 4.74l1.45-1.42a.8.8 0 0 1 .84-.17l2.42.92c.27.11.45.36.45.65v2.02a1.8 1.8 0 0 1-1.95 1.8c-7.14-.47-12.83-6.16-13.3-13.3a1.8 1.8 0 0 1 1.78-1.95Z', 1.72),
    ],
  },
  reply: {
    shapes: [
      strokePath('M10.15 8.2 5.75 12l4.4 3.8', 1.72),
      strokePath('M6.1 12h6.5a5.3 5.3 0 0 1 5.3 5.3', 1.72),
    ],
  },
  send: {
    shapes: [
      strokePath('M5.15 11.85 18.85 5.75 13.2 18.3l-2.55-4.1-5.5-2.35Z', 1.72),
      strokePath('M10.55 14.1 18.85 5.75', 1.72),
    ],
  },
  settings: {
    shapes: [
      strokePath('M12 5.2 13 6.72l1.82.3.5 1.75 1.7.82-.33 1.85 1.18 1.36-1.18 1.36.33 1.85-1.7.82-.5 1.75-1.82.3L12 18.8l-1 .5-1.82-.3-.5-1.75-1.7-.82.33-1.85-1.18-1.36 1.18-1.36-.33-1.85 1.7-.82.5-1.75 1.82-.3 1-.5Z', 1.68),
      strokeCircle(12, 12, 2.25, 1.68),
    ],
  },
  smile: {
    shapes: [
      strokeCircle(12, 12, 8, 1.68),
      strokePath('M9.25 10.1h.02M14.75 10.1h.02', 2.15),
      strokePath('M8.75 14.25c.8 1.1 1.9 1.65 3.25 1.65 1.35 0 2.45-.55 3.25-1.65', 1.68),
    ],
  },
  video: {
    shapes: [
      strokeRect(5.05, 6.45, 11.15, 11, 3.1, 1.72),
      strokePath('M16.2 9.95 19.8 7.9c.58-.33 1.28.08 1.28.74v6.72c0 .66-.7 1.07-1.28.74l-3.6-2.05', 1.72),
    ],
  },
}

const materialIconOverrides: Partial<Record<MessengerIconName, IconDefinition>> = {
  access: {
    shapes: [
      strokePath('M12 5.1 17.9 7.6v4.05c0 3.3-2.08 6.23-5.9 7.45-3.82-1.22-5.9-4.15-5.9-7.45V7.6L12 5.1Z', 2),
      strokePath('m9.15 12.05 1.8 1.8 4.15-4.25', 2),
    ],
  },
  close: {
    shapes: [strokePath('M7.4 7.4 16.6 16.6M16.6 7.4l-9.2 9.2', 2.08)],
  },
  chat: {
    shapes: [
      strokePath('M7.1 6.2h9.8a2.35 2.35 0 0 1 2.35 2.35v4.8a2.35 2.35 0 0 1-2.35 2.35h-5.05L7.8 18.6v-2.9H7.1a2.35 2.35 0 0 1-2.35-2.35v-4.8A2.35 2.35 0 0 1 7.1 6.2', 1.96),
    ],
  },
  chats: {
    shapes: [
      strokePath('M4.9 7.35A2.2 2.2 0 0 1 7.1 5.15h6.9a2.2 2.2 0 0 1 2.2 2.2v3.95a2.2 2.2 0 0 1-2.2 2.2H9.55l-2.45 1.9v-1.9a2.2 2.2 0 0 1-2.2-2.2V7.35Z', 1.96),
      strokePath('M9.55 10a2.2 2.2 0 0 1 2.2-2.2h5.15a2.2 2.2 0 0 1 2.2 2.2v3.75a2.2 2.2 0 0 1-2.2 2.2h-3.3l-2.05 1.95v-1.95a2.2 2.2 0 0 1-2.2-2.2V10Z', 1.96),
    ],
  },
  comment: {
    shapes: [
      strokePath('M7.1 6.2h9.8a2.35 2.35 0 0 1 2.35 2.35v4.8a2.35 2.35 0 0 1-2.35 2.35h-5.05L7.8 18.6v-2.9H7.1a2.35 2.35 0 0 1-2.35-2.35v-4.8A2.35 2.35 0 0 1 7.1 6.2', 1.96),
    ],
  },
  contacts: {
    shapes: [
      strokeCircle(8.75, 8.85, 2.45, 1.96),
      strokeCircle(15.95, 9.7, 2.05, 1.96),
      strokePath('M4.95 17.15c.58-2.18 2.3-3.55 3.8-3.55 1.5 0 3.22 1.37 3.8 3.55', 1.96),
      strokePath('M13.25 17.15c.48-1.7 1.8-2.8 3.1-2.8 1.3 0 2.62 1.1 3.1 2.8', 1.96),
    ],
  },
  copy: {
    shapes: [
      strokeRect(8.2, 7.05, 8.8, 10.6, 2.75, 2.02),
      strokeRect(5.85, 4.7, 8.8, 10.6, 2.75, 2.02),
    ],
  },
  delete: {
    shapes: [
      strokePath('M8.1 7.9h7.8', 1.96),
      strokePath('M9.65 7.9V6.75c0-.8.65-1.45 1.45-1.45h1.8c.8 0 1.45.65 1.45 1.45V7.9', 1.96),
      strokePath('M7.6 8.1 8.12 17a1.66 1.66 0 0 0 1.65 1.55h4.46A1.66 1.66 0 0 0 15.88 17l.52-8.9', 1.96),
    ],
  },
  forward: {
    shapes: [
      strokePath('M9.15 6.55 16.35 12l-7.2 5.45', 1.96),
      strokePath('M5.85 12h10.2', 1.96),
    ],
  },
  logout: {
    shapes: [
      strokePath('M9.95 7.25V6.15c0-.84.68-1.52 1.52-1.52h5.08c.84 0 1.52.68 1.52 1.52v11.7c0 .84-.68 1.52-1.52 1.52h-5.08c-.84 0-1.52-.68-1.52-1.52v-1.1', 2.02),
      strokePath('M13.55 12H5.8', 2.02),
      strokePath('M8.8 8.95 5.75 12l3.05 3.05', 2.02),
    ],
  },
  microphone: {
    shapes: [
      strokeRect(9.05, 4.7, 5.9, 8.9, 2.95, 2.02),
      strokePath('M6.8 11.85a5.2 5.2 0 0 0 10.4 0', 2.02),
      strokePath('M12 17.15v2.15', 2.02),
      strokePath('M9.2 19.3h5.6', 2.02),
    ],
  },
  paperclip: {
    shapes: [
      strokePath('M8.95 13.1 15.25 6.8a3.1 3.1 0 1 1 4.38 4.38l-7.65 7.65a4.88 4.88 0 1 1-6.9-6.9l6.45-6.45', 1.96),
    ],
  },
  phone: {
    shapes: [
      strokePath('M7.6 5.7h1.8c.32 0 .6.19.72.48l.88 2.32a.88.88 0 0 1-.19.92l-1.32 1.34a11.08 11.08 0 0 0 4.75 4.75l1.34-1.32a.88.88 0 0 1 .92-.19l2.32.88c.29.12.48.4.48.72v1.8a1.9 1.9 0 0 1-2.06 1.9c-7.17-.48-12.86-6.17-13.34-13.34A1.9 1.9 0 0 1 7.6 5.7Z', 1.96),
    ],
  },
  reply: {
    shapes: [
      strokePath('M9.8 8.25 5.65 12l4.15 3.75', 1.96),
      strokePath('M6 12h6.7A5.45 5.45 0 0 1 18.15 17.45', 1.96),
    ],
  },
  send: {
    shapes: [
      fillPath('M4.7 12 19.3 5.3c.96-.44 1.9.5 1.47 1.47L14.07 21.3c-.4.88-1.65.92-2.1.06l-1.92-3.7a1.92 1.92 0 0 0-.83-.83l-3.7-1.92c-.86-.45-.82-1.7.06-2.1Z'),
      strokePath('M10.15 13.85 20 6.1', 1.5),
    ],
  },
  settings: {
    shapes: [
      strokePath('M12 5.25 13 6.9l1.92.32.5 1.86 1.78.86-.34 1.92 1.24 1.4-1.24 1.4.34 1.92-1.78.86-.5 1.86-1.92.32L12 18.75l-1 .57-1.92-.32-.5-1.86-1.78-.86.34-1.92-1.24-1.4 1.24-1.4-.34-1.92 1.78-.86.5-1.86 1.92-.32L12 5.25Z', 1.96),
      strokeCircle(12, 12, 2.35, 1.96),
    ],
  },
  smile: {
    shapes: [
      strokeCircle(12, 12, 7.9, 1.96),
      fillPath('M9.2 9.3a1.2 1.2 0 1 1-.01 2.4 1.2 1.2 0 0 1 .01-2.4Z'),
      fillPath('M14.8 9.3a1.2 1.2 0 1 1-.01 2.4 1.2 1.2 0 0 1 .01-2.4Z'),
      strokePath('M8.75 14.15c.86 1.08 1.95 1.62 3.25 1.62 1.3 0 2.39-.54 3.25-1.62', 1.96),
    ],
  },
  video: {
    shapes: [
      strokeRect(5.05, 6.25, 11.25, 10.95, 3.3, 1.96),
      strokePath('M16.3 9.75 19.95 7.7c.62-.35 1.38.09 1.38.8v7c0 .71-.76 1.15-1.38.8l-3.65-2.05', 1.96),
    ],
  },
}

const resolvedLiquidIcons: Record<MessengerIconName, IconDefinition> = {
  ...liquidIcons,
  ...liquidIconOverrides,
}

const resolvedMaterialIcons: Record<MessengerIconName, IconDefinition> = {
  ...materialIcons,
  ...materialIconOverrides,
}

const iconStyle = computed(() => theme.value?.style === 'material' ? 'material' : 'liquid')
const icon = computed(() => (iconStyle.value === 'material' ? resolvedMaterialIcons : resolvedLiquidIcons)[props.name] ?? resolvedLiquidIcons[props.name])
const sizeStyle = computed(() => ({
  width: `${props.size}px`,
  height: `${props.size}px`,
}))
</script>

<template>
  <span class="messenger-icon" :class="`messenger-icon--${iconStyle}`" :style="sizeStyle" aria-hidden="true">
    <svg class="messenger-icon__svg" :viewBox="icon.viewBox || '0 0 24 24'" focusable="false">
      <component
        :is="shape.tag"
        v-for="(shape, index) in icon.shapes"
        :key="`${name}-${index}`"
        v-bind="shape.attrs"
      />
    </svg>
  </span>
</template>