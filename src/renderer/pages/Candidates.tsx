import { ClipboardCheck, PlusCircle } from 'lucide-react'
import type { AuthenticatedUser, CandidateRecord, RequirementRecord } from '../../shared/types'

interface CandidatesProps {
  candidates: CandidateRecord[]
  requirements: RequirementRecord[]
  user: AuthenticatedUser
}

export function Candidates({ candidates, requirements, user }: CandidatesProps): JSX.Element {
  const isSourcer = user.role === 'Sourcer'

  return (
    <section className="grid grid-cols-[1fr_380px] gap-6">
      <article className="rounded-3xl bg-white p-6 shadow-sm">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h3 className="text-xl font-bold">{isSourcer ? 'Candidate entry' : 'Candidates'}</h3>
            <p className="mt-1 text-sm text-experian-slate">
              {isSourcer
                ? 'Add candidates against the requirement folders assigned to your sourcing queue.'
                : 'Review candidates attached to your assigned requirements.'}
            </p>
          </div>
          <span className="rounded-full bg-experian-blue/10 px-3 py-1 text-xs font-bold text-experian-blue">
            {candidates.length} active
          </span>
        </div>

        {isSourcer ? (
          <form className="grid grid-cols-2 gap-4" onSubmit={(event) => event.preventDefault()}>
            <label className="block text-sm font-semibold text-experian-slate">
              Candidate name
              <input className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none ring-experian-blue/20 focus:ring-4" placeholder="Enter candidate name" />
            </label>
            <label className="block text-sm font-semibold text-experian-slate">
              Requirement folder
              <select className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none ring-experian-blue/20 focus:ring-4">
                {requirements.map((requirement) => (
                  <option key={requirement.id}>{requirement.reqId} · {requirement.roleTitle}</option>
                ))}
              </select>
            </label>
            <label className="col-span-2 block text-sm font-semibold text-experian-slate">
              Notes
              <textarea className="mt-2 min-h-28 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none ring-experian-blue/20 focus:ring-4" placeholder="Capture source, screening notes, and next action." />
            </label>
            <button className="col-span-2 inline-flex items-center justify-center gap-2 rounded-2xl bg-experian-purple px-5 py-3 font-bold text-white shadow-lg shadow-purple-200" type="submit">
              <PlusCircle size={18} /> Save candidate draft
            </button>
          </form>
        ) : (
          <div className="space-y-3">
            {candidates.map((candidate) => (
              <div className="rounded-2xl border border-slate-100 p-5 transition hover:border-experian-blue/40 hover:shadow-sm" key={candidate.id}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h4 className="font-bold">{candidate.name}</h4>
                    <p className="mt-1 text-sm text-experian-slate">{candidate.requirementTitle}</p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-experian-slate">{candidate.stage}</span>
                </div>
                <p className="mt-3 text-xs font-semibold uppercase tracking-[0.18em] text-experian-slate">Updated {candidate.updatedAt}</p>
              </div>
            ))}
          </div>
        )}
      </article>

      <article className="rounded-3xl bg-white p-6 shadow-sm">
        <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-experian-purple/10 text-experian-purple">
          <ClipboardCheck size={22} />
        </div>
        <h3 className="text-xl font-bold">Assigned requirement folders</h3>
        <p className="mt-1 text-sm text-experian-slate">Folders shown here are filtered by your local role assignment.</p>
        <div className="mt-5 space-y-3">
          {requirements.map((requirement) => (
            <div className="rounded-2xl border border-slate-100 p-4" key={requirement.id}>
              <p className="text-sm font-bold">{requirement.reqId} · {requirement.roleTitle}</p>
              <p className="mt-1 text-xs text-experian-slate">{requirement.businessUnit} · {requirement.hiringManager}</p>
            </div>
          ))}
        </div>
      </article>
    </section>
  )
}
