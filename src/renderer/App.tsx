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
  const [activePage, setActivePage] = useState<PageKey>('dashboard')
  const [snapshot, setSnapshot] = useState<PulseSnapshot>(fallbackSnapshot)
  const [currentUser, setCurrentUser] = useState<AuthenticatedUser | undefined>()

  const refreshSnapshot = (): void => {
    if (!currentUser) {
      return
    }

    window.experianPulse
      ?.getSnapshot(currentUser)
      .then(setSnapshot)
      .catch(() => setSnapshot(fallbackSnapshot))
  }

  useEffect(() => {
    refreshSnapshot()
  }, [currentUser])

  const handleLogin = (user: AuthenticatedUser): void => {
    setCurrentUser(user)
    setActivePage(getDefaultPage(user))
  }

  const handleLogout = (): void => {
    window.experianPulse.logout().catch(() => undefined)
    setCurrentUser(undefined)
    setActivePage('dashboard')
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

  if (!currentUser) {
    return <main className="min-h-screen bg-experian-mist px-8 py-8 text-experian-ink">{page}</main>
  }

  return (
    <Layout activePage={activePage} currentUser={currentUser} onLogout={handleLogout} onNavigate={setActivePage}>
      {page}
    </Layout>
  )
}

export default App
