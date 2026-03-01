#!/usr/bin/env node
// scripts/migrate-pages-bulk.mjs
// Одноразовая миграция: выставить всем проектам полный набор страниц фаз 0–5
import postgres from 'postgres'

const DB_URL = process.env.DATABASE_URL || 'postgresql://daria:daria_secret_2026@localhost:5433/daria_admin'

const TARGET_PAGES = [
  'first_contact',
  'self_profile',
  'site_survey',
  'tor_contract',
  'space_planning',
  'moodboard',
  'concept_approval',
  'working_drawings',
  'specifications',
  'mep_integration',
  'design_album_final',
  'procurement_list',
  'suppliers',
  'procurement_status',
  'construction_plan',
  'work_log',
  'site_photos',
  'punch_list',
  'commissioning_act',
  'client_sign_off',
]

const sql = postgres(DB_URL, { max: 1 })

try {
  const projects = await sql`SELECT id, slug, pages FROM projects ORDER BY id`
  console.log(`Найдено проектов: ${projects.length}`)

  let skipped = 0
  let updated = 0

  for (const p of projects) {
    const pages = Array.isArray(p.pages) ? p.pages : []
    const alreadyCurrent =
      pages.length === TARGET_PAGES.length &&
      pages.every((v, i) => v === TARGET_PAGES[i])

    if (alreadyCurrent) {
      console.log(`  skip  : ${p.slug}`)
      skipped++
      continue
    }

    await sql`
      UPDATE projects
      SET pages = ${sql.array(TARGET_PAGES)}, updated_at = NOW()
      WHERE id = ${p.id}
    `
    console.log(`  updated: ${p.slug}  (было ${pages.length} стр., стало ${TARGET_PAGES.length})`)
    updated++
  }

  console.log(`\nMIGRATION_DONE  обновлено=${updated}  пропущено=${skipped}`)
} catch (e) {
  console.error('MIGRATION_FAIL', e.message)
  process.exitCode = 1
} finally {
  await sql.end()
}
