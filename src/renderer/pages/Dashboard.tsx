import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { complianceTrend, reportActivity } from '../data/mockData'
import type { AuthenticatedUser, PulseSnapshot } from '../../shared/types'

interface DashboardProps {
  snapshot: PulseSnapshot
  user: AuthenticatedUser
}

export function Dashboard({ snapshot, user }: DashboardProps): JSX.Element {
  const cards = [
    { label: 'Compliance score', value: `${snapshot.metrics.complianceScore}%`, accent: 'text-experian-purple' },
    { label: 'Open requirements', value: snapshot.metrics.openRequirements, accent: 'text-experian-blue' },
    { label: user.role === 'Admin' ? 'Reports generated' : 'Assigned candidates', value: user.role === 'Admin' ? snapshot.metrics.reportsGenerated : snapshot.metrics.activeCandidates, accent: 'text-experian-magenta' },
    { label: 'Risk items', value: snapshot.metrics.riskItems, accent: 'text-amber-600' }
  ]

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-4 gap-5">
        {cards.map((card) => (
          <article className="rounded-3xl bg-white p-6 shadow-sm" key={card.label}>
            <p className="text-sm font-semibold text-experian-slate">{card.label}</p>
            <p className={`mt-3 text-3xl font-black ${card.accent}`}>{card.value}</p>
          </article>
        ))}
      </section>

      <section className="grid grid-cols-2 gap-6">
        <article className="rounded-3xl bg-white p-6 shadow-sm">
          <h3 className="text-lg font-bold">Compliance trend</h3>
          <p className="mb-6 mt-1 text-sm text-experian-slate">Score progression for the current operating period, scoped to the signed-in role.</p>
          <div className="h-72">
            <ResponsiveContainer>
              <AreaChart data={complianceTrend}>
                <defs>
                  <linearGradient id="score" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="5%" stopColor="#5f259f" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#5f259f" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="month" />
                <YAxis domain={[80, 100]} />
                <Tooltip />
                <Area dataKey="score" fill="url(#score)" stroke="#5f259f" strokeWidth={3} type="monotone" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="rounded-3xl bg-white p-6 shadow-sm">
          <h3 className="text-lg font-bold">Report activity</h3>
          <p className="mb-6 mt-1 text-sm text-experian-slate">Mock report generation volume by weekday.</p>
          <div className="h-72">
            <ResponsiveContainer>
              <BarChart data={reportActivity}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="reports" fill="#00a3e0" radius={[10, 10, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>
      </section>
    </div>
  )
}
