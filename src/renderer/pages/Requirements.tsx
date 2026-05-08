import { Download, Upload } from 'lucide-react'
import * as XLSX from 'xlsx'
import type { RequirementRecord } from '../../shared/types'

interface RequirementsProps {
  requirements: RequirementRecord[]
}

const statusStyles: Record<RequirementRecord['status'], string> = {
  Complete: 'bg-emerald-50 text-emerald-700',
  'In Review': 'bg-blue-50 text-blue-700',
  'At Risk': 'bg-amber-50 text-amber-700',
  Draft: 'bg-slate-100 text-slate-600'
}

export function Requirements({ requirements }: RequirementsProps): JSX.Element {
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
    <section className="rounded-3xl bg-white p-6 shadow-sm">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold">Requirements</h3>
          <p className="mt-1 text-sm text-experian-slate">Mock compliance requirements seeded through SQLite.</p>
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

      <div className="overflow-hidden rounded-2xl border border-slate-100">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-[0.18em] text-experian-slate">
            <tr>
              <th className="px-5 py-4">Requirement</th>
              <th className="px-5 py-4">Owner</th>
              <th className="px-5 py-4">Business unit</th>
              <th className="px-5 py-4">Due date</th>
              <th className="px-5 py-4">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {requirements.map((requirement) => (
              <tr className="hover:bg-slate-50" key={requirement.id}>
                <td className="px-5 py-4 font-semibold text-experian-ink">{requirement.title}</td>
                <td className="px-5 py-4 text-experian-slate">{requirement.owner}</td>
                <td className="px-5 py-4 text-experian-slate">{requirement.businessUnit}</td>
                <td className="px-5 py-4 text-experian-slate">{requirement.dueDate}</td>
                <td className="px-5 py-4">
                  <span className={`rounded-full px-3 py-1 text-xs font-bold ${statusStyles[requirement.status]}`}>{requirement.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
