import { useEffect, useMemo, useState } from 'react'
import { Filter, RefreshCw, ShieldCheck } from 'lucide-react'
import type { AuditActionType, AuditTrailFilters, AuditTrailRecord, SettingsRecord } from '../../shared/types'

interface AuditTrailProps {
  settings: SettingsRecord
}

const actionTypes: AuditActionType[] = [
  'User Login',
  'Requirement Created',
  'Requirement Updated',
  'Requirement Deleted',
  'Intake Updated',
  'Candidate Created',
  'Candidate Updated',
  'Candidate Deleted',
  'Candidate Status Changed',
  'Excel Export',
  'Excel Import',
  'Backup Created',
  'Restore Performed'
]

function formatDateTime(value: string): string {
  if (!value) {
    return '—'
  }

  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

function parseDetails(details: string): string {
  if (!details) {
    return '—'
  }

  try {
    const parsed = JSON.parse(details) as Record<string, unknown>
    return Object.entries(parsed)
      .filter(([, value]) => value !== undefined && value !== null && String(value).trim() !== '')
      .map(([key, value]) => `${key}: ${String(value)}`)
      .join(' · ') || '—'
  } catch {
    return details
  }
}

export function AuditTrail({ settings }: AuditTrailProps): JSX.Element {
  const [filters, setFilters] = useState<AuditTrailFilters>({ user: '', actionType: '', startDate: '', endDate: '' })
  const [records, setRecords] = useState<AuditTrailRecord[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | undefined>()

  const users = useMemo(() => settings.users.map((user) => user.username), [settings.users])

  const loadAuditTrail = (): void => {
    setIsLoading(true)
    setError(undefined)
    window.experianPulse
      .getAuditTrail(filters)
      .then(setRecords)
      .catch((loadError) => setError(loadError instanceof Error ? loadError.message : 'Unable to load audit trail.'))
      .finally(() => setIsLoading(false))
  }

  useEffect(() => {
    loadAuditTrail()
  }, [])

  const updateFilter = <Key extends keyof AuditTrailFilters>(key: Key, value: AuditTrailFilters[Key]): void => {
    setFilters((currentFilters) => ({ ...currentFilters, [key]: value }))
  }

  return (
    <section className="space-y-6">
      <article className="rounded-3xl bg-white p-6 shadow-sm">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-experian-magenta">Admin controls</p>
            <h3 className="mt-1 text-2xl font-black text-experian-ink">Audit trail</h3>
            <p className="mt-2 text-sm text-experian-slate">Review important system actions with user, action type, and date range filters.</p>
          </div>
          <div className="rounded-2xl bg-experian-purple/10 p-3 text-experian-purple">
            <ShieldCheck size={26} />
          </div>
        </div>

        <div className="grid gap-3 rounded-3xl bg-slate-50 p-4 lg:grid-cols-[1fr_1fr_1fr_1fr_auto]">
          <label className="text-xs font-bold uppercase tracking-[0.12em] text-experian-slate">
            User
            <select className="mt-2 w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm font-semibold normal-case tracking-normal text-experian-ink outline-none" onChange={(event) => updateFilter('user', event.target.value)} value={filters.user ?? ''}>
              <option value="">All users</option>
              <option value="system">System</option>
              {users.map((username) => <option key={username} value={username}>{username}</option>)}
            </select>
          </label>
          <label className="text-xs font-bold uppercase tracking-[0.12em] text-experian-slate">
            Action type
            <select className="mt-2 w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm font-semibold normal-case tracking-normal text-experian-ink outline-none" onChange={(event) => updateFilter('actionType', event.target.value as AuditActionType | '')} value={filters.actionType ?? ''}>
              <option value="">All actions</option>
              {actionTypes.map((actionType) => <option key={actionType} value={actionType}>{actionType}</option>)}
            </select>
          </label>
          <label className="text-xs font-bold uppercase tracking-[0.12em] text-experian-slate">
            Start date
            <input className="mt-2 w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm font-semibold normal-case tracking-normal text-experian-ink outline-none" onChange={(event) => updateFilter('startDate', event.target.value)} type="date" value={filters.startDate ?? ''} />
          </label>
          <label className="text-xs font-bold uppercase tracking-[0.12em] text-experian-slate">
            End date
            <input className="mt-2 w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm font-semibold normal-case tracking-normal text-experian-ink outline-none" onChange={(event) => updateFilter('endDate', event.target.value)} type="date" value={filters.endDate ?? ''} />
          </label>
          <button className="inline-flex items-center justify-center gap-2 rounded-2xl bg-experian-purple px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60" disabled={isLoading} onClick={loadAuditTrail} type="button">
            {isLoading ? <RefreshCw className="animate-spin" size={16} /> : <Filter size={16} />}
            Apply
          </button>
        </div>
      </article>

      <article className="overflow-hidden rounded-3xl bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h4 className="text-lg font-black text-experian-ink">Recent activity</h4>
          <span className="rounded-full bg-experian-blue/10 px-3 py-1 text-xs font-bold text-experian-blue">{records.length} events</span>
        </div>
        {error && <p className="m-6 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error}</p>}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-[0.12em] text-experian-slate">
              <tr>
                <th className="px-5 py-3">Date</th>
                <th className="px-5 py-3">User</th>
                <th className="px-5 py-3">Action</th>
                <th className="px-5 py-3">Entity</th>
                <th className="px-5 py-3">Summary</th>
                <th className="px-5 py-3">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {records.map((record) => (
                <tr className="align-top" key={record.id}>
                  <td className="whitespace-nowrap px-5 py-4 font-semibold text-experian-ink">{formatDateTime(record.createdAt)}</td>
                  <td className="px-5 py-4">
                    <p className="font-bold text-experian-ink">{record.userDisplayName}</p>
                    <p className="text-xs font-semibold text-experian-slate">{record.username}</p>
                  </td>
                  <td className="px-5 py-4"><span className="rounded-full bg-experian-purple/10 px-3 py-1 text-xs font-bold text-experian-purple">{record.actionType}</span></td>
                  <td className="px-5 py-4 font-semibold text-experian-slate">{record.entityType || '—'} {record.entityId ? `#${record.entityId}` : ''}</td>
                  <td className="px-5 py-4 font-semibold text-experian-ink">{record.summary}</td>
                  <td className="px-5 py-4 text-xs font-medium leading-5 text-experian-slate">{parseDetails(record.details)}</td>
                </tr>
              ))}
              {!isLoading && records.length === 0 && (
                <tr>
                  <td className="px-5 py-10 text-center font-semibold text-experian-slate" colSpan={6}>No audit events match the selected filters.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </article>
    </section>
  )
}
