#!/usr/bin/env node
// scripts/migrate-json-to-pg.mjs
// Миграция данных из JSON (Flask) в PostgreSQL (Nuxt)
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createRequire } from 'module'
import postgres from 'postgres'
import bcrypt from 'bcryptjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_DIR = '/opt/daria-admin/data'

// Подключение к PostgreSQL напрямую (без Drizzle)
const sql = postgres('postgresql://daria:daria_secret_2026@localhost:5433/daria_admin', {
  max: 1
})

function readJson(filename) {
  try {
    return JSON.parse(readFileSync(resolve(DATA_DIR, filename), 'utf-8'))
  } catch (e) {
    console.warn(`  [warn] Cannot read ${filename}: ${e.message}`)
    return null
  }
}

async function main() {
  console.log('=== Миграция JSON → PostgreSQL ===\n')

  // 1. Очищаем таблицы (в правильном порядке FK)
  console.log('1. Очищаем таблицы...')
  await sql`DELETE FROM work_status_items`
  await sql`DELETE FROM roadmap_stages`
  await sql`DELETE FROM page_content`
  await sql`DELETE FROM project_contractors`
  await sql`DELETE FROM uploads`
  await sql`DELETE FROM projects`
  await sql`DELETE FROM page_configs`
  await sql`DELETE FROM contractors`
  await sql`DELETE FROM users`
  // Сбрасываем sequences
  for (const t of ['users','projects','page_configs','page_content','contractors','project_contractors','roadmap_stages','work_status_items','uploads']) {
    await sql`SELECT setval(${t + '_id_seq'}, 1, false)`
  }
  console.log('   Готово\n')

  // 2. Создаём admin пользователя
  console.log('2. Создаём admin пользователя...')
  const passwordHash = bcrypt.hashSync('dashadashaadmin', 12)
  const [adminUser] = await sql`
    INSERT INTO users (email, password_hash, name)
    VALUES ('admin@dariakulchikhina.com', ${passwordHash}, 'Дарья К.')
    RETURNING id
  `
  console.log(`   Создан admin user id=${adminUser.id}\n`)

  // 3. Мигрируем page_configs из _pages.json
  console.log('3. Мигрируем page_configs...')
  const pagesData = readJson('_pages.json')
  if (pagesData?.pages) {
    for (let i = 0; i < pagesData.pages.length; i++) {
      const p = pagesData.pages[i]
      await sql`
        INSERT INTO page_configs (slug, title, page_title, font_size, sort_order)
        VALUES (${p.slug}, ${p.title}, ${p.page_title || null}, ${p.font_size || 16}, ${i})
      `
      console.log(`   + page_config: ${p.slug}`)
    }
  }
  console.log()

  // 4. Мигрируем contractors из _contractors.json
  console.log('4. Мигрируем contractors...')
  const contractorsData = readJson('_contractors.json')
  const contractorIdMap = {} // slug → id
  if (contractorsData?.contractors) {
    for (const c of contractorsData.contractors) {
      const [row] = await sql`
        INSERT INTO contractors (
          slug, name, company_name, contact_person, phone, email,
          inn, kpp, ogrn, bank_name, bik, settlement_account,
          correspondent_account, legal_address, fact_address,
          work_types, notes
        ) VALUES (
          ${c.slug},
          ${c.title || c.name || c.slug},
          ${c.company_name || null},
          ${c.contact_person || null},
          ${c.phone || null},
          ${c.email || null},
          ${c.inn || null},
          ${c.kpp || null},
          ${c.ogrn || null},
          ${c.bank_name || null},
          ${c.bik || null},
          ${c.settlement_account || null},
          ${c.correspondent_account || null},
          ${c.legal_address || null},
          ${c.fact_address || null},
          ${sql.array(c.work_types || [])},
          ${c.notes || null}
        )
        RETURNING id
      `
      contractorIdMap[c.slug] = row.id
      console.log(`   + contractor: ${c.slug} (id=${row.id})`)
    }
  }
  console.log()

  // 5. Мигрируем projects из _projects.json
  console.log('5. Мигрируем projects...')
  const projectsData = readJson('_projects.json')
  const projectIdMap = {} // slug → id
  if (projectsData?.projects) {
    for (const p of projectsData.projects) {
      const [row] = await sql`
        INSERT INTO projects (slug, title, user_id, client_pin, pages, profile)
        VALUES (
          ${p.slug},
          ${p.title},
          ${adminUser.id},
          ${p.client_pin || null},
          ${sql.array(p.pages || [])},
          ${sql.json(p.profile || {})}
        )
        RETURNING id
      `
      projectIdMap[p.slug] = row.id
      console.log(`   + project: ${p.slug} (id=${row.id})`)

      // Связываем подрядчиков с проектом
      for (const cSlug of (p.contractors || [])) {
        const cId = contractorIdMap[cSlug]
        if (cId) {
          await sql`
            INSERT INTO project_contractors (project_id, contractor_id)
            VALUES (${row.id}, ${cId})
          `
          console.log(`     link contractor: ${cSlug}`)
        }
      }
    }
  }
  console.log()

  // 6. Мигрируем page_content
  console.log('6. Мигрируем page_content...')
  // Маппинг: page_slug → filename
  const contentMap = {
    'materials': 'materials.json',
    'tz': 'tz.json',
    'profile_customer': 'profile_customer.json',
    'profile_contractors': 'profile_contractors.json',
    'work_status': 'work_status.json',
    'page_3': 'page_3.json',
  }

  for (const [projectSlug, projectId] of Object.entries(projectIdMap)) {
    for (const [pageSlug, filename] of Object.entries(contentMap)) {
      const content = readJson(filename)
      if (content) {
        await sql`
          INSERT INTO page_content (project_id, page_slug, content)
          VALUES (${projectId}, ${pageSlug}, ${sql.json(content)})
          ON CONFLICT (project_id, page_slug) DO UPDATE SET content = EXCLUDED.content
        `
        console.log(`   + page_content: ${projectSlug}/${pageSlug}`)
      }
    }
  }
  console.log()

  // 7. Мигрируем roadmap_stages из _roadmap.json
  console.log('7. Мигрируем roadmap_stages...')
  const roadmapData = readJson('_roadmap.json')
  if (roadmapData?.projects) {
    for (const [projectSlug, data] of Object.entries(roadmapData.projects)) {
      const projectId = projectIdMap[projectSlug]
      if (!projectId) {
        console.log(`   [skip] project not found: ${projectSlug}`)
        continue
      }
      for (let i = 0; i < (data.stages || []).length; i++) {
        const s = data.stages[i]
        await sql`
          INSERT INTO roadmap_stages (
            project_id, stage_key, title, description, status,
            date_start, date_end, notes, sort_order
          ) VALUES (
            ${projectId},
            ${s.id || null},
            ${s.title},
            ${s.description || null},
            ${s.status || 'pending'},
            ${s.date_start || null},
            ${s.date_end || null},
            ${s.notes || null},
            ${i}
          )
        `
      }
      console.log(`   + roadmap: ${projectSlug} (${data.stages?.length || 0} stages)`)
    }
  }
  console.log()

  // 8. Мигрируем work_status_items из _work_statuses.json
  console.log('8. Мигрируем work_status_items...')
  const wsData = readJson('_work_statuses.json')
  // Назначаем все задачи первому project
  const firstProjectId = Object.values(projectIdMap)[0]
  if (wsData?.items && firstProjectId) {
    for (let i = 0; i < wsData.items.length; i++) {
      const item = wsData.items[i]
      // Ищем contractor по slug
      let contractorId = null
      if (item.contractor_slug) {
        contractorId = contractorIdMap[item.contractor_slug] || null
      }
      await sql`
        INSERT INTO work_status_items (
          project_id, contractor_id, title, status,
          date_start, date_end, budget, notes, sort_order
        ) VALUES (
          ${firstProjectId},
          ${contractorId},
          ${item.title},
          ${item.status || 'pending'},
          ${item.start_date || null},
          ${item.end_date || null},
          ${item.budget || null},
          ${item.notes || null},
          ${i}
        )
      `
      console.log(`   + work_item: ${item.title}`)
    }
  }
  console.log()

  // Итог
  console.log('=== Миграция завершена ===')
  const counts = await sql`
    SELECT
      (SELECT count(*) FROM users) as users,
      (SELECT count(*) FROM projects) as projects,
      (SELECT count(*) FROM page_configs) as page_configs,
      (SELECT count(*) FROM contractors) as contractors,
      (SELECT count(*) FROM page_content) as page_content,
      (SELECT count(*) FROM roadmap_stages) as roadmap_stages,
      (SELECT count(*) FROM work_status_items) as work_status_items
  `
  console.log('\nСтатистика:')
  for (const [k, v] of Object.entries(counts[0])) {
    console.log(`  ${k}: ${v}`)
  }

  await sql.end()
}

main().catch(err => {
  console.error('[ERROR]', err)
  process.exit(1)
})
