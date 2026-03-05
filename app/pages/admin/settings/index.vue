<template>
  <Teleport v-if="sidebarActive" to="#admin-sidebar-portal">
      <AdminSidebarSwitcher title="настройки">
        <div class="std-nav">
          <button
            v-for="item in SETTINGS_NAV"
            :key="item.key"
            class="ent-nav-item std-nav-item"
            :class="{ 'ent-nav-item--active': section === item.key }"
            @click="section = item.key"
          >{{ item.label }}</button>
        </div>
      </AdminSidebarSwitcher>
  </Teleport>

    <div>
      <Transition name="tab-fade" mode="out-in">
      <div :key="section">

      <!-- ── Пользователи ─────────────────────────── -->
      <template v-if="section === 'users'">
        <div class="st-section">
          <div class="st-section-head">
            <h2 class="st-section-title">Пользователи</h2>
            <button class="a-btn-sm" @click="showAddUser = true">+ добавить</button>
          </div>

          <div v-if="usersLoading" class="ent-nav-skeleton" v-for="i in 3" :key="i" />
          <div v-else class="st-user-list">
            <div v-for="u in users" :key="u.id" class="st-user-row glass-surface">
              <div class="st-user-info">
                <div class="st-user-name">{{ u.name || u.email }}<span class="st-user-email" v-if="u.name"> · {{ u.email }}</span></div>
                <div class="st-user-meta">
                  <span v-for="r in u.roles" :key="r" class="st-role-tag" :class="`st-role--${r}`">{{ r }}</span>
                  <span v-if="u.linkedProject" class="st-user-linked">→ {{ u.linkedProject.title }}</span>
                  <span v-if="u.linkedDesigner" class="st-user-linked">→ {{ u.linkedDesigner.name }}</span>
                </div>
                <div class="st-user-since">с {{ formatDate(u.createdAt) }}</div>
              </div>
              <div class="st-user-actions">
                <button class="a-btn-sm" @click="openChangePassword(u)">сменить пароль</button>
                <button class="a-btn-sm a-btn-danger" @click="confirmDeleteUser(u)">удалить</button>
              </div>
            </div>
            <div v-if="!users?.length" class="ent-nav-empty">нет пользователей</div>
          </div>
        </div>
      </template>

      <!-- ── Роли и доступ ────────────────────────── -->
      <template v-else-if="section === 'roles'">
        <div class="st-section">
          <div class="st-section-head">
            <h2 class="st-section-title">Роли и доступ</h2>
          </div>
          <div class="st-roles-grid">
            <div class="st-role-card glass-surface">
              <div class="st-role-card-title">◈ Администратор</div>
              <p class="st-role-card-desc">Полный доступ ко всем разделам. Видит всех клиентов и проекты. Может редактировать любые данные.</p>
              <div class="st-role-card-users">
                <span v-for="u in adminUsers" :key="u.id" class="st-role-tag st-role--admin">{{ u.name || u.email }}</span>
                <span v-if="!adminUsers.length" class="st-role-empty">нет</span>
              </div>
            </div>
            <div class="st-role-card glass-surface">
              <div class="st-role-card-title">◌ Клиент</div>
              <p class="st-role-card-desc">Доступ только к своему проекту через /project/[slug]. Видит документы, статус, материалы только своего проекта.</p>
              <div class="st-role-card-users">
                <span v-for="u in clientUsers" :key="u.id" class="st-role-tag st-role--client">{{ u.name || u.email }}<span class="st-user-linked" v-if="u.linkedProject"> → {{ u.linkedProject.title }}</span></span>
                <span v-if="!clientUsers.length" class="st-role-empty">нет</span>
              </div>
            </div>
            <div class="st-role-card glass-surface">
              <div class="st-role-card-title">◇ Дизайнер</div>
              <p class="st-role-card-desc">Доступ к кабинету дизайнера. Может управлять своими услугами, портфолио и проектами.</p>
              <div class="st-role-card-users">
                <span v-for="u in designerUsers" :key="u.id" class="st-role-tag st-role--designer">{{ u.name || u.email }}</span>
                <span v-if="!designerUsers.length" class="st-role-empty">нет</span>
              </div>
            </div>
          </div>
          <div class="st-roles-note glass-surface">
            <strong>Как назначаются роли:</strong> роль определяется автоматически по связи аккаунта с сущностью. Клиент = привязан к проекту через userId. Дизайнер = запись в таблице designers. Остальные = администратор.
          </div>
        </div>
      </template>

      <!-- ── Опасная зона ──────────────────────────── -->
      <template v-else-if="section === 'danger'">
        <div class="st-section">
          <div class="st-section-head">
            <h2 class="st-section-title">⚠ Опасная зона</h2>
            <span class="st-danger-warn">Все операции необратимы</span>
          </div>

          <div class="st-danger-list">
            <!-- Delete project -->
            <div class="st-danger-card glass-surface">
              <div class="st-danger-card-head">
                <span class="st-danger-icon">◱</span>
                <div>
                  <div class="st-danger-card-title">Удалить проект</div>
                  <div class="st-danger-card-desc">Удаляет проект и все связанные данные: страницы, документы, подрядчиков</div>
                </div>
              </div>
              <div class="st-danger-action">
                <select v-model="deleteProjectSlug" class="glass-input st-danger-select">
                  <option value="">— выберите проект —</option>
                  <option v-for="p in projects" :key="p.slug" :value="p.slug">{{ p.title }}</option>
                </select>
                <button class="a-btn-danger st-danger-btn" :disabled="!deleteProjectSlug" @click="confirmDanger('project')">Удалить</button>
              </div>
            </div>

            <!-- Delete client -->
            <div class="st-danger-card glass-surface">
              <div class="st-danger-card-head">
                <span class="st-danger-icon">◌</span>
                <div>
                  <div class="st-danger-card-title">Удалить клиента</div>
                  <div class="st-danger-card-desc">Удаляет запись клиента. Связь с проектом при этом разрывается.</div>
                </div>
              </div>
              <div class="st-danger-action">
                <select v-model="deleteClientId" class="glass-input st-danger-select">
                  <option :value="null">— выберите клиента —</option>
                  <option v-for="c in clients" :key="c.id" :value="c.id">{{ c.name }}</option>
                </select>
                <button class="a-btn-danger st-danger-btn" :disabled="!deleteClientId" @click="confirmDanger('client')">Удалить</button>
              </div>
            </div>

            <!-- Delete gallery item -->
            <div class="st-danger-card glass-surface">
              <div class="st-danger-card-head">
                <span class="st-danger-icon">◫</span>
                <div>
                  <div class="st-danger-card-title">Удалить пользователя</div>
                  <div class="st-danger-card-desc">Удаляет аккаунт пользователя. Данные проекта и клиента не удаляются.</div>
                </div>
              </div>
              <div class="st-danger-action">
                <select v-model="deleteUserId" class="glass-input st-danger-select">
                  <option :value="null">— выберите пользователя —</option>
                  <option v-for="u in users" :key="u.id" :value="u.id">{{ u.name || u.email }}</option>
                </select>
                <button class="a-btn-danger st-danger-btn" :disabled="!deleteUserId" @click="confirmDanger('user')">Удалить</button>
              </div>
            </div>
          </div>
        </div>
      </template>

      <!-- ── Лог действий ─────────────────────────── -->
      <template v-else-if="section === 'log'">
        <div class="st-section">
          <div class="st-section-head">
            <h2 class="st-section-title">Лог действий</h2>
          </div>
          <div class="st-log-placeholder glass-surface">
            <div class="st-log-icon">◎</div>
            <p>Журнал действий будет доступен после создания таблицы audit_logs в базе данных.</p>
            <p class="st-log-hint">Сюда будут записываться: удаления, входы в систему, изменения критичных данных.</p>
          </div>
        </div>
      </template>

      </div>
      </Transition>
    </div>

  <!-- ── Change password modal ── -->
  <Teleport to="body">
  <div v-if="showPasswordModal" class="cl-backdrop" @click.self="showPasswordModal = false">
    <div class="cl-modal glass-surface glass-card">
      <div class="cl-modal-head">
        <span>Сменить пароль — {{ passwordUser?.name || passwordUser?.email }}</span>
        <button class="cl-close" @click="showPasswordModal = false">✕</button>
      </div>
      <form class="cl-form" @submit.prevent="doChangePassword">
        <div class="cl-field">
          <label>Новый пароль</label>
          <input v-model="newPassword" type="password" class="glass-input" required minlength="6" placeholder="не менее 6 символов" autofocus />
        </div>
        <div class="cl-field">
          <label>Повторите пароль</label>
          <input v-model="newPassword2" type="password" class="glass-input" required placeholder="повторите пароль" />
        </div>
        <p v-if="passwordError" class="cl-error">{{ passwordError }}</p>
        <div class="cl-modal-foot">
          <button type="button" class="a-btn-sm" @click="showPasswordModal = false">отмена</button>
          <button type="submit" class="a-btn-save" :disabled="passwordSaving">{{ passwordSaving ? '...' : 'сохранить' }}</button>
        </div>
      </form>
    </div>
  </div>
  </Teleport>

  <!-- ── Confirm danger modal ── -->
  <Teleport to="body">
  <div v-if="showConfirmDanger" class="cl-backdrop" @click.self="showConfirmDanger = false">
    <div class="cl-modal glass-surface glass-card">
      <div class="cl-modal-head">
        <span>⚠ Подтверждение удаления</span>
        <button class="cl-close" @click="showConfirmDanger = false">✕</button>
      </div>
      <div class="cl-form">
        <p class="st-confirm-text">{{ dangerConfirmText }}</p>
        <p class="cl-error" style="margin:0">Это действие необратимо. Вы уверены?</p>
        <div class="cl-modal-foot">
          <button class="a-btn-sm" @click="showConfirmDanger = false">отмена</button>
          <button class="a-btn-danger" :disabled="dangerLoading" @click="doDangerAction">{{ dangerLoading ? '...' : 'удалить навсегда' }}</button>
        </div>
      </div>
    </div>
  </div>
  </Teleport>

  <!-- ── Add user modal ── -->
  <Teleport to="body">
  <div v-if="showAddUser" class="cl-backdrop" @click.self="showAddUser = false">
    <div class="cl-modal glass-surface glass-card">
      <div class="cl-modal-head">
        <span>Новый пользователь</span>
        <button class="cl-close" @click="showAddUser = false">✕</button>
      </div>
      <form class="cl-form" @submit.prevent="doAddUser">
        <div class="cl-field"><label>Email *</label><input v-model="addForm.email" type="email" class="glass-input" required autofocus /></div>
        <div class="cl-field"><label>Имя</label><input v-model="addForm.name" class="glass-input" placeholder="Имя Фамилия" /></div>
        <div class="cl-field"><label>Пароль *</label><input v-model="addForm.password" type="password" class="glass-input" required minlength="6" /></div>
        <p v-if="addError" class="cl-error">{{ addError }}</p>
        <div class="cl-modal-foot">
          <button type="button" class="a-btn-sm" @click="showAddUser = false">отмена</button>
          <button type="submit" class="a-btn-save" :disabled="addSaving">{{ addSaving ? '...' : 'создать' }}</button>
        </div>
      </form>
    </div>
  </div>
  </Teleport>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })
const sidebarActive = useSidebarActive()

// ── Nav ──────────────────────────────────────────────────────────
const SETTINGS_NAV = [
  { key: 'users',  icon: '◈', label: 'Пользователи' },
  { key: 'roles',  icon: '◌', label: 'Роли и доступ' },
  { key: 'danger', icon: '⚠', label: 'Опасная зона' },
  { key: 'log',    icon: '◎', label: 'Лог действий' },
]
const section = ref('users')

// ── Data ─────────────────────────────────────────────────────────
const { data: users, pending: usersLoading, refresh: refreshUsers } = await useFetch<any[]>('/api/admin/users', { server: false, default: () => [] })
const { data: projects } = await useFetch<any[]>('/api/projects', { server: false, default: () => [] })
const { data: clients }  = await useFetch<any[]>('/api/clients',  { server: false, default: () => [] })

// ── Role filters ─────────────────────────────────────────────────
const adminUsers   = computed(() => (users.value || []).filter((u: any) => u.roles?.includes('admin')))
const clientUsers  = computed(() => (users.value || []).filter((u: any) => u.roles?.includes('client')))
const designerUsers = computed(() => (users.value || []).filter((u: any) => u.roles?.includes('designer')))

// ── Change password ──────────────────────────────────────────────
const showPasswordModal = ref(false)
const passwordUser = ref<any>(null)
const newPassword  = ref('')
const newPassword2 = ref('')
const passwordError = ref('')
const passwordSaving = ref(false)

function openChangePassword(u: any) {
  passwordUser.value = u
  newPassword.value = ''
  newPassword2.value = ''
  passwordError.value = ''
  showPasswordModal.value = true
}

async function doChangePassword() {
  passwordError.value = ''
  if (newPassword.value !== newPassword2.value) { passwordError.value = 'Пароли не совпадают'; return }
  if (newPassword.value.length < 6) { passwordError.value = 'Пароль не менее 6 символов'; return }
  passwordSaving.value = true
  try {
    await $fetch(`/api/admin/users/${passwordUser.value.id}`, { method: 'PATCH', body: { password: newPassword.value } })
    showPasswordModal.value = false
  } catch (e: any) {
    passwordError.value = e.data?.statusMessage || 'Ошибка'
  } finally {
    passwordSaving.value = false
  }
}

// ── Delete user ──────────────────────────────────────────────────
async function confirmDeleteUser(u: any) {
  if (!confirm(`Удалить пользователя «${u.name || u.email}»? Это нельзя отменить.`)) return
  try {
    await $fetch(`/api/admin/users/${u.id}`, { method: 'DELETE' })
    refreshUsers()
  } catch (e: any) {
    alert(e.data?.statusMessage || 'Ошибка удаления')
  }
}

// ── Add user ─────────────────────────────────────────────────────
const showAddUser = ref(false)
const addForm = reactive({ email: '', name: '', password: '' })
const addError = ref('')
const addSaving = ref(false)

async function doAddUser() {
  addError.value = ''
  addSaving.value = true
  try {
    await $fetch('/api/admin/users', { method: 'POST', body: addForm })
    showAddUser.value = false
    addForm.email = addForm.name = addForm.password = ''
    refreshUsers()
  } catch (e: any) {
    addError.value = e.data?.statusMessage || 'Ошибка'
  } finally {
    addSaving.value = false
  }
}

// ── Danger zone ──────────────────────────────────────────────────
const deleteProjectSlug = ref('')
const deleteClientId    = ref<number | null>(null)
const deleteUserId      = ref<number | null>(null)
const showConfirmDanger = ref(false)
const dangerLoading     = ref(false)
const dangerType        = ref<'project' | 'client' | 'user'>('project')

const dangerConfirmText = computed(() => {
  if (dangerType.value === 'project') {
    const p = projects.value?.find((x: any) => x.slug === deleteProjectSlug.value)
    return `Будет удалён проект «${p?.title || deleteProjectSlug.value}» и все его данные.`
  }
  if (dangerType.value === 'client') {
    const c = clients.value?.find((x: any) => x.id === deleteClientId.value)
    return `Будет удалён клиент «${c?.name || deleteClientId.value}».`
  }
  const u = users.value?.find((x: any) => x.id === deleteUserId.value)
  return `Будет удалён пользователь «${u?.name || u?.email || deleteUserId.value}».`
})

function confirmDanger(type: 'project' | 'client' | 'user') {
  dangerType.value = type
  showConfirmDanger.value = true
}

async function doDangerAction() {
  dangerLoading.value = true
  try {
    if (dangerType.value === 'project') {
      await $fetch(`/api/projects/${deleteProjectSlug.value}`, { method: 'DELETE' })
      deleteProjectSlug.value = ''
    } else if (dangerType.value === 'client') {
      await $fetch(`/api/clients/${deleteClientId.value}`, { method: 'DELETE' })
      deleteClientId.value = null
    } else if (dangerType.value === 'user') {
      await $fetch(`/api/admin/users/${deleteUserId.value}`, { method: 'DELETE' })
      deleteUserId.value = null
      refreshUsers()
    }
    showConfirmDanger.value = false
  } catch (e: any) {
    alert(e.data?.statusMessage || 'Ошибка')
  } finally {
    dangerLoading.value = false
  }
}

// ── Utils ────────────────────────────────────────────────────────
function formatDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('ru-RU', { year: 'numeric', month: 'long', day: 'numeric' })
}
</script>

<style scoped>
/* ── Section layout ── */
.st-section {
  padding: 20px 24px;
  max-width: 820px;
}

.st-section-head {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 20px;
}

.st-section-title {
  font-size: 0.95rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  margin: 0;
}

/* ── User list ── */
.st-user-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.st-user-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 12px 16px;
  border-radius: 12px;
}

.st-user-info { flex: 1; min-width: 0; }

.st-user-name {
  font-size: 0.88rem;
  font-weight: 600;
}

.st-user-email {
  font-weight: 400;
  opacity: 0.55;
  font-size: 0.82rem;
}

.st-user-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 5px;
}

.st-user-since {
  font-size: 0.72rem;
  opacity: 0.35;
  margin-top: 3px;
}

.st-user-linked {
  font-size: 0.75rem;
  opacity: 0.55;
}

.st-user-actions {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}

/* ── Role tags ── */
.st-role-tag {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.st-role--admin    { background: rgba(99,102,241,.15); color: #6366f1; }
.st-role--client   { background: rgba(16,185,129,.12); color: #059669; }
.st-role--designer { background: rgba(245,158,11,.12);  color: #d97706; }

/* ── Roles grid ── */
.st-roles-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 14px;
  margin-bottom: 16px;
}

.st-role-card {
  padding: 16px;
  border-radius: 14px;
}

.st-role-card-title {
  font-size: 0.83rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  margin-bottom: 6px;
}

.st-role-card-desc {
  font-size: 0.77rem;
  opacity: 0.5;
  margin: 0 0 12px;
  line-height: 1.5;
}

.st-role-card-users {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}

.st-role-empty {
  font-size: 0.75rem;
  opacity: 0.3;
}

.st-roles-note {
  padding: 14px 16px;
  border-radius: 12px;
  font-size: 0.78rem;
  opacity: 0.65;
  line-height: 1.6;
}

/* ── Danger zone ── */
.st-danger-warn {
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--ds-error, #e05252);
  opacity: 0.75;
}

.st-danger-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.st-danger-card {
  padding: 16px 18px;
  border-radius: 14px;
  border: 1px solid rgba(224, 82, 82, 0.15);
}

.st-danger-card-head {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 12px;
}

.st-danger-icon {
  font-size: 1.2rem;
  opacity: 0.4;
  flex-shrink: 0;
  margin-top: 2px;
}

.st-danger-card-title {
  font-size: 0.88rem;
  font-weight: 700;
  margin-bottom: 3px;
}

.st-danger-card-desc {
  font-size: 0.78rem;
  opacity: 0.5;
  margin: 0;
  line-height: 1.5;
}

.st-danger-action {
  display: flex;
  gap: 10px;
  align-items: center;
}

.st-danger-select {
  flex: 1;
  min-width: 0;
}

.st-danger-btn {
  flex-shrink: 0;
}

.a-btn-danger {
  background: rgba(224, 82, 82, 0.12);
  color: var(--ds-error, #e05252);
  border: 1px solid rgba(224, 82, 82, 0.25);
  padding: 5px 12px;
  border-radius: 8px;
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s;
}
.a-btn-danger:hover:not(:disabled) { background: rgba(224, 82, 82, 0.2); }
.a-btn-danger:disabled { opacity: 0.35; cursor: default; }

/* ── Confirm text ── */
.st-confirm-text {
  font-size: 0.88rem;
  margin: 0 0 12px;
  padding: 12px 14px;
  background: rgba(224, 82, 82, 0.07);
  border-radius: 10px;
  line-height: 1.5;
}

/* ── Log placeholder ── */
.st-log-placeholder {
  padding: 40px 24px;
  border-radius: 16px;
  text-align: center;
  opacity: 0.6;
}

.st-log-icon {
  font-size: 2rem;
  margin-bottom: 12px;
}

.st-log-hint {
  font-size: 0.78rem;
  opacity: 0.55;
  margin: 6px 0 0;
}
</style>
