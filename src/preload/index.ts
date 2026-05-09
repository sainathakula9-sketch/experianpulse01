import { contextBridge, ipcRenderer } from 'electron'
import type { AuditTrailFilters, AuditTrailInput, AuditTrailRecord, AuthenticatedUser, CandidateInput, CandidateRecord, LoginResult, PulseSnapshot, RequirementInput, RequirementIntakeInput, RequirementIntakeRecord, RequirementRecord, RequirementSearchStringInput, RequirementSearchStringRecord, BackupResult, BackupSettingsRecord, UserManagementInput, WorkspaceSettingsInput } from '../shared/types'

const api = {
  login: (username: string, password: string): Promise<LoginResult> => ipcRenderer.invoke('auth:login', { username, password }),
  logout: (): Promise<boolean> => ipcRenderer.invoke('auth:logout'),
  getSnapshot: (_user?: AuthenticatedUser): Promise<PulseSnapshot> => ipcRenderer.invoke('pulse:getSnapshot'),
  getAuditTrail: (filters?: AuditTrailFilters): Promise<AuditTrailRecord[]> => ipcRenderer.invoke('audit:getTrail', filters ?? {}),
  recordAudit: (input: AuditTrailInput): Promise<AuditTrailRecord> => ipcRenderer.invoke('audit:record', input),
  createCandidate: (candidate: CandidateInput): Promise<CandidateRecord> => ipcRenderer.invoke('candidates:create', candidate),
  updateCandidate: (id: number, candidate: CandidateInput): Promise<CandidateRecord> => ipcRenderer.invoke('candidates:update', { id, candidate }),
  deleteCandidate: (id: number): Promise<boolean> => ipcRenderer.invoke('candidates:delete', id),
  createRequirement: (requirement: RequirementInput): Promise<RequirementRecord> => ipcRenderer.invoke('requirements:create', requirement),
  updateRequirement: (id: number, requirement: RequirementInput): Promise<RequirementRecord> => ipcRenderer.invoke('requirements:update', { id, requirement }),
  deleteRequirement: (id: number): Promise<boolean> => ipcRenderer.invoke('requirements:delete', id),
  saveRequirementIntake: (requirementId: number, intake: RequirementIntakeInput): Promise<RequirementIntakeRecord> => ipcRenderer.invoke('requirements:saveIntake', { requirementId, intake }),
  saveRequirementSearchStrings: (requirementId: number, searchStrings: RequirementSearchStringInput): Promise<RequirementSearchStringRecord> => ipcRenderer.invoke('requirements:saveSearchStrings', { requirementId, searchStrings }),
  chooseOneDriveBackupFolder: (): Promise<BackupSettingsRecord> => ipcRenderer.invoke('backup:chooseOneDriveFolder'),
  setOneDriveBackupFolder: (folderPath: string): Promise<BackupSettingsRecord> => ipcRenderer.invoke('backup:setOneDriveFolder', folderPath),
  runBackupNow: (): Promise<BackupResult> => ipcRenderer.invoke('backup:runNow'),
  chooseRestoreBackupZip: (): Promise<string> => ipcRenderer.invoke('backup:chooseRestoreZip'),
  restoreBackup: (zipPath: string): Promise<BackupResult> => ipcRenderer.invoke('backup:restore', zipPath),
  updateWorkspaceSettings: (settings: WorkspaceSettingsInput): Promise<PulseSnapshot> => ipcRenderer.invoke('settings:updateWorkspace', settings),
  createUser: (user: UserManagementInput): Promise<PulseSnapshot> => ipcRenderer.invoke('settings:createUser', user),
  updateUser: (id: number, user: UserManagementInput): Promise<PulseSnapshot> => ipcRenderer.invoke('settings:updateUser', { id, user }),
  deleteUser: (id: number): Promise<PulseSnapshot> => ipcRenderer.invoke('settings:deleteUser', id),
  addSourceChannel: (name: string): Promise<PulseSnapshot> => ipcRenderer.invoke('settings:addSourceChannel', name),
  deleteSourceChannel: (name: string): Promise<PulseSnapshot> => ipcRenderer.invoke('settings:deleteSourceChannel', name),
  addCandidateStatus: (name: string): Promise<PulseSnapshot> => ipcRenderer.invoke('settings:addCandidateStatus', name),
  deleteCandidateStatus: (name: string): Promise<PulseSnapshot> => ipcRenderer.invoke('settings:deleteCandidateStatus', name),
}

contextBridge.exposeInMainWorld('experianPulse', api)

export type ExperianPulseApi = typeof api
