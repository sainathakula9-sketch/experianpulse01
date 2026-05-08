import { app, BrowserWindow, ipcMain } from 'electron'
import { join } from 'node:path'
import { authenticateUser, closeDatabase, connectDatabase, createRequirement, getPulseSnapshot, updateRequirement } from './database'
import type { RequirementInput } from '../shared/types'

const isDevelopment = Boolean(process.env.ELECTRON_RENDERER_URL)
let currentUser: ReturnType<typeof authenticateUser>['user']

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1360,
    height: 900,
    minWidth: 1120,
    minHeight: 720,
    title: 'Experian Pulse',
    backgroundColor: '#f4f7fb',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
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
  connectDatabase()
  ipcMain.handle('auth:login', (_event, credentials: { username: string; password: string }) => {
    const result = authenticateUser(credentials.username, credentials.password)
    currentUser = result.user
    return result
  })
  ipcMain.handle('auth:logout', () => {
    currentUser = undefined
    return true
  })
  ipcMain.handle('pulse:getSnapshot', () => getPulseSnapshot(currentUser))
  ipcMain.handle('requirements:create', (_event, requirement: RequirementInput) => createRequirement(requirement, currentUser))
  ipcMain.handle('requirements:update', (_event, payload: { id: number; requirement: RequirementInput }) =>
    updateRequirement(payload.id, payload.requirement, currentUser)
  )
  createWindow()

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
