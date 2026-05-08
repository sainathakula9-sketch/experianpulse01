import { useEffect, useMemo, useState } from 'react'
import { Layout } from './components/Layout'
import { Dashboard } from './pages/Dashboard'
import { Login } from './pages/Login'
import { Reports } from './pages/Reports'
import { Requirements } from './pages/Requirements'
import { SettingsPage } from './pages/Settings'
import type { PulseSnapshot } from '../shared/types'

export type PageKey = 'login' | 'dashboard' | 'requirements' | 'reports' | 'settings'

const fallbackSnapshot: PulseSnapshot = {
  requirements: [
    {
      id: 1,
      title: 'Quarterly access attestation',
      owner: 'Identity Governance',
      status: 'In Review',
      dueDate: '2026-06-15',
      businessUnit: 'Enterprise Risk'
    },
    {
      id: 2,
      title: 'Vendor control evidence pack',
      owner: 'Third Party Risk',
      status: 'At Risk',
      dueDate: '2026-05-28',
      businessUnit: 'Procurement'
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
    riskItems: 1
  }
}

function App(): JSX.Element {
  const [activePage, setActivePage] = useState<PageKey>('dashboard')
  const [snapshot, setSnapshot] = useState<PulseSnapshot>(fallbackSnapshot)

  useEffect(() => {
    window.experianPulse
      ?.getSnapshot()
      .then(setSnapshot)
      .catch(() => setSnapshot(fallbackSnapshot))
  }, [])

  const page = useMemo(() => {
    switch (activePage) {
      case 'login':
        return <Login />
      case 'requirements':
        return <Requirements requirements={snapshot.requirements} />
      case 'reports':
        return <Reports reports={snapshot.reports} />
      case 'settings':
        return <SettingsPage settings={snapshot.settings} />
      case 'dashboard':
      default:
        return <Dashboard snapshot={snapshot} />
    }
  }, [activePage, snapshot])

  return (
    <Layout activePage={activePage} onNavigate={setActivePage}>
      {page}
    </Layout>
  )
}

export default App
