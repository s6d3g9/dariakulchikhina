<template>
  <div>
    <!-- Sources row -->
    <div class="de-sources">
      <div class="de-source">
        <label class="de-source-label">📁 Проект</label>
        <select
          :value="pickedProjectSlug"
          class="u-status-sel"
          @change="onProjectChange"
        >
          <option value="">
            — без проекта —
          </option>
          <option
            v-for="p in projects"
            :key="p.slug"
            :value="p.slug"
          >
            {{ p.title }}
          </option>
        </select>
      </div>
      <div class="de-source">
        <label class="de-source-label">
          🎨 Исполнитель
          <span
            v-if="designersList.length"
            class="de-badge"
          >{{ designersList.length }}</span>
        </label>
        <select
          :value="pickedDesignerId"
          class="u-status-sel"
          @change="onDesignerChange"
        >
          <option :value="0">
            — не выбран —
          </option>
          <option
            v-for="d in designersList"
            :key="d.id"
            :value="d.id"
          >
            {{ d.name }}{{ d.companyName ? ` (${d.companyName})` : '' }}
          </option>
        </select>
      </div>
      <div class="de-source">
        <label class="de-source-label">
          👤 Клиент
          <span
            v-if="ctx?.clients?.length"
            class="de-badge"
          >{{ ctx.clients.length }}</span>
        </label>
        <select
          :value="pickedClientId"
          class="u-status-sel"
          :disabled="loadingCtx"
          @change="onClientChange"
        >
          <option :value="0">
            {{ loadingCtx ? 'загрузка...' : '— не выбран —' }}
          </option>
          <option
            v-for="c in ctx?.clients || []"
            :key="c.id"
            :value="c.id"
          >
            {{ c.name }}{{ c.phone ? ` · ${c.phone}` : '' }}
          </option>
        </select>
      </div>
      <div class="de-source">
        <label class="de-source-label">
          🏗 Подрядчик
          <span
            v-if="ctx?.contractors?.length"
            class="de-badge"
          >{{ ctx.contractors.length }}</span>
        </label>
        <select
          :value="pickedContractorId"
          class="u-status-sel"
          :disabled="loadingCtx"
          @change="onContractorChange"
        >
          <option :value="0">
            {{ loadingCtx ? 'загрузка...' : '— не выбран —' }}
          </option>
          <option
            v-for="c in ctx?.contractors || []"
            :key="c.id"
            :value="c.id"
          >
            {{ c.name }}{{ c.companyName ? ` (${c.companyName})` : '' }}
          </option>
        </select>
      </div>
    </div>
    <div
      v-if="loadingCtx"
      class="de-loading-bar"
    >
      <div class="de-loading-fill" />
    </div>

    <!-- Entity previews -->
    <div
      v-if="pickedDesigner || pickedClient || pickedContractor"
      class="de-preview-row"
    >
      <div
        v-if="pickedDesigner"
        class="de-preview-chip de-preview-chip--executor"
      >
        🎨 {{ pickedDesigner.name }}
        <span v-if="pickedDesigner.phone"> · {{ pickedDesigner.phone }}</span>
        <span v-if="pickedDesigner.email"> · {{ pickedDesigner.email }}</span>
        <button
          class="de-save-executor-btn"
          :class="{ 'de-save-executor-btn--saved': executorSaved }"
          :title="'Сохранить реквизиты исполнителя для автозаполнения'"
          @click="$emit('save-executor')"
        >
          {{ executorSaved ? '✓ сохранено' : '💾 запомнить реквизиты' }}
        </button>
      </div>
      <div
        v-if="pickedClient"
        class="de-preview-chip"
      >
        👤 {{ pickedClient.name }}
        <span v-if="pickedClient.phone"> · {{ pickedClient.phone }}</span>
        <span v-if="pickedClient.email"> · {{ pickedClient.email }}</span>
      </div>
      <div
        v-if="pickedContractor"
        class="de-preview-chip"
      >
        🏗 {{ pickedContractor.companyName || pickedContractor.name }}
        <span v-if="pickedContractor.inn"> · ИНН {{ pickedContractor.inn }}</span>
        <span v-if="pickedContractor.phone"> · {{ pickedContractor.phone }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  projects: Array<{ slug: string; title: string }>
  pickedProjectSlug: string
  pickedDesignerId: number
  pickedClientId: number
  pickedContractorId: number
  designersList: any[]
  ctx: any
  loadingCtx: boolean
  pickedDesigner: any | null
  pickedClient: any | null
  pickedContractor: any | null
  executorSaved: boolean
}>()

const emit = defineEmits<{
  'update:pickedProjectSlug': [value: string]
  'load-context': []
  'update:pickedDesignerId': [value: number]
  'apply-designer': []
  'update:pickedClientId': [value: number]
  'apply-client': []
  'update:pickedContractorId': [value: number]
  'apply-contractor': []
  'save-executor': []
}>()

function onProjectChange(ev: Event) {
  emit('update:pickedProjectSlug', (ev.target as HTMLSelectElement).value)
  emit('load-context')
}

function onDesignerChange(ev: Event) {
  emit('update:pickedDesignerId', Number((ev.target as HTMLSelectElement).value))
  emit('apply-designer')
}

function onClientChange(ev: Event) {
  emit('update:pickedClientId', Number((ev.target as HTMLSelectElement).value))
  emit('apply-client')
}

function onContractorChange(ev: Event) {
  emit('update:pickedContractorId', Number((ev.target as HTMLSelectElement).value))
  emit('apply-contractor')
}
</script>
