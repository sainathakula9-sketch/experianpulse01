import type { CandidateInput, CandidateStatus, RequirementInput, UserRole } from '../shared/types'

export const recruitmentUsers: Array<{ username: string; password: string; role: UserRole; displayName: string }> = [
  { username: 'admin', password: 'admin123', role: 'Admin', displayName: 'Pulse Admin' },
  { username: 'recruiter1', password: 'recruiter123', role: 'Recruiter', displayName: 'Maya Thompson' },
  { username: 'recruiter2', password: 'recruiter123', role: 'Recruiter', displayName: 'Daniel Kim' },
  { username: 'recruiter3', password: 'recruiter123', role: 'Recruiter', displayName: 'Anika Patel' },
  { username: 'recruiter4', password: 'recruiter123', role: 'Recruiter', displayName: 'Jordan Reed' },
  { username: 'recruiter5', password: 'recruiter123', role: 'Recruiter', displayName: 'Sofia Martinez' },
  { username: 'sourcer1', password: 'sourcer123', role: 'Sourcer', displayName: 'Ethan Brooks' },
  { username: 'sourcer2', password: 'sourcer123', role: 'Sourcer', displayName: 'Priya Nair' },
  { username: 'sourcer3', password: 'sourcer123', role: 'Sourcer', displayName: 'Olivia Chen' }
]

export const recruitmentSourceChannels = ['LinkedIn', 'Referral', 'GitHub', 'Naukri', 'Indeed', 'Agency', 'Career Site', 'Employee Alumni', 'Talent Community', 'Diversity Event']

export type SeedRequirement = RequirementInput & {
  createdAt: string
  closedAt: string
  intake: {
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
  }
  searchStrings: {
    linkedinBoolean: string
    githubSearch: string
    naukriKeywords: string
    googleXray: string
    diversitySourcing: string
  }
}

export type SeedCandidate = Omit<CandidateInput, 'requirementId'> & {
  requirementReqId: string
  updatedAt: string
  statusHistory: Array<{ oldStatus: CandidateStatus | ''; newStatus: CandidateStatus; changedByUser: string; changedAt: string; notes: string }>
}

const requirementsBase: Array<Omit<SeedRequirement, 'createdAt' | 'closedAt' | 'intake' | 'searchStrings'>> = [
  { reqId: 'REQ-2026-001', roleTitle: 'Senior Risk Analyst', businessUnit: 'Enterprise Risk', hiringManager: 'Priya Raman', grade: 'G7', location: 'Costa Mesa, CA', workMode: 'Hybrid', budgetRange: '$120k - $145k', priority: 'High', targetClosureDate: '2026-06-18', recruiterOwner: 'recruiter1', assignedSourcer: 'sourcer1', status: 'Open' },
  { reqId: 'REQ-2026-002', roleTitle: 'Procurement Controls Lead', businessUnit: 'Procurement', hiringManager: 'Marcus Lee', grade: 'G6', location: 'Allen, TX', workMode: 'Remote', budgetRange: '$105k - $128k', priority: 'Critical', targetClosureDate: '2026-06-03', recruiterOwner: 'recruiter2', assignedSourcer: 'sourcer2', status: 'Open' },
  { reqId: 'REQ-2026-003', roleTitle: 'Data Retention Specialist', businessUnit: 'Consumer Services', hiringManager: 'Elena Brooks', grade: 'G5', location: 'New York, NY', workMode: 'Onsite', budgetRange: '$88k - $102k', priority: 'Medium', targetClosureDate: '2026-05-10', recruiterOwner: 'recruiter3', assignedSourcer: 'sourcer3', status: 'Closed' },
  { reqId: 'REQ-2026-004', roleTitle: 'Incident Response Manager', businessUnit: 'Security Operations', hiringManager: 'Noah Patel', grade: 'G8', location: 'Schaumburg, IL', workMode: 'Hybrid', budgetRange: '$140k - $165k', priority: 'High', targetClosureDate: '2026-07-02', recruiterOwner: 'recruiter4', assignedSourcer: 'sourcer1', status: 'On Hold' },
  { reqId: 'REQ-2026-005', roleTitle: 'Cloud Data Engineer', businessUnit: 'Data Platform', hiringManager: 'Rachel Adams', grade: 'G7', location: 'Austin, TX', workMode: 'Hybrid', budgetRange: '$130k - $155k', priority: 'Critical', targetClosureDate: '2026-06-25', recruiterOwner: 'recruiter5', assignedSourcer: 'sourcer2', status: 'Open' },
  { reqId: 'REQ-2026-006', roleTitle: 'Product Manager - Identity', businessUnit: 'Identity & Fraud', hiringManager: 'Vikram Shah', grade: 'G7', location: 'San Diego, CA', workMode: 'Hybrid', budgetRange: '$135k - $160k', priority: 'High', targetClosureDate: '2026-07-12', recruiterOwner: 'recruiter1', assignedSourcer: 'sourcer3', status: 'Open' },
  { reqId: 'REQ-2026-007', roleTitle: 'ML Ops Engineer', businessUnit: 'Decision Analytics', hiringManager: 'Jasmine Price', grade: 'G6', location: 'Boston, MA', workMode: 'Remote', budgetRange: '$125k - $150k', priority: 'Medium', targetClosureDate: '2026-07-01', recruiterOwner: 'recruiter2', assignedSourcer: 'sourcer1', status: 'Open' },
  { reqId: 'REQ-2026-008', roleTitle: 'Cyber GRC Analyst', businessUnit: 'Security Operations', hiringManager: 'Grace Miller', grade: 'G5', location: 'Chicago, IL', workMode: 'Hybrid', budgetRange: '$95k - $112k', priority: 'High', targetClosureDate: '2026-06-12', recruiterOwner: 'recruiter3', assignedSourcer: 'sourcer2', status: 'Closed' },
  { reqId: 'REQ-2026-009', roleTitle: 'Salesforce Solution Architect', businessUnit: 'Revenue Operations', hiringManager: 'Owen Wright', grade: 'G8', location: 'Atlanta, GA', workMode: 'Remote', budgetRange: '$145k - $175k', priority: 'Critical', targetClosureDate: '2026-06-28', recruiterOwner: 'recruiter4', assignedSourcer: 'sourcer3', status: 'Open' },
  { reqId: 'REQ-2026-010', roleTitle: 'Talent Analytics Consultant', businessUnit: 'People Analytics', hiringManager: 'Nina Kapoor', grade: 'G6', location: 'Costa Mesa, CA', workMode: 'Hybrid', budgetRange: '$110k - $132k', priority: 'Medium', targetClosureDate: '2026-06-20', recruiterOwner: 'recruiter5', assignedSourcer: 'sourcer1', status: 'Cancelled' },
  { reqId: 'REQ-2026-011', roleTitle: 'Senior UX Researcher', businessUnit: 'Consumer Services', hiringManager: 'Liam Cooper', grade: 'G6', location: 'New York, NY', workMode: 'Hybrid', budgetRange: '$115k - $138k', priority: 'Low', targetClosureDate: '2026-07-18', recruiterOwner: 'recruiter1', assignedSourcer: 'sourcer2', status: 'Open' },
  { reqId: 'REQ-2026-012', roleTitle: 'Finance Systems Manager', businessUnit: 'Finance Technology', hiringManager: 'Heather Young', grade: 'G7', location: 'Allen, TX', workMode: 'Onsite', budgetRange: '$125k - $148k', priority: 'High', targetClosureDate: '2026-06-30', recruiterOwner: 'recruiter2', assignedSourcer: 'sourcer3', status: 'Open' },
  { reqId: 'REQ-2026-013', roleTitle: 'Privacy Program Manager', businessUnit: 'Global Privacy', hiringManager: 'Samir Gupta', grade: 'G7', location: 'Washington, DC', workMode: 'Remote', budgetRange: '$132k - $158k', priority: 'Critical', targetClosureDate: '2026-05-31', recruiterOwner: 'recruiter3', assignedSourcer: 'sourcer1', status: 'Closed' },
  { reqId: 'REQ-2026-014', roleTitle: 'Customer Success Director', businessUnit: 'Client Success', hiringManager: 'Alicia Morgan', grade: 'G8', location: 'Dallas, TX', workMode: 'Hybrid', budgetRange: '$150k - $185k', priority: 'Medium', targetClosureDate: '2026-07-25', recruiterOwner: 'recruiter4', assignedSourcer: 'sourcer2', status: 'Open' },
  { reqId: 'REQ-2026-015', roleTitle: 'Platform Reliability Engineer', businessUnit: 'Infrastructure', hiringManager: 'Ben Carter', grade: 'G6', location: 'Phoenix, AZ', workMode: 'Remote', budgetRange: '$118k - $142k', priority: 'High', targetClosureDate: '2026-06-22', recruiterOwner: 'recruiter5', assignedSourcer: 'sourcer3', status: 'On Hold' }
]

const skillsByRole: Record<string, { primary: string; secondary: string; summary: string }> = {
  'Senior Risk Analyst': { primary: 'Risk analytics, SQL, governance', secondary: 'Tableau, Python, model monitoring', summary: 'Own credit-risk reporting controls and portfolio insights for regulated lending products.' },
  'Procurement Controls Lead': { primary: 'Procurement controls, SOX, vendor risk', secondary: 'Coupa, audit, change management', summary: 'Lead procurement control remediation and supplier-risk governance across enterprise spend.' },
  'Data Retention Specialist': { primary: 'Records retention, SQL, data governance', secondary: 'OneTrust, privacy operations, eDiscovery', summary: 'Operationalize data-retention schedules and deletion evidence across consumer data platforms.' },
  'Incident Response Manager': { primary: 'Incident response, SIEM, threat hunting', secondary: 'Cloud security, forensics, executive briefings', summary: 'Manage major incident response, tabletop readiness, and security event communications.' },
  'Cloud Data Engineer': { primary: 'AWS, Snowflake, dbt, Airflow', secondary: 'Python, Terraform, data quality', summary: 'Build governed analytical data products for Experian cloud data consumers.' },
  'Product Manager - Identity': { primary: 'Identity verification, fraud strategy, roadmap planning', secondary: 'A/B testing, API products, customer discovery', summary: 'Shape identity and fraud product capabilities for financial services clients.' },
  'ML Ops Engineer': { primary: 'ML pipelines, Kubernetes, CI/CD', secondary: 'Feature stores, monitoring, Python', summary: 'Scale model deployment, monitoring, and retraining workflows for decision analytics models.' },
  'Cyber GRC Analyst': { primary: 'Cyber controls, NIST, evidence collection', secondary: 'Archer, ServiceNow, audit response', summary: 'Coordinate control testing evidence and cyber-risk reporting for security compliance.' },
  'Salesforce Solution Architect': { primary: 'Salesforce architecture, CPQ, integrations', secondary: 'Apex, MuleSoft, revenue operations', summary: 'Architect scalable Salesforce capabilities for sales and client-success teams.' },
  'Talent Analytics Consultant': { primary: 'People analytics, Power BI, workforce planning', secondary: 'SQL, storytelling, HR data governance', summary: 'Turn hiring and retention data into actionable workforce insights.' },
  'Senior UX Researcher': { primary: 'UX research, journey mapping, usability testing', secondary: 'Figma, qual synthesis, accessibility', summary: 'Lead mixed-methods research for consumer-facing credit education products.' },
  'Finance Systems Manager': { primary: 'Oracle ERP, finance systems, controls', secondary: 'BlackLine, reconciliations, process design', summary: 'Own finance-system enhancements, controls, and close-process automation.' },
  'Privacy Program Manager': { primary: 'Privacy operations, GDPR, CCPA', secondary: 'DPIAs, OneTrust, stakeholder governance', summary: 'Manage privacy-by-design programs and regulatory readiness across data products.' },
  'Customer Success Director': { primary: 'Enterprise customer success, renewals, executive engagement', secondary: 'SaaS adoption, QBRs, commercial strategy', summary: 'Lead strategic client outcomes and retention for enterprise Experian accounts.' },
  'Platform Reliability Engineer': { primary: 'SRE, Kubernetes, observability', secondary: 'Incident management, Go, Terraform', summary: 'Improve reliability, observability, and incident readiness for core platforms.' }
}

const firstNames = ['Avery', 'Morgan', 'Riley', 'Quinn', 'Taylor', 'Jordan', 'Casey', 'Jamie', 'Cameron', 'Reese', 'Skyler', 'Parker', 'Rowan', 'Emerson', 'Harper', 'Finley', 'Kendall', 'Dakota', 'Sage', 'Drew', 'Alex', 'Bailey', 'Charlie', 'Devin', 'Elliot']
const lastNames = ['Johnson', 'Smith', 'Chen', 'Garcia', 'Patel', 'Brown', 'Wilson', 'Davis', 'Martinez', 'Lee', 'Nguyen', 'Thompson', 'Moore', 'Taylor', 'Anderson', 'Thomas', 'Jackson', 'White', 'Harris', 'Martin']
const companies = ['TransUnion', 'Equifax', 'Capital One', 'FICO', 'LexisNexis Risk', 'Fiserv', 'Okta', 'Snowflake', 'Salesforce', 'Deloitte', 'PwC', 'Accenture', 'ServiceNow', 'Workday', 'Visa', 'Mastercard', 'PayPal', 'JPMorgan Chase', 'Wells Fargo', 'Comcast']
const candidateLocations = ['Costa Mesa, CA', 'Allen, TX', 'New York, NY', 'Schaumburg, IL', 'Austin, TX', 'San Diego, CA', 'Boston, MA', 'Chicago, IL', 'Atlanta, GA', 'Dallas, TX', 'Phoenix, AZ', 'Remote - US', 'Washington, DC', 'Charlotte, NC', 'Denver, CO']
const statuses: CandidateStatus[] = ['New Profile', 'Contacted', 'Interested', 'Not Interested', 'Screen Shortlisted', 'Screen Rejected', 'HM Shortlisted', 'Interview 1 Scheduled', 'Interview 1 Selected', 'Interview 1 Rejected', 'Interview 2 Scheduled', 'Interview 2 Selected', 'Final Round', 'Offer Discussion', 'Offer Released', 'Offer Accepted', 'Offer Dropped', 'Joined']
const finalStatusPlan: CandidateStatus[] = [
  ...Array(30).fill('New Profile'), ...Array(28).fill('Contacted'), ...Array(24).fill('Interested'), ...Array(18).fill('Not Interested'),
  ...Array(26).fill('Screen Shortlisted'), ...Array(18).fill('Screen Rejected'), ...Array(22).fill('HM Shortlisted'),
  ...Array(18).fill('Interview 1 Scheduled'), ...Array(14).fill('Interview 1 Selected'), ...Array(12).fill('Interview 1 Rejected'),
  ...Array(10).fill('Interview 2 Scheduled'), ...Array(7).fill('Interview 2 Selected'), ...Array(6).fill('Final Round'),
  ...Array(5).fill('Offer Discussion'), ...Array(4).fill('Offer Released'), ...Array(2).fill('Offer Accepted'), ...Array(3).fill('Offer Dropped'), ...Array(3).fill('Joined')
]

function isoDate(dayOffset: number, hour = 10): string {
  return new Date(Date.UTC(2026, 3, 1 + dayOffset, hour, 0, 0)).toISOString()
}

function dateOnly(dayOffset: number): string {
  return isoDate(dayOffset).slice(0, 10)
}

function buildIntake(requirement: Omit<SeedRequirement, 'createdAt' | 'closedAt' | 'intake' | 'searchStrings'>): SeedRequirement['intake'] {
  const skill = skillsByRole[requirement.roleTitle]
  return {
    roleSummary: skill.summary,
    whyRoleOpen: requirement.status === 'Closed' ? 'Backfill completed for a critical delivery lane.' : 'Growth and risk reduction role approved in the 2026 hiring plan.',
    mustHaveSkills: skill.primary,
    goodToHaveSkills: skill.secondary,
    primarySkills: skill.primary,
    secondarySkills: skill.secondary,
    targetCompanies: 'Equifax, TransUnion, FICO, Capital One, LexisNexis Risk, Salesforce, Snowflake',
    companiesToAvoid: 'Current Experian strategic vendors with active non-solicit restrictions',
    minimumExperience: requirement.grade === 'G8' ? '10 years' : requirement.grade === 'G7' ? '7 years' : '5 years',
    maximumExperience: requirement.grade === 'G8' ? '16 years' : requirement.grade === 'G7' ? '12 years' : '10 years',
    salaryRange: requirement.budgetRange,
    noticePeriodPreference: 'Immediate to 45 days preferred; buyout possible for critical roles.',
    interviewProcess: 'Recruiter screen, hiring-manager screen, technical or case panel, final stakeholder conversation.',
    diversityFocus: 'Inclusive sourcing slate with women, veterans, and underrepresented technology communities represented.',
    candidateSellingPoints: 'High-impact Experian data products, strong leadership visibility, flexible work model, and modern tooling.',
    keyChallenges: 'Niche domain experience and compensation alignment in competitive markets.',
    hiringManagerExpectations: 'Submit calibrated profiles weekly with clear compensation, location, and notice-period notes.',
    additionalNotes: 'Mock data generated for Experian Pulse demo dashboards.'
  }
}

function buildSearchStrings(requirement: Omit<SeedRequirement, 'createdAt' | 'closedAt' | 'intake' | 'searchStrings'>): SeedRequirement['searchStrings'] {
  const skill = skillsByRole[requirement.roleTitle]
  const mainSkill = skill.primary.split(',')[0]
  return {
    linkedinBoolean: `("${requirement.roleTitle}" OR "${mainSkill}") AND (Experian OR Equifax OR TransUnion OR FICO OR fintech)`,
    githubSearch: `${mainSkill} ${requirement.roleTitle} location:${requirement.location.split(',')[0]}`,
    naukriKeywords: `${requirement.roleTitle}, ${skill.primary}, ${requirement.grade}`,
    googleXray: `site:linkedin.com/in "${requirement.roleTitle}" "${mainSkill}" "${requirement.location.split(',')[0]}"`,
    diversitySourcing: `("women in tech" OR veteran OR disability OR "underrepresented") AND "${mainSkill}"`
  }
}

export function buildRecruitmentRequirements(): SeedRequirement[] {
  return requirementsBase.map((requirement, index) => ({
    ...requirement,
    createdAt: isoDate(index * 3, 9),
    closedAt: requirement.status === 'Closed' ? isoDate(index * 3 + 31, 17) : '',
    intake: buildIntake(requirement),
    searchStrings: buildSearchStrings(requirement)
  }))
}

function buildStatusHistory(finalStatus: CandidateStatus, changedByUser: string, startedOffset: number): SeedCandidate['statusHistory'] {
  const successfulProgression: CandidateStatus[] = [
    'New Profile',
    'Contacted',
    'Interested',
    'Screen Shortlisted',
    'HM Shortlisted',
    'Interview 1 Scheduled',
    'Interview 1 Selected',
    'Interview 2 Scheduled',
    'Interview 2 Selected',
    'Final Round',
    'Offer Discussion',
    'Offer Released',
    'Offer Accepted',
    'Joined'
  ]
  const rejectionProgressions: Partial<Record<CandidateStatus, CandidateStatus[]>> = {
    'Not Interested': ['New Profile', 'Contacted', 'Not Interested'],
    'Screen Rejected': ['New Profile', 'Contacted', 'Interested', 'Screen Shortlisted', 'Screen Rejected'],
    'Interview 1 Rejected': ['New Profile', 'Contacted', 'Interested', 'Screen Shortlisted', 'HM Shortlisted', 'Interview 1 Scheduled', 'Interview 1 Rejected'],
    'Offer Dropped': ['New Profile', 'Contacted', 'Interested', 'Screen Shortlisted', 'HM Shortlisted', 'Interview 1 Scheduled', 'Interview 1 Selected', 'Interview 2 Scheduled', 'Interview 2 Selected', 'Final Round', 'Offer Discussion', 'Offer Released', 'Offer Accepted', 'Offer Dropped']
  }
  const pipeline = rejectionProgressions[finalStatus] ?? successfulProgression.slice(0, successfulProgression.indexOf(finalStatus) + 1)

  return pipeline.map((status, index) => ({
    oldStatus: index === 0 ? '' : pipeline[index - 1],
    newStatus: status,
    changedByUser,
    changedAt: isoDate(startedOffset + index * 3, 9 + (index % 6)),
    notes: index === 0 ? 'Profile added to the Experian Pulse recruitment pipeline.' : `Moved to ${status} after recruiter and hiring-team review.`
  }))
}

export function buildRecruitmentCandidates(requirements: SeedRequirement[] = buildRecruitmentRequirements()): SeedCandidate[] {
  return finalStatusPlan.map((status, index) => {
    const requirement = requirements[index % requirements.length]
    const skill = skillsByRole[requirement.roleTitle]
    const firstName = firstNames[index % firstNames.length]
    const lastName = lastNames[(index * 7) % lastNames.length]
    const name = `${firstName} ${lastName}`
    const sourceChannel = recruitmentSourceChannels[(index * 3 + requirement.reqId.length) % recruitmentSourceChannels.length]
    const startedOffset = (index % 45) + Math.floor(index / 15)
    const history = buildStatusHistory(status, requirement.recruiterOwner, startedOffset)
    const latestChange = history[history.length - 1]
    const experienceYears = 4 + (index % 13)
    const expectedSalary = 92 + (index % 9) * 7 + (requirement.grade === 'G8' ? 35 : requirement.grade === 'G7' ? 20 : 5)
    const diversitySignal = index % 5 === 0 ? ' Diversity event lead; underrepresented community sourcing signal included.' : index % 11 === 0 ? ' Veteran talent-community referral.' : ''

    return {
      requirementReqId: requirement.reqId,
      name,
      currentCompany: companies[(index * 3) % companies.length],
      currentTitle: index % 4 === 0 ? requirement.roleTitle : `${requirement.roleTitle.replace('Senior ', '')} ${index % 3 === 0 ? 'Lead' : 'Specialist'}`,
      totalExperience: `${experienceYears} years`,
      relevantExperience: `${Math.max(3, experienceYears - 2)} years`,
      location: candidateLocations[(index + requirement.location.length) % candidateLocations.length],
      currentCtc: `$${Math.max(78, expectedSalary - 14)}k`,
      expectedCtc: `$${expectedSalary}k`,
      noticePeriod: index % 17 === 0 ? 'Immediate' : index % 6 === 0 ? '15 days' : index % 4 === 0 ? '30 days' : '45 days',
      servingNotice: index % 17 === 0 || index % 19 === 0,
      lastWorkingDay: index % 17 === 0 || index % 19 === 0 ? dateOnly(startedOffset + 28) : '',
      primarySkills: skill.primary,
      secondarySkills: skill.secondary,
      sourceChannel,
      linkedinUrl: `https://linkedin.com/in/${firstName.toLowerCase()}-${lastName.toLowerCase()}-${String(index + 1).padStart(3, '0')}`,
      githubUrl: index % 3 === 0 ? `https://github.com/${firstName.toLowerCase()}${lastName.toLowerCase()}${index + 1}` : '',
      resumeFilePath: `resumes/${firstName.toLowerCase()}-${lastName.toLowerCase()}-${String(index + 1).padStart(3, '0')}.pdf`,
      sourcerName: requirement.assignedSourcer,
      recruiterName: requirement.recruiterOwner,
      status,
      remarks: `${status} for ${requirement.roleTitle}; source ${sourceChannel}; compensation and location calibrated.${diversitySignal}`,
      followUpDate: ['Joined', 'Offer Dropped', 'Not Interested', 'Screen Rejected', 'Interview 1 Rejected'].includes(status) ? '' : dateOnly(startedOffset + history.length * 3 + 2),
      updatedAt: latestChange.changedAt,
      statusHistory: history
    }
  })
}
