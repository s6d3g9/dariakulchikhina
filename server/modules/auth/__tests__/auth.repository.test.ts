/**
 * Unit suite for server/modules/auth/auth.repository.ts.
 * Requires a live PostgreSQL DB at DATABASE_URL.
 *
 * Usage (via pnpm):
 *   pnpm test:server:auth
 *
 * Direct:
 *   node --experimental-strip-types \
 *        --import=./server/modules/auth/__tests__/tilde-register.mjs \
 *        server/modules/auth/__tests__/auth.repository.test.ts
 */

import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomUUID } from 'node:crypto'

// Load root .env so DATABASE_URL is available before any module that reads it
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
  // Dynamic imports ensure env vars are in process.env before server/config.ts
  // validates them at module-evaluation time.
  const { eq } = await import('drizzle-orm')
  const { useDb } = await import('../../../db/index.ts')
  const { users } = await import('../../../db/schema/users.ts')
  const { projects } = await import('../../../db/schema/projects.ts')
  const { contractors } = await import('../../../db/schema/contractors.ts')
  const {
    findUserByLoginOrEmail,
    findUserById,
    findUserByEmail,
    findFirstUser,
    findUserForRecovery,
    findUserByLoginOrEmailExists,
    insertUser,
    updateUserPassword,
    findProjectByClientSlug,
    findProjectWithPasswordByClientLogin,
    findProjectByClientLogin,
    findProjectWithRecoveryByClientLogin,
    projectSlugExists,
    insertClientProject,
    updateProjectClientPassword,
    findContractorById,
    findContractorWithPasswordByLogin,
    findContractorByLogin,
    findContractorWithRecoveryByLogin,
    contractorSlugExists,
    insertContractor,
    updateContractorPassword,
    findContractorIdForSession,
  } = await import('../auth.repository.ts')

  let userId: number | undefined
  let projectId: number | undefined
  let contractorId: number | undefined

  try {
    // ── Admin / users ────────────────────────────────────────────────────────

    const uid = randomUUID()
    const userLogin = `testlogin-${uid}`
    const userEmail = `test-${uid}@example.com`
    const passwordHash = `hash-${uid}`
    const recoveryHash = `recovery-${uid}`

    // insertUser
    const user = await insertUser({
      email: userEmail,
      login: userLogin,
      passwordHash,
      recoveryPhraseHash: recoveryHash,
    })
    userId = user.id
    assert(user.id > 0, 'insertUser: returns positive id')
    assert(user.email === userEmail, 'insertUser: email matches')
    assert(user.login === userLogin, 'insertUser: login matches')

    // findUserByLoginOrEmail — by login, by email, miss
    const byLogin = await findUserByLoginOrEmail(userLogin)
    assert(byLogin?.id === user.id, 'findUserByLoginOrEmail: found by login')
    const byEmail = await findUserByLoginOrEmail(userEmail)
    assert(byEmail?.id === user.id, 'findUserByLoginOrEmail: found by email')
    const missLoginOrEmail = await findUserByLoginOrEmail('no-such-user-xyz-' + uid)
    assert(missLoginOrEmail === null, 'findUserByLoginOrEmail: null on miss')

    // findUserById — found, miss
    const foundById = await findUserById(user.id)
    assert(foundById?.id === user.id, 'findUserById: found')
    const notFoundById = await findUserById(-1)
    assert(notFoundById === null, 'findUserById: null on miss')

    // findUserByEmail — found, miss
    const foundByEmail = await findUserByEmail(userEmail)
    assert(foundByEmail?.id === user.id, 'findUserByEmail: found')
    const notFoundByEmail = await findUserByEmail('no-' + uid + '@example.com')
    assert(notFoundByEmail === null, 'findUserByEmail: null on miss')

    // findFirstUser — always returns something in a seeded dev DB
    const first = await findFirstUser()
    assert(first !== null, 'findFirstUser: returns a user row')

    // findUserForRecovery — found, miss
    const forRecovery = await findUserForRecovery(userLogin)
    assert(forRecovery?.id === user.id, 'findUserForRecovery: found')
    const notFoundRecovery = await findUserForRecovery('no-login-xyz-' + uid)
    assert(notFoundRecovery === null, 'findUserForRecovery: null on miss')

    // findUserByLoginOrEmailExists — match by login, by email, miss
    const existsByLogin = await findUserByLoginOrEmailExists(userLogin, 'other@example.com')
    assert(existsByLogin?.id === user.id, 'findUserByLoginOrEmailExists: found by login')
    const existsByEmail = await findUserByLoginOrEmailExists('no-login-xyz', userEmail)
    assert(existsByEmail?.id === user.id, 'findUserByLoginOrEmailExists: found by email')
    const notExists = await findUserByLoginOrEmailExists('no-login-xyz', 'no-' + uid + '@example.com')
    assert(notExists === null, 'findUserByLoginOrEmailExists: null on miss')

    // updateUserPassword — mutates, verified via findUserByLoginOrEmail (which selects passwordHash)
    const newHash = `newhash-${uid}`
    await updateUserPassword(user.id, newHash)
    const afterUpdate = await findUserByLoginOrEmail(userLogin)
    assert(afterUpdate?.passwordHash === newHash, 'updateUserPassword: hash updated')

    // ── Client / projects ────────────────────────────────────────────────────

    const puid = randomUUID()
    const projectSlug = `test-slug-${puid}`
    const projectLogin = `test-proj-${puid}`
    const projPasswordHash = `phash-${puid}`
    const projRecoveryHash = `precovery-${puid}`

    // insertClientProject
    const project = await insertClientProject({
      slug: projectSlug,
      title: `Test Project ${puid}`,
      clientLogin: projectLogin,
      clientPasswordHash: projPasswordHash,
      clientRecoveryPhraseHash: projRecoveryHash,
      profile: {},
    })
    projectId = project.id
    assert(project.id > 0, 'insertClientProject: returns positive id')
    assert(project.slug === projectSlug, 'insertClientProject: slug matches')
    assert(project.clientLogin === projectLogin, 'insertClientProject: clientLogin matches')

    // findProjectByClientSlug — found, miss
    const bySlug = await findProjectByClientSlug(projectSlug)
    assert(bySlug?.id === project.id, 'findProjectByClientSlug: found')
    const notBySlug = await findProjectByClientSlug('no-such-slug-xyz')
    assert(notBySlug === null, 'findProjectByClientSlug: null on miss')

    // findProjectWithPasswordByClientLogin — found (with hash), miss
    const projWithPw = await findProjectWithPasswordByClientLogin(projectLogin)
    assert(projWithPw?.id === project.id, 'findProjectWithPasswordByClientLogin: found')
    assert(projWithPw?.clientPasswordHash === projPasswordHash, 'findProjectWithPasswordByClientLogin: hash present')
    const notProjWithPw = await findProjectWithPasswordByClientLogin('no-proj-login-xyz')
    assert(notProjWithPw === null, 'findProjectWithPasswordByClientLogin: null on miss')

    // findProjectByClientLogin — found, miss
    const byClientLogin = await findProjectByClientLogin(projectLogin)
    assert(byClientLogin?.id === project.id, 'findProjectByClientLogin: found')
    const notByClientLogin = await findProjectByClientLogin('no-proj-login-xyz')
    assert(notByClientLogin === null, 'findProjectByClientLogin: null on miss')

    // findProjectWithRecoveryByClientLogin — found, miss
    const projWithRecovery = await findProjectWithRecoveryByClientLogin(projectLogin)
    assert(projWithRecovery?.id === project.id, 'findProjectWithRecoveryByClientLogin: found')
    const notProjWithRecovery = await findProjectWithRecoveryByClientLogin('no-proj-login-xyz')
    assert(notProjWithRecovery === null, 'findProjectWithRecoveryByClientLogin: null on miss')

    // projectSlugExists — true, false
    assert(await projectSlugExists(projectSlug) === true, 'projectSlugExists: true for existing slug')
    assert(await projectSlugExists('no-such-slug-xyz-' + puid) === false, 'projectSlugExists: false for absent slug')

    // updateProjectClientPassword — mutates, verified via findProjectWithPasswordByClientLogin
    const newProjHash = `new-phash-${puid}`
    await updateProjectClientPassword(project.id, newProjHash)
    const afterProjUpdate = await findProjectWithPasswordByClientLogin(projectLogin)
    assert(afterProjUpdate?.clientPasswordHash === newProjHash, 'updateProjectClientPassword: hash updated')

    // ── Contractor ───────────────────────────────────────────────────────────

    const cuid = randomUUID()
    const contractorSlug = `test-contractor-${cuid}`
    const contractorLogin = `test-clogin-${cuid}`
    const contrPasswordHash = `chash-${cuid}`
    const contrRecoveryHash = `crecovery-${cuid}`

    // insertContractor
    const contractor = await insertContractor({
      slug: contractorSlug,
      login: contractorLogin,
      passwordHash: contrPasswordHash,
      recoveryPhraseHash: contrRecoveryHash,
      name: `Test Contractor ${cuid}`,
    })
    contractorId = contractor.id
    assert(contractor.id > 0, 'insertContractor: returns positive id')
    assert(contractor.login === contractorLogin, 'insertContractor: login matches')

    // findContractorById — found, miss
    const contrById = await findContractorById(contractor.id)
    assert(contrById?.id === contractor.id, 'findContractorById: found')
    const notContrById = await findContractorById(-1)
    assert(notContrById === null, 'findContractorById: null on miss')

    // findContractorWithPasswordByLogin — found (with hash), miss
    const contrWithPw = await findContractorWithPasswordByLogin(contractorLogin)
    assert(contrWithPw?.id === contractor.id, 'findContractorWithPasswordByLogin: found')
    assert(contrWithPw?.passwordHash === contrPasswordHash, 'findContractorWithPasswordByLogin: hash present')
    const notContrWithPw = await findContractorWithPasswordByLogin('no-contr-login-xyz')
    assert(notContrWithPw === null, 'findContractorWithPasswordByLogin: null on miss')

    // findContractorByLogin — found, miss
    const contrByLogin = await findContractorByLogin(contractorLogin)
    assert(contrByLogin?.id === contractor.id, 'findContractorByLogin: found')
    const notContrByLogin = await findContractorByLogin('no-contr-login-xyz')
    assert(notContrByLogin === null, 'findContractorByLogin: null on miss')

    // findContractorWithRecoveryByLogin — found, miss
    const contrWithRecovery = await findContractorWithRecoveryByLogin(contractorLogin)
    assert(contrWithRecovery?.id === contractor.id, 'findContractorWithRecoveryByLogin: found')
    const notContrWithRecovery = await findContractorWithRecoveryByLogin('no-contr-login-xyz')
    assert(notContrWithRecovery === null, 'findContractorWithRecoveryByLogin: null on miss')

    // contractorSlugExists — true, false
    assert(await contractorSlugExists(contractorSlug) === true, 'contractorSlugExists: true')
    assert(await contractorSlugExists('no-such-contractor-slug-xyz-' + cuid) === false, 'contractorSlugExists: false')

    // updateContractorPassword — mutates, verified via findContractorWithPasswordByLogin
    const newContrHash = `new-chash-${cuid}`
    await updateContractorPassword(contractor.id, newContrHash)
    const afterContrUpdate = await findContractorWithPasswordByLogin(contractorLogin)
    assert(afterContrUpdate?.passwordHash === newContrHash, 'updateContractorPassword: hash updated')

    // ── Session ──────────────────────────────────────────────────────────────

    // findContractorIdForSession — found, miss
    const forSession = await findContractorIdForSession(contractor.id)
    assert(forSession?.id === contractor.id, 'findContractorIdForSession: found')
    const notForSession = await findContractorIdForSession(-1)
    assert(notForSession === null, 'findContractorIdForSession: null on miss')

    console.log('PASS: auth.repository — all 23 exported functions covered, all assertions green')
  } finally {
    const db = useDb()
    // delete project first (nullable FK to users is harmless but avoids ordering issues)
    if (projectId !== undefined) await db.delete(projects).where(eq(projects.id, projectId))
    if (userId !== undefined) await db.delete(users).where(eq(users.id, userId))
    if (contractorId !== undefined) await db.delete(contractors).where(eq(contractors.id, contractorId))
  }
}

main().catch((err) => {
  console.error('FAIL:', err)
  process.exit(1)
})
