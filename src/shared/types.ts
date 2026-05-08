export type RequirementStatus = 'Complete' | 'In Review' | 'At Risk' | 'Draft'

export interface RequirementRecord {
  id: number
  title: string
  owner: string
  status: RequirementStatus
  dueDate: string
  businessUnit: string
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
  reports: ReportRecord[]
  settings: SettingsRecord
  metrics: {
    complianceScore: number
    openRequirements: number
    reportsGenerated: number
    riskItems: number
  }
}
