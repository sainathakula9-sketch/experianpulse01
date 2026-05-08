import Database from 'better-sqlite3'
import { app } from 'electron'
import type { PulseSnapshot, ReportRecord, RequirementRecord } from '../shared/types'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'

let db: Database.Database | undefined

const mockRequirements: Omit<RequirementRecord, 'id'>[] = [
  {
    title: 'Quarterly access attestation',
    owner: 'Identity Governance',
    status: 'In Review',
    dueDate: '2026-06-15',
    businessUnit: 'Enterprise Risk'
  },
  {
    title: 'Vendor control evidence pack',
    owner: 'Third Party Risk',
    status: 'At Risk',
    dueDate: '2026-05-28',
    businessUnit: 'Procurement'
  },
  {
    title: 'Customer data retention review',
    owner: 'Data Protection Office',
    status: 'Complete',
    dueDate: '2026-05-03',
    businessUnit: 'Consumer Services'
  },
  {
    title: 'Incident response tabletop plan',
    owner: 'Cyber Resilience',
    status: 'Draft',
    dueDate: '2026-07-02',
    businessUnit: 'Security Operations'
  }
]

const mockReports: Omit<ReportRecord, 'id'>[] = [
  {
    name: 'Executive compliance summary',
    category: 'Leadership',
    updatedAt: '2026-05-06',
    owner: 'GRC Analytics'
  },
  {
    name: 'Control exceptions by business unit',
    category: 'Risk',
    updatedAt: '2026-05-04',
    owner: 'Enterprise Risk'
  },
  {
    name: 'Monthly evidence tracker',
    category: 'Operations',
    updatedAt: '2026-05-01',
    owner: 'Compliance Operations'
  }
]

function getDatabasePath(): string {
  const dataDirectory = join(app.getPath('userData'), 'data')
  mkdirSync(dataDirectory, { recursive: true })
  return join(dataDirectory, 'experian-pulse.sqlite')
}

export function connectDatabase(): Database.Database {
  if (db) {
    return db
  }

  db = new Database(getDatabasePath())
  db.pragma('journal_mode = WAL')
  initialiseSchema(db)
  seedMockData(db)
  return db
}

function initialiseSchema(database: Database.Database): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS requirements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      owner TEXT NOT NULL,
      status TEXT NOT NULL,
      dueDate TEXT NOT NULL,
      businessUnit TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      owner TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      organizationName TEXT NOT NULL,
      dataRegion TEXT NOT NULL,
      notificationsEnabled INTEGER NOT NULL DEFAULT 1
    );
  `)
}

function seedMockData(database: Database.Database): void {
  const requirementCount = database.prepare('SELECT COUNT(*) as count FROM requirements').get() as { count: number }
  if (requirementCount.count === 0) {
    const insertRequirement = database.prepare(`
      INSERT INTO requirements (title, owner, status, dueDate, businessUnit)
      VALUES (@title, @owner, @status, @dueDate, @businessUnit)
    `)
    const insertMany = database.transaction((requirements: typeof mockRequirements) => {
      requirements.forEach((requirement) => insertRequirement.run(requirement))
    })
    insertMany(mockRequirements)
  }

  const reportCount = database.prepare('SELECT COUNT(*) as count FROM reports').get() as { count: number }
  if (reportCount.count === 0) {
    const insertReport = database.prepare(`
      INSERT INTO reports (name, category, updatedAt, owner)
      VALUES (@name, @category, @updatedAt, @owner)
    `)
    const insertMany = database.transaction((reports: typeof mockReports) => {
      reports.forEach((report) => insertReport.run(report))
    })
    insertMany(mockReports)
  }

  database
    .prepare(
      `INSERT OR IGNORE INTO settings (id, organizationName, dataRegion, notificationsEnabled)
       VALUES (1, 'Experian Pulse Demo', 'United States', 1)`
    )
    .run()
}

export function getPulseSnapshot(): PulseSnapshot {
  const database = connectDatabase()
  const requirements = database.prepare('SELECT * FROM requirements ORDER BY dueDate ASC').all() as RequirementRecord[]
  const reports = database.prepare('SELECT * FROM reports ORDER BY updatedAt DESC').all() as ReportRecord[]
  const settingsRow = database.prepare('SELECT * FROM settings WHERE id = 1').get() as {
    organizationName: string
    dataRegion: string
    notificationsEnabled: number
  }

  const openRequirements = requirements.filter((item) => item.status !== 'Complete').length
  const riskItems = requirements.filter((item) => item.status === 'At Risk').length

  return {
    requirements,
    reports,
    settings: {
      organizationName: settingsRow.organizationName,
      dataRegion: settingsRow.dataRegion,
      notificationsEnabled: Boolean(settingsRow.notificationsEnabled)
    },
    metrics: {
      complianceScore: 92,
      openRequirements,
      reportsGenerated: reports.length,
      riskItems
    }
  }
}

export function closeDatabase(): void {
  db?.close()
  db = undefined
}
