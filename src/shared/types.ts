export type RequirementStatus = 'Open' | 'On Hold' | 'Closed' | 'Cancelled'
export type RequirementPriority = 'Low' | 'Medium' | 'High' | 'Critical'
export type WorkMode = 'Onsite' | 'Hybrid' | 'Remote'
export type UserRole = 'Admin' | 'Recruiter' | 'Sourcer'
export type CandidateStatus = 'New Profile' | 'Contacted' | 'Interested' | 'Not Interested' | 'Screen Shortlisted' | 'Screen Rejected' | 'HM Shortlisted' | 'Interview 1 Scheduled' | 'Interview 1 Selected' | 'Interview 1 Rejected' | 'Interview 2 Scheduled' | 'Interview 2 Selected' | 'Final Round' | 'Offer Discussion' | 'Offer Released' | 'Offer Accepted' | 'Offer Dropped' | 'Joined'

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

export interface RequirementIntakeRecord {
  id: number
  requirementId: number
  roleSummary: string
  whyRoleOpen: string
  mustHaveSkills: string
  goodToHaveSkills: string
  primarySkills: string
  secondarySkills: string
  targetCompanies: string
  companiesToAvoid: string
  minimumExperience: string
  maximumExperience: string
  salaryRange: string
  noticePeriodPreference: string
  interviewProcess: string
  diversityFocus: string
  candidateSellingPoints: string
  keyChallenges: string
  hiringManagerExpectations: string
  additionalNotes: string
  updatedAt: string
}

export type RequirementIntakeInput = Omit<RequirementIntakeRecord, 'id' | 'requirementId' | 'updatedAt'>

export interface RequirementSearchStringRecord {
  id: number
  requirementId: number
  linkedinBoolean: string
  githubSearch: string
  naukriKeywords: string
  googleXray: string
  diversitySourcing: string
  updatedAt: string
}

export type RequirementSearchStringInput = Omit<RequirementSearchStringRecord, 'id' | 'requirementId' | 'updatedAt'>

export interface RequirementRecord {
  id: number
  reqId: string
  roleTitle: string
  businessUnit: string
  hiringManager: string
  grade: string
  location: string
  workMode: WorkMode
  budgetRange: string
  priority: RequirementPriority
  targetClosureDate: string
  recruiterOwner: string
  assignedSourcer: string
  status: RequirementStatus
  createdAt: string
  closedAt: string
  intake?: RequirementIntakeRecord
  searchStrings?: RequirementSearchStringRecord
}

export type RequirementInput = Omit<RequirementRecord, 'id' | 'createdAt' | 'closedAt' | 'intake' | 'searchStrings'>

export interface CandidateStatusHistoryRecord {
  id: number
  candidateId: number
  oldStatus: CandidateStatus | ''
  newStatus: CandidateStatus
  changedByUser: string
  changedAt: string
  notes: string
}

export interface CandidateRecord {
  id: number
  name: string
  requirementId: number
  requirementTitle: string
  currentCompany: string
  currentTitle: string
  totalExperience: string
  relevantExperience: string
  location: string
  currentCtc: string
  expectedCtc: string
  noticePeriod: string
  servingNotice: boolean
  lastWorkingDay: string
  primarySkills: string
  secondarySkills: string
  sourceChannel: string
  linkedinUrl: string
  githubUrl: string
  resumeFilePath: string
  sourcerName: string
  recruiterName: string
  status: CandidateStatus
  remarks: string
  followUpDate: string
  updatedAt: string
  assignedRecruiter: string
  assignedSourcer: string
  statusHistory: CandidateStatusHistoryRecord[]
  daysInCurrentStage: number
  totalDaysInPipeline: number
}

export type CandidateInput = Omit<CandidateRecord, 'id' | 'requirementTitle' | 'updatedAt' | 'assignedRecruiter' | 'assignedSourcer' | 'statusHistory' | 'daysInCurrentStage' | 'totalDaysInPipeline'> & {
  statusChangeNotes?: string
}

export interface ReportRecord {
  id: number
  name: string
  category: string
  updatedAt: string
  owner: string
}

export type BackupStatusLevel = 'Never Run' | 'Success' | 'Warning' | 'Failed' | 'Restored'

export interface BackupSettingsRecord {
  oneDriveBackupFolder: string
  localBackupFolder: string
  lastBackupAt: string
  lastBackupStatus: BackupStatusLevel | string
  lastBackupPath: string
}

export interface BackupResult extends BackupSettingsRecord {
  success: boolean
  message: string
  localBackupPath?: string
  oneDriveBackupPath?: string
}

export interface SettingsRecord extends BackupSettingsRecord {
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
    profilesSourced: number
    contacted: number
    interested: number
    screenShortlisted: number
    interviewsScheduled: number
    offersReleased: number
    offersAccepted: number
    joined: number
    offerDrops: number
    averageDaysToClose: number
  }
}
