import { Pie, PieChart, ResponsiveContainer, Tooltip, Cell } from 'recharts'
import type { ReportRecord } from '../../shared/types'
import { riskDistribution } from '../data/mockData'

interface ReportsProps {
  reports: ReportRecord[]
}

const colors = ['#5f259f', '#00a3e0', '#d7197d', '#94a3b8']

export function Reports({ reports }: ReportsProps): JSX.Element {
  return (
    <section className="grid grid-cols-[1fr_380px] gap-6">
      <article className="rounded-3xl bg-white p-6 shadow-sm">
        <h3 className="text-xl font-bold">Reports</h3>
        <p className="mt-1 text-sm text-experian-slate">Mock reporting inventory with xlsx dependency ready for import/export flows.</p>

        <div className="mt-6 space-y-3">
          {reports.map((report) => (
            <div className="rounded-2xl border border-slate-100 p-5 transition hover:border-experian-blue/40 hover:shadow-sm" key={report.id}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h4 className="font-bold">{report.name}</h4>
                  <p className="mt-1 text-sm text-experian-slate">{report.category} • Owned by {report.owner}</p>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-experian-slate">{report.updatedAt}</span>
              </div>
            </div>
          ))}
        </div>
      </article>

      <article className="rounded-3xl bg-white p-6 shadow-sm">
        <h3 className="text-xl font-bold">Requirement mix</h3>
        <p className="mt-1 text-sm text-experian-slate">Mock status distribution.</p>
        <div className="mt-5 h-72">
          <ResponsiveContainer>
            <PieChart>
              <Pie data={riskDistribution} dataKey="value" innerRadius={62} outerRadius={104} paddingAngle={4}>
                {riskDistribution.map((entry, index) => (
                  <Cell fill={colors[index % colors.length]} key={entry.name} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="grid gap-2">
          {riskDistribution.map((item, index) => (
            <div className="flex items-center justify-between text-sm" key={item.name}>
              <span className="flex items-center gap-2 text-experian-slate">
                <span className="h-3 w-3 rounded-full" style={{ background: colors[index] }} />
                {item.name}
              </span>
              <span className="font-bold">{item.value}%</span>
            </div>
          ))}
        </div>
      </article>
    </section>
  )
}
