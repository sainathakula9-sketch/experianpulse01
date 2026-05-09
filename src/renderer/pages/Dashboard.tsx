import { useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Funnel,
  FunnelChart,
  LabelList,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts'
import { Download } from 'lucide-react'
import type { AuthenticatedUser, CandidateRecord, CandidateStatus, PulseSnapshot, RequirementRecord, RequirementStatus } from '../../shared/types'
import { exportDashboardMetrics } from '../utils/excel'

interface DashboardProps {
  snapshot: PulseSnapshot
  user: AuthenticatedUser
}

type FilterState = {
  startDate: string
  endDate: string
  recruiter: string
  sourcer: string
  businessUnit: string
  status: string
}

type ProductivityRow = {
  name: string
  profiles: number
  interviews: number
  offers: number
  joins: number
  offerDrops: number
  openRoles: number
  closedRoles: number
}

const chartColors = ['#5f259f', '#00a3e0', '#d0006f', '#16a34a', '#f59e0b', '#6366f1', '#ef4444', '#64748b']

const statusOrder: CandidateStatus[] = [
  'New Profile',
  'Contacted',
  'Interested',
  'Screen Shortlisted',
  'HM Shortlisted',
  'Interview 1 Scheduled',
  'Interview 2 Scheduled',
  'Final Round',
  'Offer Discussion',
  'Offer Released',
  'Offer Accepted',
  'Offer Dropped',
  'Joined',
  'Not Interested',
  'Screen Rejected',
  'Interview 1 Selected',
  'Interview 1 Rejected',
  'Interview 2 Selected'
]

const requirementStatuses: RequirementStatus[] = ['Open', 'On Hold', 'Closed', 'Cancelled']

const interviewStatuses: CandidateStatus[] = ['Interview 1 Scheduled', 'Interview 1 Selected', 'Interview 1 Rejected', 'Interview 2 Scheduled', 'Interview 2 Selected', 'Final Round', 'Offer Discussion', 'Offer Released', 'Offer Accepted', 'Offer Dropped', 'Joined']
const offerStatuses: CandidateStatus[] = ['Offer Released', 'Offer Accepted', 'Offer Dropped', 'Joined']
const conversionStatuses: CandidateStatus[] = ['Contacted', 'Interested', 'Screen Shortlisted', 'Interview 1 Scheduled', 'Interview 2 Scheduled', 'Offer Released', 'Offer Accepted', 'Joined']

function daysBetween(startIso: string, endDate = new Date()): number {
  const startDate = new Date(startIso)
  if (Number.isNaN(startDate.getTime())) {
    return 0
  }

  const millisecondsPerDay = 1000 * 60 * 60 * 24
  return Math.max(0, Math.floor((endDate.getTime() - startDate.getTime()) / millisecondsPerDay))
}

function formatRequirementLabel(requirement: RequirementRecord): string {
  const shortTitle = requirement.roleTitle.length > 22 ? `${requirement.roleTitle.slice(0, 22)}...` : requirement.roleTitle
  return `${requirement.reqId.replace('REQ-', '')} ${shortTitle}`
}

function toDateInputValue(isoDate: string): string {
  if (!isoDate) {
    return ''
  }

  const date = new Date(isoDate)
  if (Number.isNaN(date.getTime())) {
    return isoDate.slice(0, 10)
  }

  return date.toISOString().slice(0, 10)
}

function isDateInRange(isoDate: string, startDate: string, endDate: string): boolean {
  if (!isoDate || (!startDate && !endDate)) {
    return true
  }

  const dateValue = toDateInputValue(isoDate)
  if (startDate && dateValue < startDate) {
    return false
  }
  if (endDate && dateValue > endDate) {
    return false
  }

  return true
}

function candidateMatchesDateRange(candidate: CandidateRecord, startDate: string, endDate: string): boolean {
  if (!startDate && !endDate) {
    return true
  }

  return (
    isDateInRange(candidate.updatedAt, startDate, endDate) ||
    candidate.statusHistory.some((history) => isDateInRange(history.changedAt, startDate, endDate))
  )
}

function requirementMatchesDateRange(requirement: RequirementRecord, startDate: string, endDate: string): boolean {
  if (!startDate && !endDate) {
    return true
  }

  return [requirement.createdAt, requirement.closedAt, requirement.targetClosureDate].some((dateValue) => isDateInRange(dateValue, startDate, endDate))
}

function getUniqueOptions(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean))).sort((first, second) => first.localeCompare(second))
}

function getCandidateRequirement(candidate: CandidateRecord, requirementsById: Map<number, RequirementRecord>): RequirementRecord | undefined {
  return requirementsById.get(candidate.requirementId)
}

function countCandidatesAtOrBeyond(candidates: CandidateRecord[], statuses: CandidateStatus[]): number {
  return candidates.filter((candidate) => statuses.includes(candidate.status)).length
}

function isRequirementStatus(status: string): status is RequirementStatus {
  return requirementStatuses.includes(status as RequirementStatus)
}

function isCandidateStatus(status: string): status is CandidateStatus {
  return statusOrder.includes(status as CandidateStatus)
}

function buildProductivityRows(
  people: string[],
  candidates: CandidateRecord[],
  requirements: RequirementRecord[],
  ownerKey: 'recruiter' | 'sourcer'
): ProductivityRow[] {
  return people.map((person) => {
    const ownedCandidates = candidates.filter((candidate) => (ownerKey === 'recruiter' ? candidate.recruiterName || candidate.assignedRecruiter : candidate.sourcerName || candidate.assignedSourcer) === person)
    const ownedRequirements = requirements.filter((requirement) => (ownerKey === 'recruiter' ? requirement.recruiterOwner : requirement.assignedSourcer) === person)

    return {
      name: person,
      profiles: ownedCandidates.length,
      interviews: countCandidatesAtOrBeyond(ownedCandidates, interviewStatuses),
      offers: countCandidatesAtOrBeyond(ownedCandidates, offerStatuses),
      joins: ownedCandidates.filter((candidate) => candidate.status === 'Joined').length,
      offerDrops: ownedCandidates.filter((candidate) => candidate.status === 'Offer Dropped').length,
      openRoles: ownedRequirements.filter((requirement) => requirement.status === 'Open').length,
      closedRoles: ownedRequirements.filter((requirement) => requirement.status === 'Closed').length
    }
  })
}

function hasDiversitySignal(candidate: CandidateRecord, requirement?: RequirementRecord): boolean {
  const searchableCandidateText = [candidate.sourceChannel, candidate.primarySkills, candidate.secondarySkills, candidate.remarks].join(' ').toLowerCase()
  const searchableRequirementText = [requirement?.intake?.diversityFocus, requirement?.searchStrings?.diversitySourcing].join(' ').toLowerCase()
  return /diversity|diverse|underrepresented|women|female|veteran|disability|inclusive/.test(`${searchableCandidateText} ${searchableRequirementText}`)
}

export function Dashboard({ snapshot, user }: DashboardProps): JSX.Element {
  const [filters, setFilters] = useState<FilterState>({
    startDate: '',
    endDate: '',
    recruiter: '',
    sourcer: '',
    businessUnit: '',
    status: ''
  })

  const requirementsById = useMemo(() => new Map(snapshot.requirements.map((requirement) => [requirement.id, requirement])), [snapshot.requirements])

  const filterOptions = useMemo(() => {
    const recruiters = getUniqueOptions([
      ...snapshot.requirements.map((requirement) => requirement.recruiterOwner),
      ...snapshot.candidates.flatMap((candidate) => [candidate.recruiterName, candidate.assignedRecruiter])
    ])
    const sourcers = getUniqueOptions([
      ...snapshot.requirements.map((requirement) => requirement.assignedSourcer),
      ...snapshot.candidates.flatMap((candidate) => [candidate.sourcerName, candidate.assignedSourcer])
    ])
    const businessUnits = getUniqueOptions(snapshot.requirements.map((requirement) => requirement.businessUnit))

    return { recruiters, sourcers, businessUnits }
  }, [snapshot.candidates, snapshot.requirements])

  const filteredRequirements = useMemo(
    () =>
      snapshot.requirements.filter((requirement) => {
        const statusMatches = !filters.status || !isRequirementStatus(filters.status) || requirement.status === filters.status
        return (
          statusMatches &&
          (!filters.recruiter || requirement.recruiterOwner === filters.recruiter) &&
          (!filters.sourcer || requirement.assignedSourcer === filters.sourcer) &&
          (!filters.businessUnit || requirement.businessUnit === filters.businessUnit) &&
          requirementMatchesDateRange(requirement, filters.startDate, filters.endDate)
        )
      }),
    [filters, snapshot.requirements]
  )

  const filteredRequirementIds = useMemo(() => new Set(filteredRequirements.map((requirement) => requirement.id)), [filteredRequirements])

  const filteredCandidates = useMemo(
    () =>
      snapshot.candidates.filter((candidate) => {
        const requirement = getCandidateRequirement(candidate, requirementsById)
        const candidateStatusMatches = !filters.status || !isCandidateStatus(filters.status) || candidate.status === filters.status
        const requirementStatusMatches = !filters.status || !isRequirementStatus(filters.status) || requirement?.status === filters.status

        return (
          filteredRequirementIds.has(candidate.requirementId) &&
          candidateStatusMatches &&
          requirementStatusMatches &&
          (!filters.recruiter || candidate.recruiterName === filters.recruiter || candidate.assignedRecruiter === filters.recruiter) &&
          (!filters.sourcer || candidate.sourcerName === filters.sourcer || candidate.assignedSourcer === filters.sourcer) &&
          candidateMatchesDateRange(candidate, filters.startDate, filters.endDate)
        )
      }),
    [filteredRequirementIds, filters, requirementsById, snapshot.candidates]
  )

  const isAdmin = user.role === 'Admin'
  const openRoles = filteredRequirements.filter((requirement) => requirement.status === 'Open').length
  const closedRoles = filteredRequirements.filter((requirement) => requirement.status === 'Closed').length
  const offerDrops = filteredCandidates.filter((candidate) => candidate.status === 'Offer Dropped').length
  const diversityPipelineCount = filteredCandidates.filter((candidate) => hasDiversitySignal(candidate, requirementsById.get(candidate.requirementId))).length

  const cards = [
    { label: 'Total open roles', value: openRoles, accent: 'text-experian-blue' },
    { label: 'Total closed roles', value: closedRoles, accent: 'text-green-600' },
    { label: 'Profiles sourced', value: filteredCandidates.length, accent: 'text-experian-purple' },
    { label: 'Interviews scheduled', value: countCandidatesAtOrBeyond(filteredCandidates, interviewStatuses), accent: 'text-sky-600' },
    { label: 'Offers released', value: countCandidatesAtOrBeyond(filteredCandidates, offerStatuses), accent: 'text-amber-600' },
    { label: 'Offer drops', value: offerDrops, accent: 'text-red-600' },
    { label: 'Diversity pipeline count', value: diversityPipelineCount, accent: 'text-experian-magenta' },
    { label: 'Average days to close', value: snapshot.metrics.averageDaysToClose, accent: 'text-experian-ink' }
  ]

  const candidateFunnel = [
    { name: 'Profiles sourced', value: filteredCandidates.length, fill: '#5f259f' },
    { name: 'Contacted', value: filteredCandidates.filter((candidate) => conversionStatuses.includes(candidate.status)).length, fill: '#00a3e0' },
    { name: 'Interested', value: filteredCandidates.filter((candidate) => ['Interested', 'Screen Shortlisted', 'HM Shortlisted', ...interviewStatuses].includes(candidate.status)).length, fill: '#d0006f' },
    { name: 'Screen shortlisted', value: filteredCandidates.filter((candidate) => ['Screen Shortlisted', 'HM Shortlisted', ...interviewStatuses].includes(candidate.status)).length, fill: '#6366f1' },
    { name: 'Interviews scheduled', value: countCandidatesAtOrBeyond(filteredCandidates, interviewStatuses), fill: '#0ea5e9' },
    { name: 'Offers released', value: countCandidatesAtOrBeyond(filteredCandidates, offerStatuses), fill: '#f59e0b' },
    { name: 'Joined', value: filteredCandidates.filter((candidate) => candidate.status === 'Joined').length, fill: '#0f766e' }
  ]

  const statusDistribution = statusOrder
    .map((status) => ({ name: status, value: filteredCandidates.filter((candidate) => candidate.status === status).length }))
    .filter((item) => item.value > 0)

  const recruiterProductivity = buildProductivityRows(filterOptions.recruiters, filteredCandidates, filteredRequirements, 'recruiter')
  const sourcerProductivity = buildProductivityRows(filterOptions.sourcers, filteredCandidates, filteredRequirements, 'sourcer')

  const businessUnitStatus = filterOptions.businessUnits.map((businessUnit) => {
    const requirements = filteredRequirements.filter((requirement) => requirement.businessUnit === businessUnit)
    return {
      name: businessUnit,
      open: requirements.filter((requirement) => requirement.status === 'Open').length,
      closed: requirements.filter((requirement) => requirement.status === 'Closed').length,
      onHold: requirements.filter((requirement) => requirement.status === 'On Hold').length,
      cancelled: requirements.filter((requirement) => requirement.status === 'Cancelled').length
    }
  })

  const sourceConversion = Object.entries(
    filteredCandidates.reduce<Record<string, CandidateRecord[]>>((channels, candidate) => {
      const channel = candidate.sourceChannel || 'Unspecified'
      channels[channel] = [...(channels[channel] ?? []), candidate]
      return channels
    }, {})
  )
    .map(([name, candidates]) => ({
      name,
      profiles: candidates.length,
      contacted: candidates.filter((candidate) => conversionStatuses.includes(candidate.status)).length,
      offers: countCandidatesAtOrBeyond(candidates, offerStatuses),
      joined: candidates.filter((candidate) => candidate.status === 'Joined').length,
      conversion: candidates.length > 0 ? Math.round((candidates.filter((candidate) => candidate.status === 'Joined').length / candidates.length) * 100) : 0
    }))
    .sort((first, second) => second.profiles - first.profiles)

  const requirementAging = filteredRequirements
    .filter((requirement) => requirement.status === 'Open' || requirement.status === 'On Hold')
    .map((requirement) => ({
      name: formatRequirementLabel(requirement),
      days: daysBetween(requirement.createdAt),
      status: requirement.status,
      priority: requirement.priority
    }))
    .sort((first, second) => second.days - first.days)
    .slice(0, 10)

  const offerDropTrend = filteredCandidates
    .filter((candidate) => candidate.status === 'Offer Dropped')
    .reduce<Record<string, number>>((trend, candidate) => {
      const date = toDateInputValue(candidate.updatedAt || candidate.statusHistory[0]?.changedAt || '') || 'Unspecified'
      trend[date] = (trend[date] ?? 0) + 1
      return trend
    }, {})

  const offerDropTrendData = Object.entries(offerDropTrend)
    .map(([date, drops]) => ({ date, drops }))
    .sort((first, second) => first.date.localeCompare(second.date))

  const emptyChartMessage = 'No SQLite records match this dashboard slice yet.'

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-experian-magenta">{isAdmin ? 'Admin dashboard' : 'Recruiting dashboard'}</p>
            <h3 className="mt-1 text-2xl font-black text-experian-ink">Hiring command center</h3>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-experian-slate">
              Live dashboard from the local SQLite workspace with filters for date range, recruiter, sourcer, business unit, and role or candidate status.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              className="inline-flex items-center gap-2 rounded-2xl bg-experian-purple px-4 py-3 text-sm font-bold text-white transition hover:bg-experian-purple/90"
              onClick={() => exportDashboardMetrics({ ...snapshot, requirements: filteredRequirements, candidates: filteredCandidates }, cards)}
              type="button"
            >
              <Download size={16} /> Export metrics
            </button>
            <button
              className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold text-experian-slate transition hover:border-experian-magenta/40 hover:text-experian-magenta"
              onClick={() => setFilters({ startDate: '', endDate: '', recruiter: '', sourcer: '', businessUnit: '', status: '' })}
              type="button"
            >
              Reset filters
            </button>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4 xl:grid-cols-6">
          <label className="space-y-2 text-sm font-bold text-experian-slate">
            Date from
            <input className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-experian-ink outline-none focus:border-experian-blue" onChange={(event) => setFilters((current) => ({ ...current, startDate: event.target.value }))} type="date" value={filters.startDate} />
          </label>
          <label className="space-y-2 text-sm font-bold text-experian-slate">
            Date to
            <input className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-experian-ink outline-none focus:border-experian-blue" onChange={(event) => setFilters((current) => ({ ...current, endDate: event.target.value }))} type="date" value={filters.endDate} />
          </label>
          <label className="space-y-2 text-sm font-bold text-experian-slate">
            Recruiter
            <select className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-experian-ink outline-none focus:border-experian-blue" onChange={(event) => setFilters((current) => ({ ...current, recruiter: event.target.value }))} value={filters.recruiter}>
              <option value="">All recruiters</option>
              {filterOptions.recruiters.map((recruiter) => (
                <option key={recruiter} value={recruiter}>{recruiter}</option>
              ))}
            </select>
          </label>
          <label className="space-y-2 text-sm font-bold text-experian-slate">
            Sourcer
            <select className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-experian-ink outline-none focus:border-experian-blue" onChange={(event) => setFilters((current) => ({ ...current, sourcer: event.target.value }))} value={filters.sourcer}>
              <option value="">All sourcers</option>
              {filterOptions.sourcers.map((sourcer) => (
                <option key={sourcer} value={sourcer}>{sourcer}</option>
              ))}
            </select>
          </label>
          <label className="space-y-2 text-sm font-bold text-experian-slate">
            Business Unit
            <select className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-experian-ink outline-none focus:border-experian-blue" onChange={(event) => setFilters((current) => ({ ...current, businessUnit: event.target.value }))} value={filters.businessUnit}>
              <option value="">All BUs</option>
              {filterOptions.businessUnits.map((businessUnit) => (
                <option key={businessUnit} value={businessUnit}>{businessUnit}</option>
              ))}
            </select>
          </label>
          <label className="space-y-2 text-sm font-bold text-experian-slate">
            Status
            <select className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-experian-ink outline-none focus:border-experian-blue" onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))} value={filters.status}>
              <option value="">All statuses</option>
              <optgroup label="Role status">
                {requirementStatuses.map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </optgroup>
              <optgroup label="Candidate status">
                {statusOrder.map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </optgroup>
            </select>
          </label>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-5 xl:grid-cols-4">
        {cards.map((card) => (
          <article className="rounded-3xl bg-white p-5 shadow-sm" key={card.label}>
            <p className="text-sm font-semibold text-experian-slate">{card.label}</p>
            <p className={`mt-3 text-3xl font-black ${card.accent}`}>{card.value}</p>
          </article>
        ))}
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <article className="rounded-3xl bg-white p-6 shadow-sm">
          <h3 className="text-lg font-bold">Recruiter-wise productivity</h3>
          <p className="mb-6 mt-1 text-sm text-experian-slate">Profiles, interviews, offers, joins, and role ownership by recruiter.</p>
          <div className="h-80">
            {recruiterProductivity.some((row) => row.profiles > 0 || row.openRoles > 0 || row.closedRoles > 0) ? (
              <ResponsiveContainer>
                <BarChart data={recruiterProductivity} margin={{ bottom: 20, left: 0, right: 12, top: 10 }}>
                  <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" />
                  <XAxis dataKey="name" interval={0} tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="profiles" fill="#5f259f" name="Profiles" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="interviews" fill="#00a3e0" name="Interviews" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="offers" fill="#f59e0b" name="Offers" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="joins" fill="#16a34a" name="Joins" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center rounded-2xl bg-slate-50 text-sm font-semibold text-experian-slate">{emptyChartMessage}</div>
            )}
          </div>
        </article>

        <article className="rounded-3xl bg-white p-6 shadow-sm">
          <h3 className="text-lg font-bold">Sourcer-wise productivity</h3>
          <p className="mb-6 mt-1 text-sm text-experian-slate">Sourcing output and conversion progress by sourcer.</p>
          <div className="h-80">
            {sourcerProductivity.some((row) => row.profiles > 0 || row.openRoles > 0 || row.closedRoles > 0) ? (
              <ResponsiveContainer>
                <BarChart data={sourcerProductivity} margin={{ bottom: 20, left: 0, right: 12, top: 10 }}>
                  <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" />
                  <XAxis dataKey="name" interval={0} tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="profiles" fill="#5f259f" name="Profiles" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="interviews" fill="#00a3e0" name="Interviews" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="offers" fill="#f59e0b" name="Offers" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="joins" fill="#16a34a" name="Joins" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center rounded-2xl bg-slate-50 text-sm font-semibold text-experian-slate">{emptyChartMessage}</div>
            )}
          </div>
        </article>

        <article className="rounded-3xl bg-white p-6 shadow-sm">
          <h3 className="text-lg font-bold">BU-wise hiring status</h3>
          <p className="mb-6 mt-1 text-sm text-experian-slate">Open, on-hold, closed, and cancelled requirements by business unit.</p>
          <div className="h-80">
            {businessUnitStatus.some((row) => row.open > 0 || row.closed > 0 || row.onHold > 0 || row.cancelled > 0) ? (
              <ResponsiveContainer>
                <BarChart data={businessUnitStatus} margin={{ bottom: 20, left: 0, right: 12, top: 10 }}>
                  <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" />
                  <XAxis dataKey="name" interval={0} tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="open" stackId="roles" fill="#00a3e0" name="Open" />
                  <Bar dataKey="onHold" stackId="roles" fill="#f59e0b" name="On hold" />
                  <Bar dataKey="closed" stackId="roles" fill="#16a34a" name="Closed" />
                  <Bar dataKey="cancelled" stackId="roles" fill="#64748b" name="Cancelled" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center rounded-2xl bg-slate-50 text-sm font-semibold text-experian-slate">{emptyChartMessage}</div>
            )}
          </div>
        </article>

        <article className="rounded-3xl bg-white p-6 shadow-sm">
          <h3 className="text-lg font-bold">Requirement aging</h3>
          <p className="mb-6 mt-1 text-sm text-experian-slate">Oldest open and on-hold requirements by days since creation.</p>
          <div className="h-80">
            {requirementAging.length > 0 ? (
              <ResponsiveContainer>
                <BarChart data={requirementAging} layout="vertical" margin={{ bottom: 0, left: 12, right: 28, top: 10 }}>
                  <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" />
                  <XAxis allowDecimals={false} type="number" />
                  <YAxis dataKey="name" tick={{ fontSize: 12 }} type="category" width={150} />
                  <Tooltip />
                  <Bar dataKey="days" fill="#5f259f" name="Days open" radius={[0, 10, 10, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center rounded-2xl bg-slate-50 text-sm font-semibold text-experian-slate">{emptyChartMessage}</div>
            )}
          </div>
        </article>

        <article className="rounded-3xl bg-white p-6 shadow-sm">
          <h3 className="text-lg font-bold">Offer drops</h3>
          <p className="mb-6 mt-1 text-sm text-experian-slate">Dropped offers over time for the selected SQLite slice.</p>
          <div className="h-80">
            {offerDropTrendData.length > 0 ? (
              <ResponsiveContainer>
                <LineChart data={offerDropTrendData} margin={{ bottom: 20, left: 0, right: 12, top: 10 }}>
                  <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Line dataKey="drops" name="Offer drops" stroke="#ef4444" strokeWidth={3} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center rounded-2xl bg-slate-50 text-sm font-semibold text-experian-slate">No offer drops match this dashboard slice.</div>
            )}
          </div>
        </article>

        <article className="rounded-3xl bg-white p-6 shadow-sm">
          <h3 className="text-lg font-bold">Source-wise conversion</h3>
          <p className="mb-6 mt-1 text-sm text-experian-slate">Profiles, contacted candidates, offers, joins, and joined conversion percentage by source channel.</p>
          <div className="h-80">
            {sourceConversion.length > 0 ? (
              <ResponsiveContainer>
                <BarChart data={sourceConversion} margin={{ bottom: 20, left: 0, right: 12, top: 10 }}>
                  <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" />
                  <XAxis dataKey="name" interval={0} tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="profiles" fill="#5f259f" name="Profiles" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="contacted" fill="#00a3e0" name="Contacted+" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="offers" fill="#f59e0b" name="Offers+" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="joined" fill="#16a34a" name="Joined" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="conversion" fill="#d0006f" name="Joined %" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center rounded-2xl bg-slate-50 text-sm font-semibold text-experian-slate">{emptyChartMessage}</div>
            )}
          </div>
        </article>

        <article className="rounded-3xl bg-white p-6 shadow-sm">
          <h3 className="text-lg font-bold">Candidate funnel</h3>
          <p className="mb-6 mt-1 text-sm text-experian-slate">Stage progression for candidates available to {user.displayName}.</p>
          <div className="h-80">
            {filteredCandidates.length > 0 ? (
              <ResponsiveContainer>
                <FunnelChart>
                  <Tooltip />
                  <Funnel data={candidateFunnel} dataKey="value" isAnimationActive labelLine nameKey="name">
                    <LabelList dataKey="name" fill="#172033" position="right" />
                  </Funnel>
                </FunnelChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center rounded-2xl bg-slate-50 text-sm font-semibold text-experian-slate">{emptyChartMessage}</div>
            )}
          </div>
        </article>

        <article className="rounded-3xl bg-white p-6 shadow-sm">
          <h3 className="text-lg font-bold">Diversity pipeline and status mix</h3>
          <p className="mb-6 mt-1 text-sm text-experian-slate">Diversity-tagged candidates are counted when diversity signals are available in candidate or requirement data.</p>
          <div className="h-80">
            {statusDistribution.length > 0 ? (
              <ResponsiveContainer>
                <PieChart>
                  <Tooltip />
                  <Pie data={statusDistribution} dataKey="value" innerRadius={58} nameKey="name" outerRadius={108} paddingAngle={2}>
                    {statusDistribution.map((entry, index) => (
                      <Cell fill={chartColors[index % chartColors.length]} key={entry.name} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center rounded-2xl bg-slate-50 text-sm font-semibold text-experian-slate">{emptyChartMessage}</div>
            )}
          </div>
        </article>
      </section>
    </div>
  )
}
