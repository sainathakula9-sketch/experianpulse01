import { ClipboardCheck, Download, History, Pencil, PlusCircle, Trash2, Upload } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import type { AuthenticatedUser, CandidateInput, CandidateRecord, CandidateStatus, RequirementRecord, SettingsRecord } from '../../shared/types'
import { exportCandidatesForRequirement, parseCandidateImportFile } from '../utils/excel'


interface ImportSummary {
  imported: number
  errors: string[]
}

interface CandidatesProps {
  candidates: CandidateRecord[]
  onCandidatesChange: () => void
  requirements: RequirementRecord[]
  user: AuthenticatedUser
  settings: SettingsRecord
}

const visibleCandidateLimit = 250

const fallbackCandidateStatuses: CandidateStatus[] = [
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
  followUpDate: '',
  statusChangeNotes: ''
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
    followUpDate: candidate.followUpDate,
    statusChangeNotes: ''
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

function formatDateTime(value: string): string {
  if (!value) {
    return '—'
  }

  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

export function Candidates({ candidates, onCandidatesChange, requirements, settings, user }: CandidatesProps): JSX.Element {
  const [candidateForm, setCandidateForm] = useState<CandidateInput>(() => createDefaultCandidate(requirements, user))
  const [editingCandidateId, setEditingCandidateId] = useState<number | undefined>()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | undefined>()
  const [selectedCandidateId, setSelectedCandidateId] = useState<number | undefined>()
  const [filters, setFilters] = useState({ status: '', sourcer: '', sourceChannel: '', location: '' })
  const candidateStatuses = settings.candidateStatuses.length > 0 ? settings.candidateStatuses : fallbackCandidateStatuses
  const [excelRequirementId, setExcelRequirementId] = useState<number>(requirements[0]?.id ?? 0)
  const [importSummary, setImportSummary] = useState<ImportSummary | undefined>()
  const [isImporting, setIsImporting] = useState(false)

  const filterOptions = useMemo(
    () => ({
      sourcers: uniqueValues(candidates.map((candidate) => candidate.sourcerName || candidate.assignedSourcer)),
      sourceChannels: uniqueValues(candidates.map((candidate) => candidate.sourceChannel)),
      locations: uniqueValues(candidates.map((candidate) => candidate.location))
    }),
    [candidates]
  )

  const selectedCandidate = useMemo(
    () => candidates.find((candidate) => candidate.id === selectedCandidateId) ?? candidates.find((candidate) => candidate.id === editingCandidateId),
    [candidates, editingCandidateId, selectedCandidateId]
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

  const excelRequirement = useMemo(
    () => requirements.find((requirement) => requirement.id === excelRequirementId) ?? requirements[0],
    [excelRequirementId, requirements]
  )

  const visibleCandidates = useMemo(() => filteredCandidates.slice(0, visibleCandidateLimit), [filteredCandidates])
  const hiddenCandidateCount = Math.max(0, filteredCandidates.length - visibleCandidates.length)

  const excelCandidates = useMemo(
    () => (excelRequirement ? candidates.filter((candidate) => candidate.requirementId === excelRequirement.id) : []),
    [candidates, excelRequirement]
  )

  useEffect(() => {
    if (requirements.length === 0) {
      setCandidateForm((currentCandidate) => ({ ...currentCandidate, requirementId: 0 }))
      setExcelRequirementId(0)
      return
    }

    setCandidateForm((currentCandidate) =>
      currentCandidate.requirementId && requirements.some((requirement) => requirement.id === currentCandidate.requirementId)
        ? currentCandidate
        : { ...currentCandidate, requirementId: requirements[0].id }
    )

    setExcelRequirementId((currentRequirementId) => (requirements.some((requirement) => requirement.id === currentRequirementId) ? currentRequirementId : requirements[0].id))
  }, [requirements])

  const resetForm = (): void => {
    setCandidateForm(createDefaultCandidate(requirements, user))
    setEditingCandidateId(undefined)
    setSelectedCandidateId(undefined)
    setFormError(undefined)
  }

  const updateField = <K extends keyof CandidateInput>(field: K, value: CandidateInput[K]): void => {
    setCandidateForm((currentCandidate) => ({ ...currentCandidate, [field]: value }))
  }

  const editCandidate = (candidate: CandidateRecord): void => {
    setCandidateForm(toCandidateInput(candidate))
    setEditingCandidateId(candidate.id)
    setSelectedCandidateId(candidate.id)
    setFormError(undefined)
  }

  const saveCandidate = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault()
    setFormError(undefined)

    if (!candidateForm.requirementId) {
      setFormError('Select a requirement before saving a candidate.')
      return
    }

    if (!candidateForm.name.trim()) {
      setFormError('Candidate name is required.')
      return
    }

    if (candidateForm.linkedinUrl && !candidateForm.linkedinUrl.startsWith('http')) {
      setFormError('LinkedIn URL must start with http:// or https://.')
      return
    }

    if (candidateForm.githubUrl && !candidateForm.githubUrl.startsWith('http')) {
      setFormError('GitHub URL must start with http:// or https://.')
      return
    }

    setIsSubmitting(true)

    try {
      if (editingCandidateId) {
        await window.experianPulse.updateCandidate(editingCandidateId, candidateForm)
      } else {
        await window.experianPulse.createCandidate(candidateForm)
      }
      setCandidateForm((currentCandidate) => ({ ...currentCandidate, statusChangeNotes: '' }))
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

    try {
      await window.experianPulse.deleteCandidate(candidate.id)
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Unable to delete candidate.')
      return
    }
    if (editingCandidateId === candidate.id) {
      resetForm()
    }
    if (selectedCandidateId === candidate.id) {
      setSelectedCandidateId(undefined)
    }
    onCandidatesChange()
  }

  const exportRequirementCandidates = (): void => {
    if (!excelRequirement) {
      return
    }

    exportCandidatesForRequirement(excelRequirement, excelCandidates)
    window.experianPulse.recordAudit({
      actionType: 'Excel Export',
      entityType: 'Requirement',
      entityId: excelRequirement.id,
      summary: `Exported candidates for ${excelRequirement.reqId}.`,
      details: JSON.stringify({ candidates: excelCandidates.length, file: `${excelRequirement.reqId}-candidates.xlsx` })
    }).catch(() => undefined)
  }

  const importCandidates = async (event: ChangeEvent<HTMLInputElement>): Promise<void> => {
    const [file] = Array.from(event.target.files ?? [])
    event.target.value = ''

    if (!file || !excelRequirement) {
      return
    }

    setIsImporting(true)
    setImportSummary(undefined)

    try {
      const preview = await parseCandidateImportFile(file, excelRequirement)
      if (preview.errors.length > 0) {
        setImportSummary({ imported: 0, errors: preview.errors })
        return
      }

      let imported = 0
      const errors: string[] = []
      for (const [index, candidate] of preview.rows.entries()) {
        try {
          await window.experianPulse.createCandidate(candidate)
          imported += 1
        } catch (error) {
          errors.push(`Row ${index + 2}: ${error instanceof Error ? error.message : 'Unable to import candidate.'}`)
        }
      }

      setImportSummary({ imported, errors })
      await window.experianPulse.recordAudit({
        actionType: 'Excel Import',
        entityType: 'Requirement',
        entityId: excelRequirement.id,
        summary: `Imported ${imported} candidate${imported === 1 ? '' : 's'} into ${excelRequirement.reqId}.`,
        details: JSON.stringify({ imported, errors: errors.length, file: file.name })
      }).catch(() => undefined)
      onCandidatesChange()
    } catch (error) {
      setImportSummary({ imported: 0, errors: [error instanceof Error ? error.message : 'Unable to read Excel file.'] })
    } finally {
      setIsImporting(false)
    }
  }

  return (
    <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
      <article className="rounded-3xl bg-white p-6 shadow-sm">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h3 className="text-xl font-bold">Candidate pipeline</h3>
            <p className="mt-1 text-sm text-experian-slate">Track candidates against requirement folders with SQLite-backed add, edit, delete, and filters.</p>
          </div>
          <span className="rounded-full bg-experian-blue/10 px-3 py-1 text-xs font-bold text-experian-blue">{filteredCandidates.length} matched · {visibleCandidates.length} rendered</span>
        </div>

        <div className="mb-5 grid gap-3 rounded-2xl bg-slate-50 p-4 lg:grid-cols-[minmax(0,1fr)_auto_auto]">
          <label className="text-xs font-bold uppercase tracking-[0.12em] text-experian-slate">
            Excel requirement
            <select
              className="mt-2 w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm font-semibold normal-case tracking-normal text-experian-ink outline-none"
              onChange={(event) => setExcelRequirementId(Number(event.target.value))}
              value={excelRequirement?.id ?? 0}
            >
              {requirements.map((requirement) => <option key={requirement.id} value={requirement.id}>{requirement.reqId} · {requirement.roleTitle}</option>)}
            </select>
          </label>
          <button
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 px-4 py-2 text-sm font-bold text-experian-slate disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!excelRequirement}
            onClick={exportRequirementCandidates}
            type="button"
          >
            <Download size={16} /> Export candidates
          </button>
          <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl bg-experian-purple px-4 py-2 text-sm font-bold text-white has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50">
            <Upload size={16} /> {isImporting ? 'Importing...' : 'Import candidates'}
            <input accept=".xlsx,.xls" className="sr-only" disabled={!excelRequirement || isImporting} onChange={importCandidates} type="file" />
          </label>
        </div>

        {importSummary && (
          <div className={`mb-5 rounded-2xl px-4 py-3 text-sm font-semibold ${importSummary.errors.length > 0 ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'}`}>
            <p>{importSummary.imported} candidate{importSummary.imported === 1 ? '' : 's'} imported into {excelRequirement?.reqId ?? 'the selected requirement'}.</p>
            {importSummary.errors.length > 0 && (
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {importSummary.errors.slice(0, 8).map((error) => <li key={error}>{error}</li>)}
                {importSummary.errors.length > 8 && <li>{importSummary.errors.length - 8} more error(s).</li>}
              </ul>
            )}
          </div>
        )}

        <div className="mb-5 grid gap-3 rounded-2xl bg-slate-50 p-4 sm:grid-cols-2 xl:grid-cols-4">
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

        {hiddenCandidateCount > 0 && (
          <p className="mb-3 rounded-2xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
            Showing the first {visibleCandidateLimit} matching candidates to keep filtering responsive. Narrow filters to inspect the remaining {hiddenCandidateCount}, or use Excel export for the full requirement dataset.
          </p>
        )}

        <div className="overflow-x-auto rounded-2xl border border-slate-100">
          <table className="min-w-full divide-y divide-slate-100 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-bold uppercase tracking-[0.12em] text-experian-slate">
              <tr>
                <th className="px-4 py-3">Candidate</th>
                <th className="px-4 py-3">Requirement</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Source</th>
                <th className="px-4 py-3">Location</th>
                <th className="px-4 py-3">Follow-up</th>
                <th className="px-4 py-3">Stage days</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredCandidates.length === 0 ? (
                <tr>
                  <td className="px-4 py-10 text-center text-sm font-semibold text-experian-slate" colSpan={8}>
                    No candidates match the current filters. Add a candidate or clear filters to expand the view.
                  </td>
                </tr>
              ) : visibleCandidates.map((candidate) => (
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
                  <td className="px-4 py-4 text-experian-slate">{candidate.daysInCurrentStage}d</td>
                  <td className="px-4 py-4">
                    <div className="flex gap-2">
                      <button className="rounded-full border border-slate-200 p-2 text-experian-slate" onClick={() => editCandidate(candidate)} type="button"><Pencil size={14} /></button>
                      <button className="rounded-full border border-slate-200 p-2 text-experian-slate" onClick={() => setSelectedCandidateId(candidate.id)} type="button"><History size={14} /></button>
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

          <div className="grid max-h-[64vh] gap-3 overflow-y-auto pr-1 sm:grid-cols-2">
            <label className="sm:col-span-2 text-sm font-semibold text-experian-slate">
              Requirement
              <select className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none ring-experian-blue/20 focus:ring-4" onChange={(event) => updateField('requirementId', Number(event.target.value))} required value={candidateForm.requirementId}>
                <option value={0}>Select requirement</option>
                {requirements.map((requirement) => <option key={requirement.id} value={requirement.id}>{requirement.reqId} · {requirement.roleTitle}</option>)}
              </select>
            </label>
            {textFields.map(({ key, label, multiline, required, type }) => (
              <label className={`${multiline ? 'sm:col-span-2' : ''} text-sm font-semibold text-experian-slate`} key={key}>
                {label}
                {key === 'sourceChannel' && settings.sourceChannels.length > 0 ? (
                  <select className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none ring-experian-blue/20 focus:ring-4" onChange={(event) => updateField(key, event.target.value as never)} required={required} value={candidateForm[key] as string}>
                    <option value="">Select source channel</option>
                    {settings.sourceChannels.map((source) => <option key={source}>{source}</option>)}
                  </select>
                ) : multiline ? (
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
            <label className="sm:col-span-2 text-sm font-semibold text-experian-slate">
              Status change notes
              <textarea className="mt-2 min-h-20 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none ring-experian-blue/20 focus:ring-4" onChange={(event) => updateField('statusChangeNotes', event.target.value)} placeholder="Optional notes recorded when the status changes" value={candidateForm.statusChangeNotes ?? ''} />
            </label>
          </div>

          {formError && <p className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{formError}</p>}
          <button className="mt-5 w-full rounded-2xl bg-experian-purple px-5 py-3 font-bold text-white shadow-lg shadow-purple-200 disabled:cursor-not-allowed disabled:opacity-60" disabled={isSubmitting} type="submit">
            {isSubmitting ? 'Saving...' : editingCandidateId ? 'Save candidate' : 'Add candidate'}
          </button>
        </form>


        {selectedCandidate && (
          <article className="rounded-3xl bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-xl font-bold">Candidate detail</h3>
                <p className="mt-1 text-sm text-experian-slate">{selectedCandidate.name} · {selectedCandidate.requirementTitle}</p>
              </div>
              <span className="rounded-full bg-purple-50 px-3 py-1 text-xs font-bold text-experian-purple">{selectedCandidate.status}</span>
            </div>

            <div className="mb-5 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-experian-slate">Days in current stage</p>
                <p className="mt-2 text-2xl font-black text-experian-ink">{selectedCandidate.daysInCurrentStage}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-experian-slate">Total days in pipeline</p>
                <p className="mt-2 text-2xl font-black text-experian-ink">{selectedCandidate.totalDaysInPipeline}</p>
              </div>
            </div>

            <div className="mb-4 flex items-center gap-2 text-sm font-bold text-experian-ink">
              <History size={16} /> Status timeline
            </div>
            <div className="max-h-80 space-y-4 overflow-y-auto pr-1">
              {selectedCandidate.statusHistory.length === 0 ? (
                <p className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-experian-slate">No status changes have been recorded yet.</p>
              ) : (
                selectedCandidate.statusHistory.map((historyItem) => (
                  <div className="relative border-l-2 border-experian-purple/20 pl-4" key={historyItem.id}>
                    <span className="absolute -left-[7px] top-1 h-3 w-3 rounded-full bg-experian-purple" />
                    <p className="text-sm font-bold text-experian-ink">{historyItem.oldStatus || 'Pipeline start'} → {historyItem.newStatus}</p>
                    <p className="mt-1 text-xs text-experian-slate">Changed by {historyItem.changedByUser} on {formatDateTime(historyItem.changedAt)}</p>
                    {historyItem.notes && <p className="mt-2 rounded-2xl bg-slate-50 px-3 py-2 text-xs text-experian-slate">{historyItem.notes}</p>}
                  </div>
                ))
              )}
            </div>
          </article>
        )}

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
