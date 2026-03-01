<template>
  <div class="amb-wrap">
    <div v-if="pending" class="amb-loading">Загрузка...</div>
    <template v-else>

      <!-- Status -->
      <div class="amb-status-row">
        <span class="amb-dot" :class="`amb-dot--${statusColor}`"></span>
        <select v-model="form.mb_status" class="amb-status-sel" @change="save">
          <option value="">статус не задан</option>
          <option value="collecting">собираем</option>
          <option value="review">на согласовании</option>
          <option value="revision">доработка</option>
          <option value="approved">утверждён ✓</option>
        </select>
        <span v-if="savedAt" class="amb-saved">✓ {{ savedAt }}</span>
      </div>

      <!-- Style tags -->
      <div class="amb-section">
        <div class="amb-section-title">теги стиля / настроения</div>
        <div class="amb-tags-row">
          <button
            v-for="tag in STYLE_TAGS"
            :key="tag"
            class="amb-tag-btn"
            :class="{ 'amb-tag-btn--on': form.mb_style_tags.includes(tag) }"
            @click="toggleTag(tag)"
          >#{{ tag }}</button>
        </div>
        <div class="amb-row" style="margin-top:12px">
          <label class="amb-lbl">ключевые слова (дополнительно)</label>
          <input v-model="form.mb_keywords" class="amb-inp" placeholder="минимализм, japandi, wabi-sabi..." @blur="save">
        </div>
      </div>

      <!-- References gallery -->
      <div class="amb-section">
        <div class="amb-section-title">
          изображения-референсы
          <span class="amb-section-count">({{ filteredImages.length }})</span>
          <!-- Category filter -->
          <div class="amb-cat-filter">
            <button
              v-for="cat in imageCats"
              :key="cat.key"
              class="amb-cat-btn"
              :class="{ 'amb-cat-btn--active': activeCat === cat.key }"
              @click="activeCat = cat.key"
            >{{ cat.label }}</button>
          </div>
        </div>

        <div class="amb-gallery" v-if="filteredImages.length">
          <div v-for="(img, idx) in filteredImages" :key="idx" class="amb-img-card">
            <div class="amb-img-wrap">
              <img :src="img.url" :alt="img.label" class="amb-img" loading="lazy">
              <div class="amb-img-actions">
                <select v-model="img.category" class="amb-img-cat" @change="save">
                  <option v-for="c in IMAGE_CATS" :key="c.key" :value="c.key">{{ c.label }}</option>
                </select>
                <button class="amb-img-del" @click="removeImage(img)" title="удалить">×</button>
              </div>
            </div>
            <input v-model="img.comment" class="amb-img-comment" placeholder="комментарий к фото..." @blur="save">
          </div>
        </div>
        <div v-else class="amb-gallery-empty">
          <span>🖼</span>
          <p>Загрузите референсы или добавьте ссылки ниже</p>
        </div>

        <!-- Upload bar -->
        <div class="amb-upload-bar">
          <label class="amb-upload-btn" :class="{ 'amb-upload-btn--loading': uploading }">
            {{ uploading ? 'загрузка...' : '+ загрузить изображения' }}
            <input type="file" multiple accept="image/*" style="display:none" @change="onImgInput" :disabled="uploading">
          </label>
          <select v-model="newCategory" class="amb-new-cat-sel">
            <option v-for="c in IMAGE_CATS" :key="c.key" :value="c.key">{{ c.label }}</option>
          </select>
        </div>
      </div>

      <!-- External refs / links -->
      <div class="amb-section">
        <div class="amb-section-title">ссылки-референсы (Pinterest, Houzz, etc.)</div>
        <div class="amb-links-list" v-if="form.mb_links.length">
          <div v-for="(link, idx) in form.mb_links" :key="idx" class="amb-link-item">
            <span class="amb-link-icon">🔗</span>
            <input v-model="link.url" class="amb-link-inp amb-link-url" placeholder="https://..." @blur="save">
            <input v-model="link.label" class="amb-link-inp" placeholder="описание..." @blur="save">
            <button class="amb-link-del" @click="removeLink(Number(idx))">×</button>
          </div>
        </div>
        <button class="amb-add-link-btn" @click="addLink">+ добавить ссылку</button>
      </div>

      <!-- General notes -->
      <div class="amb-section">
        <div class="amb-section-title">примечания</div>
        <div class="amb-rows">
          <div class="amb-row amb-row--full">
            <label class="amb-lbl">замечания дизайнера</label>
            <textarea v-model="form.mb_notes" class="amb-inp amb-ta" rows="3" @blur="save" />
          </div>
          <div class="amb-row amb-row--full">
            <label class="amb-lbl">антипримеры (что NOT to do)</label>
            <textarea v-model="form.mb_dislikes" class="amb-inp amb-ta" rows="2" @blur="save" />
          </div>
        </div>
      </div>

    </template>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{ slug: string }>()

const { data: project, pending } = await useFetch<any>(() => `/api/projects/${props.slug}`)

const { savedAt, touch: markSaved } = useTimestamp()
const uploading = ref(false)
const activeCat = ref('all')
const newCategory = ref('style')

const STYLE_TAGS = [
  'минимализм','контемпорари','japandi','скандинавский','вернакулярный',
  'art-deco','лофт','индустриальный','эклектика','классика',
  'природные_текстуры','монохром','эко','hi-tech',
]

const IMAGE_CATS = [
  { key: 'style',      label: 'стиль' },
  { key: 'colors',     label: 'цвета' },
  { key: 'materials',  label: 'материалы' },
  { key: 'furniture',  label: 'мебель' },
  { key: 'lighting',   label: 'свет' },
  { key: 'details',    label: 'детали' },
  { key: 'other',      label: 'прочее' },
]

const imageCats = computed(() => [
  { key: 'all', label: 'все' },
  ...IMAGE_CATS.filter(c => form.mb_images.some((i: any) => i.category === c.key))
])

const form = reactive<any>({
  mb_status:     '',
  mb_style_tags: [] as string[],
  mb_keywords:   '',
  mb_images:     [] as any[],
  mb_links:      [] as any[],
  mb_notes:      '',
  mb_dislikes:   '',
})

watch(project, (p) => {
  if (!p?.profile) return
  const pf = p.profile
  Object.keys(form).forEach(k => {
    if (pf[k] !== undefined) (form as any)[k] = pf[k]
  })
  if (!Array.isArray(form.mb_style_tags)) form.mb_style_tags = []
  if (!Array.isArray(form.mb_images))     form.mb_images = []
  if (!Array.isArray(form.mb_links))      form.mb_links = []
}, { immediate: true })

const filteredImages = computed(() =>
  activeCat.value === 'all'
    ? form.mb_images
    : form.mb_images.filter((i: any) => i.category === activeCat.value)
)

const statusColor = useStatusColor(form, 'mb_status')

function toggleTag(tag: string) {
  const idx = form.mb_style_tags.indexOf(tag)
  if (idx === -1) form.mb_style_tags.push(tag)
  else form.mb_style_tags.splice(idx, 1)
  save()
}

async function save() {
  await $fetch(`/api/projects/${props.slug}`, {
    method: 'PUT',
    body: { profile: { ...(project.value?.profile || {}), ...form } },
  })
  markSaved()
}

async function onImgInput(e: Event) {
  const files = (e.target as HTMLInputElement).files
  if (!files?.length) return
  uploading.value = true
  for (const f of Array.from(files)) {
    const fd = new FormData()
    fd.append('file', f)
    const res = await $fetch<any>('/api/upload', { method: 'POST', body: fd })
    form.mb_images.push({
      url:      res.url,
      filename: f.name,
      label:    f.name.replace(/\.[^.]+$/, ''),
      category: newCategory.value,
      comment:  '',
    })
  }
  uploading.value = false
  await save();
  (e.target as HTMLInputElement).value = ''
}

function removeImage(img: any) {
  form.mb_images.splice(form.mb_images.indexOf(img), 1)
  save()
}

function addLink() {
  form.mb_links.push({ url: '', label: '' })
}
function removeLink(idx: number) {
  form.mb_links.splice(idx, 1)
  save()
}
</script>

<style scoped>
.amb-wrap { padding: 4px 0 40px; }
.amb-loading { padding: 40px 0; font-size: .82rem; color: #aaa; }

.amb-status-row { display: flex; align-items: center; gap: 10px; margin-bottom: 28px; }
.amb-dot { width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0; }
.amb-dot--gray   { background: #ccc; }
.amb-dot--blue   { background: #6b9fd4; }
.amb-dot--yellow { background: #e8b84b; }
.amb-dot--red    { background: #d46b6b; }
.amb-dot--green  { background: #5caa7f; }
.amb-status-sel  { background: none; border: 1px solid var(--border, #e0e0e0); padding: 4px 10px; font-size: .78rem; font-family: inherit; color: inherit; cursor: pointer; }
.amb-saved       { font-size: .72rem; color: #5caa7f; margin-left: auto; }

.amb-section { margin-bottom: 32px; }
.amb-section-title {
  font-size: .68rem; text-transform: uppercase; letter-spacing: 1.2px; color: #aaa;
  margin-bottom: 16px; padding-bottom: 8px; border-bottom: 1px solid var(--border, #ececec);
  display: flex; align-items: center; flex-wrap: wrap; gap: 8px;
}
.amb-section-count { font-size: .7rem; color: #bbb; }

/* Style tags */
.amb-tags-row { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 8px; }
.amb-tag-btn {
  border: 1px solid var(--border, #e0e0e0); background: none; padding: 4px 10px;
  font-size: .72rem; font-family: inherit; color: #999; cursor: pointer;
}
.amb-tag-btn:hover { border-color: #aaa; color: inherit; }
.amb-tag-btn--on { border-color: #1a1a1a; color: #1a1a1a; background: var(--bg2, #f8f8f7); }

/* Category filter */
.amb-cat-filter { display: flex; flex-wrap: wrap; gap: 4px; margin-left: auto; }
.amb-cat-btn { border: 1px solid transparent; background: none; padding: 2px 8px; font-size: .7rem; font-family: inherit; color: #bbb; cursor: pointer; }
.amb-cat-btn:hover { color: #666; border-color: var(--border, #e0e0e0); }
.amb-cat-btn--active { color: inherit; border-color: var(--border, #e0e0e0); }

/* Gallery */
.amb-gallery {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 10px;
  margin-bottom: 12px;
}
.amb-img-card { display: flex; flex-direction: column; gap: 4px; }
.amb-img-wrap { position: relative; aspect-ratio: 4/3; overflow: hidden; background: var(--bg2, #f8f8f7); border: 1px solid var(--border, #e0e0e0); }
.amb-img { width: 100%; height: 100%; object-fit: cover; display: block; }
.amb-img-actions {
  position: absolute; bottom: 0; left: 0; right: 0;
  padding: 6px; background: rgba(0,0,0,.55); display: flex; gap: 4px; align-items: center;
  opacity: 0; transition: opacity .15s;
}
.amb-img-card:hover .amb-img-actions { opacity: 1; }
.amb-img-cat { flex: 1; background: transparent; border: 1px solid rgba(255,255,255,.3); color: #fff; font-size: .68rem; padding: 2px 4px; font-family: inherit; }
.amb-img-cat option { background: #222; }
.amb-img-del { background: none; border: 1px solid rgba(255,255,255,.3); color: #fff; cursor: pointer; font-size: .9rem; line-height: 1; width: 22px; height: 22px; display: flex; align-items: center; justify-content: center; }
.amb-img-comment { border: 1px solid var(--border, #e0e0e0); background: none; padding: 4px 8px; font-size: .72rem; font-family: inherit; color: inherit; outline: none; }
.amb-gallery-empty { text-align: center; padding: 32px 0; color: #bbb; border: 1px dashed var(--border, #e0e0e0); margin-bottom: 12px; }
.amb-gallery-empty span { font-size: 1.8rem; display: block; margin-bottom: 8px; opacity: .4; }
.amb-gallery-empty p { font-size: .78rem; margin: 0; }

.amb-upload-bar { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.amb-upload-btn { display: inline-flex; align-items: center; border: 1px solid var(--border, #e0e0e0); padding: 7px 14px; font-size: .78rem; color: #666; cursor: pointer; user-select: none; }
.amb-upload-btn:hover { border-color: #aaa; color: inherit; }
.amb-upload-btn--loading { opacity: .6; cursor: wait; }
.amb-new-cat-sel { border: 1px solid var(--border, #e0e0e0); background: none; padding: 5px 10px; font-size: .78rem; font-family: inherit; color: inherit; }

/* Links */
.amb-links-list { display: flex; flex-direction: column; gap: 6px; margin-bottom: 10px; }
.amb-link-item { display: flex; align-items: center; gap: 6px; }
.amb-link-icon { font-size: 1rem; flex-shrink: 0; }
.amb-link-inp { flex: 1; border: 1px solid var(--border, #e0e0e0); background: none; padding: 6px 8px; font-size: .78rem; font-family: inherit; color: inherit; outline: none; }
.amb-link-url { flex: 2; }
.amb-link-del { background: none; border: none; cursor: pointer; color: #aaa; font-size: 1.1rem; }
.amb-link-del:hover { color: #c00; }
.amb-add-link-btn { background: none; border: 1px dashed var(--border, #e0e0e0); padding: 6px 14px; font-size: .78rem; color: #aaa; cursor: pointer; font-family: inherit; }
.amb-add-link-btn:hover { border-color: #aaa; color: inherit; }

/* Row form */
.amb-rows { display: grid; grid-template-columns: 1fr 1fr; gap: 12px 20px; }
.amb-row { display: flex; flex-direction: column; gap: 5px; }
.amb-row--full { grid-column: 1 / -1; }
.amb-lbl { font-size: .72rem; color: #999; }
.amb-inp { border: 1px solid var(--border, #e0e0e0); padding: 7px 10px; font-size: .82rem; background: var(--bg, #fff); color: inherit; font-family: inherit; outline: none; }
.amb-ta { resize: vertical; }
</style>
