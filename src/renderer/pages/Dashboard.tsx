import { Bar, BarChart, CartesianGrid, Cell, Funnel, FunnelChart, LabelList, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { AuthenticatedUser, CandidateStatus, PulseSnapshot, RequirementRecord } from '../../shared/types'

interface DashboardProps {
  snapshot: PulseSnapshot
  user: AuthenticatedUser
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

export function Dashboard({ snapshot, user }: DashboardProps): JSX.Element {
  const metrics = snapshot.metrics
  const cards = [
    { label: 'Open requirements', value: metrics.openRequirements, accent: 'text-experian-blue' },
    { label: 'Profiles sourced', value: metrics.profilesSourced, accent: 'text-experian-purple' },
    { label: 'Contacted', value: metrics.contacted, accent: 'text-experian-magenta' },
    { label: 'Interested', value: metrics.interested, accent: 'text-emerald-600' },
    { label: 'Screen shortlisted', value: metrics.screenShortlisted, accent: 'text-indigo-600' },
    { label: 'Interviews scheduled', value: metrics.interviewsScheduled, accent: 'text-sky-600' },
    { label: 'Offers released', value: metrics.offersReleased, accent: 'text-amber-600' },
    { label: 'Offers accepted', value: metrics.offersAccepted, accent: 'text-green-600' },
    { label: 'Joined', value: metrics.joined, accent: 'text-teal-600' },
    { label: 'Offer drops', value: metrics.offerDrops, accent: 'text-red-600' },
    { label: 'Average days to close', value: metrics.averageDaysToClose, accent: 'text-experian-ink' }
  ]

  const candidateFunnel = [
    { name: 'Profiles sourced', value: metrics.profilesSourced, fill: '#5f259f' },
    { name: 'Contacted', value: metrics.contacted, fill: '#00a3e0' },
    { name: 'Interested', value: metrics.interested, fill: '#d0006f' },
    { name: 'Screen shortlisted', value: metrics.screenShortlisted, fill: '#6366f1' },
    { name: 'Interviews scheduled', value: metrics.interviewsScheduled, fill: '#0ea5e9' },
    { name: 'Offers released', value: metrics.offersReleased, fill: '#f59e0b' },
    { name: 'Offers accepted', value: metrics.offersAccepted, fill: '#16a34a' },
    { name: 'Joined', value: metrics.joined, fill: '#0f766e' }
  ]

  const statusDistribution = statusOrder
    .map((status) => ({ name: status, value: snapshot.candidates.filter((candidate) => candidate.status === status).length }))
    .filter((item) => item.value > 0)

  const sourceChannels = Object.entries(
    snapshot.candidates.reduce<Record<string, number>>((channels, candidate) => {
      const channel = candidate.sourceChannel || 'Unspecified'
      channels[channel] = (channels[channel] ?? 0) + 1
      return channels
    }, {})
  )
    .map(([name, value]) => ({ name, value }))
    .sort((first, second) => second.value - first.value)

  const requirementAging = snapshot.requirements
    .filter((requirement) => requirement.status === 'Open' || requirement.status === 'On Hold')
    .map((requirement) => ({
      name: formatRequirementLabel(requirement),
      days: daysBetween(requirement.createdAt),
      status: requirement.status,
      priority: requirement.priority
    }))
    .sort((first, second) => second.days - first.days)
    .slice(0, 8)

  const emptyChartMessage = 'No SQLite records match this dashboard slice yet.'

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-4 gap-5 xl:grid-cols-6">
        {cards.map((card) => (
          <article className="rounded-3xl bg-white p-5 shadow-sm" key={card.label}>
            <p className="text-sm font-semibold text-experian-slate">{card.label}</p>
            <p className={`mt-3 text-3xl font-black ${card.accent}`}>{card.value}</p>
          </article>
        ))}
      </section>

      <section className="grid grid-cols-2 gap-6">
        <article className="rounded-3xl bg-white p-6 shadow-sm">
          <h3 className="text-lg font-bold">Candidate funnel chart</h3>
          <p className="mb-6 mt-1 text-sm text-experian-slate">Stage progression for candidates available to {user.displayName} from the local SQLite workspace.</p>
          <div className="h-80">
            {metrics.profilesSourced > 0 ? (
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
          <h3 className="text-lg font-bold">Status distribution chart</h3>
          <p className="mb-6 mt-1 text-sm text-experian-slate">Current candidate status mix from SQLite candidate records.</p>
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

        <article className="rounded-3xl bg-white p-6 shadow-sm">
          <h3 className="text-lg font-bold">Source channel chart</h3>
          <p className="mb-6 mt-1 text-sm text-experian-slate">Candidate sourcing volume by channel.</p>
          <div className="h-80">
            {sourceChannels.length > 0 ? (
              <ResponsiveContainer>
                <BarChart data={sourceChannels} margin={{ bottom: 20, left: 0, right: 12, top: 10 }}>
                  <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" />
                  <XAxis dataKey="name" interval={0} tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#00a3e0" name="Candidates" radius={[10, 10, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center rounded-2xl bg-slate-50 text-sm font-semibold text-experian-slate">{emptyChartMessage}</div>
            )}
          </div>
        </article>

        <article className="rounded-3xl bg-white p-6 shadow-sm">
          <h3 className="text-lg font-bold">Requirement aging chart</h3>
          <p className="mb-6 mt-1 text-sm text-experian-slate">Open and on-hold requirements ranked by days since creation.</p>
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
      </section>
    </div>
  )
}
