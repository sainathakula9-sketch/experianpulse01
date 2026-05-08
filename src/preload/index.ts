import { contextBridge, ipcRenderer } from 'electron'
import type { AuthenticatedUser, LoginResult, PulseSnapshot } from '../shared/types'

const api = {
  login: (username: string, password: string): Promise<LoginResult> => ipcRenderer.invoke('auth:login', { username, password }),
  logout: (): Promise<boolean> => ipcRenderer.invoke('auth:logout'),
  getSnapshot: (_user?: AuthenticatedUser): Promise<PulseSnapshot> => ipcRenderer.invoke('pulse:getSnapshot')
}

contextBridge.exposeInMainWorld('experianPulse', api)

export type ExperianPulseApi = typeof api
