import { useEffect, useMemo, useState } from 'react'
import { Layout } from './components/Layout'
import { Candidates } from './pages/Candidates'
import { Dashboard } from './pages/Dashboard'
import { Login } from './pages/Login'
import { Reports } from './pages/Reports'
import { Requirements } from './pages/Requirements'
import { SettingsPage } from './pages/Settings'
import type { AuthenticatedUser, PulseSnapshot } from '../shared/types'

export type PageKey = 'dashboard' | 'requirements' | 'candidates' | 'reports' | 'settings'

const fallbackSnapshot: PulseSnapshot = {
  requirements: [
    {
      id: 1,
      title: 'Quarterly access attestation',
      owner: 'Identity Governance',
      status: 'In Review',
      dueDate: '2026-06-15',
      businessUnit: 'Enterprise Risk',
      folderName: 'Enterprise Risk / Q2 Attestation',
      assignedRecruiter: 'recruiter',
      assignedSourcer: 'sourcer'
    },
    {
      id: 2,
      title: 'Vendor control evidence pack',
      owner: 'Third Party Risk',
      status: 'At Risk',
      dueDate: '2026-05-28',
      businessUnit: 'Procurement',
      folderName: 'Procurement / Vendor Controls',
      assignedRecruiter: 'recruiter',
      assignedSourcer: 'sourcer'
    }
  ],
  candidates: [
    {
      id: 1,
      name: 'Avery Johnson',
      requirementId: 1,
      requirementTitle: 'Quarterly access attestation',
      stage: 'Recruiter screen',
      updatedAt: '2026-05-07',
      assignedRecruiter: 'recruiter',
      assignedSourcer: 'sourcer'
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
    notificationsEnabled: true
  },
  metrics: {
    complianceScore: 92,
    openRequirements: 2,
    reportsGenerated: 1,
    riskItems: 1,
    activeCandidates: 1
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

  useEffect(() => {
    if (!currentUser) {
      return
    }

    window.experianPulse
      ?.getSnapshot(currentUser)
      .then(setSnapshot)
      .catch(() => setSnapshot(fallbackSnapshot))
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
        return <Requirements requirements={snapshot.requirements} user={currentUser} />
      case 'candidates':
        return <Candidates candidates={snapshot.candidates} requirements={snapshot.requirements} user={currentUser} />
      case 'reports':
        return <Reports reports={snapshot.reports} />
      case 'settings':
        return <SettingsPage settings={snapshot.settings} />
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
