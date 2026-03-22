import fs from 'fs'

const path = 'messenger/web/app/components/messenger/MessengerSettingsSection.vue'
let code = fs.readFileSync(path, 'utf8')

// Inject activeSubmenu logic
const scriptEndMatch = code.match(/<\/script>/)
if (scriptEndMatch) {
  const insertIndex = scriptEndMatch.index
  const logicToInsert = `
const submenus = computed(() => {
  if (settingsModel.activeSection.value === 'privacy') {
    return [
      { key: 'visibility', title: 'Видимость' },
      { key: 'security', title: 'Безопасность' },
      { key: 'data', title: 'Данные' }
    ]
  }
  if (settingsModel.activeSection.value === 'notifications') {
    return [
      { key: 'system', title: 'Системные' },
      { key: 'chats', title: 'В чатах' },
      { key: 'calls', title: 'Звонки' }
    ]
  }
  return null
})

const activeSubmenu = ref('visibility')
watch(() => settingsModel.activeSection.value, (newVal) => {
  if (newVal === 'privacy') activeSubmenu.value = 'visibility'
  else if (newVal === 'notifications') activeSubmenu.value = 'system'
  else activeSubmenu.value = ''
})
`
  code = code.slice(0, insertIndex) + logicToInsert + '\n' + code.slice(insertIndex)
}

// Update the M3 aside template to add submenus
code = code.replace(
  /<div class="settings-nav__m3-track">/,
  `
        <Transition name="m3-submenu-rise">
          <div v-if="submenus" class="settings-nav__m3-track settings-nav__m3-track--sub">
            <button
              v-for="sub in submenus"
              :key="sub.key"
              type="button"
              class="settings-nav__m3-chip settings-nav__m3-chip--sub"
              :class="{ 'settings-nav__m3-chip--active': activeSubmenu === sub.key }"
              @click="activeSubmenu = sub.key"
            >
              {{ sub.title }}
            </button>
          </div>
        </Transition>
        <div class="settings-nav__m3-track">`
)

fs.writeFileSync(path, code)
console.log('Patched Settings')
