import { app, dialog } from 'electron'
import type { BrowserWindow } from 'electron'
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { basename, dirname, extname, isAbsolute, join, normalize, relative } from 'node:path'
import Database from 'better-sqlite3'

export type BackupStatusLevel = 'Never Run' | 'Success' | 'Warning' | 'Failed' | 'Restored'

export interface BackupSettings {
  defaultBackupFolder: string
  oneDriveBackupFolder: string
  lastBackupAt: string
  lastBackupStatus: string
  lastBackupPath: string
}

export interface BackupResult extends BackupSettings {
  success: boolean
  message: string
  localBackupPath?: string
  oneDriveBackupPath?: string
}

interface ZipEntry {
  name: string
  data: Buffer
}

let crcTable: number[] | undefined

function getUserDataPath(): string {
  return app.getPath('userData')
}

export function getDatabasePath(): string {
  return join(getUserDataPath(), 'data', 'experian-pulse.sqlite')
}

export function getDailyBackupDirectory(): string {
  return join(getUserDataPath(), 'Backups', 'Daily')
}

function getTodayKey(): string {
  return new Date().toISOString().slice(0, 10)
}

function getDailyBackupPath(dateKey = getTodayKey(), backupDirectory = getDailyBackupDirectory()): string {
  return join(backupDirectory, `experian-pulse-backup-${dateKey}.zip`)
}

function normaliseZipPath(path: string): string {
  return path.replace(/\\/g, '/').replace(/^\/+/, '')
}

function buildCrcTable(): number[] {
  if (crcTable) {
    return crcTable
  }

  crcTable = Array.from({ length: 256 }, (_, index) => {
    let crc = index
    for (let bit = 0; bit < 8; bit += 1) {
      crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1
    }
    return crc >>> 0
  })

  return crcTable
}

function crc32(buffer: Buffer): number {
  const table = buildCrcTable()
  let crc = 0xffffffff
  for (const byte of buffer) {
    crc = table[(crc ^ byte) & 0xff] ^ (crc >>> 8)
  }
  return (crc ^ 0xffffffff) >>> 0
}

function writeUInt16(value: number): Buffer {
  const buffer = Buffer.alloc(2)
  buffer.writeUInt16LE(value)
  return buffer
}

function writeUInt32(value: number): Buffer {
  const buffer = Buffer.alloc(4)
  buffer.writeUInt32LE(value >>> 0)
  return buffer
}

function createZip(entries: ZipEntry[]): Buffer {
  const localParts: Buffer[] = []
  const centralParts: Buffer[] = []
  let offset = 0

  entries.forEach((entry) => {
    const name = Buffer.from(normaliseZipPath(entry.name))
    const checksum = crc32(entry.data)
    const localHeader = Buffer.concat([
      writeUInt32(0x04034b50),
      writeUInt16(20),
      writeUInt16(0),
      writeUInt16(0),
      writeUInt16(0),
      writeUInt16(0),
      writeUInt32(checksum),
      writeUInt32(entry.data.length),
      writeUInt32(entry.data.length),
      writeUInt16(name.length),
      writeUInt16(0),
      name
    ])

    localParts.push(localHeader, entry.data)
    centralParts.push(
      Buffer.concat([
        writeUInt32(0x02014b50),
        writeUInt16(20),
        writeUInt16(20),
        writeUInt16(0),
        writeUInt16(0),
        writeUInt16(0),
        writeUInt16(0),
        writeUInt32(checksum),
        writeUInt32(entry.data.length),
        writeUInt32(entry.data.length),
        writeUInt16(name.length),
        writeUInt16(0),
        writeUInt16(0),
        writeUInt16(0),
        writeUInt16(0),
        writeUInt32(0),
        writeUInt32(offset),
        name
      ])
    )
    offset += localHeader.length + entry.data.length
  })

  const centralDirectory = Buffer.concat(centralParts)
  const endOfCentralDirectory = Buffer.concat([
    writeUInt32(0x06054b50),
    writeUInt16(0),
    writeUInt16(0),
    writeUInt16(entries.length),
    writeUInt16(entries.length),
    writeUInt32(centralDirectory.length),
    writeUInt32(offset),
    writeUInt16(0)
  ])

  return Buffer.concat([...localParts, centralDirectory, endOfCentralDirectory])
}

function assertReadableRange(buffer: Buffer, offset: number, length: number, label: string): void {
  if (offset < 0 || length < 0 || offset + length > buffer.length) {
    throw new Error(`ZIP backup is incomplete or corrupted near ${label}.`)
  }
}

function readZip(buffer: Buffer): Map<string, Buffer> {
  const entries = new Map<string, Buffer>()
  const eocdSignature = 0x06054b50
  let eocdOffset = -1
  for (let index = Math.max(0, buffer.length - 22); index >= 0; index -= 1) {
    if (index + 4 <= buffer.length && buffer.readUInt32LE(index) === eocdSignature) {
      eocdOffset = index
      break
    }
  }

  if (eocdOffset === -1) {
    throw new Error('Selected file is not a valid ZIP backup.')
  }

  assertReadableRange(buffer, eocdOffset, 22, 'end of central directory')
  const entryCount = buffer.readUInt16LE(eocdOffset + 10)
  let centralOffset = buffer.readUInt32LE(eocdOffset + 16)
  assertReadableRange(buffer, centralOffset, 0, 'central directory')

  for (let index = 0; index < entryCount; index += 1) {
    assertReadableRange(buffer, centralOffset, 46, `central directory entry ${index + 1}`)
    if (buffer.readUInt32LE(centralOffset) !== 0x02014b50) {
      throw new Error('ZIP central directory is invalid.')
    }

    const compressionMethod = buffer.readUInt16LE(centralOffset + 10)
    if (compressionMethod !== 0) {
      throw new Error('Only Experian Pulse stored ZIP backups can be restored.')
    }

    const expectedChecksum = buffer.readUInt32LE(centralOffset + 16)
    const compressedSize = buffer.readUInt32LE(centralOffset + 20)
    const uncompressedSize = buffer.readUInt32LE(centralOffset + 24)
    if (compressedSize !== uncompressedSize) {
      throw new Error('ZIP backup entry size metadata is inconsistent.')
    }

    const fileNameLength = buffer.readUInt16LE(centralOffset + 28)
    const extraLength = buffer.readUInt16LE(centralOffset + 30)
    const commentLength = buffer.readUInt16LE(centralOffset + 32)
    const localOffset = buffer.readUInt32LE(centralOffset + 42)
    assertReadableRange(buffer, centralOffset + 46, fileNameLength, `file name for entry ${index + 1}`)
    const name = buffer.subarray(centralOffset + 46, centralOffset + 46 + fileNameLength).toString('utf8')

    assertReadableRange(buffer, localOffset, 30, `local header for ${name}`)
    if (buffer.readUInt32LE(localOffset) !== 0x04034b50) {
      throw new Error(`ZIP local file header is invalid for ${name}.`)
    }

    const localCompressionMethod = buffer.readUInt16LE(localOffset + 8)
    if (localCompressionMethod !== compressionMethod) {
      throw new Error(`ZIP local file header metadata does not match for ${name}.`)
    }

    const localFileNameLength = buffer.readUInt16LE(localOffset + 26)
    const localExtraLength = buffer.readUInt16LE(localOffset + 28)
    const dataOffset = localOffset + 30 + localFileNameLength + localExtraLength
    assertReadableRange(buffer, dataOffset, compressedSize, `data for ${name}`)
    const data = buffer.subarray(dataOffset, dataOffset + compressedSize)
    if (crc32(data) !== expectedChecksum) {
      throw new Error(`ZIP backup checksum validation failed for ${name}.`)
    }

    entries.set(name, data)
    centralOffset += 46 + fileNameLength + extraLength + commentLength
  }

  return entries
}

export function validateBackupFile(zipPath: string): { valid: boolean; message: string; entries: string[] } {
  if (!zipPath || !existsSync(zipPath)) {
    return { valid: false, message: 'Backup ZIP was not found.', entries: [] }
  }

  try {
    const entries = readZip(readFileSync(zipPath))
    if (!entries.has('backup-manifest.json')) {
      throw new Error('Backup ZIP does not contain a manifest.')
    }
    if (!entries.has('database/experian-pulse.sqlite')) {
      throw new Error('Backup ZIP does not contain an Experian Pulse database.')
    }

    JSON.parse(entries.get('backup-manifest.json')!.toString('utf8'))
    return { valid: true, message: 'Backup ZIP integrity checks passed.', entries: Array.from(entries.keys()).sort() }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Backup ZIP integrity checks failed.'
    return { valid: false, message, entries: [] }
  }
}

function getBackupSettings(database: Database.Database): BackupSettings {
  const row = database.prepare('SELECT defaultBackupFolder, oneDriveBackupFolder, lastBackupAt, lastBackupStatus, lastBackupPath FROM settings WHERE id = 1').get() as BackupSettings | undefined
  return {
    defaultBackupFolder: row?.defaultBackupFolder ?? getDailyBackupDirectory(),
    oneDriveBackupFolder: row?.oneDriveBackupFolder ?? '',
    lastBackupAt: row?.lastBackupAt ?? '',
    lastBackupStatus: row?.lastBackupStatus ?? 'Never Run',
    lastBackupPath: row?.lastBackupPath ?? ''
  }
}

function updateBackupStatus(database: Database.Database, status: BackupStatusLevel, path: string, at = new Date().toISOString()): BackupSettings {
  database
    .prepare(
      `UPDATE settings
       SET lastBackupAt = @lastBackupAt,
           lastBackupStatus = @lastBackupStatus,
           lastBackupPath = @lastBackupPath
       WHERE id = 1`
    )
    .run({ lastBackupAt: at, lastBackupStatus: status, lastBackupPath: path })

  return getBackupSettings(database)
}

export function setOneDriveBackupFolder(database: Database.Database, folderPath: string): BackupSettings {
  database.prepare('UPDATE settings SET oneDriveBackupFolder = @oneDriveBackupFolder WHERE id = 1').run({ oneDriveBackupFolder: folderPath })
  return getBackupSettings(database)
}

export async function chooseOneDriveBackupFolder(database: Database.Database, window?: BrowserWindow): Promise<BackupSettings> {
  const dialogOptions = {
    title: 'Choose OneDrive backup folder',
    properties: ['openDirectory', 'createDirectory'] as Array<'openDirectory' | 'createDirectory'>
  }
  const selection = window ? await dialog.showOpenDialog(window, dialogOptions) : await dialog.showOpenDialog(dialogOptions)

  if (selection.canceled || selection.filePaths.length === 0) {
    return getBackupSettings(database)
  }

  return setOneDriveBackupFolder(database, selection.filePaths[0])
}

function collectConfigEntries(database: Database.Database): ZipEntry[] {
  const settings = database.prepare('SELECT organizationName, dataRegion, notificationsEnabled, defaultBackupFolder, oneDriveBackupFolder, backupFrequency, defaultCurrency, defaultLocation FROM settings WHERE id = 1').get()
  const entries: ZipEntry[] = [
    {
      name: 'config/app-settings.json',
      data: Buffer.from(JSON.stringify(settings ?? {}, null, 2))
    }
  ]

  const userDataPath = getUserDataPath()
  if (existsSync(userDataPath)) {
    readdirSync(userDataPath, { withFileTypes: true })
      .filter((entry) => entry.isFile() && ['.json', '.config', '.conf'].includes(extname(entry.name).toLowerCase()))
      .forEach((entry) => {
        entries.push({ name: `config/${entry.name}`, data: readFileSync(join(userDataPath, entry.name)) })
      })
  }

  return entries
}

function backupDatabase(database: Database.Database, destination: string): void {
  const backupCapableDatabase = database as Database.Database & { backup?: (path: string) => Promise<void> }
  if (typeof backupCapableDatabase.backup === 'function') {
    // better-sqlite3 exposes an online backup API that safely snapshots WAL databases.
    // Keep this synchronous from the caller's perspective by waiting in createBackup.
    throw new Error('Async backup API should be handled by createBackup.')
  }

  copyFileSync(getDatabasePath(), destination)
}

async function createDatabaseSnapshot(database: Database.Database, destination: string): Promise<void> {
  const backupCapableDatabase = database as Database.Database & { backup?: (path: string) => Promise<void> }
  if (typeof backupCapableDatabase.backup === 'function') {
    await backupCapableDatabase.backup(destination)
    return
  }

  backupDatabase(database, destination)
}

export async function createBackup(database: Database.Database, reason = 'Manual'): Promise<BackupResult> {
  const settings = getBackupSettings(database)
  const backupDirectory = settings.defaultBackupFolder || getDailyBackupDirectory()
  mkdirSync(backupDirectory, { recursive: true })

  const localBackupPath = getDailyBackupPath(getTodayKey(), backupDirectory)
  const temporaryDatabasePath = join(backupDirectory, `experian-pulse-${Date.now()}.sqlite`)

  try {
    await createDatabaseSnapshot(database, temporaryDatabasePath)
    const manifest = {
      appName: 'Experian Pulse',
      createdAt: new Date().toISOString(),
      reason,
      databaseFile: 'database/experian-pulse.sqlite'
    }
    const entries: ZipEntry[] = [
      { name: 'backup-manifest.json', data: Buffer.from(JSON.stringify(manifest, null, 2)) },
      { name: 'database/experian-pulse.sqlite', data: readFileSync(temporaryDatabasePath) },
      ...collectConfigEntries(database)
    ]

    writeFileSync(localBackupPath, createZip(entries))

    let oneDriveBackupPath = ''
    let status: BackupStatusLevel = 'Success'
    let message = `Backup saved to ${localBackupPath}.`
    if (settings.oneDriveBackupFolder) {
      try {
        mkdirSync(settings.oneDriveBackupFolder, { recursive: true })
        oneDriveBackupPath = join(settings.oneDriveBackupFolder, basename(localBackupPath))
        copyFileSync(localBackupPath, oneDriveBackupPath)
        message = `Backup saved locally and copied to ${oneDriveBackupPath}.`
      } catch (copyError) {
        status = 'Warning'
        const copyMessage = copyError instanceof Error ? copyError.message : 'Unable to copy to OneDrive.'
        message = `Backup saved to ${localBackupPath}, but the OneDrive copy failed: ${copyMessage}`
        oneDriveBackupPath = ''
      }
    } else {
      status = 'Warning'
      message = `Backup saved to ${localBackupPath}. Choose a OneDrive folder in Settings to copy backups there.`
    }

    const updatedSettings = updateBackupStatus(database, status, localBackupPath)
    return { ...updatedSettings, success: true, message, localBackupPath, oneDriveBackupPath }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Backup failed.'
    const failedPath = existsSync(localBackupPath) ? localBackupPath : settings.lastBackupPath
    const updatedSettings = updateBackupStatus(database, 'Failed', failedPath)
    return { ...updatedSettings, success: false, message: `Backup failed before a complete ZIP could be created: ${message}` }
  } finally {
    rmSync(temporaryDatabasePath, { force: true })
  }
}

export async function createStartupBackupIfNeeded(database: Database.Database): Promise<BackupResult | undefined> {
  const settings = getBackupSettings(database)
  const localBackupPath = getDailyBackupPath(getTodayKey(), settings.defaultBackupFolder || getDailyBackupDirectory())
  if (existsSync(localBackupPath)) {
    return undefined
  }

  return createBackup(database, 'Startup')
}

function assertSafeRestoreTarget(targetPath: string): void {
  const normalizedTarget = normalize(targetPath)
  const dataDirectory = normalize(join(getUserDataPath(), 'data'))
  const relativeTarget = relative(dataDirectory, normalizedTarget)
  if (relativeTarget === '' || relativeTarget.startsWith('..') || isAbsolute(relativeTarget)) {
    throw new Error('Restore target is outside the application data directory.')
  }
}

function validateSqliteDatabaseFile(databasePath: string): void {
  const database = new Database(databasePath)
  try {
    const result = database.pragma('quick_check') as Array<{ quick_check?: string } | string>
    const firstResult = result[0]
    const quickCheck = typeof firstResult === 'string' ? firstResult : firstResult?.quick_check
    if (!Array.isArray(result) || quickCheck !== 'ok') {
      throw new Error('Restored database failed SQLite integrity checks.')
    }
  } finally {
    database.close()
  }
}

export async function chooseBackupZip(window?: BrowserWindow): Promise<string> {
  const dialogOptions = {
    title: 'Choose backup ZIP to restore',
    defaultPath: getDailyBackupDirectory(),
    filters: [{ name: 'ZIP backups', extensions: ['zip'] }],
    properties: ['openFile'] as Array<'openFile'>
  }
  const selection = window ? await dialog.showOpenDialog(window, dialogOptions) : await dialog.showOpenDialog(dialogOptions)

  if (selection.canceled || selection.filePaths.length === 0) {
    return ''
  }

  return selection.filePaths[0]
}

export function restoreBackup(database: Database.Database, zipPath: string): BackupResult {
  const currentSettings = getBackupSettings(database)
  if (!zipPath) {
    return { ...currentSettings, success: false, message: 'No backup ZIP selected.' }
  }

  if (!existsSync(zipPath)) {
    return { ...currentSettings, success: false, message: 'Backup ZIP was not found.' }
  }

  let temporaryRestorePath = ''

  try {
    const integrity = validateBackupFile(zipPath)
    if (!integrity.valid) {
      throw new Error(integrity.message)
    }

    const entries = readZip(readFileSync(zipPath))
    const databaseEntry = entries.get('database/experian-pulse.sqlite')
    if (!databaseEntry) {
      throw new Error('Backup ZIP does not contain an Experian Pulse database.')
    }

    const databasePath = getDatabasePath()
    assertSafeRestoreTarget(databasePath)
    mkdirSync(dirname(databasePath), { recursive: true })

    const restoreCheckpointPath = join(getDailyBackupDirectory(), `pre-restore-${Date.now()}-${basename(databasePath)}`)
    mkdirSync(dirname(restoreCheckpointPath), { recursive: true })
    if (existsSync(databasePath)) {
      copyFileSync(databasePath, restoreCheckpointPath)
    }

    temporaryRestorePath = `${databasePath}.restore-${Date.now()}`
    writeFileSync(temporaryRestorePath, databaseEntry)
    validateSqliteDatabaseFile(temporaryRestorePath)

    database.close()
    renameSync(temporaryRestorePath, databasePath)
    ;['-wal', '-shm'].forEach((suffix) => rmSync(`${databasePath}${suffix}`, { force: true }))

    return {
      ...currentSettings,
      lastBackupAt: new Date().toISOString(),
      lastBackupStatus: 'Restored',
      lastBackupPath: zipPath,
      success: true,
      message: `Restored ${basename(zipPath)}. Restart the app to load the restored database.`
    }
  } catch (error) {
    if (temporaryRestorePath) {
      rmSync(temporaryRestorePath, { force: true })
    }
    const message = error instanceof Error ? error.message : 'Restore failed.'
    return { ...currentSettings, success: false, message }
  }
}

export function listLocalBackups(): string[] {
  const backupDirectory = getDailyBackupDirectory()
  if (!existsSync(backupDirectory)) {
    return []
  }

  return readdirSync(backupDirectory)
    .filter((fileName) => fileName.toLowerCase().endsWith('.zip'))
    .map((fileName) => join(backupDirectory, fileName))
    .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs)
}

