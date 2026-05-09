import { contextBridge, ipcRenderer } from 'electron'
import type { AuthenticatedUser, CandidateInput, CandidateRecord, LoginResult, PulseSnapshot, RequirementInput, RequirementIntakeInput, RequirementIntakeRecord, RequirementRecord, RequirementSearchStringInput, RequirementSearchStringRecord } from '../shared/types'

const api = {
  login: (username: string, password: string): Promise<LoginResult> => ipcRenderer.invoke('auth:login', { username, password }),
  logout: (): Promise<boolean> => ipcRenderer.invoke('auth:logout'),
  getSnapshot: (_user?: AuthenticatedUser): Promise<PulseSnapshot> => ipcRenderer.invoke('pulse:getSnapshot'),
  createCandidate: (candidate: CandidateInput): Promise<CandidateRecord> => ipcRenderer.invoke('candidates:create', candidate),
  updateCandidate: (id: number, candidate: CandidateInput): Promise<CandidateRecord> => ipcRenderer.invoke('candidates:update', { id, candidate }),
  deleteCandidate: (id: number): Promise<boolean> => ipcRenderer.invoke('candidates:delete', id),
  createRequirement: (requirement: RequirementInput): Promise<RequirementRecord> => ipcRenderer.invoke('requirements:create', requirement),
  updateRequirement: (id: number, requirement: RequirementInput): Promise<RequirementRecord> => ipcRenderer.invoke('requirements:update', { id, requirement }),
  saveRequirementIntake: (requirementId: number, intake: RequirementIntakeInput): Promise<RequirementIntakeRecord> => ipcRenderer.invoke('requirements:saveIntake', { requirementId, intake }),
  saveRequirementSearchStrings: (requirementId: number, searchStrings: RequirementSearchStringInput): Promise<RequirementSearchStringRecord> => ipcRenderer.invoke('requirements:saveSearchStrings', { requirementId, searchStrings })
}

contextBridge.exposeInMainWorld('experianPulse', api)

export type ExperianPulseApi = typeof api
