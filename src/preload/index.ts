import { contextBridge, ipcRenderer } from 'electron'
import type { AuthenticatedUser, LoginResult, PulseSnapshot, RequirementInput, RequirementIntakeInput, RequirementIntakeRecord, RequirementRecord } from '../shared/types'

const api = {
  login: (username: string, password: string): Promise<LoginResult> => ipcRenderer.invoke('auth:login', { username, password }),
  logout: (): Promise<boolean> => ipcRenderer.invoke('auth:logout'),
  getSnapshot: (_user?: AuthenticatedUser): Promise<PulseSnapshot> => ipcRenderer.invoke('pulse:getSnapshot'),
  createRequirement: (requirement: RequirementInput): Promise<RequirementRecord> => ipcRenderer.invoke('requirements:create', requirement),
  updateRequirement: (id: number, requirement: RequirementInput): Promise<RequirementRecord> => ipcRenderer.invoke('requirements:update', { id, requirement }),
  saveRequirementIntake: (requirementId: number, intake: RequirementIntakeInput): Promise<RequirementIntakeRecord> => ipcRenderer.invoke('requirements:saveIntake', { requirementId, intake })
}

contextBridge.exposeInMainWorld('experianPulse', api)

export type ExperianPulseApi = typeof api
