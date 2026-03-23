<template>
  <div class="dock-field-shell">
    <div v-if="$slots.leading" class="dock-field-shell__leading">
      <slot name="leading" />
    </div>

    <div class="dock-field-shell__control">
      <slot />
    </div>

    <div v-if="$slots.trailing" class="dock-field-shell__trailing">
      <slot name="trailing" />
    </div>
  </div>
</template>