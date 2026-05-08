export type RequirementStatus = 'Complete' | 'In Review' | 'At Risk' | 'Draft'
export type UserRole = 'Admin' | 'Recruiter' | 'Sourcer'

export interface AuthenticatedUser {
  id: number
  username: string
  role: UserRole
  displayName: string
}

export interface LoginResult {
  success: boolean
  user?: AuthenticatedUser
  message?: string
}

export interface RequirementRecord {
  id: number
  title: string
  owner: string
  status: RequirementStatus
  dueDate: string
  businessUnit: string
  folderName: string
  assignedRecruiter: string
  assignedSourcer: string
}

export interface CandidateRecord {
  id: number
  name: string
  requirementId: number
  requirementTitle: string
  stage: string
  updatedAt: string
  assignedRecruiter: string
  assignedSourcer: string
}

export interface ReportRecord {
  id: number
  name: string
  category: string
  updatedAt: string
  owner: string
}

export interface SettingsRecord {
  organizationName: string
  dataRegion: string
  notificationsEnabled: boolean
}

export interface PulseSnapshot {
  requirements: RequirementRecord[]
  candidates: CandidateRecord[]
  reports: ReportRecord[]
  settings: SettingsRecord
  metrics: {
    complianceScore: number
    openRequirements: number
    reportsGenerated: number
    riskItems: number
    activeCandidates: number
  }
}
