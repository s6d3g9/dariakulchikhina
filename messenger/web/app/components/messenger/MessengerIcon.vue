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

const { theme } = useMessengerSettings()

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

const iconStyle = computed(() => theme.value.style === 'material' ? 'material' : 'liquid')
const icon = computed(() => (iconStyle.value === 'material' ? materialIcons : liquidIcons)[props.name] ?? liquidIcons[props.name])
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