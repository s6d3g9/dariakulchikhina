const fs = require('fs');

let btnPath = 'app/components/GlassButton.vue';
let btnContent = fs.readFileSync(btnPath, 'utf-8');

if (!btnContent.includes('density?:')) {
  btnContent = btnContent.replace(
    `iconPosition?: 'left' | 'right'`,
    `iconPosition?: 'left' | 'right'\n  density?: 'default' | 'compact' | 'comfortable'`
  ).replace(
    `iconPosition: 'left'`,
    `iconPosition: 'left',\n  density: 'default'`
  );
  fs.writeFileSync(btnPath, btnContent);
  console.log('Patched GlassButton');
} else {
  console.log('GlassButton already patched');
}

let inpPath = 'app/components/GlassInput.vue';
let inpContent = fs.readFileSync(inpPath, 'utf-8');

if (!inpContent.includes('inheritAttrs: false')) {
  inpContent = inpContent.replace(
    `import { computed } from 'vue'`,
    `import { computed, useAttrs } from 'vue'`
  ).replace(
    `</script>`,
    `\ndefineOptions({ inheritAttrs: false });\nconst attrs = useAttrs();\nconst wrapperAttrs = computed(() => ({ class: attrs.class, style: attrs.style }));\nconst inputAttrs = computed(() => { const { class: _, style: __, ...rest } = attrs; return rest; });\n</script>`
  ).replace(
    `<div class="relative w-full group">`,
    `<div class="relative group" v-bind="wrapperAttrs" :class="!(attrs.class || '').includes('w-') ? 'w-full' : ''">`
  ).replace(
    `<input\n`,
    `\n    <!-- Fix for type=file preventing value assignment and $event.target usage -->\n    <input v-if="type === 'file'" type="file" :disabled="disabled" :class="inputClasses" v-bind="inputAttrs" @change="emit('update:modelValue', $event.target.files ? $event.target.files[0] : null)" @focus="emit('focus', $event)" @blur="emit('blur', $event)" />\n    <input v-else v-bind="inputAttrs"\n`
  );
  fs.writeFileSync(inpPath, inpContent);
  console.log('Patched GlassInput');
} else {
  console.log('GlassInput already patched');
}
