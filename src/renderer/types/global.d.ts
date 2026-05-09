import type { AuthenticatedUser, CandidateInput, CandidateRecord, LoginResult, PulseSnapshot, RequirementInput, RequirementIntakeInput, RequirementIntakeRecord, RequirementRecord, RequirementSearchStringInput, RequirementSearchStringRecord, BackupResult, BackupSettingsRecord, UserManagementInput, WorkspaceSettingsInput } from '../../shared/types'

declare global {
  interface Window {
    experianPulse: {
      login: (username: string, password: string) => Promise<LoginResult>
      logout: () => Promise<boolean>
      getSnapshot: (user?: AuthenticatedUser) => Promise<PulseSnapshot>
      createCandidate: (candidate: CandidateInput) => Promise<CandidateRecord>
      updateCandidate: (id: number, candidate: CandidateInput) => Promise<CandidateRecord>
      deleteCandidate: (id: number) => Promise<boolean>
      createRequirement: (requirement: RequirementInput) => Promise<RequirementRecord>
      updateRequirement: (id: number, requirement: RequirementInput) => Promise<RequirementRecord>
      saveRequirementIntake: (requirementId: number, intake: RequirementIntakeInput) => Promise<RequirementIntakeRecord>
      saveRequirementSearchStrings: (requirementId: number, searchStrings: RequirementSearchStringInput) => Promise<RequirementSearchStringRecord>
      chooseOneDriveBackupFolder: () => Promise<BackupSettingsRecord>
      setOneDriveBackupFolder: (folderPath: string) => Promise<BackupSettingsRecord>
      runBackupNow: () => Promise<BackupResult>
      chooseRestoreBackupZip: () => Promise<string>
      restoreBackup: (zipPath: string) => Promise<BackupResult>
      updateWorkspaceSettings: (settings: WorkspaceSettingsInput) => Promise<PulseSnapshot>
      createUser: (user: UserManagementInput) => Promise<PulseSnapshot>
      updateUser: (id: number, user: UserManagementInput) => Promise<PulseSnapshot>
      deleteUser: (id: number) => Promise<PulseSnapshot>
      addSourceChannel: (name: string) => Promise<PulseSnapshot>
      deleteSourceChannel: (name: string) => Promise<PulseSnapshot>
      addCandidateStatus: (name: string) => Promise<PulseSnapshot>
      deleteCandidateStatus: (name: string) => Promise<PulseSnapshot>
    }
  }
}

export {}
