/**
 * Unit suite for server/modules/projects/project-governance.repository.ts.
 * Requires a live PostgreSQL DB at DATABASE_URL.
 *
 * Usage (via pnpm):
 *   pnpm test:server:projects-governance
 *
 * Direct:
 *   node --experimental-strip-types \
 *        --import=./server/modules/projects/__tests__/tilde-register.mjs \
 *        server/modules/projects/__tests__/project-governance.repository.test.ts
 */

import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomUUID } from 'node:crypto'

const _dir = dirname(fileURLToPath(import.meta.url))
const _envPath = resolve(_dir, '../../../../.env')
try {
  for (const line of readFileSync(_envPath, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z][A-Z0-9_]*)=(.*)$/)
    // eslint-disable-next-line no-restricted-syntax
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2]
  }
} catch { /* .env absent — rely on pre-set env vars */ }

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) {
    console.error(`FAIL: ${message}`)
    process.exit(1)
  }
}

async function main() {
  const { eq, sql } = await import('drizzle-orm')
  const { useDb } = await import('../../../db/index.ts')
  const postgres = (await import('postgres')).default
  const { projects } = await import('../../../db/schema/projects.ts')
  const {
    projectParticipants,
    projectScopeAssignments,
    projectScopeSettings,
  } = await import('../../../db/schema/project-governance.ts')
  const {
    runInTransaction,
    findGovernanceProject,
    readGovernanceParticipants,
    readGovernanceAssignments,
    readGovernanceSettings,
    findParticipantByProjectAndId,
    insertParticipantInTx,
    updateParticipantInTx,
    findAssignmentByProjectAndId,
    insertAssignmentInTx,
    updateAssignmentInTx,
    deleteAssignmentInTx,
    findScopeSettingsByContext,
    findScopeSettingsByContextInTx,
    insertScopeSettingsInTx,
    updateScopeSettingsInTx,
    findWorkTaskForScope,
    findDocumentForScope,
    findExtraServiceForScope,
    readGovernanceSyncData,
    updateProjectHybridControlInTx,
  } = await import('../project-governance.repository.ts')

  const db = useDb()
  const rawSql = postgres(process.env.DATABASE_URL!)
  const uid = randomUUID()
  const projectSlug = `test-gov-${uid}`

  let projectId: number | undefined
  let participantId: number | undefined
  let secondParticipantId: number | undefined
  let assignmentId: number | undefined
  let scopeSettingsId: number | undefined

  try {
    // ── Ensure governance tables exist (migration 0004_project_governance.sql) ──

    await rawSql`
      CREATE TABLE IF NOT EXISTS project_participants (
        id serial PRIMARY KEY,
        project_id integer NOT NULL REFERENCES projects(id) ON DELETE cascade,
        source_kind text DEFAULT 'custom' NOT NULL,
        source_id integer,
        role_key text DEFAULT 'other' NOT NULL,
        display_name text NOT NULL,
        company_name text,
        phone text,
        email text,
        messenger_nick text,
        is_primary boolean DEFAULT false NOT NULL,
        status text DEFAULT 'active' NOT NULL,
        notes text,
        meta jsonb DEFAULT '{}'::jsonb NOT NULL,
        created_at timestamp DEFAULT now() NOT NULL,
        updated_at timestamp DEFAULT now() NOT NULL,
        CONSTRAINT project_participant_source_uniq UNIQUE(project_id, source_kind, source_id)
      )
    `
    await rawSql`
      CREATE TABLE IF NOT EXISTS project_scope_assignments (
        id serial PRIMARY KEY,
        project_id integer NOT NULL REFERENCES projects(id) ON DELETE cascade,
        participant_id integer NOT NULL REFERENCES project_participants(id) ON DELETE cascade,
        scope_type text NOT NULL,
        scope_source text NOT NULL,
        scope_id text NOT NULL,
        responsibility text DEFAULT 'observer' NOT NULL,
        allocation_percent integer,
        status text DEFAULT 'active' NOT NULL,
        due_date text,
        notes text,
        meta jsonb DEFAULT '{}'::jsonb NOT NULL,
        assigned_by text,
        assigned_at timestamp DEFAULT now() NOT NULL,
        updated_at timestamp DEFAULT now() NOT NULL,
        CONSTRAINT project_scope_assignment_uniq UNIQUE(project_id, participant_id, scope_type, scope_source, scope_id, responsibility)
      )
    `
    await rawSql`
      CREATE TABLE IF NOT EXISTS project_scope_settings (
        id serial PRIMARY KEY,
        project_id integer NOT NULL REFERENCES projects(id) ON DELETE cascade,
        scope_type text NOT NULL,
        scope_source text NOT NULL,
        scope_id text NOT NULL,
        settings jsonb DEFAULT '{}'::jsonb NOT NULL,
        created_at timestamp DEFAULT now() NOT NULL,
        updated_at timestamp DEFAULT now() NOT NULL,
        CONSTRAINT project_scope_settings_uniq UNIQUE(project_id, scope_type, scope_source, scope_id)
      )
    `

    // ── Fixture: one project (raw SQL avoids schema/DB drift on nullable cols) ──

    const [project] = await rawSql<{ id: number; slug: string }>`
      INSERT INTO projects (slug, title) VALUES (${projectSlug}, ${'Test Governance Project ' + uid}) RETURNING id, slug
    `
    projectId = project.id

    // ── findGovernanceProject ────────────────────────────────────────────

    const found = await findGovernanceProject(projectSlug)
    assert(found !== null, 'findGovernanceProject: found by slug')
    assert(found!.id === projectId, 'findGovernanceProject: correct id')
    assert(found!.slug === projectSlug, 'findGovernanceProject: slug matches')

    const notFound = await findGovernanceProject('no-such-slug-xyz-' + uid)
    assert(notFound === null, 'findGovernanceProject: null on miss')

    // ── readGovernanceParticipants (empty) ───────────────────────────────

    const emptyParticipants = await readGovernanceParticipants(projectId)
    assert(Array.isArray(emptyParticipants), 'readGovernanceParticipants: returns array')
    assert(emptyParticipants.length === 0, 'readGovernanceParticipants: empty initially')

    // ── insertParticipantInTx ────────────────────────────────────────────

    const p1 = await runInTransaction(tx =>
      insertParticipantInTx(tx, {
        projectId,
        displayName: `Alpha ${uid}`,
        roleKey: 'designer',
        sourceKind: 'custom',
      }),
    )
    participantId = p1.id
    assert(p1.id > 0, 'insertParticipantInTx: returns positive id')
    assert(p1.projectId === projectId, 'insertParticipantInTx: projectId matches')
    assert(p1.displayName === `Alpha ${uid}`, 'insertParticipantInTx: displayName matches')

    const p2 = await runInTransaction(tx =>
      insertParticipantInTx(tx, {
        projectId,
        displayName: `Beta ${uid}`,
        roleKey: 'contractor',
        sourceKind: 'custom',
      }),
    )
    secondParticipantId = p2.id
    assert(p2.id > 0, 'insertParticipantInTx (second): returns positive id')

    // ── readGovernanceParticipants (populated) ───────────────────────────

    const participants = await readGovernanceParticipants(projectId)
    assert(participants.length === 2, 'readGovernanceParticipants: returns both participants')

    // ── findParticipantByProjectAndId ────────────────────────────────────

    const foundP = await findParticipantByProjectAndId(projectId, participantId)
    assert(foundP !== null, 'findParticipantByProjectAndId: found')
    assert(foundP!.id === participantId, 'findParticipantByProjectAndId: correct id')

    const notFoundP = await findParticipantByProjectAndId(projectId, -1)
    assert(notFoundP === null, 'findParticipantByProjectAndId: null on miss')

    // ── updateParticipantInTx ────────────────────────────────────────────

    const updatedP = await runInTransaction(tx =>
      updateParticipantInTx(tx, projectId!, participantId!, { notes: 'updated-note' }),
    )
    assert(updatedP !== null, 'updateParticipantInTx: returns row')
    assert(updatedP!.notes === 'updated-note', 'updateParticipantInTx: notes updated')

    const notUpdatedP = await runInTransaction(tx =>
      updateParticipantInTx(tx, projectId!, -1, { notes: 'x' }),
    )
    assert(notUpdatedP === null, 'updateParticipantInTx: null on miss')

    // ── insertAssignmentInTx ─────────────────────────────────────────────

    const a1 = await runInTransaction(tx =>
      insertAssignmentInTx(tx, {
        projectId,
        participantId,
        scopeType: 'work_task',
        scopeSource: 'internal',
        scopeId: `scope-${uid}`,
        responsibility: 'executor',
      }),
    )
    assignmentId = a1.id
    assert(a1.id > 0, 'insertAssignmentInTx: returns positive id')
    assert(a1.projectId === projectId, 'insertAssignmentInTx: projectId matches')
    assert(a1.scopeType === 'work_task', 'insertAssignmentInTx: scopeType matches')

    // ── readGovernanceAssignments ────────────────────────────────────────

    const assignments = await readGovernanceAssignments(projectId)
    assert(Array.isArray(assignments), 'readGovernanceAssignments: returns array')
    assert(assignments.length === 1, 'readGovernanceAssignments: one assignment')

    // ── findAssignmentByProjectAndId ─────────────────────────────────────

    const foundA = await findAssignmentByProjectAndId(projectId, assignmentId)
    assert(foundA !== null, 'findAssignmentByProjectAndId: found')
    assert(foundA!.id === assignmentId, 'findAssignmentByProjectAndId: correct id')

    const notFoundA = await findAssignmentByProjectAndId(projectId, -1)
    assert(notFoundA === null, 'findAssignmentByProjectAndId: null on miss')

    // ── updateAssignmentInTx ─────────────────────────────────────────────

    const updatedA = await runInTransaction(tx =>
      updateAssignmentInTx(tx, projectId!, assignmentId!, { notes: 'assign-note' }),
    )
    assert(updatedA !== null, 'updateAssignmentInTx: returns row')
    assert(updatedA!.notes === 'assign-note', 'updateAssignmentInTx: notes updated')

    const notUpdatedA = await runInTransaction(tx =>
      updateAssignmentInTx(tx, projectId!, -1, { notes: 'x' }),
    )
    assert(notUpdatedA === null, 'updateAssignmentInTx: null on miss')

    // ── insertScopeSettingsInTx ──────────────────────────────────────────

    const ss = await runInTransaction(tx =>
      insertScopeSettingsInTx(tx, {
        projectId,
        scopeType: 'work_task',
        scopeSource: 'internal',
        scopeId: `scope-${uid}`,
        settings: { visible: true },
      }),
    )
    scopeSettingsId = ss.id
    assert(ss.id > 0, 'insertScopeSettingsInTx: returns positive id')
    assert(ss.projectId === projectId, 'insertScopeSettingsInTx: projectId matches')

    // ── readGovernanceSettings ───────────────────────────────────────────

    const settings = await readGovernanceSettings(projectId)
    assert(Array.isArray(settings), 'readGovernanceSettings: returns array')
    assert(settings.length === 1, 'readGovernanceSettings: one setting row')

    // ── findScopeSettingsByContext ────────────────────────────────────────

    const foundSS = await findScopeSettingsByContext(projectId, 'work_task', 'internal', `scope-${uid}`)
    assert(foundSS !== null, 'findScopeSettingsByContext: found')
    assert(foundSS!.id === scopeSettingsId, 'findScopeSettingsByContext: correct id')

    const notFoundSS = await findScopeSettingsByContext(projectId, 'work_task', 'internal', 'no-such-scope')
    assert(notFoundSS === null, 'findScopeSettingsByContext: null on miss')

    // ── findScopeSettingsByContextInTx ────────────────────────────────────

    const foundSSTx = await runInTransaction(tx =>
      findScopeSettingsByContextInTx(tx, projectId!, 'work_task', 'internal', `scope-${uid}`),
    )
    assert(foundSSTx !== null, 'findScopeSettingsByContextInTx: found')
    assert(foundSSTx!.id === scopeSettingsId, 'findScopeSettingsByContextInTx: correct id')

    const notFoundSSTx = await runInTransaction(tx =>
      findScopeSettingsByContextInTx(tx, projectId!, 'work_task', 'internal', 'no-such-scope'),
    )
    assert(notFoundSSTx === null, 'findScopeSettingsByContextInTx: null on miss')

    // ── updateScopeSettingsInTx ───────────────────────────────────────────

    const updatedSS = await runInTransaction(tx =>
      updateScopeSettingsInTx(tx, projectId!, 'work_task', 'internal', `scope-${uid}`, { settings: { visible: false } }),
    )
    assert(updatedSS !== undefined, 'updateScopeSettingsInTx: returns row')

    // ── readGovernanceSyncData ────────────────────────────────────────────

    const syncData = await runInTransaction(tx => readGovernanceSyncData(tx, projectId!))
    assert(syncData.participantRows.length === 2, 'readGovernanceSyncData: two participants')
    assert(syncData.assignmentRows.length === 1, 'readGovernanceSyncData: one assignment')

    // ── updateProjectHybridControlInTx ────────────────────────────────────

    const profile = found!.profile as Record<string, unknown>
    const revDate = await runInTransaction(tx =>
      updateProjectHybridControlInTx(tx, projectId!, profile, { mode: 'hybrid' }),
    )
    assert(revDate instanceof Date, 'updateProjectHybridControlInTx: returns Date')

    // verify profile was updated
    const updatedProject = await findGovernanceProject(projectSlug)
    assert((updatedProject!.profile as any)?.hybridControl?.mode === 'hybrid', 'updateProjectHybridControlInTx: hybridControl written')

    // ── findWorkTaskForScope (no fixture, just assert null on miss) ────────

    const noTask = await findWorkTaskForScope(projectId, -1)
    assert(noTask === null, 'findWorkTaskForScope: null on miss')

    // ── findDocumentForScope (no fixture, just assert null on miss) ────────

    const noDoc = await findDocumentForScope(projectId, -1)
    assert(noDoc === null, 'findDocumentForScope: null on miss')

    // ── findExtraServiceForScope (no fixture, just assert null on miss) ───

    const noService = await findExtraServiceForScope(projectId, -1)
    assert(noService === null, 'findExtraServiceForScope: null on miss')

    // ── deleteAssignmentInTx ──────────────────────────────────────────────

    await runInTransaction(tx => deleteAssignmentInTx(tx, projectId!, assignmentId!))
    const afterDelete = await findAssignmentByProjectAndId(projectId, assignmentId)
    assert(afterDelete === null, 'deleteAssignmentInTx: row removed')
    assignmentId = undefined

    // ── Transaction rollback: updateProjectHybridControlInTx ─────────────

    let rollbackCaught = false
    try {
      await runInTransaction(async (tx) => {
        await updateProjectHybridControlInTx(tx, projectId!, profile, { mode: 'should-not-persist' })
        throw new Error('deliberate rollback')
      })
    } catch (e: any) {
      rollbackCaught = e.message === 'deliberate rollback'
    }
    assert(rollbackCaught, 'updateProjectHybridControlInTx rollback: error propagated')
    const afterRollback = await findGovernanceProject(projectSlug)
    assert(
      (afterRollback!.profile as any)?.hybridControl?.mode !== 'should-not-persist',
      'updateProjectHybridControlInTx rollback: change not persisted',
    )

    // ── Transaction rollback: insertScopeSettingsInTx ─────────────────────

    let ssRollbackCaught = false
    const ssCountBefore = (await readGovernanceSettings(projectId)).length
    try {
      await runInTransaction(async (tx) => {
        await insertScopeSettingsInTx(tx, {
          projectId,
          scopeType: 'extra',
          scopeSource: 'internal',
          scopeId: `rollback-${uid}`,
          settings: {},
        })
        throw new Error('deliberate rollback ss')
      })
    } catch (e: any) {
      ssRollbackCaught = e.message === 'deliberate rollback ss'
    }
    assert(ssRollbackCaught, 'insertScopeSettingsInTx rollback: error propagated')
    const ssCountAfter = (await readGovernanceSettings(projectId)).length
    assert(ssCountAfter === ssCountBefore, 'insertScopeSettingsInTx rollback: row not persisted')

    console.log('PASS: project-governance.repository — all 20 exported functions covered, all assertions green')
  } finally {
    // Delete in dependency order (cascade handles children but be explicit)
    if (assignmentId !== undefined) {
      await db.delete(projectScopeAssignments).where(eq(projectScopeAssignments.id, assignmentId))
    }
    if (scopeSettingsId !== undefined) {
      await db.delete(projectScopeSettings).where(eq(projectScopeSettings.id, scopeSettingsId))
    }
    if (participantId !== undefined) {
      await db.delete(projectParticipants).where(eq(projectParticipants.id, participantId))
    }
    if (secondParticipantId !== undefined) {
      await db.delete(projectParticipants).where(eq(projectParticipants.id, secondParticipantId))
    }
    if (projectId !== undefined) {
      await rawSql`DELETE FROM projects WHERE id = ${projectId}`
    }
    await rawSql.end()
  }
}

main().catch((err) => {
  console.error('FAIL:', err)
  process.exit(1)
})
