import { app, BrowserWindow, dialog, ipcMain } from 'electron'
import { join } from 'node:path'
import { addCandidateStatus, addSourceChannel, authenticateUser, closeDatabase, connectDatabase, createCandidate, createRequirement, createUser, deleteCandidate, deleteRequirement, deleteCandidateStatus, deleteSourceChannel, deleteUser, getAuditTrail, getPulseSnapshot, recordAuditAction, restoreFromBackup, runBackupNow, runStartupBackup, updateCandidate, updateOneDriveBackupFolder, updateRequirement, updateUser, updateWorkspaceSettings, upsertRequirementIntake, upsertRequirementSearchStrings } from './database'
import { chooseBackupZip, chooseOneDriveBackupFolder, getDailyBackupDirectory } from './backup'
import type Database from 'better-sqlite3'
import type { AuditTrailFilters, AuditTrailInput, CandidateInput, RequirementInput, RequirementIntakeInput, RequirementSearchStringInput, UserManagementInput, WorkspaceSettingsInput } from '../shared/types'

const isDevelopment = Boolean(process.env.ELECTRON_RENDERER_URL)
const preloadFileName = 'index.mjs'

if (process.platform === 'linux' && typeof process.getuid === 'function' && process.getuid() === 0) {
  app.commandLine.appendSwitch('no-sandbox')
}

let currentUser: ReturnType<typeof authenticateUser>['user']

function showStartupError(error: unknown): void {
  const message = error instanceof Error ? error.message : String(error)
  dialog.showErrorBox('Experian Pulse startup error', `Experian Pulse could not start the local workspace.\n\n${message}`)
}

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1360,
    height: 900,
    minWidth: 1120,
    minHeight: 720,
    title: 'Experian Pulse',
    backgroundColor: '#f4f7fb',
    webPreferences: {
      preload: join(__dirname, `../preload/${preloadFileName}`),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  if (isDevelopment && process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  let database: Database.Database
  try {
    database = connectDatabase()
  } catch (error) {
    showStartupError(error)
    app.quit()
    return
  }
  ipcMain.handle('auth:login', (_event, credentials: { username: string; password: string }) => {
    const result = authenticateUser(credentials.username, credentials.password)
    currentUser = result.user
    return result
  })
  ipcMain.handle('auth:logout', () => {
    currentUser = undefined
    return true
  })
  ipcMain.handle('pulse:getSnapshot', () => {
    if (!currentUser) {
      throw new Error('You must be logged in to open the workspace.')
    }
    return getPulseSnapshot(currentUser)
  })
  ipcMain.handle('audit:getTrail', (_event, filters: AuditTrailFilters) => getAuditTrail(filters, currentUser))
  ipcMain.handle('audit:record', (_event, input: AuditTrailInput) => recordAuditAction(input, currentUser))
  ipcMain.handle('candidates:create', (_event, candidate: CandidateInput) => createCandidate(candidate, currentUser))
  ipcMain.handle('candidates:update', (_event, payload: { id: number; candidate: CandidateInput }) => updateCandidate(payload.id, payload.candidate, currentUser))
  ipcMain.handle('candidates:delete', (_event, id: number) => deleteCandidate(id, currentUser))
  ipcMain.handle('requirements:create', (_event, requirement: RequirementInput) => createRequirement(requirement, currentUser))
  ipcMain.handle('requirements:update', (_event, payload: { id: number; requirement: RequirementInput }) =>
    updateRequirement(payload.id, payload.requirement, currentUser)
  )
  ipcMain.handle('requirements:delete', (_event, id: number) => deleteRequirement(id, currentUser))
  ipcMain.handle('requirements:saveIntake', (_event, payload: { requirementId: number; intake: RequirementIntakeInput }) =>
    upsertRequirementIntake(payload.requirementId, payload.intake, currentUser)
  )
  ipcMain.handle('requirements:saveSearchStrings', (_event, payload: { requirementId: number; searchStrings: RequirementSearchStringInput }) =>
    upsertRequirementSearchStrings(payload.requirementId, payload.searchStrings, currentUser)
  )

  ipcMain.handle('settings:updateWorkspace', (_event, settings: WorkspaceSettingsInput) => updateWorkspaceSettings(settings, currentUser))
  ipcMain.handle('settings:createUser', (_event, user: UserManagementInput) => createUser(user, currentUser))
  ipcMain.handle('settings:updateUser', (_event, payload: { id: number; user: UserManagementInput }) => updateUser(payload.id, payload.user, currentUser))
  ipcMain.handle('settings:deleteUser', (_event, id: number) => deleteUser(id, currentUser))
  ipcMain.handle('settings:addSourceChannel', (_event, name: string) => addSourceChannel(name, currentUser))
  ipcMain.handle('settings:deleteSourceChannel', (_event, name: string) => deleteSourceChannel(name, currentUser))
  ipcMain.handle('settings:addCandidateStatus', (_event, name: string) => addCandidateStatus(name, currentUser))
  ipcMain.handle('settings:deleteCandidateStatus', (_event, name: string) => deleteCandidateStatus(name, currentUser))
  ipcMain.handle('backup:chooseOneDriveFolder', async (event) => {
    if (!currentUser || currentUser.role !== 'Admin') {
      throw new Error('Only admins can manage backups.')
    }
    const window = BrowserWindow.fromWebContents(event.sender) ?? undefined
    const settings = await chooseOneDriveBackupFolder(database, window)
    return { ...settings, localBackupFolder: getDailyBackupDirectory() }
  })
  ipcMain.handle('backup:setOneDriveFolder', (_event, folderPath: string) => updateOneDriveBackupFolder(folderPath, currentUser))
  ipcMain.handle('backup:runNow', () => runBackupNow(currentUser))
  ipcMain.handle('backup:chooseRestoreZip', async (event) => {
    const window = BrowserWindow.fromWebContents(event.sender) ?? undefined
    return chooseBackupZip(window)
  })
  ipcMain.handle('backup:restore', (_event, zipPath: string) => restoreFromBackup(zipPath, currentUser))
  createWindow()
  runStartupBackup().catch((error) => console.error('Startup backup failed', error))

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', () => {
  closeDatabase()
})
