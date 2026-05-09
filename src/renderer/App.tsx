import { useEffect, useMemo, useState } from 'react'
import { Layout } from './components/Layout'
import { AuditTrail } from './pages/AuditTrail'
import { AiAssistant } from './pages/AiAssistant'
import { Candidates } from './pages/Candidates'
import { Dashboard } from './pages/Dashboard'
import { Login } from './pages/Login'
import { Reports } from './pages/Reports'
import { Requirements } from './pages/Requirements'
import { SettingsPage } from './pages/Settings'
import type { AuthenticatedUser, PulseSnapshot } from '../shared/types'

export type PageKey = 'dashboard' | 'requirements' | 'candidates' | 'ai-assistant' | 'reports' | 'audit' | 'settings'

const pageKeys: PageKey[] = ['dashboard', 'requirements', 'candidates', 'ai-assistant', 'reports', 'audit', 'settings']

const pageRoles: Record<PageKey, AuthenticatedUser['role'][]> = {
  dashboard: ['Admin', 'Recruiter'],
  requirements: ['Admin', 'Recruiter', 'Sourcer'],
  candidates: ['Admin', 'Recruiter', 'Sourcer'],
  'ai-assistant': ['Admin', 'Recruiter', 'Sourcer'],
  reports: ['Admin'],
  audit: ['Admin'],
  settings: ['Admin']
}

function parseHashPage(): PageKey | undefined {
  const hashPage = window.location.hash.replace(/^#\/?/, '')
  return pageKeys.includes(hashPage as PageKey) ? (hashPage as PageKey) : undefined
}

function canUserOpenPage(user: AuthenticatedUser, page: PageKey): boolean {
  return pageRoles[page].includes(user.role)
}

const fallbackSnapshot: PulseSnapshot = {
  requirements: [
    {
      id: 1,
      reqId: 'REQ-2026-001',
      roleTitle: 'Senior Risk Analyst',
      businessUnit: 'Enterprise Risk',
      hiringManager: 'Priya Raman',
      grade: 'G7',
      location: 'Costa Mesa, CA',
      workMode: 'Hybrid',
      budgetRange: '$120k - $145k',
      priority: 'High',
      targetClosureDate: '2026-06-15',
      recruiterOwner: 'recruiter',
      assignedSourcer: 'sourcer',
      status: 'Open',
      createdAt: '2026-04-01T09:00:00.000Z',
      closedAt: ''
    },
    {
      id: 2,
      reqId: 'REQ-2026-002',
      roleTitle: 'Procurement Controls Lead',
      businessUnit: 'Procurement',
      hiringManager: 'Marcus Lee',
      grade: 'G6',
      location: 'Allen, TX',
      workMode: 'Remote',
      budgetRange: '$105k - $128k',
      priority: 'Critical',
      targetClosureDate: '2026-05-28',
      recruiterOwner: 'recruiter',
      assignedSourcer: 'sourcer',
      status: 'Open',
      createdAt: '2026-04-09T09:00:00.000Z',
      closedAt: ''
    }
  ],
  candidates: [
    {
      id: 1,
      name: 'Avery Johnson',
      requirementId: 1,
      requirementTitle: 'Senior Risk Analyst',
      currentCompany: 'TransUnion',
      currentTitle: 'Senior Risk Analyst',
      totalExperience: '8 years',
      relevantExperience: '6 years',
      location: 'Costa Mesa, CA',
      currentCtc: '$118k',
      expectedCtc: '$135k',
      noticePeriod: '30 days',
      servingNotice: false,
      lastWorkingDay: '',
      primarySkills: 'Risk analytics, SQL, governance',
      secondarySkills: 'Tableau, Python',
      sourceChannel: 'LinkedIn',
      linkedinUrl: 'https://linkedin.com/in/avery-johnson',
      githubUrl: '',
      resumeFilePath: 'resumes/avery-johnson.pdf',
      sourcerName: 'sourcer',
      recruiterName: 'recruiter',
      status: 'Screen Shortlisted',
      remarks: 'Strong risk controls background.',
      followUpDate: '2026-05-12',
      updatedAt: '2026-05-07',
      assignedRecruiter: 'recruiter',
      assignedSourcer: 'sourcer',
      statusHistory: [
        {
          id: 1,
          candidateId: 1,
          oldStatus: '',
          newStatus: 'Screen Shortlisted',
          changedByUser: 'recruiter',
          changedAt: '2026-05-07T09:00:00.000Z',
          notes: 'Initial status captured during pipeline setup.'
        }
      ],
      daysInCurrentStage: 2,
      totalDaysInPipeline: 2
    }
  ],
  reports: [
    {
      id: 1,
      name: 'Executive compliance summary',
      category: 'Leadership',
      updatedAt: '2026-05-06',
      owner: 'GRC Analytics'
    }
  ],
  settings: {
    organizationName: 'Experian Pulse Demo',
    dataRegion: 'United States',
    notificationsEnabled: true,
    defaultBackupFolder: '',
    oneDriveBackupFolder: '',
    localBackupFolder: '',
    lastBackupAt: '',
    lastBackupStatus: 'Never Run',
    lastBackupPath: '',
    backupFrequency: 'Daily',
    defaultCurrency: 'USD',
    defaultLocation: 'United States',
    users: [],
    sourceChannels: [],
    candidateStatuses: []
  },
  metrics: {
    complianceScore: 92,
    openRequirements: 2,
    reportsGenerated: 1,
    riskItems: 1,
    activeCandidates: 1,
    profilesSourced: 1,
    contacted: 1,
    interested: 1,
    screenShortlisted: 1,
    interviewsScheduled: 0,
    offersReleased: 0,
    offersAccepted: 0,
    joined: 0,
    offerDrops: 0,
    averageDaysToClose: 0
  }
}

function getDefaultPage(user: AuthenticatedUser): PageKey {
  if (user.role === 'Sourcer') {
    return 'requirements'
  }

  return 'dashboard'
}

function App(): JSX.Element {
  const [activePage, setActivePage] = useState<PageKey>(() => parseHashPage() ?? 'dashboard')
  const [snapshot, setSnapshot] = useState<PulseSnapshot>(fallbackSnapshot)
  const [currentUser, setCurrentUser] = useState<AuthenticatedUser | undefined>()
  const [isSnapshotLoading, setIsSnapshotLoading] = useState(false)
  const [snapshotError, setSnapshotError] = useState('')

  const refreshSnapshot = (): void => {
    if (!currentUser || !window.experianPulse) {
      return
    }

    setIsSnapshotLoading(true)
    setSnapshotError('')
    window.experianPulse
      .getSnapshot(currentUser)
      .then((nextSnapshot) => {
        setSnapshot(nextSnapshot)
      })
      .catch((error) => {
        setSnapshot(fallbackSnapshot)
        setSnapshotError(error instanceof Error ? error.message : 'Unable to load the local workspace. Showing safe demo data.')
      })
      .finally(() => setIsSnapshotLoading(false))
  }

  useEffect(() => {
    const handleHashChange = (): void => {
      const hashPage = parseHashPage()
      if (hashPage) {
        setActivePage(hashPage)
      }
    }

    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  useEffect(() => {
    if (!currentUser) {
      return
    }

    const nextPage = canUserOpenPage(currentUser, activePage) ? activePage : getDefaultPage(currentUser)
    if (nextPage !== activePage) {
      setActivePage(nextPage)
      return
    }

    if (window.location.hash !== `#/${nextPage}`) {
      window.location.hash = `/${nextPage}`
    }
  }, [activePage, currentUser])

  useEffect(() => {
    refreshSnapshot()
  }, [currentUser])

  const handleLogin = (user: AuthenticatedUser): void => {
    const hashPage = parseHashPage()
    const nextPage = hashPage && canUserOpenPage(user, hashPage) ? hashPage : getDefaultPage(user)
    setCurrentUser(user)
    setActivePage(nextPage)
    window.location.hash = `/${nextPage}`
  }

  const handleNavigate = (page: PageKey): void => {
    setActivePage(page)
    window.location.hash = `/${page}`
  }

  const handleLogout = (): void => {
    window.experianPulse?.logout().catch(() => undefined)
    setCurrentUser(undefined)
    setActivePage('dashboard')
    window.location.hash = ''
  }

  const page = useMemo(() => {
    if (!currentUser) {
      return <Login onLogin={handleLogin} />
    }

    switch (activePage) {
      case 'requirements':
        return <Requirements candidates={snapshot.candidates} onRequirementsChange={refreshSnapshot} requirements={snapshot.requirements} user={currentUser} />
      case 'candidates':
        return <Candidates candidates={snapshot.candidates} onCandidatesChange={refreshSnapshot} requirements={snapshot.requirements} settings={snapshot.settings} user={currentUser} />
      case 'ai-assistant':
        return <AiAssistant snapshot={snapshot} />
      case 'reports':
        return <Reports reports={snapshot.reports} />
      case 'audit':
        return <AuditTrail settings={snapshot.settings} />
      case 'settings':
        return <SettingsPage onSettingsChange={refreshSnapshot} settings={snapshot.settings} user={currentUser} />
      case 'dashboard':
      default:
        return <Dashboard snapshot={snapshot} user={currentUser} />
    }
  }, [activePage, currentUser, snapshot])

  if (!window.experianPulse) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-experian-mist px-4 py-6 text-experian-ink sm:px-8">
        <section className="max-w-xl rounded-3xl border border-rose-100 bg-white p-8 text-center shadow-enterprise">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-rose-500">Startup issue</p>
          <h1 className="mt-3 text-3xl font-black">Experian Pulse could not load its Electron bridge.</h1>
          <p className="mt-4 text-sm leading-6 text-experian-slate">Restart the desktop app so the preload script can connect React to the local SQLite workspace.</p>
        </section>
      </main>
    )
  }

  if (!currentUser) {
    return <main className="min-h-screen bg-experian-mist px-4 py-6 text-experian-ink sm:px-8">{page}</main>
  }

  return (
    <Layout activePage={activePage} currentUser={currentUser} onLogout={handleLogout} onNavigate={handleNavigate}>
      {isSnapshotLoading ? (
        <div className="mb-5 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-semibold text-experian-blue">Loading the latest SQLite workspace data…</div>
      ) : null}
      {snapshotError ? (
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
          <span>{snapshotError}</span>
          <button className="rounded-xl bg-white px-3 py-1 text-xs font-bold text-rose-700" onClick={refreshSnapshot} type="button">Retry</button>
        </div>
      ) : null}
      {page}
    </Layout>
  )
}

export default App
