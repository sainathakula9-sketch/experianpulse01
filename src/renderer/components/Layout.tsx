import { BarChart3, FileSpreadsheet, Gauge, LockKeyhole, Settings, ShieldCheck } from 'lucide-react'
import type { ReactNode } from 'react'
import type { PageKey } from '../App'

const navigation = [
  { key: 'login', label: 'Login', icon: LockKeyhole },
  { key: 'dashboard', label: 'Dashboard', icon: Gauge },
  { key: 'requirements', label: 'Requirements', icon: ShieldCheck },
  { key: 'reports', label: 'Reports', icon: BarChart3 },
  { key: 'settings', label: 'Settings', icon: Settings }
] as const

interface LayoutProps {
  activePage: PageKey
  children: ReactNode
  onNavigate: (page: PageKey) => void
}

export function Layout({ activePage, children, onNavigate }: LayoutProps): JSX.Element {
  return (
    <div className="flex min-h-screen bg-experian-mist text-experian-ink">
      <aside className="flex w-72 flex-col border-r border-white/70 bg-white/95 px-5 py-6 shadow-enterprise">
        <div className="mb-10 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-experian-purple via-experian-magenta to-experian-blue text-white shadow-lg">
            <FileSpreadsheet size={25} />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-experian-slate">Experian</p>
            <h1 className="text-xl font-bold">Pulse</h1>
          </div>
        </div>

        <nav className="space-y-2">
          {navigation.map(({ key, label, icon: Icon }) => {
            const selected = activePage === key
            return (
              <button
                key={key}
                className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-semibold transition ${
                  selected
                    ? 'bg-experian-purple text-white shadow-lg shadow-purple-200'
                    : 'text-experian-slate hover:bg-slate-100 hover:text-experian-ink'
                }`}
                onClick={() => onNavigate(key)}
                type="button"
              >
                <Icon size={19} />
                {label}
              </button>
            )
          })}
        </nav>

        <div className="mt-auto rounded-3xl bg-gradient-to-br from-experian-purple to-experian-blue p-5 text-white">
          <p className="text-sm font-semibold">Foundation build</p>
          <p className="mt-2 text-xs leading-5 text-white/80">
            Mock data, SQLite wiring, Excel-ready dependencies, and enterprise navigation are ready for feature work.
          </p>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto px-8 py-7">
        <header className="mb-7 flex items-center justify-between rounded-3xl bg-white px-6 py-5 shadow-sm">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-experian-magenta">Compliance workspace</p>
            <h2 className="mt-1 text-2xl font-bold">Experian Pulse command center</h2>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-right">
            <p className="text-xs font-semibold text-experian-slate">Environment</p>
            <p className="text-sm font-bold text-experian-ink">Local desktop</p>
          </div>
        </header>
        {children}
      </main>
    </div>
  )
}
