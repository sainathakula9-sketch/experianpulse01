import { ClipboardCheck, Pencil, PlusCircle, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import type { AuthenticatedUser, CandidateInput, CandidateRecord, CandidateStatus, RequirementRecord } from '../../shared/types'

interface CandidatesProps {
  candidates: CandidateRecord[]
  onCandidatesChange: () => void
  requirements: RequirementRecord[]
  user: AuthenticatedUser
}

const candidateStatuses: CandidateStatus[] = [
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

const emptyCandidate: CandidateInput = {
  name: '',
  requirementId: 0,
  currentCompany: '',
  currentTitle: '',
  totalExperience: '',
  relevantExperience: '',
  location: '',
  currentCtc: '',
  expectedCtc: '',
  noticePeriod: '',
  servingNotice: false,
  lastWorkingDay: '',
  primarySkills: '',
  secondarySkills: '',
  sourceChannel: '',
  linkedinUrl: '',
  githubUrl: '',
  resumeFilePath: '',
  sourcerName: '',
  recruiterName: '',
  status: 'New Profile',
  remarks: '',
  followUpDate: ''
}

const textFields: Array<{ key: keyof CandidateInput; label: string; type?: string; required?: boolean; multiline?: boolean }> = [
  { key: 'name', label: 'Candidate Name', required: true },
  { key: 'currentCompany', label: 'Current Company' },
  { key: 'currentTitle', label: 'Current Title' },
  { key: 'totalExperience', label: 'Total Experience' },
  { key: 'relevantExperience', label: 'Relevant Experience' },
  { key: 'location', label: 'Location' },
  { key: 'currentCtc', label: 'Current CTC' },
  { key: 'expectedCtc', label: 'Expected CTC' },
  { key: 'noticePeriod', label: 'Notice Period' },
  { key: 'lastWorkingDay', label: 'Last Working Day', type: 'date' },
  { key: 'primarySkills', label: 'Primary Skills', multiline: true },
  { key: 'secondarySkills', label: 'Secondary Skills', multiline: true },
  { key: 'sourceChannel', label: 'Source Channel' },
  { key: 'linkedinUrl', label: 'LinkedIn URL', type: 'url' },
  { key: 'githubUrl', label: 'GitHub URL', type: 'url' },
  { key: 'resumeFilePath', label: 'Resume File Path' },
  { key: 'sourcerName', label: 'Sourcer Name' },
  { key: 'recruiterName', label: 'Recruiter Name' },
  { key: 'remarks', label: 'Remarks', multiline: true },
  { key: 'followUpDate', label: 'Follow-up Date', type: 'date' }
]

function toCandidateInput(candidate: CandidateRecord): CandidateInput {
  return {
    name: candidate.name,
    requirementId: candidate.requirementId,
    currentCompany: candidate.currentCompany,
    currentTitle: candidate.currentTitle,
    totalExperience: candidate.totalExperience,
    relevantExperience: candidate.relevantExperience,
    location: candidate.location,
    currentCtc: candidate.currentCtc,
    expectedCtc: candidate.expectedCtc,
    noticePeriod: candidate.noticePeriod,
    servingNotice: candidate.servingNotice,
    lastWorkingDay: candidate.lastWorkingDay,
    primarySkills: candidate.primarySkills,
    secondarySkills: candidate.secondarySkills,
    sourceChannel: candidate.sourceChannel,
    linkedinUrl: candidate.linkedinUrl,
    githubUrl: candidate.githubUrl,
    resumeFilePath: candidate.resumeFilePath,
    sourcerName: candidate.sourcerName,
    recruiterName: candidate.recruiterName,
    status: candidate.status,
    remarks: candidate.remarks,
    followUpDate: candidate.followUpDate
  }
}

function createDefaultCandidate(requirements: RequirementRecord[], user: AuthenticatedUser): CandidateInput {
  const requirement = requirements[0]
  return {
    ...emptyCandidate,
    requirementId: requirement?.id ?? 0,
    sourcerName: user.role === 'Sourcer' ? user.username : requirement?.assignedSourcer ?? '',
    recruiterName: user.role === 'Recruiter' ? user.username : requirement?.recruiterOwner ?? ''
  }
}

function uniqueValues(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b))
}

export function Candidates({ candidates, onCandidatesChange, requirements, user }: CandidatesProps): JSX.Element {
  const [candidateForm, setCandidateForm] = useState<CandidateInput>(() => createDefaultCandidate(requirements, user))
  const [editingCandidateId, setEditingCandidateId] = useState<number | undefined>()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | undefined>()
  const [filters, setFilters] = useState({ status: '', sourcer: '', sourceChannel: '', location: '' })

  const filterOptions = useMemo(
    () => ({
      sourcers: uniqueValues(candidates.map((candidate) => candidate.sourcerName || candidate.assignedSourcer)),
      sourceChannels: uniqueValues(candidates.map((candidate) => candidate.sourceChannel)),
      locations: uniqueValues(candidates.map((candidate) => candidate.location))
    }),
    [candidates]
  )

  const filteredCandidates = useMemo(
    () =>
      candidates.filter(
        (candidate) =>
          (!filters.status || candidate.status === filters.status) &&
          (!filters.sourcer || candidate.sourcerName === filters.sourcer || candidate.assignedSourcer === filters.sourcer) &&
          (!filters.sourceChannel || candidate.sourceChannel === filters.sourceChannel) &&
          (!filters.location || candidate.location === filters.location)
      ),
    [candidates, filters]
  )

  const resetForm = (): void => {
    setCandidateForm(createDefaultCandidate(requirements, user))
    setEditingCandidateId(undefined)
    setFormError(undefined)
  }

  const updateField = <K extends keyof CandidateInput>(field: K, value: CandidateInput[K]): void => {
    setCandidateForm((currentCandidate) => ({ ...currentCandidate, [field]: value }))
  }

  const editCandidate = (candidate: CandidateRecord): void => {
    setCandidateForm(toCandidateInput(candidate))
    setEditingCandidateId(candidate.id)
    setFormError(undefined)
  }

  const saveCandidate = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault()
    setIsSubmitting(true)
    setFormError(undefined)

    try {
      if (editingCandidateId) {
        await window.experianPulse.updateCandidate(editingCandidateId, candidateForm)
      } else {
        await window.experianPulse.createCandidate(candidateForm)
      }
      resetForm()
      onCandidatesChange()
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Unable to save candidate.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const deleteCandidate = async (candidate: CandidateRecord): Promise<void> => {
    if (!window.confirm(`Delete ${candidate.name} from the candidate pipeline?`)) {
      return
    }

    await window.experianPulse.deleteCandidate(candidate.id)
    if (editingCandidateId === candidate.id) {
      resetForm()
    }
    onCandidatesChange()
  }

  return (
    <section className="grid grid-cols-[minmax(0,1fr)_420px] gap-6">
      <article className="rounded-3xl bg-white p-6 shadow-sm">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h3 className="text-xl font-bold">Candidate pipeline</h3>
            <p className="mt-1 text-sm text-experian-slate">Track candidates against requirement folders with SQLite-backed add, edit, delete, and filters.</p>
          </div>
          <span className="rounded-full bg-experian-blue/10 px-3 py-1 text-xs font-bold text-experian-blue">{filteredCandidates.length} shown</span>
        </div>

        <div className="mb-5 grid grid-cols-4 gap-3 rounded-2xl bg-slate-50 p-4">
          <select className="rounded-2xl border border-slate-200 px-3 py-2 text-sm outline-none" onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))} value={filters.status}>
            <option value="">All statuses</option>
            {candidateStatuses.map((status) => <option key={status}>{status}</option>)}
          </select>
          <select className="rounded-2xl border border-slate-200 px-3 py-2 text-sm outline-none" onChange={(event) => setFilters((current) => ({ ...current, sourcer: event.target.value }))} value={filters.sourcer}>
            <option value="">All sourcers</option>
            {filterOptions.sourcers.map((sourcer) => <option key={sourcer}>{sourcer}</option>)}
          </select>
          <select className="rounded-2xl border border-slate-200 px-3 py-2 text-sm outline-none" onChange={(event) => setFilters((current) => ({ ...current, sourceChannel: event.target.value }))} value={filters.sourceChannel}>
            <option value="">All sources</option>
            {filterOptions.sourceChannels.map((source) => <option key={source}>{source}</option>)}
          </select>
          <select className="rounded-2xl border border-slate-200 px-3 py-2 text-sm outline-none" onChange={(event) => setFilters((current) => ({ ...current, location: event.target.value }))} value={filters.location}>
            <option value="">All locations</option>
            {filterOptions.locations.map((location) => <option key={location}>{location}</option>)}
          </select>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-100">
          <table className="min-w-full divide-y divide-slate-100 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-bold uppercase tracking-[0.12em] text-experian-slate">
              <tr>
                <th className="px-4 py-3">Candidate</th>
                <th className="px-4 py-3">Requirement</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Source</th>
                <th className="px-4 py-3">Location</th>
                <th className="px-4 py-3">Follow-up</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredCandidates.map((candidate) => (
                <tr key={candidate.id}>
                  <td className="px-4 py-4">
                    <p className="font-bold text-experian-ink">{candidate.name}</p>
                    <p className="text-xs text-experian-slate">{candidate.currentTitle || 'Title TBD'} · {candidate.currentCompany || 'Company TBD'}</p>
                  </td>
                  <td className="px-4 py-4 text-experian-slate">{candidate.requirementTitle}</td>
                  <td className="px-4 py-4"><span className="rounded-full bg-purple-50 px-3 py-1 text-xs font-bold text-experian-purple">{candidate.status}</span></td>
                  <td className="px-4 py-4 text-experian-slate">{candidate.sourceChannel || '—'}</td>
                  <td className="px-4 py-4 text-experian-slate">{candidate.location || '—'}</td>
                  <td className="px-4 py-4 text-experian-slate">{candidate.followUpDate || '—'}</td>
                  <td className="px-4 py-4">
                    <div className="flex gap-2">
                      <button className="rounded-full border border-slate-200 p-2 text-experian-slate" onClick={() => editCandidate(candidate)} type="button"><Pencil size={14} /></button>
                      <button className="rounded-full border border-rose-100 p-2 text-rose-600" onClick={() => deleteCandidate(candidate)} type="button"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>

      <aside className="space-y-6">
        <form className="rounded-3xl bg-white p-6 shadow-sm" onSubmit={saveCandidate}>
          <div className="mb-5 flex items-start justify-between gap-3">
            <div>
              <h3 className="text-xl font-bold">{editingCandidateId ? 'Edit candidate' : 'Add candidate'}</h3>
              <p className="mt-1 text-sm text-experian-slate">Capture every candidate pipeline field for a selected requirement.</p>
            </div>
            <button className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-3 py-2 text-xs font-bold text-experian-slate" onClick={resetForm} type="button">
              <PlusCircle size={15} /> New
            </button>
          </div>

          <div className="grid max-h-[64vh] grid-cols-2 gap-3 overflow-y-auto pr-1">
            <label className="col-span-2 text-sm font-semibold text-experian-slate">
              Requirement
              <select className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none ring-experian-blue/20 focus:ring-4" onChange={(event) => updateField('requirementId', Number(event.target.value))} required value={candidateForm.requirementId}>
                <option value={0}>Select requirement</option>
                {requirements.map((requirement) => <option key={requirement.id} value={requirement.id}>{requirement.reqId} · {requirement.roleTitle}</option>)}
              </select>
            </label>
            {textFields.map(({ key, label, multiline, required, type }) => (
              <label className={`${multiline ? 'col-span-2' : ''} text-sm font-semibold text-experian-slate`} key={key}>
                {label}
                {multiline ? (
                  <textarea className="mt-2 min-h-20 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none ring-experian-blue/20 focus:ring-4" onChange={(event) => updateField(key, event.target.value as never)} required={required} value={candidateForm[key] as string} />
                ) : (
                  <input className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none ring-experian-blue/20 focus:ring-4" onChange={(event) => updateField(key, event.target.value as never)} required={required} type={type ?? 'text'} value={candidateForm[key] as string} />
                )}
              </label>
            ))}
            <label className="text-sm font-semibold text-experian-slate">
              Status
              <select className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none ring-experian-blue/20 focus:ring-4" onChange={(event) => updateField('status', event.target.value as CandidateStatus)} value={candidateForm.status}>
                {candidateStatuses.map((status) => <option key={status}>{status}</option>)}
              </select>
            </label>
            <label className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-experian-slate">
              <input checked={candidateForm.servingNotice} onChange={(event) => updateField('servingNotice', event.target.checked)} type="checkbox" /> Serving Notice
            </label>
          </div>

          {formError && <p className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{formError}</p>}
          <button className="mt-5 w-full rounded-2xl bg-experian-purple px-5 py-3 font-bold text-white shadow-lg shadow-purple-200 disabled:cursor-not-allowed disabled:opacity-60" disabled={isSubmitting} type="submit">
            {isSubmitting ? 'Saving...' : editingCandidateId ? 'Save candidate' : 'Add candidate'}
          </button>
        </form>

        <article className="rounded-3xl bg-white p-6 shadow-sm">
          <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-experian-purple/10 text-experian-purple">
            <ClipboardCheck size={22} />
          </div>
          <h3 className="text-xl font-bold">Assigned requirement folders</h3>
          <p className="mt-1 text-sm text-experian-slate">Candidate rows remain linked to the requirement where they were sourced.</p>
        </article>
      </aside>
    </section>
  )
}
