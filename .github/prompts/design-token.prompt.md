---
mode: 'agent'
description: 'Добавить токен в дизайн-систему и подключить в UIDesignPanel'
---

# Новый токен дизайн-системы

## 1. Добавить тип в `app/composables/useDesignSystem.ts`

```ts
export interface DesignTokens {
  // ...existing...
  newToken: 'option-a' | 'option-b'  // или number / string
}

export const DEFAULT_TOKENS: DesignTokens = {
  // ...existing...
  newToken: 'option-a',
}
```

## 2. Применить токен как CSS custom property

В `useDesignSystem.ts` функции `applyTokens`:
```ts
root.style.setProperty('--ds-new-token', tokens.newToken)
```

## 3. Добавить контрол в `UIDesignPanel.vue`

Чипы:
```vue
<div class="dp-field">
  <label class="dp-label">название токена</label>
  <div class="dp-arch-chips">
    <button v-for="opt in optionsList" :key="opt.id"
      class="dp-arch-chip"
      :class="{ 'dp-arch-chip--active': tokens.newToken === opt.id }"
      @click="set('newToken', opt.id)"
    >{{ opt.label }}</button>
  </div>
</div>
```

Слайдер (для числовых):
```vue
<input type="range" min="0" max="100" step="1"
  :value="tokens.newToken"
  @input="set('newToken', Number(($event.target as HTMLInputElement).value))"
  class="dp-range"
/>
```

## Запрос

Добавить токен: ${input:tokenName:newToken}
Описание: ${input:description:что контролирует}
Таб панели: ${input:tab:arch|surface|typography|buttons|colors}
