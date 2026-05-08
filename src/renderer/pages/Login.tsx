import { LockKeyhole } from 'lucide-react'

export function Login(): JSX.Element {
  return (
    <section className="grid grid-cols-[1.05fr_0.95fr] gap-6">
      <div className="rounded-3xl bg-white p-8 shadow-sm">
        <div className="mb-8 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-experian-purple text-white">
          <LockKeyhole size={25} />
        </div>
        <p className="text-sm font-bold uppercase tracking-[0.25em] text-experian-magenta">Secure access</p>
        <h3 className="mt-3 text-3xl font-bold">Welcome to Experian Pulse</h3>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-experian-slate">
          This foundation screen uses mock authentication fields only. Identity provider and session management will be added in a later milestone.
        </p>

        <form className="mt-8 space-y-4">
          <label className="block text-sm font-semibold text-experian-slate">
            Work email
            <input className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none ring-experian-blue/20 focus:ring-4" placeholder="name@experian.com" />
          </label>
          <label className="block text-sm font-semibold text-experian-slate">
            Password
            <input className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none ring-experian-blue/20 focus:ring-4" placeholder="••••••••" type="password" />
          </label>
          <button className="w-full rounded-2xl bg-experian-purple px-5 py-3 font-bold text-white shadow-lg shadow-purple-200" type="button">
            Continue to dashboard
          </button>
        </form>
      </div>

      <div className="rounded-3xl bg-gradient-to-br from-experian-purple via-experian-magenta to-experian-blue p-8 text-white shadow-enterprise">
        <p className="text-sm font-bold uppercase tracking-[0.25em] text-white/70">Enterprise-ready shell</p>
        <h3 className="mt-4 text-3xl font-bold">Designed for governed workflows.</h3>
        <p className="mt-4 text-sm leading-6 text-white/80">
          Sidebar navigation, SQLite-backed mock data, charting, and Excel import/export libraries are in place for rapid iteration.
        </p>
      </div>
    </section>
  )
}
