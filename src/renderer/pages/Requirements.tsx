import { BriefcaseBusiness, CalendarDays, ClipboardList, Copy, Download, FolderOpen, Pencil, PlusCircle, Search, Users, Trash2, WandSparkles } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import type { AuthenticatedUser, CandidateRecord, RequirementInput, RequirementIntakeInput, RequirementPriority, RequirementSearchStringInput, RequirementRecord, RequirementStatus, WorkMode } from '../../shared/types'
import { exportRequirementSummary } from '../utils/excel'

interface RequirementsProps {
  candidates: CandidateRecord[]
  onRequirementsChange: () => void
  requirements: RequirementRecord[]
  user: AuthenticatedUser
}

const emptyRequirement: RequirementInput = {
  reqId: '',
  roleTitle: '',
  businessUnit: '',
  hiringManager: '',
  grade: '',
  location: '',
  workMode: 'Hybrid',
  budgetRange: '',
  priority: 'Medium',
  targetClosureDate: '',
  recruiterOwner: '',
  assignedSourcer: '',
  status: 'Open'
}


const emptyIntake: RequirementIntakeInput = {
  roleSummary: '',
  whyRoleOpen: '',
  mustHaveSkills: '',
  goodToHaveSkills: '',
  primarySkills: '',
  secondarySkills: '',
  targetCompanies: '',
  companiesToAvoid: '',
  minimumExperience: '',
  maximumExperience: '',
  salaryRange: '',
  noticePeriodPreference: '',
  interviewProcess: '',
  diversityFocus: '',
  candidateSellingPoints: '',
  keyChallenges: '',
  hiringManagerExpectations: '',
  additionalNotes: ''
}


const emptySearchStrings: RequirementSearchStringInput = {
  linkedinBoolean: '',
  githubSearch: '',
  naukriKeywords: '',
  googleXray: '',
  diversitySourcing: ''
}

const searchStringFields: Array<{ key: keyof RequirementSearchStringInput; label: string; help: string }> = [
  { key: 'linkedinBoolean', label: 'LinkedIn Boolean', help: 'Use in LinkedIn Recruiter or people search keyword fields.' },
  { key: 'githubSearch', label: 'GitHub search', help: 'Use in GitHub user, code, and profile keyword searches.' },
  { key: 'naukriKeywords', label: 'Naukri keywords', help: 'Paste into Naukri keyword search with experience filters.' },
  { key: 'googleXray', label: 'Google X-Ray search', help: 'Search public LinkedIn profiles from Google.' },
  { key: 'diversitySourcing', label: 'Diversity sourcing search', help: 'Adds inclusive community and affinity sourcing terms.' }
]

const intakeFields: Array<{ key: keyof RequirementIntakeInput; label: string; multiline?: boolean }> = [
  { key: 'roleSummary', label: 'Role summary', multiline: true },
  { key: 'whyRoleOpen', label: 'Why is this role open?', multiline: true },
  { key: 'mustHaveSkills', label: 'Must-have skills', multiline: true },
  { key: 'goodToHaveSkills', label: 'Good-to-have skills', multiline: true },
  { key: 'primarySkills', label: 'Primary skills' },
  { key: 'secondarySkills', label: 'Secondary skills' },
  { key: 'targetCompanies', label: 'Target companies', multiline: true },
  { key: 'companiesToAvoid', label: 'Companies to avoid', multiline: true },
  { key: 'minimumExperience', label: 'Minimum experience' },
  { key: 'maximumExperience', label: 'Maximum experience' },
  { key: 'salaryRange', label: 'Salary range' },
  { key: 'noticePeriodPreference', label: 'Notice period preference' },
  { key: 'interviewProcess', label: 'Interview process', multiline: true },
  { key: 'diversityFocus', label: 'Diversity focus', multiline: true },
  { key: 'candidateSellingPoints', label: 'Candidate selling points', multiline: true },
  { key: 'keyChallenges', label: 'Key challenges', multiline: true },
  { key: 'hiringManagerExpectations', label: 'Hiring manager expectations', multiline: true },
  { key: 'additionalNotes', label: 'Additional notes', multiline: true }
]

const statusOptions: RequirementStatus[] = ['Open', 'On Hold', 'Closed', 'Cancelled']
const priorityOptions: RequirementPriority[] = ['Low', 'Medium', 'High', 'Critical']
const workModeOptions: WorkMode[] = ['Onsite', 'Hybrid', 'Remote']

const statusStyles: Record<RequirementRecord['status'], string> = {
  Open: 'bg-emerald-50 text-emerald-700',
  'On Hold': 'bg-amber-50 text-amber-700',
  Closed: 'bg-slate-100 text-slate-600',
  Cancelled: 'bg-rose-50 text-rose-700'
}

const priorityStyles: Record<RequirementRecord['priority'], string> = {
  Low: 'bg-slate-100 text-slate-600',
  Medium: 'bg-blue-50 text-blue-700',
  High: 'bg-purple-50 text-experian-purple',
  Critical: 'bg-rose-50 text-rose-700'
}

function toRequirementInput(requirement: RequirementRecord): RequirementInput {
  return {
    reqId: requirement.reqId,
    roleTitle: requirement.roleTitle,
    businessUnit: requirement.businessUnit,
    hiringManager: requirement.hiringManager,
    grade: requirement.grade,
    location: requirement.location,
    workMode: requirement.workMode,
    budgetRange: requirement.budgetRange,
    priority: requirement.priority,
    targetClosureDate: requirement.targetClosureDate,
    recruiterOwner: requirement.recruiterOwner,
    assignedSourcer: requirement.assignedSourcer,
    status: requirement.status
  }
}

function createDefaultRequirement(user: AuthenticatedUser): RequirementInput {
  return {
    ...emptyRequirement,
    reqId: `REQ-${new Date().getFullYear()}-`,
    recruiterOwner: user.role === 'Recruiter' ? user.username : 'recruiter',
    assignedSourcer: 'sourcer'
  }
}


function toIntakeInput(requirement?: RequirementRecord): RequirementIntakeInput {
  if (!requirement?.intake) {
    return emptyIntake
  }

  return {
    roleSummary: requirement.intake.roleSummary,
    whyRoleOpen: requirement.intake.whyRoleOpen,
    mustHaveSkills: requirement.intake.mustHaveSkills,
    goodToHaveSkills: requirement.intake.goodToHaveSkills,
    primarySkills: requirement.intake.primarySkills,
    secondarySkills: requirement.intake.secondarySkills,
    targetCompanies: requirement.intake.targetCompanies,
    companiesToAvoid: requirement.intake.companiesToAvoid,
    minimumExperience: requirement.intake.minimumExperience,
    maximumExperience: requirement.intake.maximumExperience,
    salaryRange: requirement.intake.salaryRange,
    noticePeriodPreference: requirement.intake.noticePeriodPreference,
    interviewProcess: requirement.intake.interviewProcess,
    diversityFocus: requirement.intake.diversityFocus,
    candidateSellingPoints: requirement.intake.candidateSellingPoints,
    keyChallenges: requirement.intake.keyChallenges,
    hiringManagerExpectations: requirement.intake.hiringManagerExpectations,
    additionalNotes: requirement.intake.additionalNotes
  }
}


function toSearchStringInput(requirement?: RequirementRecord): RequirementSearchStringInput {
  if (!requirement?.searchStrings) {
    return emptySearchStrings
  }

  return {
    linkedinBoolean: requirement.searchStrings.linkedinBoolean,
    githubSearch: requirement.searchStrings.githubSearch,
    naukriKeywords: requirement.searchStrings.naukriKeywords,
    googleXray: requirement.searchStrings.googleXray,
    diversitySourcing: requirement.searchStrings.diversitySourcing
  }
}

function splitSearchTerms(value: string): string[] {
  return value
    .split(/[\n,;|]+/)
    .map((term) => term.trim())
    .filter(Boolean)
}

function uniqueTerms(terms: string[]): string[] {
  return [...new Set(terms.map((term) => term.trim()).filter(Boolean))]
}

function quoteTerm(term: string): string {
  return /\s/.test(term) ? `"${term}"` : term
}

function booleanGroup(terms: string[]): string {
  const unique = uniqueTerms(terms).slice(0, 8)
  if (unique.length === 0) {
    return ''
  }

  return `(${unique.map(quoteTerm).join(' OR ')})`
}

function companyAvoidance(companies: string[]): string {
  return uniqueTerms(companies).map((company) => `NOT ${quoteTerm(company)}`).join(' ')
}

function generateRequirementSearchStrings(requirement: RequirementRecord, intake: RequirementIntakeInput): RequirementSearchStringInput {
  const primarySkills = splitSearchTerms(`${intake.primarySkills}\n${intake.mustHaveSkills}`)
  const secondarySkills = splitSearchTerms(`${intake.secondarySkills}\n${intake.goodToHaveSkills}`)
  const companiesToAvoid = splitSearchTerms(intake.companiesToAvoid)
  const targetCompanies = splitSearchTerms(intake.targetCompanies)
  const titleGroup = booleanGroup([requirement.roleTitle, requirement.roleTitle.replace(/senior|lead|manager/gi, '').trim()].filter(Boolean))
  const primaryGroup = booleanGroup(primarySkills)
  const secondaryGroup = booleanGroup(secondarySkills)
  const targetCompanyGroup = booleanGroup(targetCompanies)
  const locationTerm = requirement.workMode === 'Remote' ? 'remote' : requirement.location
  const avoid = companyAvoidance(companiesToAvoid)
  const experienceRange = [intake.minimumExperience, intake.maximumExperience].filter(Boolean).join('-')
  const githubKeywords = uniqueTerms([requirement.roleTitle, ...primarySkills, ...secondarySkills, locationTerm]).map(quoteTerm).join(' ')
  const naukriKeywords = uniqueTerms([requirement.roleTitle, ...primarySkills, ...secondarySkills, experienceRange, locationTerm]).filter(Boolean).map(quoteTerm).join(' ')
  const diversityFocusTerms = splitSearchTerms(intake.diversityFocus)
  const diversityGroup = booleanGroup(
    diversityFocusTerms.length > 0
      ? diversityFocusTerms
      : ['women in tech', 'diversity tech', 'black professionals', 'latinx tech', 'veterans in tech']
  )

  return {
    linkedinBoolean: [titleGroup, primaryGroup, secondaryGroup, targetCompanyGroup, quoteTerm(locationTerm), avoid].filter(Boolean).join(' AND '),
    githubSearch: `${githubKeywords} followers:>10 repos:>2`,
    naukriKeywords,
    googleXray: [`site:linkedin.com/in`, titleGroup, primaryGroup, quoteTerm(locationTerm), '-jobs', '-job', '-hiring', avoid].filter(Boolean).join(' '),
    diversitySourcing: [`site:linkedin.com/in`, titleGroup, primaryGroup, diversityGroup, quoteTerm(locationTerm), '-jobs', '-job', avoid].filter(Boolean).join(' ')
  }
}

function hasIntakeData(intake: RequirementIntakeInput): boolean {
  return Object.values(intake).some((value) => value.trim().length > 0)
}

export function Requirements({ candidates, onRequirementsChange, requirements, user }: RequirementsProps): JSX.Element {
  const [formRequirement, setFormRequirement] = useState<RequirementInput>(() => createDefaultRequirement(user))
  const [editingRequirementId, setEditingRequirementId] = useState<number | undefined>()
  const [selectedRequirementId, setSelectedRequirementId] = useState<number | undefined>(requirements[0]?.id)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | undefined>()
  const [activeDetailTab, setActiveDetailTab] = useState<'overview' | 'intake' | 'search' | 'pipeline'>('overview')
  const [intakeForm, setIntakeForm] = useState<RequirementIntakeInput>(emptyIntake)
  const [isSavingIntake, setIsSavingIntake] = useState(false)
  const [intakeError, setIntakeError] = useState<string | undefined>()
  const [searchStringForm, setSearchStringForm] = useState<RequirementSearchStringInput>(emptySearchStrings)
  const [isSavingSearchStrings, setIsSavingSearchStrings] = useState(false)
  const [searchStringError, setSearchStringError] = useState<string | undefined>()
  const [copiedSearchString, setCopiedSearchString] = useState<keyof RequirementSearchStringInput | undefined>()

  const canManageRequirements = user.role === 'Admin' || user.role === 'Recruiter'
  const selectedRequirement = requirements.find((requirement) => requirement.id === selectedRequirementId) ?? requirements[0]
  const selectedCandidates = selectedRequirement ? candidates.filter((candidate) => candidate.requirementId === selectedRequirement.id) : []

  useEffect(() => {
    setIntakeForm(toIntakeInput(selectedRequirement))
    setIntakeError(undefined)
    setSearchStringForm(toSearchStringInput(selectedRequirement))
    setSearchStringError(undefined)
    setCopiedSearchString(undefined)
  }, [selectedRequirement?.id, selectedRequirement?.intake?.updatedAt, selectedRequirement?.searchStrings?.updatedAt])

  const metrics = useMemo(() => {
    const openCount = requirements.filter((requirement) => requirement.status === 'Open').length
    const urgentCount = requirements.filter((requirement) => requirement.priority === 'High' || requirement.priority === 'Critical').length
    const onHoldCount = requirements.filter((requirement) => requirement.status === 'On Hold').length
    const closedCount = requirements.filter((requirement) => requirement.status === 'Closed').length

    return [
      { label: 'Total reqs', value: requirements.length, icon: FolderOpen, accent: 'text-experian-purple' },
      { label: 'Open', value: openCount, icon: BriefcaseBusiness, accent: 'text-emerald-600' },
      { label: 'High priority', value: urgentCount, icon: CalendarDays, accent: 'text-rose-600' },
      { label: 'On hold / closed', value: onHoldCount + closedCount, icon: Users, accent: 'text-experian-blue' }
    ]
  }, [requirements])

  const resetForm = (): void => {
    setEditingRequirementId(undefined)
    setFormRequirement(createDefaultRequirement(user))
    setFormError(undefined)
  }

  const updateField = <K extends keyof RequirementInput>(field: K, value: RequirementInput[K]): void => {
    setFormRequirement((currentRequirement) => ({ ...currentRequirement, [field]: value }))
  }

  const updateIntakeField = <K extends keyof RequirementIntakeInput>(field: K, value: RequirementIntakeInput[K]): void => {
    setIntakeForm((currentIntake) => ({ ...currentIntake, [field]: value }))
  }

  const updateSearchStringField = <K extends keyof RequirementSearchStringInput>(field: K, value: RequirementSearchStringInput[K]): void => {
    setSearchStringForm((currentSearchStrings) => ({ ...currentSearchStrings, [field]: value }))
  }

  const editRequirement = (requirement: RequirementRecord): void => {
    setEditingRequirementId(requirement.id)
    setFormRequirement(toRequirementInput(requirement))
    setSelectedRequirementId(requirement.id)
    setFormError(undefined)
  }

  const openRequirement = (requirement: RequirementRecord): void => {
    setSelectedRequirementId(requirement.id)
  }

  const saveRequirement = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault()

    if (!canManageRequirements) {
      return
    }

    setFormError(undefined)
    const missingField = Object.entries(formRequirement).find(([, value]) => !String(value).trim())
    if (missingField) {
      setFormError(`Complete the ${missingField[0]} field before saving.`)
      return
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(formRequirement.targetClosureDate)) {
      setFormError('Target closure date must use YYYY-MM-DD format.')
      return
    }

    setIsSubmitting(true)

    try {
      const savedRequirement = editingRequirementId
        ? await window.experianPulse.updateRequirement(editingRequirementId, formRequirement)
        : await window.experianPulse.createRequirement(formRequirement)

      setSelectedRequirementId(savedRequirement.id)
      resetForm()
      onRequirementsChange()
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Unable to save requirement.')
    } finally {
      setIsSubmitting(false)
    }
  }


  const saveIntake = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault()

    if (!selectedRequirement) {
      return
    }

    setIsSavingIntake(true)
    setIntakeError(undefined)

    try {
      const savedIntake = await window.experianPulse.saveRequirementIntake(selectedRequirement.id, intakeForm)
      setIntakeForm(toIntakeInput({ ...selectedRequirement, intake: savedIntake }))
      onRequirementsChange()
    } catch (error) {
      setIntakeError(error instanceof Error ? error.message : 'Unable to save intake notes.')
    } finally {
      setIsSavingIntake(false)
    }
  }

  const generateSearchStrings = (): void => {
    if (!selectedRequirement) {
      return
    }

    setSearchStringForm(generateRequirementSearchStrings(selectedRequirement, intakeForm))
    setSearchStringError(undefined)
    setCopiedSearchString(undefined)
  }

  const saveSearchStrings = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault()

    if (!selectedRequirement) {
      return
    }

    setIsSavingSearchStrings(true)
    setSearchStringError(undefined)

    try {
      const savedSearchStrings = await window.experianPulse.saveRequirementSearchStrings(selectedRequirement.id, searchStringForm)
      setSearchStringForm(toSearchStringInput({ ...selectedRequirement, searchStrings: savedSearchStrings }))
      onRequirementsChange()
    } catch (error) {
      setSearchStringError(error instanceof Error ? error.message : 'Unable to save search strings.')
    } finally {
      setIsSavingSearchStrings(false)
    }
  }

  const copySearchString = async (field: keyof RequirementSearchStringInput): Promise<void> => {
    const value = searchStringForm[field].trim()
    if (!value) {
      return
    }

    await navigator.clipboard.writeText(value)
    setCopiedSearchString(field)
  }

  const deleteSelectedRequirement = async (requirement: RequirementRecord): Promise<void> => {
    if (!window.confirm(`Delete ${requirement.reqId} · ${requirement.roleTitle}? This will also remove related candidates.`)) {
      return
    }

    try {
      await window.experianPulse.deleteRequirement(requirement.id)
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Unable to delete requirement.')
      return
    }
    if (selectedRequirementId === requirement.id) {
      setSelectedRequirementId(undefined)
    }
    if (editingRequirementId === requirement.id) {
      resetForm()
    }
    onRequirementsChange()
  }

  const exportSelectedRequirementSummary = (): void => {
    if (!selectedRequirement) {
      return
    }

    exportRequirementSummary(selectedRequirement, selectedCandidates)
    window.experianPulse.recordAudit({
      actionType: 'Excel Export',
      entityType: 'Requirement',
      entityId: selectedRequirement.id,
      summary: `Exported requirement summary for ${selectedRequirement.reqId}.`,
      details: JSON.stringify({ candidates: selectedCandidates.length, file: `${selectedRequirement.reqId}-summary.xlsx` })
    }).catch(() => undefined)
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map(({ accent, icon: Icon, label, value }) => (
          <article className="rounded-3xl bg-white p-5 shadow-sm" key={label}>
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-experian-slate">{label}</p>
              <Icon className={accent} size={20} />
            </div>
            <p className={`mt-3 text-3xl font-black ${accent}`}>{value}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <article className="rounded-3xl bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-bold">Requirement folder</h3>
              <p className="mt-1 text-sm text-experian-slate">
                Create, edit, list, and open requirement details from SQLite-backed hiring folders.
              </p>
            </div>
            <button
              className="inline-flex items-center gap-2 rounded-2xl bg-experian-purple px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!selectedRequirement}
              onClick={exportSelectedRequirementSummary}
              type="button"
            >
              <Download size={16} /> Export summary
            </button>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {requirements.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm font-semibold text-experian-slate lg:col-span-2">
                No requirements are available for your role yet. Create a requirement to start sourcing.
              </div>
            ) : requirements.map((requirement) => {
              const selected = selectedRequirement?.id === requirement.id
              return (
                <article
                  className={`rounded-3xl border p-5 text-left transition hover:-translate-y-0.5 hover:shadow-md ${
                    selected ? 'border-experian-purple bg-experian-purple/5 shadow-sm' : 'border-slate-100 bg-white'
                  }`}
                  key={requirement.id}
                  onClick={() => openRequirement(requirement)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      openRequirement(requirement)
                    }
                  }}
                  role="button"
                  tabIndex={0}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.18em] text-experian-magenta">{requirement.reqId}</p>
                      <h4 className="mt-2 text-lg font-black text-experian-ink">{requirement.roleTitle}</h4>
                      <p className="mt-1 text-sm text-experian-slate">{requirement.businessUnit}</p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-bold ${statusStyles[requirement.status]}`}>{requirement.status}</span>
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-2xl bg-slate-50 p-3">
                      <p className="text-xs font-bold uppercase text-experian-slate">Manager</p>
                      <p className="mt-1 font-semibold">{requirement.hiringManager}</p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-3">
                      <p className="text-xs font-bold uppercase text-experian-slate">Closure</p>
                      <p className="mt-1 font-semibold">{requirement.targetClosureDate}</p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-3">
                      <p className="text-xs font-bold uppercase text-experian-slate">Mode</p>
                      <p className="mt-1 font-semibold">{requirement.workMode}</p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-3">
                      <p className="text-xs font-bold uppercase text-experian-slate">Budget</p>
                      <p className="mt-1 font-semibold">{requirement.budgetRange}</p>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between">
                    <span className={`rounded-full px-3 py-1 text-xs font-bold ${priorityStyles[requirement.priority]}`}>{requirement.priority} priority</span>
                    {canManageRequirements && (
                      <div className="flex items-center gap-2">
                        <button
                          className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-bold text-experian-slate"
                          onClick={(event) => {
                            event.stopPropagation()
                            editRequirement(requirement)
                          }}
                          type="button"
                        >
                          <Pencil size={13} /> Edit
                        </button>
                        <button
                          className="inline-flex items-center gap-1 rounded-full border border-rose-100 bg-white px-3 py-1 text-xs font-bold text-rose-600"
                          onClick={(event) => {
                            event.stopPropagation()
                            deleteSelectedRequirement(requirement)
                          }}
                          type="button"
                        >
                          <Trash2 size={13} /> Delete
                        </button>
                      </div>
                    )}
                  </div>
                </article>
              )
            })}
          </div>
        </article>

        <aside className="space-y-6">
          <article className="rounded-3xl bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-experian-magenta">Detail page</p>
                <h3 className="mt-1 text-xl font-bold">{selectedRequirement?.roleTitle ?? 'No requirement selected'}</h3>
              </div>
              {selectedRequirement && <span className={`rounded-full px-3 py-1 text-xs font-bold ${statusStyles[selectedRequirement.status]}`}>{selectedRequirement.status}</span>}
            </div>

            {selectedRequirement ? (
              <>
                <div className="mb-5 grid grid-cols-4 gap-2 rounded-2xl bg-slate-50 p-1 text-sm font-bold">
                  <button
                    className={`rounded-xl px-3 py-2 transition ${activeDetailTab === 'overview' ? 'bg-white text-experian-purple shadow-sm' : 'text-experian-slate'}`}
                    onClick={() => setActiveDetailTab('overview')}
                    type="button"
                  >
                    Overview
                  </button>
                  <button
                    className={`inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 transition ${activeDetailTab === 'intake' ? 'bg-white text-experian-purple shadow-sm' : 'text-experian-slate'}`}
                    onClick={() => setActiveDetailTab('intake')}
                    type="button"
                  >
                    <ClipboardList size={15} /> Intake Call
                  </button>
                  <button
                    className={`inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 transition ${activeDetailTab === 'search' ? 'bg-white text-experian-purple shadow-sm' : 'text-experian-slate'}`}
                    onClick={() => setActiveDetailTab('search')}
                    type="button"
                  >
                    <Search size={15} /> Search Strings
                  </button>
                  <button
                    className={`inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 transition ${activeDetailTab === 'pipeline' ? 'bg-white text-experian-purple shadow-sm' : 'text-experian-slate'}`}
                    onClick={() => setActiveDetailTab('pipeline')}
                    type="button"
                  >
                    <Users size={15} /> Pipeline
                  </button>
                </div>

                {activeDetailTab === 'overview' && (
                  <dl className="space-y-3 text-sm">
                    {[
                      ['Req ID', selectedRequirement.reqId],
                      ['Business Unit', selectedRequirement.businessUnit],
                      ['Hiring Manager', selectedRequirement.hiringManager],
                      ['Grade', selectedRequirement.grade],
                      ['Location', selectedRequirement.location],
                      ['Work Mode', selectedRequirement.workMode],
                      ['Budget Range', selectedRequirement.budgetRange],
                      ['Priority', selectedRequirement.priority],
                      ['Target Closure', selectedRequirement.targetClosureDate],
                      ['Recruiter Owner', selectedRequirement.recruiterOwner],
                      ['Assigned Sourcer', selectedRequirement.assignedSourcer]
                    ].map(([label, value]) => (
                      <div className="flex items-start justify-between gap-4 rounded-2xl bg-slate-50 px-4 py-3" key={label}>
                        <dt className="font-semibold text-experian-slate">{label}</dt>
                        <dd className="text-right font-bold text-experian-ink">{value}</dd>
                      </div>
                    ))}
                  </dl>
                )}

                {activeDetailTab === 'intake' && (
                  <div className="space-y-5">
                    <section className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <h4 className="font-bold text-experian-ink">Saved intake summary</h4>
                        {selectedRequirement.intake?.updatedAt && <span className="text-xs font-semibold text-experian-slate">Updated {new Date(selectedRequirement.intake.updatedAt).toLocaleString()}</span>}
                      </div>
                      {hasIntakeData(toIntakeInput(selectedRequirement)) ? (
                        <dl className="mt-4 space-y-3 text-sm">
                          {intakeFields.map(({ key, label }) => {
                            const value = selectedRequirement.intake?.[key]
                            if (!value?.trim()) {
                              return null
                            }

                            return (
                              <div className="rounded-2xl bg-white px-4 py-3" key={key}>
                                <dt className="font-bold text-experian-slate">{label}</dt>
                                <dd className="mt-1 whitespace-pre-line leading-6 text-experian-ink">{value}</dd>
                              </div>
                            )
                          })}
                        </dl>
                      ) : (
                        <p className="mt-3 text-sm text-experian-slate">No intake call details saved yet. Complete the form below to capture hiring context.</p>
                      )}
                    </section>

                    <form className="space-y-4" onSubmit={saveIntake}>
                      <div className="grid grid-cols-1 gap-3">
                        {intakeFields.map(({ key, label, multiline }) => (
                          <label className="text-sm font-semibold text-experian-slate" key={key}>
                            {label}
                            {multiline ? (
                              <textarea
                                className="mt-2 min-h-24 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none ring-experian-blue/20 focus:ring-4"
                                onChange={(event) => updateIntakeField(key, event.target.value)}
                                value={intakeForm[key]}
                              />
                            ) : (
                              <input
                                className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none ring-experian-blue/20 focus:ring-4"
                                onChange={(event) => updateIntakeField(key, event.target.value)}
                                value={intakeForm[key]}
                              />
                            )}
                          </label>
                        ))}
                      </div>

                      {intakeError && <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{intakeError}</p>}

                      <button className="w-full rounded-2xl bg-experian-blue px-5 py-3 font-bold text-white shadow-lg shadow-blue-100 disabled:cursor-not-allowed disabled:opacity-60" disabled={isSavingIntake} type="submit">
                        {isSavingIntake ? 'Saving intake...' : 'Save intake call'}
                      </button>
                    </form>
                  </div>
                )}

                {activeDetailTab === 'pipeline' && (
                  <div className="space-y-3">
                    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                      <h4 className="font-bold text-experian-ink">Candidate pipeline</h4>
                      <p className="mt-1 text-sm text-experian-slate">{selectedCandidates.length} candidate profiles are attached to this requirement.</p>
                    </div>
                    {selectedCandidates.length === 0 ? (
                      <p className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-experian-slate">No candidates added for this requirement yet. Use the Candidates page to add pipeline records.</p>
                    ) : (
                      selectedCandidates.map((candidate) => (
                        <article className="rounded-2xl border border-slate-100 p-4" key={candidate.id}>
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <h5 className="font-bold text-experian-ink">{candidate.name}</h5>
                              <p className="mt-1 text-xs text-experian-slate">{candidate.currentTitle || 'Title TBD'} · {candidate.currentCompany || 'Company TBD'}</p>
                            </div>
                            <span className="rounded-full bg-purple-50 px-3 py-1 text-xs font-bold text-experian-purple">{candidate.status}</span>
                          </div>
                          <dl className="mt-3 grid grid-cols-2 gap-2 text-xs text-experian-slate">
                            <div className="rounded-xl bg-slate-50 p-2"><dt className="font-bold">Source</dt><dd>{candidate.sourceChannel || '—'}</dd></div>
                            <div className="rounded-xl bg-slate-50 p-2"><dt className="font-bold">Location</dt><dd>{candidate.location || '—'}</dd></div>
                            <div className="rounded-xl bg-slate-50 p-2"><dt className="font-bold">Sourcer</dt><dd>{candidate.sourcerName || candidate.assignedSourcer}</dd></div>
                            <div className="rounded-xl bg-slate-50 p-2"><dt className="font-bold">Follow-up</dt><dd>{candidate.followUpDate || '—'}</dd></div>
                          </dl>
                        </article>
                      ))
                    )}
                  </div>
                )}

                {activeDetailTab === 'search' && (
                  <form className="space-y-5" onSubmit={saveSearchStrings}>
                    <section className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h4 className="font-bold text-experian-ink">Search strings workspace</h4>
                          <p className="mt-1 text-sm text-experian-slate">Rule-based strings are generated from the requirement and intake fields, then can be edited before saving.</p>
                        </div>
                        {selectedRequirement.searchStrings?.updatedAt && <span className="text-xs font-semibold text-experian-slate">Updated {new Date(selectedRequirement.searchStrings.updatedAt).toLocaleString()}</span>}
                      </div>
                      <button className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-experian-purple px-4 py-3 text-sm font-bold text-white shadow-lg shadow-purple-100" onClick={generateSearchStrings} type="button">
                        <WandSparkles size={16} /> Generate Search Strings
                      </button>
                    </section>

                    <div className="space-y-4">
                      {searchStringFields.map(({ help, key, label }) => (
                        <label className="block rounded-2xl border border-slate-100 bg-white p-4 text-sm font-semibold text-experian-slate" key={key}>
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <span className="font-bold text-experian-ink">{label}</span>
                              <p className="mt-1 text-xs font-medium leading-5 text-experian-slate">{help}</p>
                            </div>
                            <button
                              className="inline-flex shrink-0 items-center gap-1 rounded-full border border-slate-200 px-3 py-1 text-xs font-bold text-experian-slate disabled:cursor-not-allowed disabled:opacity-50"
                              disabled={!searchStringForm[key].trim()}
                              onClick={() => copySearchString(key)}
                              type="button"
                            >
                              <Copy size={13} /> {copiedSearchString === key ? 'Copied' : 'Copy'}
                            </button>
                          </div>
                          <textarea
                            className="mt-3 min-h-28 w-full rounded-2xl border border-slate-200 px-4 py-3 font-mono text-xs leading-5 text-experian-ink outline-none ring-experian-blue/20 focus:ring-4"
                            onChange={(event) => updateSearchStringField(key, event.target.value)}
                            placeholder={`Generate or enter ${label.toLowerCase()}`}
                            value={searchStringForm[key]}
                          />
                        </label>
                      ))}
                    </div>

                    {searchStringError && <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{searchStringError}</p>}

                    <button className="w-full rounded-2xl bg-experian-blue px-5 py-3 font-bold text-white shadow-lg shadow-blue-100 disabled:cursor-not-allowed disabled:opacity-60" disabled={isSavingSearchStrings} type="submit">
                      {isSavingSearchStrings ? 'Saving search strings...' : 'Save final strings'}
                    </button>
                  </form>
                )}

              </>
            ) : (
              <p className="text-sm text-experian-slate">Select a requirement card to open its detail page.</p>
            )}
          </article>

          {canManageRequirements && (
            <form className="rounded-3xl bg-white p-6 shadow-sm" onSubmit={saveRequirement}>
              <div className="mb-5 flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-xl font-bold">{editingRequirementId ? 'Edit requirement' : 'Create requirement'}</h3>
                  <p className="mt-1 text-sm text-experian-slate">All fields are stored in the local SQLite database.</p>
                </div>
                <button className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-3 py-2 text-xs font-bold text-experian-slate" onClick={resetForm} type="button">
                  <PlusCircle size={15} /> New
                </button>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-sm font-semibold text-experian-slate">
                  Req ID
                  <input className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none ring-experian-blue/20 focus:ring-4" onChange={(event) => updateField('reqId', event.target.value)} required value={formRequirement.reqId} />
                </label>
                <label className="text-sm font-semibold text-experian-slate">
                  Role Title
                  <input className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none ring-experian-blue/20 focus:ring-4" onChange={(event) => updateField('roleTitle', event.target.value)} required value={formRequirement.roleTitle} />
                </label>
                <label className="text-sm font-semibold text-experian-slate">
                  Business Unit
                  <input className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none ring-experian-blue/20 focus:ring-4" onChange={(event) => updateField('businessUnit', event.target.value)} required value={formRequirement.businessUnit} />
                </label>
                <label className="text-sm font-semibold text-experian-slate">
                  Hiring Manager
                  <input className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none ring-experian-blue/20 focus:ring-4" onChange={(event) => updateField('hiringManager', event.target.value)} required value={formRequirement.hiringManager} />
                </label>
                <label className="text-sm font-semibold text-experian-slate">
                  Grade
                  <input className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none ring-experian-blue/20 focus:ring-4" onChange={(event) => updateField('grade', event.target.value)} required value={formRequirement.grade} />
                </label>
                <label className="text-sm font-semibold text-experian-slate">
                  Location
                  <input className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none ring-experian-blue/20 focus:ring-4" onChange={(event) => updateField('location', event.target.value)} required value={formRequirement.location} />
                </label>
                <label className="text-sm font-semibold text-experian-slate">
                  Work Mode
                  <select className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none ring-experian-blue/20 focus:ring-4" onChange={(event) => updateField('workMode', event.target.value as WorkMode)} value={formRequirement.workMode}>
                    {workModeOptions.map((mode) => (
                      <option key={mode}>{mode}</option>
                    ))}
                  </select>
                </label>
                <label className="text-sm font-semibold text-experian-slate">
                  Budget Range
                  <input className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none ring-experian-blue/20 focus:ring-4" onChange={(event) => updateField('budgetRange', event.target.value)} required value={formRequirement.budgetRange} />
                </label>
                <label className="text-sm font-semibold text-experian-slate">
                  Priority
                  <select className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none ring-experian-blue/20 focus:ring-4" onChange={(event) => updateField('priority', event.target.value as RequirementPriority)} value={formRequirement.priority}>
                    {priorityOptions.map((priority) => (
                      <option key={priority}>{priority}</option>
                    ))}
                  </select>
                </label>
                <label className="text-sm font-semibold text-experian-slate">
                  Target Closure Date
                  <input className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none ring-experian-blue/20 focus:ring-4" onChange={(event) => updateField('targetClosureDate', event.target.value)} required type="date" value={formRequirement.targetClosureDate} />
                </label>
                <label className="text-sm font-semibold text-experian-slate">
                  Recruiter Owner
                  <input className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none ring-experian-blue/20 focus:ring-4" onChange={(event) => updateField('recruiterOwner', event.target.value)} required value={formRequirement.recruiterOwner} />
                </label>
                <label className="text-sm font-semibold text-experian-slate">
                  Assigned Sourcer
                  <input className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none ring-experian-blue/20 focus:ring-4" onChange={(event) => updateField('assignedSourcer', event.target.value)} required value={formRequirement.assignedSourcer} />
                </label>
                <label className="sm:col-span-2 text-sm font-semibold text-experian-slate">
                  Status
                  <select className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none ring-experian-blue/20 focus:ring-4" onChange={(event) => updateField('status', event.target.value as RequirementStatus)} value={formRequirement.status}>
                    {statusOptions.map((status) => (
                      <option key={status}>{status}</option>
                    ))}
                  </select>
                </label>
              </div>

              {formError && <p className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{formError}</p>}

              <button className="mt-5 w-full rounded-2xl bg-experian-purple px-5 py-3 font-bold text-white shadow-lg shadow-purple-200 disabled:cursor-not-allowed disabled:opacity-60" disabled={isSubmitting} type="submit">
                {isSubmitting ? 'Saving...' : editingRequirementId ? 'Save changes' : 'Create requirement'}
              </button>
            </form>
          )}
        </aside>
      </section>
    </div>
  )
}
