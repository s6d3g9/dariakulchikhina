import { access, cp, mkdir, readFile, readdir, realpath, symlink } from 'node:fs/promises'
import path from 'node:path'

const REPAIRED_PACKAGES = [
  'vue',
  '@vue/server-renderer',
  'unhead',
]

async function pathExists(targetPath) {
  try {
    await access(targetPath)
    return true
  }
  catch {
    return false
  }
}

async function readPackageManifest(packageRoot) {
  const manifestPath = path.join(packageRoot, 'package.json')
  if (!(await pathExists(manifestPath))) {
    return null
  }

  return JSON.parse(await readFile(manifestPath, 'utf8'))
}

function getPnpmDirectoryPrefix(packageName, version) {
  const normalizedName = packageName.startsWith('@')
    ? packageName.replace('/', '+')
    : packageName

  return `${normalizedName}@${version}`
}

async function findMatchingPackageRoot(projectRoot, packageName, version) {
  const topLevelRoot = path.join(projectRoot, 'node_modules', ...packageName.split('/'))
  const topLevelManifest = await readPackageManifest(topLevelRoot)

  if (topLevelManifest?.name === packageName && topLevelManifest.version === version) {
    return topLevelRoot
  }

  const pnpmStoreRoot = path.join(projectRoot, 'node_modules', '.pnpm')
  if (!(await pathExists(pnpmStoreRoot))) {
    return null
  }

  const entries = await readdir(pnpmStoreRoot, { withFileTypes: true })
  const expectedPrefix = getPnpmDirectoryPrefix(packageName, version)

  for (const entry of entries) {
    if (!entry.isDirectory() || !entry.name.startsWith(expectedPrefix)) {
      continue
    }

    const candidateRoot = path.join(pnpmStoreRoot, entry.name, 'node_modules', ...packageName.split('/'))
    if (await pathExists(candidateRoot)) {
      return candidateRoot
    }
  }

  return null
}

async function resolveBuiltPackageRoot(projectRoot, packageName) {
  const outputNodeModulesRoot = path.join(projectRoot, '.output', 'server', 'node_modules')
  const packageEntryPath = path.join(outputNodeModulesRoot, ...packageName.split('/'))

  if (await pathExists(packageEntryPath)) {
    return {
      linkedEntry: false,
      packageEntryPath,
      packageRoot: await realpath(packageEntryPath),
    }
  }

  const nitroPackagesRoot = path.join(outputNodeModulesRoot, '.nitro')
  if (!(await pathExists(nitroPackagesRoot))) {
    return null
  }

  const nitroEntries = await readdir(nitroPackagesRoot, { withFileTypes: true })
  for (const entry of nitroEntries) {
    if (!entry.isDirectory()) {
      continue
    }

    const candidateRoot = path.join(nitroPackagesRoot, entry.name)
    const candidateManifest = await readPackageManifest(candidateRoot)
    if (candidateManifest?.name !== packageName) {
      continue
    }

    await mkdir(path.dirname(packageEntryPath), { recursive: true })
    await symlink(path.relative(path.dirname(packageEntryPath), candidateRoot), packageEntryPath)
    return {
      linkedEntry: true,
      packageEntryPath,
      packageRoot: candidateRoot,
    }
  }

  return null
}

async function syncMissingTree(sourceRoot, targetRoot, targetBaseRoot, repairedPaths) {
  const sourceEntries = await readdir(sourceRoot, { withFileTypes: true })

  for (const entry of sourceEntries) {
    const sourcePath = path.join(sourceRoot, entry.name)
    const targetPath = path.join(targetRoot, entry.name)

    if (!(await pathExists(targetPath))) {
      await mkdir(path.dirname(targetPath), { recursive: true })
      await cp(sourcePath, targetPath, { recursive: true, dereference: true })
      repairedPaths.push(path.relative(targetBaseRoot, targetPath))
      continue
    }

    if (entry.isDirectory()) {
      await syncMissingTree(sourcePath, targetPath, targetBaseRoot, repairedPaths)
    }
  }
}

async function repairPackage(projectRoot, packageName) {
  const builtPackageInfo = await resolveBuiltPackageRoot(projectRoot, packageName)
  if (!builtPackageInfo) {
    return []
  }

  const builtManifest = await readPackageManifest(builtPackageInfo.packageRoot)
  if (!builtManifest || builtManifest.name !== packageName) {
    return []
  }

  const sourceRoot = await findMatchingPackageRoot(projectRoot, packageName, builtManifest.version)
  if (!sourceRoot) {
    console.warn(`[repair-nitro-vue-runtime] skip ${packageName}: source ${builtManifest.version} not found in node_modules/.pnpm`)
    return []
  }

  const repairedPaths = []
  await syncMissingTree(sourceRoot, builtPackageInfo.packageRoot, builtPackageInfo.packageRoot, repairedPaths)

  if (builtPackageInfo.linkedEntry) {
    repairedPaths.unshift('(entry link)')
  }

  return repairedPaths.map(relativePath => `${packageName}/${relativePath}`)
}

async function main() {
  const projectRoot = process.cwd()
  const outputServerRoot = path.join(projectRoot, '.output', 'server')
  if (!(await pathExists(outputServerRoot))) {
    return
  }

  const repaired = []
  for (const packageName of REPAIRED_PACKAGES) {
    repaired.push(...await repairPackage(projectRoot, packageName))
  }

  if (repaired.length) {
    console.log(`[repair-nitro-vue-runtime] restored ${repaired.join(', ')}`)
  }
}

main().catch((error) => {
  console.error('[repair-nitro-vue-runtime] failed:', error)
  process.exit(1)
})