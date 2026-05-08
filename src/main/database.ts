import Database from 'better-sqlite3'
import { app } from 'electron'
import type { AuthenticatedUser, CandidateRecord, LoginResult, PulseSnapshot, ReportRecord, RequirementRecord, UserRole } from '../shared/types'
import { createHash } from 'node:crypto'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'

let db: Database.Database | undefined

const passwordSalt = 'experian-pulse-local-auth'

const defaultUsers: Array<{ username: string; password: string; role: UserRole; displayName: string }> = [
  { username: 'admin', password: 'admin123', role: 'Admin', displayName: 'Pulse Admin' },
  { username: 'recruiter', password: 'recruiter123', role: 'Recruiter', displayName: 'Recruiter User' },
  { username: 'sourcer', password: 'sourcer123', role: 'Sourcer', displayName: 'Sourcer User' }
]

const mockRequirements: Omit<RequirementRecord, 'id'>[] = [
  {
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
    title: 'Vendor control evidence pack',
    owner: 'Third Party Risk',
    status: 'At Risk',
    dueDate: '2026-05-28',
    businessUnit: 'Procurement',
    folderName: 'Procurement / Vendor Controls',
    assignedRecruiter: 'recruiter',
    assignedSourcer: 'sourcer'
  },
  {
    title: 'Customer data retention review',
    owner: 'Data Protection Office',
    status: 'Complete',
    dueDate: '2026-05-03',
    businessUnit: 'Consumer Services',
    folderName: 'Consumer Services / Retention',
    assignedRecruiter: 'admin',
    assignedSourcer: 'admin'
  },
  {
    title: 'Incident response tabletop plan',
    owner: 'Cyber Resilience',
    status: 'Draft',
    dueDate: '2026-07-02',
    businessUnit: 'Security Operations',
    folderName: 'Security Operations / Incident Response',
    assignedRecruiter: 'admin',
    assignedSourcer: 'sourcer'
  }
]

const mockCandidates: Omit<CandidateRecord, 'id'>[] = [
  {
    name: 'Avery Johnson',
    requirementId: 1,
    requirementTitle: 'Quarterly access attestation',
    stage: 'Recruiter screen',
    updatedAt: '2026-05-07',
    assignedRecruiter: 'recruiter',
    assignedSourcer: 'sourcer'
  },
  {
    name: 'Morgan Smith',
    requirementId: 2,
    requirementTitle: 'Vendor control evidence pack',
    stage: 'Submitted',
    updatedAt: '2026-05-06',
    assignedRecruiter: 'recruiter',
    assignedSourcer: 'sourcer'
  },
  {
    name: 'Riley Chen',
    requirementId: 4,
    requirementTitle: 'Incident response tabletop plan',
    stage: 'Sourcing',
    updatedAt: '2026-05-04',
    assignedRecruiter: 'admin',
    assignedSourcer: 'sourcer'
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

function hashPassword(password: string): string {
  return createHash('sha256').update(`${passwordSalt}:${password}`).digest('hex')
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

function addColumnIfMissing(database: Database.Database, tableName: string, columnName: string, definition: string): void {
  const columns = database.prepare(`PRAGMA table_info(${tableName})`).all() as Array<{ name: string }>
  if (!columns.some((column) => column.name === columnName)) {
    database.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`)
  }
}

function initialiseSchema(database: Database.Database): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      passwordHash TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('Admin', 'Recruiter', 'Sourcer')),
      displayName TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS requirements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      owner TEXT NOT NULL,
      status TEXT NOT NULL,
      dueDate TEXT NOT NULL,
      businessUnit TEXT NOT NULL,
      folderName TEXT NOT NULL DEFAULT 'General',
      assignedRecruiter TEXT NOT NULL DEFAULT 'recruiter',
      assignedSourcer TEXT NOT NULL DEFAULT 'sourcer'
    );

    CREATE TABLE IF NOT EXISTS candidates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      requirementId INTEGER NOT NULL,
      requirementTitle TEXT NOT NULL,
      stage TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      assignedRecruiter TEXT NOT NULL,
      assignedSourcer TEXT NOT NULL
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

  addColumnIfMissing(database, 'requirements', 'folderName', "TEXT NOT NULL DEFAULT 'General'")
  addColumnIfMissing(database, 'requirements', 'assignedRecruiter', "TEXT NOT NULL DEFAULT 'recruiter'")
  addColumnIfMissing(database, 'requirements', 'assignedSourcer', "TEXT NOT NULL DEFAULT 'sourcer'")
}

function seedMockData(database: Database.Database): void {
  const insertUser = database.prepare(`
    INSERT INTO users (username, passwordHash, role, displayName)
    VALUES (@username, @passwordHash, @role, @displayName)
    ON CONFLICT(username) DO UPDATE SET
      passwordHash = excluded.passwordHash,
      role = excluded.role,
      displayName = excluded.displayName
  `)
  defaultUsers.forEach((user) => {
    insertUser.run({ ...user, passwordHash: hashPassword(user.password) })
  })

  const requirementCount = database.prepare('SELECT COUNT(*) as count FROM requirements').get() as { count: number }
  if (requirementCount.count === 0) {
    const insertRequirement = database.prepare(`
      INSERT INTO requirements (title, owner, status, dueDate, businessUnit, folderName, assignedRecruiter, assignedSourcer)
      VALUES (@title, @owner, @status, @dueDate, @businessUnit, @folderName, @assignedRecruiter, @assignedSourcer)
    `)
    const insertMany = database.transaction((requirements: typeof mockRequirements) => {
      requirements.forEach((requirement) => insertRequirement.run(requirement))
    })
    insertMany(mockRequirements)
  }

  const candidateCount = database.prepare('SELECT COUNT(*) as count FROM candidates').get() as { count: number }
  if (candidateCount.count === 0) {
    const insertCandidate = database.prepare(`
      INSERT INTO candidates (name, requirementId, requirementTitle, stage, updatedAt, assignedRecruiter, assignedSourcer)
      VALUES (@name, @requirementId, @requirementTitle, @stage, @updatedAt, @assignedRecruiter, @assignedSourcer)
    `)
    const insertMany = database.transaction((candidates: typeof mockCandidates) => {
      candidates.forEach((candidate) => insertCandidate.run(candidate))
    })
    insertMany(mockCandidates)
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

export function authenticateUser(username: string, password: string): LoginResult {
  const database = connectDatabase()
  const normalizedUsername = username.trim().toLowerCase()
  const user = database
    .prepare('SELECT id, username, role, displayName FROM users WHERE username = @username AND passwordHash = @passwordHash')
    .get({ username: normalizedUsername, passwordHash: hashPassword(password) }) as AuthenticatedUser | undefined

  if (!user) {
    return { success: false, message: 'Invalid username or password.' }
  }

  return { success: true, user }
}

function filterByUser<T extends { assignedRecruiter: string; assignedSourcer: string }>(items: T[], user?: AuthenticatedUser): T[] {
  if (!user || user.role === 'Admin') {
    return items
  }

  if (user.role === 'Recruiter') {
    return items.filter((item) => item.assignedRecruiter === user.username)
  }

  return items.filter((item) => item.assignedSourcer === user.username)
}

export function getPulseSnapshot(user?: AuthenticatedUser): PulseSnapshot {
  const database = connectDatabase()
  const allRequirements = database.prepare('SELECT * FROM requirements ORDER BY dueDate ASC').all() as RequirementRecord[]
  const allCandidates = database.prepare('SELECT * FROM candidates ORDER BY updatedAt DESC').all() as CandidateRecord[]
  const reports = database.prepare('SELECT * FROM reports ORDER BY updatedAt DESC').all() as ReportRecord[]
  const settingsRow = database.prepare('SELECT * FROM settings WHERE id = 1').get() as {
    organizationName: string
    dataRegion: string
    notificationsEnabled: number
  }

  const requirements = filterByUser(allRequirements, user)
  const candidates = filterByUser(allCandidates, user)
  const openRequirements = requirements.filter((item) => item.status !== 'Complete').length
  const riskItems = requirements.filter((item) => item.status === 'At Risk').length

  return {
    requirements,
    candidates,
    reports: user?.role === 'Admin' || !user ? reports : [],
    settings: {
      organizationName: settingsRow.organizationName,
      dataRegion: settingsRow.dataRegion,
      notificationsEnabled: Boolean(settingsRow.notificationsEnabled)
    },
    metrics: {
      complianceScore: 92,
      openRequirements,
      reportsGenerated: user?.role === 'Admin' || !user ? reports.length : 0,
      riskItems,
      activeCandidates: candidates.length
    }
  }
}

export function closeDatabase(): void {
  db?.close()
  db = undefined
}
