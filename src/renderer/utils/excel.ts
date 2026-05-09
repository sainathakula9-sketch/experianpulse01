import * as XLSX from 'xlsx'
import type { CandidateInput, CandidateRecord, CandidateStatus, PulseSnapshot, RequirementRecord } from '../../shared/types'

export const candidateStatuses: CandidateStatus[] = [
  'New Profile',
  'Contacted',
  'Interested',
  'Not Interested',
  'Screen Shortlisted',
  'Screen Rejected',
  'HM Shortlisted',
  'Interview 1 Scheduled',
  'Interview 1 Selected',
  'Interview 1 Rejected',
  'Interview 2 Scheduled',
  'Interview 2 Selected',
  'Final Round',
  'Offer Discussion',
  'Offer Released',
  'Offer Accepted',
  'Offer Dropped',
  'Joined'
]

const candidateHeaders = [
  'Candidate Name',
  'Current Company',
  'Current Title',
  'Total Experience',
  'Relevant Experience',
  'Location',
  'Current CTC',
  'Expected CTC',
  'Notice Period',
  'Serving Notice',
  'Last Working Day',
  'Primary Skills',
  'Secondary Skills',
  'Source Channel',
  'LinkedIn URL',
  'GitHub URL',
  'Resume File Path',
  'Sourcer Name',
  'Recruiter Name',
  'Status',
  'Remarks',
  'Follow-up Date'
] as const

type CandidateHeader = (typeof candidateHeaders)[number]
export interface CandidateImportPreview {
  rows: CandidateInput[]
  errors: string[]
}

export function writeEditableWorkbook(sheets: Array<{ name: string; rows: Record<string, string | number | boolean>[] }>, fileName: string): void {
  const workbook = XLSX.utils.book_new()
  sheets.forEach(({ name, rows }) => {
    const worksheet = XLSX.utils.json_to_sheet(rows.length > 0 ? rows : [{}], { skipHeader: false })
    const keys = Object.keys(rows[0] ?? {})
    worksheet['!cols'] = keys.map((key) => ({ wch: Math.min(Math.max(key.length + 4, 16), 40) }))
    XLSX.utils.book_append_sheet(workbook, worksheet, name.slice(0, 31))
  })
  XLSX.writeFile(workbook, fileName)
}

export function exportCandidatesForRequirement(requirement: RequirementRecord, candidates: CandidateRecord[]): void {
  const rows = candidates.map((candidate) => ({
    'Candidate Name': candidate.name,
    'Requirement ID': requirement.reqId,
    Requirement: requirement.roleTitle,
    'Current Company': candidate.currentCompany,
    'Current Title': candidate.currentTitle,
    'Total Experience': candidate.totalExperience,
    'Relevant Experience': candidate.relevantExperience,
    Location: candidate.location,
    'Current CTC': candidate.currentCtc,
    'Expected CTC': candidate.expectedCtc,
    'Notice Period': candidate.noticePeriod,
    'Serving Notice': candidate.servingNotice ? 'Yes' : 'No',
    'Last Working Day': candidate.lastWorkingDay,
    'Primary Skills': candidate.primarySkills,
    'Secondary Skills': candidate.secondarySkills,
    'Source Channel': candidate.sourceChannel,
    'LinkedIn URL': candidate.linkedinUrl,
    'GitHub URL': candidate.githubUrl,
    'Resume File Path': candidate.resumeFilePath,
    'Sourcer Name': candidate.sourcerName,
    'Recruiter Name': candidate.recruiterName,
    Status: candidate.status,
    Remarks: candidate.remarks,
    'Follow-up Date': candidate.followUpDate,
    'Days in Current Stage': candidate.daysInCurrentStage,
    'Total Days in Pipeline': candidate.totalDaysInPipeline,
    'Last Updated': candidate.updatedAt
  }))

  writeEditableWorkbook(
    [
      { name: 'Candidates', rows },
      { name: 'Import Template', rows: [Object.fromEntries(candidateHeaders.map((header) => [header, '']))] }
    ],
    `${requirement.reqId}-candidates.xlsx`
  )
}

export function exportRequirementSummary(requirement: RequirementRecord, candidates: CandidateRecord[]): void {
  const summaryRows = [
    { Field: 'Req ID', Value: requirement.reqId },
    { Field: 'Role Title', Value: requirement.roleTitle },
    { Field: 'Business Unit', Value: requirement.businessUnit },
    { Field: 'Hiring Manager', Value: requirement.hiringManager },
    { Field: 'Grade', Value: requirement.grade },
    { Field: 'Location', Value: requirement.location },
    { Field: 'Work Mode', Value: requirement.workMode },
    { Field: 'Budget Range', Value: requirement.budgetRange },
    { Field: 'Priority', Value: requirement.priority },
    { Field: 'Status', Value: requirement.status },
    { Field: 'Target Closure Date', Value: requirement.targetClosureDate },
    { Field: 'Recruiter Owner', Value: requirement.recruiterOwner },
    { Field: 'Assigned Sourcer', Value: requirement.assignedSourcer },
    { Field: 'Candidates', Value: candidates.length },
    { Field: 'Created At', Value: requirement.createdAt },
    { Field: 'Closed At', Value: requirement.closedAt }
  ]

  const intakeRows = requirement.intake
    ? [
        { Field: 'Role Summary', Value: requirement.intake.roleSummary },
        { Field: 'Must-have Skills', Value: requirement.intake.mustHaveSkills },
        { Field: 'Good-to-have Skills', Value: requirement.intake.goodToHaveSkills },
        { Field: 'Primary Skills', Value: requirement.intake.primarySkills },
        { Field: 'Secondary Skills', Value: requirement.intake.secondarySkills },
        { Field: 'Target Companies', Value: requirement.intake.targetCompanies },
        { Field: 'Companies to Avoid', Value: requirement.intake.companiesToAvoid },
        { Field: 'Interview Process', Value: requirement.intake.interviewProcess },
        { Field: 'Diversity Focus', Value: requirement.intake.diversityFocus },
        { Field: 'Candidate Selling Points', Value: requirement.intake.candidateSellingPoints },
        { Field: 'Additional Notes', Value: requirement.intake.additionalNotes }
      ]
    : [{ Field: 'Intake', Value: 'No intake details saved' }]

  const statusRows = candidateStatuses.map((status) => ({ Status: status, Candidates: candidates.filter((candidate) => candidate.status === status).length }))
  writeEditableWorkbook(
    [
      { name: 'Requirement Summary', rows: summaryRows },
      { name: 'Intake Notes', rows: intakeRows },
      { name: 'Pipeline by Status', rows: statusRows }
    ],
    `${requirement.reqId}-summary.xlsx`
  )
}

export function exportDashboardMetrics(snapshot: PulseSnapshot, cards: Array<{ label: string; value: number }>): void {
  const metricRows = cards.map((card) => ({ Metric: card.label, Value: card.value }))
  const requirementRows = snapshot.requirements.map((requirement) => ({
    'Req ID': requirement.reqId,
    'Role Title': requirement.roleTitle,
    'Business Unit': requirement.businessUnit,
    Status: requirement.status,
    Priority: requirement.priority,
    'Recruiter Owner': requirement.recruiterOwner,
    'Assigned Sourcer': requirement.assignedSourcer,
    'Target Closure Date': requirement.targetClosureDate
  }))
  const candidateRows = snapshot.candidates.map((candidate) => ({
    'Candidate Name': candidate.name,
    Requirement: candidate.requirementTitle,
    Status: candidate.status,
    Source: candidate.sourceChannel,
    Recruiter: candidate.recruiterName || candidate.assignedRecruiter,
    Sourcer: candidate.sourcerName || candidate.assignedSourcer,
    Location: candidate.location,
    'Days in Current Stage': candidate.daysInCurrentStage,
    'Total Days in Pipeline': candidate.totalDaysInPipeline
  }))

  writeEditableWorkbook(
    [
      { name: 'Metrics', rows: metricRows },
      { name: 'Requirements', rows: requirementRows },
      { name: 'Candidates', rows: candidateRows }
    ],
    'experian-pulse-dashboard-metrics.xlsx'
  )
}

function normalizeHeader(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '')
}

function cellToString(value: unknown): string {
  if (value === undefined || value === null) {
    return ''
  }
  return String(value).trim()
}

function cellToDateString(value: unknown): string {
  if (value === undefined || value === null || value === '') {
    return ''
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10)
  }

  if (typeof value === 'number') {
    const parsed = XLSX.SSF.parse_date_code(value)
    if (parsed) {
      const date = new Date(Date.UTC(parsed.y, parsed.m - 1, parsed.d))
      return date.toISOString().slice(0, 10)
    }
  }

  const textValue = cellToString(value)
  if (/^\d{4}-\d{2}-\d{2}$/.test(textValue)) {
    return textValue
  }

  const parsedDate = new Date(textValue)
  if (!Number.isNaN(parsedDate.getTime())) {
    return parsedDate.toISOString().slice(0, 10)
  }

  return textValue
}

function parseBoolean(value: unknown): boolean {
  const normalized = cellToString(value).toLowerCase()
  return ['yes', 'y', 'true', '1', 'serving'].includes(normalized)
}

function getRowValue(row: Record<string, unknown>, header: CandidateHeader): unknown {
  const normalizedHeader = normalizeHeader(header)
  const matchingKey = Object.keys(row).find((key) => normalizeHeader(key) === normalizedHeader)
  return matchingKey ? row[matchingKey] : ''
}

function isValidOptionalDate(value: string): boolean {
  return !value || /^\d{4}-\d{2}-\d{2}$/.test(value)
}

export async function parseCandidateImportFile(file: File, requirement: RequirementRecord): Promise<CandidateImportPreview> {
  const buffer = await file.arrayBuffer()
  const workbook = XLSX.read(buffer, { cellDates: true, type: 'array' })
  const worksheet = workbook.Sheets[workbook.SheetNames[0]]
  if (!worksheet) {
    return { rows: [], errors: ['The workbook does not contain any sheets.'] }
  }

  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: '' })
  const rows: CandidateInput[] = []
  const errors: string[] = []

  rawRows.forEach((row, index) => {
    const rowNumber = index + 2
    const name = cellToString(getRowValue(row, 'Candidate Name'))
    const statusValue = cellToString(getRowValue(row, 'Status')) || 'New Profile'
    const lastWorkingDay = cellToDateString(getRowValue(row, 'Last Working Day'))
    const followUpDate = cellToDateString(getRowValue(row, 'Follow-up Date'))

    if (!name) {
      errors.push(`Row ${rowNumber}: Candidate Name is required.`)
    }
    if (!candidateStatuses.includes(statusValue as CandidateStatus)) {
      errors.push(`Row ${rowNumber}: Status must be one of: ${candidateStatuses.join(', ')}.`)
    }
    if (!isValidOptionalDate(lastWorkingDay)) {
      errors.push(`Row ${rowNumber}: Last Working Day must be a valid date.`)
    }
    if (!isValidOptionalDate(followUpDate)) {
      errors.push(`Row ${rowNumber}: Follow-up Date must be a valid date.`)
    }

    rows.push({
      name,
      requirementId: requirement.id,
      currentCompany: cellToString(getRowValue(row, 'Current Company')),
      currentTitle: cellToString(getRowValue(row, 'Current Title')),
      totalExperience: cellToString(getRowValue(row, 'Total Experience')),
      relevantExperience: cellToString(getRowValue(row, 'Relevant Experience')),
      location: cellToString(getRowValue(row, 'Location')),
      currentCtc: cellToString(getRowValue(row, 'Current CTC')),
      expectedCtc: cellToString(getRowValue(row, 'Expected CTC')),
      noticePeriod: cellToString(getRowValue(row, 'Notice Period')),
      servingNotice: parseBoolean(getRowValue(row, 'Serving Notice')),
      lastWorkingDay,
      primarySkills: cellToString(getRowValue(row, 'Primary Skills')),
      secondarySkills: cellToString(getRowValue(row, 'Secondary Skills')),
      sourceChannel: cellToString(getRowValue(row, 'Source Channel')),
      linkedinUrl: cellToString(getRowValue(row, 'LinkedIn URL')),
      githubUrl: cellToString(getRowValue(row, 'GitHub URL')),
      resumeFilePath: cellToString(getRowValue(row, 'Resume File Path')),
      sourcerName: cellToString(getRowValue(row, 'Sourcer Name')) || requirement.assignedSourcer,
      recruiterName: cellToString(getRowValue(row, 'Recruiter Name')) || requirement.recruiterOwner,
      status: candidateStatuses.includes(statusValue as CandidateStatus) ? (statusValue as CandidateStatus) : 'New Profile',
      remarks: cellToString(getRowValue(row, 'Remarks')),
      followUpDate,
      statusChangeNotes: 'Imported from Excel'
    })
  })

  if (rawRows.length === 0) {
    errors.push('The selected workbook does not contain any candidate rows.')
  }

  return { rows, errors }
}
