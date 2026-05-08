import { contextBridge, ipcRenderer } from 'electron'
import type { PulseSnapshot } from '../shared/types'

const api = {
  getSnapshot: (): Promise<PulseSnapshot> => ipcRenderer.invoke('pulse:getSnapshot')
}

contextBridge.exposeInMainWorld('experianPulse', api)

export type ExperianPulseApi = typeof api
