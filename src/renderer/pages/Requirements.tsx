import { BriefcaseBusiness, CalendarDays, Download, FolderOpen, Pencil, PlusCircle, Upload, Users } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import * as XLSX from 'xlsx'
import type { AuthenticatedUser, RequirementInput, RequirementPriority, RequirementRecord, RequirementStatus, WorkMode } from '../../shared/types'

interface RequirementsProps {
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

export function Requirements({ onRequirementsChange, requirements, user }: RequirementsProps): JSX.Element {
  const [formRequirement, setFormRequirement] = useState<RequirementInput>(() => createDefaultRequirement(user))
  const [editingRequirementId, setEditingRequirementId] = useState<number | undefined>()
  const [selectedRequirementId, setSelectedRequirementId] = useState<number | undefined>(requirements[0]?.id)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | undefined>()

  const canManageRequirements = user.role === 'Admin' || user.role === 'Recruiter'
  const selectedRequirement = requirements.find((requirement) => requirement.id === selectedRequirementId) ?? requirements[0]

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

    setIsSubmitting(true)
    setFormError(undefined)

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

  const exportWorkbook = (): void => {
    const worksheet = XLSX.utils.json_to_sheet(requirements)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Requirements')
    XLSX.writeFile(workbook, 'experian-pulse-requirements.xlsx')
  }

  const acknowledgeImport = (): void => {
    window.alert('XLSX import workflow placeholder: parsing and validation will be added in a future milestone.')
  }

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-4 gap-5">
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

      <section className="grid grid-cols-[minmax(0,1fr)_420px] gap-6">
        <article className="rounded-3xl bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-bold">Requirement folder</h3>
              <p className="mt-1 text-sm text-experian-slate">
                Create, edit, list, and open requirement details from SQLite-backed hiring folders.
              </p>
            </div>
            <div className="flex gap-3">
              <button className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-2 text-sm font-bold text-experian-slate" onClick={acknowledgeImport} type="button">
                <Upload size={16} /> Import XLSX
              </button>
              <button className="inline-flex items-center gap-2 rounded-2xl bg-experian-purple px-4 py-2 text-sm font-bold text-white" onClick={exportWorkbook} type="button">
                <Download size={16} /> Export XLSX
              </button>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {requirements.map((requirement) => {
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

              <div className="grid grid-cols-2 gap-3">
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
                <label className="col-span-2 text-sm font-semibold text-experian-slate">
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
