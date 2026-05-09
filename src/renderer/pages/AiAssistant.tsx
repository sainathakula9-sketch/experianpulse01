import { Bot, ClipboardCopy, Mail, Search, Sparkles, TrendingDown, Users, WandSparkles } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { AiAssistantAction, AiAssistantResult } from '../services/aiAssistant'
import { aiAssistantProvider } from '../services/aiAssistant'
import type { PulseSnapshot } from '../../shared/types'

interface AiAssistantProps {
  snapshot: PulseSnapshot
}

const actions: Array<{ action: AiAssistantAction; label: string; description: string; icon: typeof Sparkles }> = [
  {
    action: 'intake-summary',
    label: 'Generate intake summary',
    description: 'Summarize selected requirement intake, must-have skills, and selling points.',
    icon: ClipboardCopy
  },
  {
    action: 'hiring-manager-update-email',
    label: 'Generate hiring manager update email',
    description: 'Draft a concise pipeline email using local requirement and candidate data.',
    icon: Mail
  },
  {
    action: 'candidate-fitment-summary',
    label: 'Generate candidate fitment summary',
    description: 'Create a rule-based candidate fitment snapshot against the selected role.',
    icon: Users
  },
  {
    action: 'search-strings',
    label: 'Generate search strings',
    description: 'Build placeholder Boolean, X-Ray, GitHub, and diversity sourcing strings.',
    icon: Search
  },
  {
    action: 'weekly-recruitment-report',
    label: 'Generate weekly recruitment report',
    description: 'Turn current workspace metrics into an executive weekly report outline.',
    icon: Sparkles
  },
  {
    action: 'offer-drop-analysis',
    label: 'Analyze offer drops',
    description: 'Summarize offer drop volume and local risk themes to validate.',
    icon: TrendingDown
  }
]

function formatGeneratedAt(value: string): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

export function AiAssistant({ snapshot }: AiAssistantProps): JSX.Element {
  const [selectedRequirementId, setSelectedRequirementId] = useState<number>(snapshot.requirements[0]?.id ?? 0)
  const [selectedCandidateId, setSelectedCandidateId] = useState<number>(snapshot.candidates[0]?.id ?? 0)
  const [result, setResult] = useState<AiAssistantResult | undefined>()
  const [isGenerating, setIsGenerating] = useState<AiAssistantAction | undefined>()

  const selectedRequirement = useMemo(
    () => snapshot.requirements.find((requirement) => requirement.id === selectedRequirementId) ?? snapshot.requirements[0],
    [selectedRequirementId, snapshot.requirements]
  )

  const selectedCandidate = useMemo(
    () => snapshot.candidates.find((candidate) => candidate.id === selectedCandidateId) ?? snapshot.candidates[0],
    [selectedCandidateId, snapshot.candidates]
  )

  const requirementCandidates = useMemo(
    () => (selectedRequirement ? snapshot.candidates.filter((candidate) => candidate.requirementId === selectedRequirement.id) : snapshot.candidates),
    [selectedRequirement, snapshot.candidates]
  )

  const handleGenerate = async (action: AiAssistantAction): Promise<void> => {
    setIsGenerating(action)
    const nextResult = await aiAssistantProvider.generate({
      action,
      requirement: selectedRequirement,
      candidate: selectedCandidate,
      snapshot
    })
    setResult(nextResult)
    setIsGenerating(undefined)
  }

  const handleCopy = (): void => {
    if (!result) {
      return
    }

    navigator.clipboard?.writeText(result.content).catch(() => undefined)
  }

  return (
    <section className="grid grid-cols-[minmax(0,1fr)_420px] gap-6">
      <article className="rounded-3xl bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-experian-magenta">AI Assistant</p>
            <h3 className="mt-1 text-2xl font-bold">Placeholder generation workspace</h3>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-experian-slate">
              These actions use local rule-based output only. The provider interface is isolated so OpenAI or Claude can be connected later without changing the page workflow.
            </p>
          </div>
          <div className="rounded-2xl bg-purple-50 p-3 text-experian-purple">
            <Bot size={28} />
          </div>
        </div>

        <div className="mt-6 grid gap-4 rounded-3xl border border-slate-100 bg-slate-50 p-5 md:grid-cols-2">
          <label className="text-sm font-semibold text-experian-slate">
            Requirement context
            <select
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-experian-ink outline-none transition focus:border-experian-purple"
              onChange={(event) => setSelectedRequirementId(Number(event.target.value))}
              value={selectedRequirement?.id ?? 0}
            >
              {snapshot.requirements.length === 0 ? <option value={0}>No requirements available</option> : null}
              {snapshot.requirements.map((requirement) => (
                <option key={requirement.id} value={requirement.id}>
                  {requirement.reqId} - {requirement.roleTitle}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm font-semibold text-experian-slate">
            Candidate context
            <select
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-experian-ink outline-none transition focus:border-experian-purple"
              onChange={(event) => setSelectedCandidateId(Number(event.target.value))}
              value={selectedCandidate?.id ?? 0}
            >
              {snapshot.candidates.length === 0 ? <option value={0}>No candidates available</option> : null}
              {snapshot.candidates.map((candidate) => (
                <option key={candidate.id} value={candidate.id}>
                  {candidate.name} - {candidate.status}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {actions.map(({ action, description, icon: Icon, label }) => (
            <button
              className="group rounded-3xl border border-slate-100 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-experian-purple/40 hover:shadow-enterprise disabled:cursor-wait disabled:opacity-70"
              disabled={Boolean(isGenerating)}
              key={action}
              onClick={() => void handleGenerate(action)}
              type="button"
            >
              <span className="flex items-start gap-4">
                <span className="rounded-2xl bg-experian-mist p-3 text-experian-purple transition group-hover:bg-experian-purple group-hover:text-white">
                  <Icon size={22} />
                </span>
                <span>
                  <span className="block font-bold text-experian-ink">{isGenerating === action ? 'Generating placeholder...' : label}</span>
                  <span className="mt-1 block text-sm leading-6 text-experian-slate">{description}</span>
                </span>
              </span>
            </button>
          ))}
        </div>
      </article>

      <aside className="space-y-6">
        <article className="rounded-3xl bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-experian-purple p-3 text-white">
              <WandSparkles size={22} />
            </div>
            <div>
              <h3 className="text-lg font-bold">Generated output</h3>
              <p className="text-sm text-experian-slate">Provider: {result?.provider ?? aiAssistantProvider.label}</p>
            </div>
          </div>

          {result ? (
            <div className="mt-5">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <h4 className="font-bold">{result.title}</h4>
                  <p className="text-xs font-semibold text-experian-slate">{formatGeneratedAt(result.generatedAt)}</p>
                </div>
                <button
                  className="rounded-full border border-slate-200 px-3 py-1 text-xs font-bold text-experian-slate transition hover:border-experian-magenta/40 hover:text-experian-magenta"
                  onClick={handleCopy}
                  type="button"
                >
                  Copy
                </button>
              </div>
              <pre className="max-h-[520px] whitespace-pre-wrap rounded-2xl bg-slate-950 p-4 text-sm leading-6 text-slate-100 shadow-inner">{result.content}</pre>
            </div>
          ) : (
            <div className="mt-5 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 text-sm leading-6 text-experian-slate">
              Select a context and click one of the assistant actions to generate a local placeholder response. No external AI API calls are made.
            </div>
          )}
        </article>

        <article className="rounded-3xl bg-gradient-to-br from-experian-purple to-experian-blue p-6 text-white shadow-enterprise">
          <h3 className="text-lg font-bold">Current context</h3>
          <div className="mt-4 space-y-3 text-sm leading-6 text-white/85">
            <p>
              <span className="font-bold text-white">Requirement:</span> {selectedRequirement?.roleTitle ?? 'None selected'}
            </p>
            <p>
              <span className="font-bold text-white">Candidate:</span> {selectedCandidate?.name ?? 'None selected'}
            </p>
            <p>
              <span className="font-bold text-white">Profiles for selected role:</span> {requirementCandidates.length}
            </p>
            <p>
              <span className="font-bold text-white">Offer drops:</span> {snapshot.metrics.offerDrops}
            </p>
          </div>
        </article>
      </aside>
    </section>
  )
}
