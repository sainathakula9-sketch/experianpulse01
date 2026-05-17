import Database from 'better-sqlite3'
import esbuild from 'esbuild'
import { mkdtempSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, dirname, join, resolve } from 'node:path'
import { pathToFileURL, fileURLToPath } from 'node:url'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const workspaceRoot = mkdtempSync(join(tmpdir(), 'experian-pulse-backup-test-'))
const userDataPath = join(workspaceRoot, 'userData')
const customBackupFolder = join(workspaceRoot, 'custom-backups')
const oneDriveFolder = join(workspaceRoot, 'OneDrive Sync')
const bundledBackupModulePath = join(repoRoot, '.backup-test-tmp.mjs')
const electronStubPath = join(workspaceRoot, 'electron-stub.mjs')
const results = []

writeFileSync(electronStubPath, `
const paths = new Map([['userData', ${JSON.stringify(userDataPath)}]])
export const app = {
  getPath(name) { return paths.get(name) ?? '' },
  setPath(name, value) { paths.set(name, value) },
  whenReady() { return Promise.resolve() },
  quit() {}
}
export const dialog = {
  showOpenDialog() { return Promise.resolve({ canceled: true, filePaths: [] }) },
  showErrorBox() {}
}
`)

await esbuild.build({
  entryPoints: [join(repoRoot, 'src/main/backup.ts')],
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'esm',
  outfile: bundledBackupModulePath,
  external: ['better-sqlite3'],
  plugins: [
    {
      name: 'electron-stub',
      setup(build) {
        build.onResolve({ filter: /^electron$/ }, () => ({ path: electronStubPath }))
      }
    }
  ]
})

function assert(condition, message) {
  if (!condition) {
    throw new Error(message)
  }
}

function record(name, fn) {
  try {
    const detail = fn()
    results.push({ name, status: 'PASS', detail: detail ?? '' })
  } catch (error) {
    results.push({ name, status: 'FAIL', detail: error instanceof Error ? error.message : String(error) })
  }
}

function initializeDatabase(databasePath) {
  mkdirSync(dirname(databasePath), { recursive: true })
  const database = new Database(databasePath)
  database.pragma('journal_mode = WAL')
  database.exec(`
    CREATE TABLE settings (
      id INTEGER PRIMARY KEY,
      organizationName TEXT NOT NULL,
      dataRegion TEXT NOT NULL,
      notificationsEnabled INTEGER NOT NULL,
      defaultBackupFolder TEXT NOT NULL,
      oneDriveBackupFolder TEXT NOT NULL,
      backupFrequency TEXT NOT NULL,
      defaultCurrency TEXT NOT NULL,
      defaultLocation TEXT NOT NULL,
      lastBackupAt TEXT NOT NULL DEFAULT '',
      lastBackupStatus TEXT NOT NULL DEFAULT 'Never Run',
      lastBackupPath TEXT NOT NULL DEFAULT ''
    );
    CREATE TABLE test_records (
      id INTEGER PRIMARY KEY,
      value TEXT NOT NULL
    );
  `)
  database.prepare(`
    INSERT INTO settings (
      id, organizationName, dataRegion, notificationsEnabled, defaultBackupFolder, oneDriveBackupFolder,
      backupFrequency, defaultCurrency, defaultLocation, lastBackupAt, lastBackupStatus, lastBackupPath
    ) VALUES (1, 'Experian Pulse Test', 'US-East', 1, ?, ?, 'Daily', 'USD', 'United States', '', 'Never Run', '')
  `).run(customBackupFolder, oneDriveFolder)
  database.prepare('INSERT INTO test_records (id, value) VALUES (1, ?)').run('original backup payload')
  return database
}

function corruptZipPayload(sourcePath, destinationPath) {
  const buffer = Buffer.from(readFileSync(sourcePath))
  const needle = Buffer.from('original backup payload')
  const offset = buffer.indexOf(needle)
  assert(offset > -1, 'Could not find test payload inside ZIP backup to corrupt it.')
  buffer[offset] = buffer[offset] ^ 0xff
  writeFileSync(destinationPath, buffer)
}

const backupModule = await import(pathToFileURL(bundledBackupModulePath).href)
const databasePath = backupModule.getDatabasePath()
let database = initializeDatabase(databasePath)
const backupResult = await backupModule.createBackup(database, 'Automated Backup Test')
const localBackupPath = backupResult.localBackupPath ?? ''
const oneDriveBackupPath = backupResult.oneDriveBackupPath ?? ''
const integrityResult = backupModule.validateBackupFile(localBackupPath)

record('backup folder creation', () => {
  assert(statSync(customBackupFolder).isDirectory(), 'Default backup folder was not created.')
  return customBackupFolder
})

record('ZIP backup creation', () => {
  assert(backupResult.success, backupResult.message)
  assert(localBackupPath.endsWith('.zip'), `Backup path is not a ZIP file: ${localBackupPath}`)
  assert(statSync(localBackupPath).size > 0, 'Backup ZIP is empty.')
  return localBackupPath
})

record('OneDrive folder copy', () => {
  assert(oneDriveBackupPath === join(oneDriveFolder, basename(localBackupPath)), 'Unexpected OneDrive copy path.')
  assert(readFileSync(localBackupPath).equals(readFileSync(oneDriveBackupPath)), 'OneDrive copy does not match local backup bytes.')
  return oneDriveBackupPath
})

record('backup integrity', () => {
  assert(integrityResult.valid, integrityResult.message)
  assert(integrityResult.entries.includes('backup-manifest.json'), 'Backup manifest is missing.')
  assert(integrityResult.entries.includes('database/experian-pulse.sqlite'), 'Database entry is missing.')
  return integrityResult.entries.join(', ')
})

database.prepare('UPDATE test_records SET value = ? WHERE id = 1').run('changed after backup')
const restoreResult = backupModule.restoreBackup(database, localBackupPath)
database = new Database(databasePath)

record('restore process', () => {
  assert(restoreResult.success, restoreResult.message)
  const row = database.prepare('SELECT value FROM test_records WHERE id = 1').get()
  assert(row?.value === 'original backup payload', `Restored value mismatch: ${row?.value}`)
  return restoreResult.message
})

database.close()
database = new Database(databasePath)
const protectedValueBeforeCorruptionTest = database.prepare('SELECT value FROM test_records WHERE id = 1').get().value
const corruptedBackupPath = join(customBackupFolder, 'corrupted-backup.zip')
corruptZipPayload(localBackupPath, corruptedBackupPath)
const corruptedRestoreResult = backupModule.restoreBackup(database, corruptedBackupPath)
database.close()
const valueAfterCorruptionTest = new Database(databasePath)

record('corrupted backup handling', () => {
  assert(!corruptedRestoreResult.success, 'Corrupted backup restore unexpectedly succeeded.')
  assert(/checksum|corrupt|integrity|failed/i.test(corruptedRestoreResult.message), `Unexpected corrupted backup message: ${corruptedRestoreResult.message}`)
  const row = valueAfterCorruptionTest.prepare('SELECT value FROM test_records WHERE id = 1').get()
  assert(row?.value === protectedValueBeforeCorruptionTest, 'Corrupted restore changed the live database.')
  return corruptedRestoreResult.message
})

valueAfterCorruptionTest.close()
database = new Database(databasePath)
const missingRestoreResult = backupModule.restoreBackup(database, join(customBackupFolder, 'missing-backup.zip'))

record('missing backup handling', () => {
  assert(!missingRestoreResult.success, 'Missing backup restore unexpectedly succeeded.')
  assert(/not found/i.test(missingRestoreResult.message), `Unexpected missing backup message: ${missingRestoreResult.message}`)
  return missingRestoreResult.message
})

database.close()

const failed = results.filter((result) => result.status !== 'PASS')
console.table(results)
rmSync(workspaceRoot, { recursive: true, force: true })
rmSync(bundledBackupModulePath, { force: true })

if (failed.length > 0) {
  console.error(`Backup/restore tests failed: ${failed.map((result) => result.name).join(', ')}`)
  process.exit(1)
}

console.log('Backup/restore tests passed.')
