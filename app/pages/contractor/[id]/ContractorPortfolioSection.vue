<template>
  <div>
    <!-- Статистика портфолио -->
    <div class="cab-portfolio-stats glass-surface">
      <div class="cab-portfolio-stat">
        <span class="cab-portfolio-stat-val">{{ stats.doneCount }}</span>
        <span class="cab-portfolio-stat-label">Выполнено задач</span>
      </div>
      <div class="cab-portfolio-stat">
        <span class="cab-portfolio-stat-val">{{ stats.projectCount }}</span>
        <span class="cab-portfolio-stat-label">Проектов</span>
      </div>
      <div class="cab-portfolio-stat">
        <span class="cab-portfolio-stat-val">{{ stats.photoCount }}</span>
        <span class="cab-portfolio-stat-label">Фотографий</span>
      </div>
      <div class="cab-portfolio-stat">
        <span class="cab-portfolio-stat-val">{{ contractor?.experienceYears || '—' }}</span>
        <span class="cab-portfolio-stat-label">Лет опыта</span>
      </div>
    </div>

    <!-- Специализации -->
    <div v-if="contractor?.workTypes?.length" class="cab-portfolio-specializations glass-surface">
      <div class="cab-portfolio-spec-title">Специализации</div>
      <div class="cab-portfolio-chips">
        <span v-for="wt in contractor.workTypes" :key="wt" class="glass-chip">
          {{ workTypeToLabel(wt) }}
        </span>
      </div>
    </div>

    <div class="u-form-section">
      <h3>Выполненные работы</h3>
      <div class="cab-portfolio-grid">
        <div v-for="proj in byProject" :key="proj.slug" class="cab-portfolio-proj glass-surface">
          <div class="cab-portfolio-proj-head">
            <span class="cab-portfolio-proj-title">{{ proj.title }}</span>
            <span class="cab-portfolio-proj-progress">{{ proj.doneCount }}/{{ proj.totalCount }}</span>
          </div>
          <div v-for="wt in proj.wtGroups" :key="wt.workType">
            <div
              v-for="item in wt.items.filter((i: any) => i.status === 'done')"
              :key="item.id"
              class="cab-portfolio-item"
            >
              <span class="cab-portfolio-item-check">✓</span>
              <span class="cab-portfolio-item-name">{{ item.title }}</span>
              <span class="cab-portfolio-item-wt">{{ wt.label }}</span>
              <span v-if="item.photoCount" class="cab-portfolio-item-photos">📷 {{ item.photoCount }}</span>
            </div>
          </div>
        </div>
      </div>
      <div v-if="!byProject.length" class="cab-empty" style="margin-top:12px;">
        <div class="cab-empty-icon">◖</div>
        <p>Завершённых проектов пока нет.<br>Ваше портфолио автоматически пополнится по мере выполнения задач.</p>
      </div>
    </div>

    <div class="u-form-section">
      <h3>Ссылки на внешнее портфолио</h3>
      <div class="u-grid-2">
        <div class="u-field u-field--full">
          <label>Сайт / Behance / Instagram</label>
          <GlassInput v-model="form.website" placeholder="https://…" />
        </div>
      </div>
      <div class="u-form-foot" style="margin-top:12px;">
        <GlassButton variant="primary" type="button" :disabled="saving" @click="$emit('save')">{{ saving ? 'Сохранение…' : 'Сохранить' }}</GlassButton>
        <span v-if="saveMsg" class="u-save-msg">{{ saveMsg }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { CONTRACTOR_WORK_TYPE_OPTIONS } from '~~/shared/types/catalogs'

interface ContractorInfo {
  workTypes?: string[] | null
  experienceYears?: number | null
}

interface PortfolioStats {
  doneCount: number
  projectCount: number
  photoCount: number
}

interface PortfolioProject {
  slug: string
  title: string
  doneCount: number
  totalCount: number
  wtGroups: Array<{
    workType: string
    label: string
    items: Array<{ id: string | number; title: string; status: string; photoCount?: number }>
  }>
}

defineProps<{
  form: { website: string }
  saving: boolean
  saveMsg: string
  stats: PortfolioStats
  contractor: ContractorInfo | null | undefined
  byProject: PortfolioProject[]
}>()

defineEmits<{
  save: []
}>()

function workTypeToLabel(wt: string): string {
  const opt = CONTRACTOR_WORK_TYPE_OPTIONS.find(o => o.value === wt)
  return opt?.label || wt
}
</script>
