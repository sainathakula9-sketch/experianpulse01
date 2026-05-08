import type { SettingsRecord } from '../../shared/types'

interface SettingsProps {
  settings: SettingsRecord
}

export function SettingsPage({ settings }: SettingsProps): JSX.Element {
  return (
    <section className="grid grid-cols-2 gap-6">
      <article className="rounded-3xl bg-white p-6 shadow-sm">
        <h3 className="text-xl font-bold">Workspace settings</h3>
        <p className="mt-1 text-sm text-experian-slate">Read-only mock settings stored in SQLite for the foundation build.</p>

        <div className="mt-6 space-y-4">
          <label className="block text-sm font-semibold text-experian-slate">
            Organization name
            <input className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-experian-ink" readOnly value={settings.organizationName} />
          </label>
          <label className="block text-sm font-semibold text-experian-slate">
            Data region
            <input className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-experian-ink" readOnly value={settings.dataRegion} />
          </label>
          <div className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3">
            <div>
              <p className="font-semibold">Notifications</p>
              <p className="text-sm text-experian-slate">Mock preference for desktop alerts.</p>
            </div>
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
              {settings.notificationsEnabled ? 'Enabled' : 'Disabled'}
            </span>
          </div>
        </div>
      </article>

      <article className="rounded-3xl border border-dashed border-experian-blue/40 bg-white/70 p-6">
        <h3 className="text-xl font-bold">Next milestones</h3>
        <ul className="mt-5 space-y-3 text-sm leading-6 text-experian-slate">
          <li>• Replace mock authentication with the selected identity provider.</li>
          <li>• Add editable requirements, workflow states, and audit history.</li>
          <li>• Implement XLSX import/export actions using the installed xlsx library.</li>
          <li>• Add packaging configuration for signed Windows distribution.</li>
        </ul>
      </article>
    </section>
  )
}
