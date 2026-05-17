import Database from 'better-sqlite3'
import { app } from 'electron'
import type { AuditActionType, AuditTrailFilters, AuditTrailInput, AuditTrailRecord, AuthenticatedUser, CandidateInput, CandidateRecord, CandidateStatus, CandidateStatusHistoryRecord, LoginResult, PulseSnapshot, ReportRecord, RequirementInput, RequirementIntakeInput, RequirementIntakeRecord, RequirementRecord, RequirementSearchStringInput, RequirementSearchStringRecord, UserManagementInput, UserManagementRecord, UserRole, WorkspaceSettingsInput } from '../shared/types'
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, renameSync } from 'node:fs'
import { join } from 'node:path'
import { createBackup, createStartupBackupIfNeeded, getDailyBackupDirectory, restoreBackup, setOneDriveBackupFolder, type BackupResult, type BackupSettings } from './backup'
import { buildRecruitmentCandidates, buildRecruitmentRequirements, recruitmentSourceChannels, recruitmentUsers, type SeedCandidate } from './recruitmentSeedData'

let db: Database.Database | undefined

const passwordSalt = 'experian-pulse-local-auth'

export const defaultCandidateStatuses: CandidateStatus[] = [
  'New Profile',
  'Contacted',
  'Interested',
  'Not Interested',
  'Screen Shortlisted',
  'Screen Rejected',
  'HM Shortlisted',
  'Interview 1 Scheduled',
  'Interview 1 Selected',
  'Interview 1 Rejected',
  'Interview 2 Scheduled',
  'Interview 2 Selected',
  'Final Round',
  'Offer Discussion',
  'Offer Released',
  'Offer Accepted',
  'Offer Dropped',
  'Joined'
]

const defaultSourceChannels = recruitmentSourceChannels

const defaultWorkspaceSettings = {
  organizationName: 'Experian Talent Acquisition',
  dataRegion: 'US-East',
  notificationsEnabled: 1,
  defaultBackupFolder: '',
  backupFrequency: 'Daily',
  defaultCurrency: 'USD',
  defaultLocation: 'United States'
}

const defaultUsers = recruitmentUsers

const mockRequirements = buildRecruitmentRequirements()
const mockCandidates = buildRecruitmentCandidates(mockRequirements)

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

function ensureDatabaseDirectory(): string {
  const dataDirectory = join(app.getPath('userData'), 'data')
  mkdirSync(dataDirectory, { recursive: true })
  return dataDirectory
}

function getDatabaseFilePath(): string {
  return join(ensureDatabaseDirectory(), 'experian-pulse.sqlite')
}

function moveAsideDatabaseFiles(databasePath: string): void {
  const recoveryStamp = new Date().toISOString().replace(/[:.]/g, '-')
  ;[databasePath, `${databasePath}-wal`, `${databasePath}-shm`].forEach((path) => {
    if (existsSync(path)) {
      renameSync(path, `${path}.failed-${recoveryStamp}`)
    }
  })
}

function openDatabase(databasePath: string): Database.Database {
  const database = new Database(databasePath)
  database.pragma('journal_mode = WAL')
  database.pragma('foreign_keys = ON')
  initialiseSchema(database)
  seedMockData(database)
  return database
}

function hashPassword(password: string): string {
  return createHash('sha256').update(`${passwordSalt}:${password}`).digest('hex')
}

export function connectDatabase(): Database.Database {
  if (db) {
    return db
  }

  const databasePath = getDatabaseFilePath()

  try {
    db = openDatabase(databasePath)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    try {
      db?.close()
    } catch {
      // Ignore close errors while recovering from a failed SQLite open.
    }
    db = undefined
    moveAsideDatabaseFiles(databasePath)
    db = openDatabase(databasePath)
    recordAuditEvent(db, 'Restore Performed', undefined, 'Recovered local SQLite workspace after startup failure.', {
      entityType: 'Database',
      details: message
    })
  }

  return db
}

const sqliteIdentifierPattern = /^[A-Za-z_][A-Za-z0-9_]*$/

function assertSafeSqlIdentifier(identifier: string): string {
  if (!sqliteIdentifierPattern.test(identifier)) {
    throw new Error(`Unsafe SQLite identifier: ${identifier}`)
  }

  return identifier
}

function addColumnIfMissing(database: Database.Database, tableName: string, columnName: string, definition: string): void {
  const safeTableName = assertSafeSqlIdentifier(tableName)
  const safeColumnName = assertSafeSqlIdentifier(columnName)
  const columns = database.prepare(`PRAGMA table_info(${safeTableName})`).all() as Array<{ name: string }>
  if (!columns.some((column) => column.name === safeColumnName)) {
    database.exec(`ALTER TABLE ${safeTableName} ADD COLUMN ${safeColumnName} ${definition}`)
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
      reqId TEXT NOT NULL UNIQUE,
      roleTitle TEXT NOT NULL,
      businessUnit TEXT NOT NULL,
      hiringManager TEXT NOT NULL,
      grade TEXT NOT NULL,
      location TEXT NOT NULL,
      workMode TEXT NOT NULL CHECK (workMode IN ('Onsite', 'Hybrid', 'Remote')),
      budgetRange TEXT NOT NULL,
      priority TEXT NOT NULL CHECK (priority IN ('Low', 'Medium', 'High', 'Critical')),
      targetClosureDate TEXT NOT NULL,
      recruiterOwner TEXT NOT NULL,
      assignedSourcer TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('Open', 'On Hold', 'Closed', 'Cancelled')),
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      closedAt TEXT NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS requirement_intake (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      requirementId INTEGER NOT NULL UNIQUE,
      roleSummary TEXT NOT NULL DEFAULT '',
      whyRoleOpen TEXT NOT NULL DEFAULT '',
      mustHaveSkills TEXT NOT NULL DEFAULT '',
      goodToHaveSkills TEXT NOT NULL DEFAULT '',
      primarySkills TEXT NOT NULL DEFAULT '',
      secondarySkills TEXT NOT NULL DEFAULT '',
      targetCompanies TEXT NOT NULL DEFAULT '',
      companiesToAvoid TEXT NOT NULL DEFAULT '',
      minimumExperience TEXT NOT NULL DEFAULT '',
      maximumExperience TEXT NOT NULL DEFAULT '',
      salaryRange TEXT NOT NULL DEFAULT '',
      noticePeriodPreference TEXT NOT NULL DEFAULT '',
      interviewProcess TEXT NOT NULL DEFAULT '',
      diversityFocus TEXT NOT NULL DEFAULT '',
      candidateSellingPoints TEXT NOT NULL DEFAULT '',
      keyChallenges TEXT NOT NULL DEFAULT '',
      hiringManagerExpectations TEXT NOT NULL DEFAULT '',
      additionalNotes TEXT NOT NULL DEFAULT '',
      updatedAt TEXT NOT NULL,
      FOREIGN KEY (requirementId) REFERENCES requirements(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS requirement_search_strings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      requirementId INTEGER NOT NULL UNIQUE,
      linkedinBoolean TEXT NOT NULL DEFAULT '',
      githubSearch TEXT NOT NULL DEFAULT '',
      naukriKeywords TEXT NOT NULL DEFAULT '',
      googleXray TEXT NOT NULL DEFAULT '',
      diversitySourcing TEXT NOT NULL DEFAULT '',
      updatedAt TEXT NOT NULL,
      FOREIGN KEY (requirementId) REFERENCES requirements(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS candidates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      requirementId INTEGER NOT NULL,
      requirementTitle TEXT NOT NULL,
      currentCompany TEXT NOT NULL DEFAULT '',
      currentTitle TEXT NOT NULL DEFAULT '',
      totalExperience TEXT NOT NULL DEFAULT '',
      relevantExperience TEXT NOT NULL DEFAULT '',
      location TEXT NOT NULL DEFAULT '',
      currentCtc TEXT NOT NULL DEFAULT '',
      expectedCtc TEXT NOT NULL DEFAULT '',
      noticePeriod TEXT NOT NULL DEFAULT '',
      servingNotice INTEGER NOT NULL DEFAULT 0,
      lastWorkingDay TEXT NOT NULL DEFAULT '',
      primarySkills TEXT NOT NULL DEFAULT '',
      secondarySkills TEXT NOT NULL DEFAULT '',
      sourceChannel TEXT NOT NULL DEFAULT '',
      linkedinUrl TEXT NOT NULL DEFAULT '',
      githubUrl TEXT NOT NULL DEFAULT '',
      resumeFilePath TEXT NOT NULL DEFAULT '',
      sourcerName TEXT NOT NULL DEFAULT '',
      recruiterName TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'New Profile',
      stage TEXT NOT NULL DEFAULT 'New Profile',
      remarks TEXT NOT NULL DEFAULT '',
      followUpDate TEXT NOT NULL DEFAULT '',
      updatedAt TEXT NOT NULL,
      assignedRecruiter TEXT NOT NULL,
      assignedSourcer TEXT NOT NULL,
      FOREIGN KEY (requirementId) REFERENCES requirements(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS candidate_status_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      candidateId INTEGER NOT NULL,
      oldStatus TEXT NOT NULL DEFAULT '',
      newStatus TEXT NOT NULL,
      changedByUser TEXT NOT NULL,
      changedAt TEXT NOT NULL,
      notes TEXT NOT NULL DEFAULT '',
      FOREIGN KEY (candidateId) REFERENCES candidates(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS audit_trail (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER,
      username TEXT NOT NULL,
      userDisplayName TEXT NOT NULL,
      actionType TEXT NOT NULL,
      entityType TEXT NOT NULL DEFAULT '',
      entityId TEXT NOT NULL DEFAULT '',
      summary TEXT NOT NULL,
      details TEXT NOT NULL DEFAULT '',
      createdAt TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_audit_trail_created_at ON audit_trail(createdAt DESC);
    CREATE INDEX IF NOT EXISTS idx_audit_trail_username ON audit_trail(username);
    CREATE INDEX IF NOT EXISTS idx_audit_trail_action_type ON audit_trail(actionType);

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
      notificationsEnabled INTEGER NOT NULL DEFAULT 1,
      defaultBackupFolder TEXT NOT NULL DEFAULT '',
      oneDriveBackupFolder TEXT NOT NULL DEFAULT '',
      backupFrequency TEXT NOT NULL DEFAULT 'Daily',
      defaultCurrency TEXT NOT NULL DEFAULT 'USD',
      defaultLocation TEXT NOT NULL DEFAULT 'United States',
      lastBackupAt TEXT NOT NULL DEFAULT '',
      lastBackupStatus TEXT NOT NULL DEFAULT 'Never Run',
      lastBackupPath TEXT NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS source_channels (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE
    );

    CREATE TABLE IF NOT EXISTS candidate_status_options (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      sortOrder INTEGER NOT NULL DEFAULT 0
    );
  `)

  addColumnIfMissing(database, 'requirements', 'reqId', "TEXT NOT NULL DEFAULT ''")
  addColumnIfMissing(database, 'requirements', 'roleTitle', "TEXT NOT NULL DEFAULT ''")
  addColumnIfMissing(database, 'requirements', 'hiringManager', "TEXT NOT NULL DEFAULT ''")
  addColumnIfMissing(database, 'requirements', 'grade', "TEXT NOT NULL DEFAULT ''")
  addColumnIfMissing(database, 'requirements', 'location', "TEXT NOT NULL DEFAULT ''")
  addColumnIfMissing(database, 'requirements', 'workMode', "TEXT NOT NULL DEFAULT 'Hybrid'")
  addColumnIfMissing(database, 'requirements', 'budgetRange', "TEXT NOT NULL DEFAULT ''")
  addColumnIfMissing(database, 'requirements', 'priority', "TEXT NOT NULL DEFAULT 'Medium'")
  addColumnIfMissing(database, 'requirements', 'targetClosureDate', "TEXT NOT NULL DEFAULT ''")
  addColumnIfMissing(database, 'requirements', 'recruiterOwner', "TEXT NOT NULL DEFAULT 'recruiter'")
  addColumnIfMissing(database, 'requirements', 'assignedSourcer', "TEXT NOT NULL DEFAULT 'sourcer'")
  addColumnIfMissing(database, 'requirements', 'status', "TEXT NOT NULL DEFAULT 'Open'")
  addColumnIfMissing(database, 'requirements', 'createdAt', "TEXT NOT NULL DEFAULT ''")
  addColumnIfMissing(database, 'requirements', 'closedAt', "TEXT NOT NULL DEFAULT ''")
  addColumnIfMissing(database, 'candidates', 'requirementTitle', "TEXT NOT NULL DEFAULT ''")
  addColumnIfMissing(database, 'candidates', 'currentCompany', "TEXT NOT NULL DEFAULT ''")
  addColumnIfMissing(database, 'candidates', 'currentTitle', "TEXT NOT NULL DEFAULT ''")
  addColumnIfMissing(database, 'candidates', 'totalExperience', "TEXT NOT NULL DEFAULT ''")
  addColumnIfMissing(database, 'candidates', 'relevantExperience', "TEXT NOT NULL DEFAULT ''")
  addColumnIfMissing(database, 'candidates', 'location', "TEXT NOT NULL DEFAULT ''")
  addColumnIfMissing(database, 'candidates', 'currentCtc', "TEXT NOT NULL DEFAULT ''")
  addColumnIfMissing(database, 'candidates', 'expectedCtc', "TEXT NOT NULL DEFAULT ''")
  addColumnIfMissing(database, 'candidates', 'noticePeriod', "TEXT NOT NULL DEFAULT ''")
  addColumnIfMissing(database, 'candidates', 'servingNotice', "INTEGER NOT NULL DEFAULT 0")
  addColumnIfMissing(database, 'candidates', 'lastWorkingDay', "TEXT NOT NULL DEFAULT ''")
  addColumnIfMissing(database, 'candidates', 'primarySkills', "TEXT NOT NULL DEFAULT ''")
  addColumnIfMissing(database, 'candidates', 'secondarySkills', "TEXT NOT NULL DEFAULT ''")
  addColumnIfMissing(database, 'candidates', 'sourceChannel', "TEXT NOT NULL DEFAULT ''")
  addColumnIfMissing(database, 'candidates', 'linkedinUrl', "TEXT NOT NULL DEFAULT ''")
  addColumnIfMissing(database, 'candidates', 'githubUrl', "TEXT NOT NULL DEFAULT ''")
  addColumnIfMissing(database, 'candidates', 'resumeFilePath', "TEXT NOT NULL DEFAULT ''")
  addColumnIfMissing(database, 'candidates', 'sourcerName', "TEXT NOT NULL DEFAULT ''")
  addColumnIfMissing(database, 'candidates', 'recruiterName', "TEXT NOT NULL DEFAULT ''")
  addColumnIfMissing(database, 'candidates', 'status', "TEXT NOT NULL DEFAULT 'New Profile'")
  addColumnIfMissing(database, 'candidates', 'stage', "TEXT NOT NULL DEFAULT 'New Profile'")
  addColumnIfMissing(database, 'candidates', 'remarks', "TEXT NOT NULL DEFAULT ''")
  addColumnIfMissing(database, 'candidates', 'followUpDate', "TEXT NOT NULL DEFAULT ''")
  addColumnIfMissing(database, 'settings', 'defaultBackupFolder', "TEXT NOT NULL DEFAULT ''")
  addColumnIfMissing(database, 'settings', 'oneDriveBackupFolder', "TEXT NOT NULL DEFAULT ''")
  addColumnIfMissing(database, 'settings', 'backupFrequency', "TEXT NOT NULL DEFAULT 'Daily'")
  addColumnIfMissing(database, 'settings', 'defaultCurrency', "TEXT NOT NULL DEFAULT 'USD'")
  addColumnIfMissing(database, 'settings', 'defaultLocation', "TEXT NOT NULL DEFAULT 'United States'")
  addColumnIfMissing(database, 'settings', 'lastBackupAt', "TEXT NOT NULL DEFAULT ''")
  addColumnIfMissing(database, 'settings', 'lastBackupStatus', "TEXT NOT NULL DEFAULT 'Never Run'")
  addColumnIfMissing(database, 'settings', 'lastBackupPath', "TEXT NOT NULL DEFAULT ''")
  migrateLegacyRequirements(database)
  migrateRequirementLifecycleDates(database)
  migrateLegacyCandidates(database)
  seedConfigOptions(database)
}

function migrateLegacyRequirements(database: Database.Database): void {
  const rows = database.prepare('SELECT * FROM requirements').all() as Array<Record<string, string | number>>
  const updateRequirement = database.prepare(`
    UPDATE requirements
    SET reqId = @reqId,
        roleTitle = @roleTitle,
        businessUnit = @businessUnit,
        hiringManager = @hiringManager,
        grade = @grade,
        location = @location,
        workMode = @workMode,
        budgetRange = @budgetRange,
        priority = @priority,
        targetClosureDate = @targetClosureDate,
        recruiterOwner = @recruiterOwner,
        assignedSourcer = @assignedSourcer,
        status = @status
    WHERE id = @id
  `)

  rows.forEach((row) => {
    if (String(row.reqId ?? '').trim() && String(row.roleTitle ?? '').trim()) {
      return
    }

    updateRequirement.run({
      id: row.id,
      reqId: `REQ-LEGACY-${String(row.id).padStart(3, '0')}`,
      roleTitle: row.title || 'Untitled Requirement',
      businessUnit: row.businessUnit || 'General',
      hiringManager: row.owner || 'Unassigned Manager',
      grade: 'G5',
      location: 'United States',
      workMode: 'Hybrid',
      budgetRange: 'TBD',
      priority: row.status === 'At Risk' ? 'High' : 'Medium',
      targetClosureDate: row.dueDate || '2026-06-30',
      recruiterOwner: row.assignedRecruiter || 'recruiter',
      assignedSourcer: row.assignedSourcer || 'sourcer',
      status: row.status === 'Complete' ? 'Closed' : 'Open'
    })
  })
}


function migrateRequirementLifecycleDates(database: Database.Database): void {
  const now = new Date().toISOString()
  database
    .prepare(
      `UPDATE requirements
       SET createdAt = @createdAt
       WHERE createdAt = '' OR createdAt IS NULL`
    )
    .run({ createdAt: now })

  database
    .prepare(
      `UPDATE requirements
       SET closedAt = @closedAt
       WHERE status = 'Closed' AND (closedAt = '' OR closedAt IS NULL)`
    )
    .run({ closedAt: now })
}

function migrateLegacyCandidates(database: Database.Database): void {
  const rows = database.prepare('SELECT candidates.*, requirements.roleTitle, requirements.recruiterOwner, requirements.assignedSourcer FROM candidates LEFT JOIN requirements ON candidates.requirementId = requirements.id').all() as Array<Record<string, string | number>>
  const updateCandidate = database.prepare(`
    UPDATE candidates
    SET requirementTitle = @requirementTitle,
        status = @status,
        stage = @status,
        sourcerName = @sourcerName,
        recruiterName = @recruiterName,
        assignedRecruiter = @assignedRecruiter,
        assignedSourcer = @assignedSourcer
    WHERE id = @id
  `)

  rows.forEach((row) => {
    const status = defaultCandidateStatuses.includes(row.stage as CandidateStatus) ? String(row.stage) : String(row.status || 'New Profile')
    updateCandidate.run({
      id: row.id,
      requirementTitle: row.requirementTitle || row.roleTitle || 'Untitled Requirement',
      status: defaultCandidateStatuses.includes(status as CandidateStatus) ? status : 'New Profile',
      sourcerName: row.sourcerName || row.assignedSourcer || 'sourcer',
      recruiterName: row.recruiterName || row.assignedRecruiter || 'recruiter',
      assignedRecruiter: row.assignedRecruiter || row.recruiterOwner || 'recruiter',
      assignedSourcer: row.assignedSourcer || row.assignedSourcer || 'sourcer'
    })
  })
}

function seedConfigOptions(database: Database.Database): void {
  const insertSourceChannel = database.prepare('INSERT OR IGNORE INTO source_channels (name) VALUES (?)')
  defaultSourceChannels.forEach((channel) => insertSourceChannel.run(channel))

  const insertCandidateStatus = database.prepare('INSERT OR IGNORE INTO candidate_status_options (name, sortOrder) VALUES (@name, @sortOrder)')
  defaultCandidateStatuses.forEach((status, index) => insertCandidateStatus.run({ name: status, sortOrder: index }))
}

function getSourceChannels(database: Database.Database): string[] {
  const rows = database.prepare('SELECT name FROM source_channels ORDER BY name COLLATE NOCASE').all() as Array<{ name: string }>
  return rows.map((row) => row.name)
}

function getCandidateStatuses(database: Database.Database): CandidateStatus[] {
  const rows = database.prepare('SELECT name FROM candidate_status_options ORDER BY sortOrder ASC, name COLLATE NOCASE').all() as Array<{ name: CandidateStatus }>
  return rows.map((row) => row.name)
}

function seedMissingCandidateStatusHistory(database: Database.Database): void {
  const candidates = database.prepare('SELECT * FROM candidates').all() as CandidateDatabaseRow[]
  const historyCount = database.prepare('SELECT COUNT(*) as count FROM candidate_status_history WHERE candidateId = ?')
  const insertHistory = database.prepare(
    `INSERT INTO candidate_status_history (candidateId, oldStatus, newStatus, changedByUser, changedAt, notes)
     VALUES (@candidateId, '', @newStatus, @changedByUser, @changedAt, @notes)`
  )

  const insertMissing = database.transaction((candidateRows: CandidateDatabaseRow[]) => {
    candidateRows.forEach((candidate) => {
      const existingHistory = historyCount.get(candidate.id) as { count: number }
      if (existingHistory.count === 0) {
        insertHistory.run({
          candidateId: candidate.id,
          newStatus: candidate.status,
          changedByUser: candidate.recruiterName || candidate.sourcerName || 'system',
          changedAt: candidate.updatedAt || new Date().toISOString(),
          notes: 'Initial status captured during pipeline setup.'
        })
      }
    })
  })

  insertMissing(candidates)
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
      INSERT INTO requirements (reqId, roleTitle, businessUnit, hiringManager, grade, location, workMode, budgetRange, priority, targetClosureDate, recruiterOwner, assignedSourcer, status, createdAt, closedAt)
      VALUES (@reqId, @roleTitle, @businessUnit, @hiringManager, @grade, @location, @workMode, @budgetRange, @priority, @targetClosureDate, @recruiterOwner, @assignedSourcer, @status, @createdAt, @closedAt)
    `)
    const insertIntake = database.prepare(`
      INSERT INTO requirement_intake (
        requirementId, roleSummary, whyRoleOpen, mustHaveSkills, goodToHaveSkills, primarySkills, secondarySkills,
        targetCompanies, companiesToAvoid, minimumExperience, maximumExperience, salaryRange, noticePeriodPreference,
        interviewProcess, diversityFocus, candidateSellingPoints, keyChallenges, hiringManagerExpectations, additionalNotes, updatedAt
      ) VALUES (
        @requirementId, @roleSummary, @whyRoleOpen, @mustHaveSkills, @goodToHaveSkills, @primarySkills, @secondarySkills,
        @targetCompanies, @companiesToAvoid, @minimumExperience, @maximumExperience, @salaryRange, @noticePeriodPreference,
        @interviewProcess, @diversityFocus, @candidateSellingPoints, @keyChallenges, @hiringManagerExpectations, @additionalNotes, @updatedAt
      )
    `)
    const insertSearchStrings = database.prepare(`
      INSERT INTO requirement_search_strings (
        requirementId, linkedinBoolean, githubSearch, naukriKeywords, googleXray, diversitySourcing, updatedAt
      ) VALUES (
        @requirementId, @linkedinBoolean, @githubSearch, @naukriKeywords, @googleXray, @diversitySourcing, @updatedAt
      )
    `)
    const insertMany = database.transaction((requirements: typeof mockRequirements) => {
      requirements.forEach((requirement) => {
        const result = insertRequirement.run(requirement) as { lastInsertRowid: number | bigint }
        const requirementId = Number(result.lastInsertRowid)
        insertIntake.run({ ...requirement.intake, requirementId, updatedAt: requirement.createdAt })
        insertSearchStrings.run({ ...requirement.searchStrings, requirementId, updatedAt: requirement.createdAt })
      })
    })
    insertMany(mockRequirements)
  }

  const candidateCount = database.prepare('SELECT COUNT(*) as count FROM candidates').get() as { count: number }
  if (candidateCount.count === 0) {
    const insertCandidate = database.prepare(`
      INSERT INTO candidates (
        name, requirementId, requirementTitle, currentCompany, currentTitle, totalExperience, relevantExperience, location,
        currentCtc, expectedCtc, noticePeriod, servingNotice, lastWorkingDay, primarySkills, secondarySkills, sourceChannel,
        linkedinUrl, githubUrl, resumeFilePath, sourcerName, recruiterName, status, stage, remarks, followUpDate, updatedAt, assignedRecruiter, assignedSourcer
      ) VALUES (
        @name, @requirementId, @requirementTitle, @currentCompany, @currentTitle, @totalExperience, @relevantExperience, @location,
        @currentCtc, @expectedCtc, @noticePeriod, @servingNotice, @lastWorkingDay, @primarySkills, @secondarySkills, @sourceChannel,
        @linkedinUrl, @githubUrl, @resumeFilePath, @sourcerName, @recruiterName, @status, @stage, @remarks, @followUpDate, @updatedAt, @assignedRecruiter, @assignedSourcer
      )
    `)
    const insertHistory = database.prepare(`
      INSERT INTO candidate_status_history (candidateId, oldStatus, newStatus, changedByUser, changedAt, notes)
      VALUES (@candidateId, @oldStatus, @newStatus, @changedByUser, @changedAt, @notes)
    `)
    const requirementsByReqId = new Map((database.prepare('SELECT id, reqId FROM requirements').all() as Array<{ id: number; reqId: string }>).map((requirement) => [requirement.reqId, requirement.id]))
    const insertMany = database.transaction((candidates: typeof mockCandidates) => {
      candidates.forEach((candidate) => {
        const requirementId = requirementsByReqId.get(candidate.requirementReqId)
        if (!requirementId) {
          throw new Error(`Missing seeded requirement for candidate ${candidate.name}.`)
        }
        const candidateForStorage = prepareSeedCandidateForStorage(database, candidate, requirementId)
        const result = insertCandidate.run(candidateForStorage) as { lastInsertRowid: number | bigint }
        candidate.statusHistory.forEach((history) => insertHistory.run({ ...history, candidateId: result.lastInsertRowid }))
      })
    })
    insertMany(mockCandidates)
  }

  seedMissingCandidateStatusHistory(database)

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
      `INSERT OR IGNORE INTO settings (id, organizationName, dataRegion, notificationsEnabled, defaultBackupFolder, backupFrequency, defaultCurrency, defaultLocation)
       VALUES (1, @organizationName, @dataRegion, @notificationsEnabled, @defaultBackupFolder, @backupFrequency, @defaultCurrency, @defaultLocation)`
    )
    .run({ ...defaultWorkspaceSettings, defaultBackupFolder: getDailyBackupDirectory() })
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

  recordAuditEvent(database, 'User Login', user, `${user.displayName} signed in.`, { entityType: 'User', entityId: user.id })
  return { success: true, user }
}

function assertAdmin(user?: AuthenticatedUser): void {
  if (!user || user.role !== 'Admin') {
    throw new Error('Only admins can manage users.')
  }
}

function recordAuditEvent(
  database: Database.Database,
  actionType: AuditActionType,
  user: AuthenticatedUser | undefined,
  summary: string,
  options: { entityType?: string; entityId?: string | number; details?: string } = {}
): void {
  const auditUser = user ?? { id: null, username: 'system', displayName: 'System' }
  database
    .prepare(
      `INSERT INTO audit_trail (userId, username, userDisplayName, actionType, entityType, entityId, summary, details, createdAt)
       VALUES (@userId, @username, @userDisplayName, @actionType, @entityType, @entityId, @summary, @details, @createdAt)`
    )
    .run({
      userId: auditUser.id,
      username: auditUser.username,
      userDisplayName: auditUser.displayName,
      actionType,
      entityType: options.entityType ?? '',
      entityId: String(options.entityId ?? ''),
      summary,
      details: options.details ?? '',
      createdAt: new Date().toISOString()
    })
}

export function recordAuditAction(input: AuditTrailInput, user?: AuthenticatedUser): AuditTrailRecord {
  if (!user) {
    throw new Error('You must be logged in to record audit events.')
  }

  const database = connectDatabase()
  recordAuditEvent(database, input.actionType, user, input.summary, {
    entityType: input.entityType,
    entityId: input.entityId,
    details: input.details
  })
  return database.prepare('SELECT * FROM audit_trail WHERE id = last_insert_rowid()').get() as AuditTrailRecord
}

export function getAuditTrail(filters: AuditTrailFilters = {}, user?: AuthenticatedUser): AuditTrailRecord[] {
  assertAdmin(user)
  const database = connectDatabase()
  const conditions: string[] = []
  const params: Record<string, string> = {}

  if (filters.user?.trim()) {
    conditions.push('username = @username')
    params.username = filters.user.trim()
  }
  if (filters.actionType) {
    conditions.push('actionType = @actionType')
    params.actionType = filters.actionType
  }
  if (filters.startDate?.trim()) {
    conditions.push('createdAt >= @startDate')
    params.startDate = `${filters.startDate.trim()}T00:00:00.000Z`
  }
  if (filters.endDate?.trim()) {
    conditions.push('createdAt <= @endDate')
    params.endDate = `${filters.endDate.trim()}T23:59:59.999Z`
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
  return database
    .prepare(`SELECT * FROM audit_trail ${whereClause} ORDER BY createdAt DESC, id DESC LIMIT 500`)
    .all(params) as AuditTrailRecord[]
}


function normalizeWorkspaceSettings(input: WorkspaceSettingsInput): WorkspaceSettingsInput {
  if (!['Daily', 'Weekly', 'Monthly'].includes(input.backupFrequency)) {
    throw new Error('Invalid backup frequency.')
  }

  return {
    organizationName: input.organizationName.trim() || 'Experian Pulse',
    defaultBackupFolder: input.defaultBackupFolder.trim(),
    oneDriveBackupFolder: input.oneDriveBackupFolder.trim(),
    backupFrequency: input.backupFrequency,
    defaultCurrency: input.defaultCurrency.trim().toUpperCase() || 'USD',
    defaultLocation: input.defaultLocation.trim() || 'United States'
  }
}

function normalizeUserInput(input: UserManagementInput): UserManagementInput {
  const username = input.username.trim().toLowerCase()
  if (!username) {
    throw new Error('Username is required.')
  }

  if (!input.displayName.trim()) {
    throw new Error('Display name is required.')
  }

  if (!['Admin', 'Recruiter', 'Sourcer'].includes(input.role)) {
    throw new Error('Invalid user role.')
  }

  return {
    username,
    displayName: input.displayName.trim(),
    role: input.role,
    password: input.password?.trim()
  }
}

export function updateWorkspaceSettings(input: WorkspaceSettingsInput, user?: AuthenticatedUser): PulseSnapshot {
  assertAdmin(user)
  const database = connectDatabase()
  const settings = normalizeWorkspaceSettings(input)
  database
    .prepare(
      `UPDATE settings
       SET organizationName = @organizationName,
           defaultBackupFolder = @defaultBackupFolder,
           oneDriveBackupFolder = @oneDriveBackupFolder,
           backupFrequency = @backupFrequency,
           defaultCurrency = @defaultCurrency,
           defaultLocation = @defaultLocation
       WHERE id = 1`
    )
    .run(settings)
  recordAuditEvent(database, 'Settings Updated', user, 'Updated workspace settings.', {
    entityType: 'Settings',
    entityId: 1,
    details: JSON.stringify({ organizationName: settings.organizationName, backupFrequency: settings.backupFrequency, defaultCurrency: settings.defaultCurrency })
  })
  return getPulseSnapshot(user)
}

export function createUser(input: UserManagementInput, user?: AuthenticatedUser): PulseSnapshot {
  assertAdmin(user)
  const database = connectDatabase()
  const nextUser = normalizeUserInput(input)
  if (!nextUser.password) {
    throw new Error('Password is required when creating a user.')
  }

  database
    .prepare('INSERT INTO users (username, passwordHash, role, displayName) VALUES (@username, @passwordHash, @role, @displayName)')
    .run({ ...nextUser, passwordHash: hashPassword(nextUser.password) })
  recordAuditEvent(database, 'User Created', user, `Created user ${nextUser.username}.`, {
    entityType: 'User',
    entityId: nextUser.username,
    details: JSON.stringify({ role: nextUser.role, displayName: nextUser.displayName })
  })
  return getPulseSnapshot(user)
}

export function updateUser(id: number, input: UserManagementInput, user?: AuthenticatedUser): PulseSnapshot {
  assertAdmin(user)
  const database = connectDatabase()
  const nextUser = normalizeUserInput(input)
  const existingUser = database.prepare('SELECT * FROM users WHERE id = ?').get(id) as UserManagementRecord | undefined
  if (!existingUser) {
    throw new Error('User not found.')
  }

  if (nextUser.password) {
    database
      .prepare('UPDATE users SET username = @username, passwordHash = @passwordHash, role = @role, displayName = @displayName WHERE id = @id')
      .run({ ...nextUser, id, passwordHash: hashPassword(nextUser.password) })
  } else {
    database.prepare('UPDATE users SET username = @username, role = @role, displayName = @displayName WHERE id = @id').run({ ...nextUser, id })
  }

  recordAuditEvent(database, 'User Updated', user, `Updated user ${nextUser.username}.`, {
    entityType: 'User',
    entityId: id,
    details: JSON.stringify({ previousUsername: existingUser.username, role: nextUser.role, passwordChanged: Boolean(nextUser.password) })
  })

  return getPulseSnapshot(user)
}

export function deleteUser(id: number, user?: AuthenticatedUser): PulseSnapshot {
  assertAdmin(user)
  if (user?.id === id) {
    throw new Error('Admins cannot delete their own signed-in account.')
  }

  const database = connectDatabase()
  const adminCount = database.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'Admin'").get() as { count: number }
  const deletingUser = database.prepare('SELECT role FROM users WHERE id = ?').get(id) as { role: UserRole } | undefined
  if (deletingUser?.role === 'Admin' && adminCount.count <= 1) {
    throw new Error('At least one admin user is required.')
  }

  database.prepare('DELETE FROM users WHERE id = ?').run(id)
  recordAuditEvent(database, 'User Deleted', user, `Deleted user ${id}.`, {
    entityType: 'User',
    entityId: id,
    details: JSON.stringify({ role: deletingUser?.role ?? '' })
  })
  return getPulseSnapshot(user)
}

export function addSourceChannel(name: string, user?: AuthenticatedUser): PulseSnapshot {
  assertAdmin(user)
  const value = name.trim()
  if (!value) {
    throw new Error('Source channel name is required.')
  }

  const database = connectDatabase()
  database.prepare('INSERT OR IGNORE INTO source_channels (name) VALUES (?)').run(value)
  recordAuditEvent(database, 'Source Channel Updated', user, `Added source channel ${value}.`, { entityType: 'Settings', entityId: value })
  return getPulseSnapshot(user)
}

export function deleteSourceChannel(name: string, user?: AuthenticatedUser): PulseSnapshot {
  assertAdmin(user)
  const database = connectDatabase()
  const inUse = database.prepare('SELECT COUNT(*) as count FROM candidates WHERE sourceChannel = ?').get(name) as { count: number }
  if (inUse.count > 0) {
    throw new Error('Source channels in use cannot be deleted.')
  }
  database.prepare('DELETE FROM source_channels WHERE name = ?').run(name)
  recordAuditEvent(database, 'Source Channel Updated', user, `Deleted source channel ${name}.`, { entityType: 'Settings', entityId: name })
  return getPulseSnapshot(user)
}

export function addCandidateStatus(name: string, user?: AuthenticatedUser): PulseSnapshot {
  assertAdmin(user)
  const value = name.trim()
  if (!value) {
    throw new Error('Candidate status name is required.')
  }

  const database = connectDatabase()
  const maxOrder = database.prepare('SELECT COALESCE(MAX(sortOrder), -1) as maxOrder FROM candidate_status_options').get() as { maxOrder: number }
  database.prepare('INSERT OR IGNORE INTO candidate_status_options (name, sortOrder) VALUES (@name, @sortOrder)').run({ name: value, sortOrder: maxOrder.maxOrder + 1 })
  recordAuditEvent(database, 'Candidate Status Option Updated', user, `Added candidate status option ${value}.`, { entityType: 'Settings', entityId: value })
  return getPulseSnapshot(user)
}

export function deleteCandidateStatus(name: string, user?: AuthenticatedUser): PulseSnapshot {
  assertAdmin(user)
  const database = connectDatabase()
  const inUse = database.prepare('SELECT COUNT(*) as count FROM candidates WHERE status = ?').get(name) as { count: number }
  if (inUse.count > 0) {
    throw new Error('Candidate statuses in use cannot be deleted.')
  }

  database.prepare('DELETE FROM candidate_status_options WHERE name = ?').run(name)
  recordAuditEvent(database, 'Candidate Status Option Updated', user, `Deleted candidate status option ${name}.`, { entityType: 'Settings', entityId: name })
  return getPulseSnapshot(user)
}

function filterByUser<T extends { recruiterOwner?: string; assignedRecruiter?: string; assignedSourcer: string }>(items: T[], user?: AuthenticatedUser): T[] {
  if (!user || user.role === 'Admin') {
    return items
  }

  if (user.role === 'Recruiter') {
    return items.filter((item) => (item.recruiterOwner ?? item.assignedRecruiter) === user.username)
  }

  return items.filter((item) => item.assignedSourcer === user.username)
}

function normalizeDateInput(value: string, label: string): string {
  const trimmedValue = value.trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmedValue)) {
    throw new Error(`${label} must use YYYY-MM-DD format.`)
  }

  return trimmedValue
}

function normalizeOptionalDateInput(value: string, label: string): string {
  const trimmedValue = value.trim()
  if (!trimmedValue) {
    return ''
  }

  return normalizeDateInput(trimmedValue, label)
}

function normalizeOptionalHttpUrl(value: string, label: string): string {
  const trimmedValue = value.trim()
  if (!trimmedValue) {
    return ''
  }

  try {
    const parsedUrl = new URL(trimmedValue)
    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      throw new Error('Unsupported protocol')
    }
  } catch {
    throw new Error(`${label} must be a valid http:// or https:// URL.`)
  }

  return trimmedValue
}

function normalizeRequirementInput(input: RequirementInput, user?: AuthenticatedUser): RequirementInput {
  return {
    reqId: input.reqId.trim(),
    roleTitle: input.roleTitle.trim(),
    businessUnit: input.businessUnit.trim(),
    hiringManager: input.hiringManager.trim(),
    grade: input.grade.trim(),
    location: input.location.trim(),
    workMode: input.workMode,
    budgetRange: input.budgetRange.trim(),
    priority: input.priority,
    targetClosureDate: normalizeDateInput(input.targetClosureDate, 'Target closure date'),
    recruiterOwner: input.recruiterOwner.trim() || user?.username || 'recruiter',
    assignedSourcer: input.assignedSourcer.trim() || 'sourcer',
    status: input.status
  }
}

function assertCanManageRequirements(user?: AuthenticatedUser): void {
  if (!user || (user.role !== 'Admin' && user.role !== 'Recruiter')) {
    throw new Error('Only admins and recruiters can manage requirements.')
  }
}

function assertPositiveInteger(value: number, label: string): void {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`${label} must be a valid positive integer.`)
  }
}

function assertRequirementInput(input: RequirementInput): void {
  const requiredFields: Array<keyof RequirementInput> = [
    'reqId',
    'roleTitle',
    'businessUnit',
    'hiringManager',
    'grade',
    'location',
    'workMode',
    'budgetRange',
    'priority',
    'targetClosureDate',
    'recruiterOwner',
    'assignedSourcer',
    'status'
  ]

  requiredFields.forEach((field) => {
    if (!String(input[field]).trim()) {
      throw new Error(`Missing required field: ${field}`)
    }
  })
}

export function createRequirement(input: RequirementInput, user?: AuthenticatedUser): RequirementRecord {
  assertCanManageRequirements(user)
  const database = connectDatabase()
  const requirement = normalizeRequirementInput(input, user)
  assertRequirementInput(requirement)

  const result = database
    .prepare(
      `INSERT INTO requirements (reqId, roleTitle, businessUnit, hiringManager, grade, location, workMode, budgetRange, priority, targetClosureDate, recruiterOwner, assignedSourcer, status, createdAt, closedAt)
       VALUES (@reqId, @roleTitle, @businessUnit, @hiringManager, @grade, @location, @workMode, @budgetRange, @priority, @targetClosureDate, @recruiterOwner, @assignedSourcer, @status, @createdAt, @closedAt)`
    )
    .run({
      ...requirement,
      createdAt: new Date().toISOString(),
      closedAt: requirement.status === 'Closed' ? new Date().toISOString() : ''
    }) as { lastInsertRowid: number | bigint }

  const createdRequirement = database.prepare('SELECT * FROM requirements WHERE id = ?').get(result.lastInsertRowid) as RequirementRecord
  recordAuditEvent(database, 'Requirement Created', user, `Created requirement ${createdRequirement.reqId} · ${createdRequirement.roleTitle}.`, {
    entityType: 'Requirement',
    entityId: createdRequirement.id,
    details: JSON.stringify({ status: createdRequirement.status, recruiterOwner: createdRequirement.recruiterOwner, assignedSourcer: createdRequirement.assignedSourcer })
  })
  return createdRequirement
}

export function updateRequirement(id: number, input: RequirementInput, user?: AuthenticatedUser): RequirementRecord {
  assertPositiveInteger(id, 'Requirement ID')
  assertCanManageRequirements(user)
  const database = connectDatabase()
  const requirement = normalizeRequirementInput(input, user)
  assertRequirementInput(requirement)
  const currentRequirement = database.prepare('SELECT * FROM requirements WHERE id = ?').get(id) as RequirementRecord | undefined
  if (!currentRequirement) {
    throw new Error('Requirement not found.')
  }

  database
    .prepare(
      `UPDATE requirements
       SET reqId = @reqId,
           roleTitle = @roleTitle,
           businessUnit = @businessUnit,
           hiringManager = @hiringManager,
           grade = @grade,
           location = @location,
           workMode = @workMode,
           budgetRange = @budgetRange,
           priority = @priority,
           targetClosureDate = @targetClosureDate,
           recruiterOwner = @recruiterOwner,
           assignedSourcer = @assignedSourcer,
           status = @status,
           closedAt = @closedAt
       WHERE id = @id`
    )
    .run({
      ...requirement,
      id,
      closedAt: requirement.status === 'Closed' ? currentRequirement.closedAt || new Date().toISOString() : ''
    })

  const updatedRequirement = database.prepare('SELECT * FROM requirements WHERE id = ?').get(id) as RequirementRecord
  recordAuditEvent(database, 'Requirement Updated', user, `Updated requirement ${updatedRequirement.reqId} · ${updatedRequirement.roleTitle}.`, {
    entityType: 'Requirement',
    entityId: updatedRequirement.id,
    details: JSON.stringify({ previousStatus: currentRequirement.status, status: updatedRequirement.status })
  })

  return updatedRequirement
}

export function deleteRequirement(id: number, user?: AuthenticatedUser): boolean {
  assertPositiveInteger(id, 'Requirement ID')
  assertCanManageRequirements(user)
  const database = connectDatabase()
  const requirement = database.prepare('SELECT * FROM requirements WHERE id = ?').get(id) as RequirementRecord | undefined
  if (!requirement) {
    throw new Error('Requirement not found.')
  }

  const [accessibleRequirement] = filterByUser([requirement], user)
  if (!accessibleRequirement) {
    throw new Error('You do not have access to this requirement.')
  }

  database.prepare('DELETE FROM requirements WHERE id = ?').run(id)
  recordAuditEvent(database, 'Requirement Deleted', user, `Deleted requirement ${requirement.reqId} · ${requirement.roleTitle}.`, {
    entityType: 'Requirement',
    entityId: id,
    details: JSON.stringify({ status: requirement.status })
  })
  return true
}


function normalizeIntakeInput(input: RequirementIntakeInput): RequirementIntakeInput {
  return {
    roleSummary: input.roleSummary.trim(),
    whyRoleOpen: input.whyRoleOpen.trim(),
    mustHaveSkills: input.mustHaveSkills.trim(),
    goodToHaveSkills: input.goodToHaveSkills.trim(),
    primarySkills: input.primarySkills.trim(),
    secondarySkills: input.secondarySkills.trim(),
    targetCompanies: input.targetCompanies.trim(),
    companiesToAvoid: input.companiesToAvoid.trim(),
    minimumExperience: input.minimumExperience.trim(),
    maximumExperience: input.maximumExperience.trim(),
    salaryRange: input.salaryRange.trim(),
    noticePeriodPreference: input.noticePeriodPreference.trim(),
    interviewProcess: input.interviewProcess.trim(),
    diversityFocus: input.diversityFocus.trim(),
    candidateSellingPoints: input.candidateSellingPoints.trim(),
    keyChallenges: input.keyChallenges.trim(),
    hiringManagerExpectations: input.hiringManagerExpectations.trim(),
    additionalNotes: input.additionalNotes.trim()
  }
}

function attachRequirementDetails(database: Database.Database, requirements: RequirementRecord[]): RequirementRecord[] {
  if (requirements.length === 0) {
    return requirements
  }

  const intakeRows = database.prepare('SELECT * FROM requirement_intake').all() as RequirementIntakeRecord[]
  const searchStringRows = database.prepare('SELECT * FROM requirement_search_strings').all() as RequirementSearchStringRecord[]
  const intakeByRequirementId = new Map(intakeRows.map((intake) => [intake.requirementId, intake]))
  const searchStringsByRequirementId = new Map(searchStringRows.map((searchStrings) => [searchStrings.requirementId, searchStrings]))

  return requirements.map((requirement) => ({
    ...requirement,
    intake: intakeByRequirementId.get(requirement.id),
    searchStrings: searchStringsByRequirementId.get(requirement.id)
  }))
}

function assertCanAccessRequirement(database: Database.Database, requirementId: number, user: AuthenticatedUser): void {
  const requirement = database.prepare('SELECT * FROM requirements WHERE id = ?').get(requirementId) as RequirementRecord | undefined
  if (!requirement) {
    throw new Error('Requirement not found.')
  }

  const [accessibleRequirement] = filterByUser([requirement], user)
  if (!accessibleRequirement) {
    throw new Error('You do not have access to this requirement.')
  }
}

export function upsertRequirementIntake(requirementId: number, input: RequirementIntakeInput, user?: AuthenticatedUser): RequirementIntakeRecord {
  assertPositiveInteger(requirementId, 'Requirement ID')
  if (!user) {
    throw new Error('You must be logged in to save intake notes.')
  }

  const database = connectDatabase()
  assertCanAccessRequirement(database, requirementId, user)

  const intake = normalizeIntakeInput(input)
  const updatedAt = new Date().toISOString()

  database
    .prepare(
      `INSERT INTO requirement_intake (
         requirementId,
         roleSummary,
         whyRoleOpen,
         mustHaveSkills,
         goodToHaveSkills,
         primarySkills,
         secondarySkills,
         targetCompanies,
         companiesToAvoid,
         minimumExperience,
         maximumExperience,
         salaryRange,
         noticePeriodPreference,
         interviewProcess,
         diversityFocus,
         candidateSellingPoints,
         keyChallenges,
         hiringManagerExpectations,
         additionalNotes,
         updatedAt
       ) VALUES (
         @requirementId,
         @roleSummary,
         @whyRoleOpen,
         @mustHaveSkills,
         @goodToHaveSkills,
         @primarySkills,
         @secondarySkills,
         @targetCompanies,
         @companiesToAvoid,
         @minimumExperience,
         @maximumExperience,
         @salaryRange,
         @noticePeriodPreference,
         @interviewProcess,
         @diversityFocus,
         @candidateSellingPoints,
         @keyChallenges,
         @hiringManagerExpectations,
         @additionalNotes,
         @updatedAt
       )
       ON CONFLICT(requirementId) DO UPDATE SET
         roleSummary = excluded.roleSummary,
         whyRoleOpen = excluded.whyRoleOpen,
         mustHaveSkills = excluded.mustHaveSkills,
         goodToHaveSkills = excluded.goodToHaveSkills,
         primarySkills = excluded.primarySkills,
         secondarySkills = excluded.secondarySkills,
         targetCompanies = excluded.targetCompanies,
         companiesToAvoid = excluded.companiesToAvoid,
         minimumExperience = excluded.minimumExperience,
         maximumExperience = excluded.maximumExperience,
         salaryRange = excluded.salaryRange,
         noticePeriodPreference = excluded.noticePeriodPreference,
         interviewProcess = excluded.interviewProcess,
         diversityFocus = excluded.diversityFocus,
         candidateSellingPoints = excluded.candidateSellingPoints,
         keyChallenges = excluded.keyChallenges,
         hiringManagerExpectations = excluded.hiringManagerExpectations,
         additionalNotes = excluded.additionalNotes,
         updatedAt = excluded.updatedAt`
    )
    .run({ ...intake, requirementId, updatedAt })

  const savedIntake = database.prepare('SELECT * FROM requirement_intake WHERE requirementId = ?').get(requirementId) as RequirementIntakeRecord
  const requirement = database.prepare('SELECT reqId, roleTitle FROM requirements WHERE id = ?').get(requirementId) as { reqId: string; roleTitle: string }
  recordAuditEvent(database, 'Intake Updated', user, `Updated intake for ${requirement.reqId} · ${requirement.roleTitle}.`, {
    entityType: 'Requirement',
    entityId: requirementId
  })
  return savedIntake
}

function normalizeSearchStringInput(input: RequirementSearchStringInput): RequirementSearchStringInput {
  return {
    linkedinBoolean: input.linkedinBoolean.trim(),
    githubSearch: input.githubSearch.trim(),
    naukriKeywords: input.naukriKeywords.trim(),
    googleXray: input.googleXray.trim(),
    diversitySourcing: input.diversitySourcing.trim()
  }
}

export function upsertRequirementSearchStrings(requirementId: number, input: RequirementSearchStringInput, user?: AuthenticatedUser): RequirementSearchStringRecord {
  assertPositiveInteger(requirementId, 'Requirement ID')
  if (!user) {
    throw new Error('You must be logged in to save search strings.')
  }

  const database = connectDatabase()
  assertCanAccessRequirement(database, requirementId, user)
  const requirement = database.prepare('SELECT * FROM requirements WHERE id = ?').get(requirementId) as RequirementRecord

  const searchStrings = normalizeSearchStringInput(input)
  const updatedAt = new Date().toISOString()

  database
    .prepare(
      `INSERT INTO requirement_search_strings (
         requirementId,
         linkedinBoolean,
         githubSearch,
         naukriKeywords,
         googleXray,
         diversitySourcing,
         updatedAt
       ) VALUES (
         @requirementId,
         @linkedinBoolean,
         @githubSearch,
         @naukriKeywords,
         @googleXray,
         @diversitySourcing,
         @updatedAt
       )
       ON CONFLICT(requirementId) DO UPDATE SET
         linkedinBoolean = excluded.linkedinBoolean,
         githubSearch = excluded.githubSearch,
         naukriKeywords = excluded.naukriKeywords,
         googleXray = excluded.googleXray,
         diversitySourcing = excluded.diversitySourcing,
         updatedAt = excluded.updatedAt`
    )
    .run({ ...searchStrings, requirementId, updatedAt })

  const savedSearchStrings = database.prepare('SELECT * FROM requirement_search_strings WHERE requirementId = ?').get(requirementId) as RequirementSearchStringRecord
  recordAuditEvent(database, 'Search Strings Updated', user, `Updated search strings for ${requirement.reqId} · ${requirement.roleTitle}.`, {
    entityType: 'Requirement',
    entityId: requirementId,
    details: JSON.stringify({ linkedinBoolean: Boolean(savedSearchStrings.linkedinBoolean), githubSearch: Boolean(savedSearchStrings.githubSearch), googleXray: Boolean(savedSearchStrings.googleXray) })
  })
  return savedSearchStrings
}

function normalizeCandidateInput(input: CandidateInput): CandidateInput {
  return {
    name: input.name.trim(),
    requirementId: Number(input.requirementId),
    currentCompany: input.currentCompany.trim(),
    currentTitle: input.currentTitle.trim(),
    totalExperience: input.totalExperience.trim(),
    relevantExperience: input.relevantExperience.trim(),
    location: input.location.trim(),
    currentCtc: input.currentCtc.trim(),
    expectedCtc: input.expectedCtc.trim(),
    noticePeriod: input.noticePeriod.trim(),
    servingNotice: Boolean(input.servingNotice),
    lastWorkingDay: normalizeOptionalDateInput(input.lastWorkingDay, 'Last working day'),
    primarySkills: input.primarySkills.trim(),
    secondarySkills: input.secondarySkills.trim(),
    sourceChannel: input.sourceChannel.trim(),
    linkedinUrl: normalizeOptionalHttpUrl(input.linkedinUrl, 'LinkedIn URL'),
    githubUrl: normalizeOptionalHttpUrl(input.githubUrl, 'GitHub URL'),
    resumeFilePath: input.resumeFilePath.trim(),
    sourcerName: input.sourcerName.trim(),
    recruiterName: input.recruiterName.trim(),
    status: input.status,
    remarks: input.remarks.trim(),
    followUpDate: normalizeOptionalDateInput(input.followUpDate, 'Follow-up date'),
    statusChangeNotes: input.statusChangeNotes?.trim() ?? ''
  }
}

function getRequirementForCandidate(database: Database.Database, requirementId: number): RequirementRecord {
  const requirement = database.prepare('SELECT * FROM requirements WHERE id = ?').get(requirementId) as RequirementRecord | undefined
  if (!requirement) {
    throw new Error('Requirement not found for candidate.')
  }
  return requirement
}

function prepareCandidateForStorage(database: Database.Database, input: CandidateInput): Record<string, string | number> {
  const candidate = normalizeCandidateInput(input)
  if (!candidate.name) {
    throw new Error('Missing required field: Candidate Name')
  }
  if (!candidate.requirementId) {
    throw new Error('Missing required field: Requirement')
  }
  if (!getCandidateStatuses(database).includes(candidate.status)) {
    throw new Error('Invalid candidate status.')
  }

  const requirement = getRequirementForCandidate(database, candidate.requirementId)
  return {
    ...candidate,
    requirementTitle: requirement.roleTitle,
    servingNotice: candidate.servingNotice ? 1 : 0,
    stage: candidate.status,
    updatedAt: new Date().toISOString(),
    sourcerName: candidate.sourcerName || requirement.assignedSourcer,
    recruiterName: candidate.recruiterName || requirement.recruiterOwner,
    assignedRecruiter: requirement.recruiterOwner,
    assignedSourcer: requirement.assignedSourcer
  }
}

function prepareSeedCandidateForStorage(database: Database.Database, seedCandidate: SeedCandidate, requirementId: number): Record<string, string | number> {
  const { requirementReqId: _requirementReqId, updatedAt, statusHistory: _statusHistory, ...candidateInput } = seedCandidate
  const candidate = prepareCandidateForStorage(database, { ...candidateInput, requirementId })
  return {
    ...candidate,
    updatedAt
  }
}

type CandidateDatabaseRow = Omit<CandidateRecord, 'servingNotice' | 'statusHistory' | 'daysInCurrentStage' | 'totalDaysInPipeline'> & { servingNotice: number | boolean }

function daysBetween(startIso: string, endDate = new Date()): number {
  const startDate = new Date(startIso)
  if (Number.isNaN(startDate.getTime())) {
    return 0
  }

  const millisecondsPerDay = 1000 * 60 * 60 * 24
  return Math.max(0, Math.floor((endDate.getTime() - startDate.getTime()) / millisecondsPerDay))
}

function mapCandidateRow(row: CandidateDatabaseRow, statusHistory: CandidateStatusHistoryRecord[] = []): CandidateRecord {
  const latestStageChange = statusHistory.find((history) => history.newStatus === row.status)
  const firstPipelineEvent = statusHistory[statusHistory.length - 1]

  return {
    ...row,
    servingNotice: Boolean(row.servingNotice),
    statusHistory,
    daysInCurrentStage: daysBetween(latestStageChange?.changedAt ?? row.updatedAt),
    totalDaysInPipeline: daysBetween(firstPipelineEvent?.changedAt ?? row.updatedAt)
  }
}

function getCandidateStatusHistory(database: Database.Database, candidateId: number): CandidateStatusHistoryRecord[] {
  return database
    .prepare('SELECT * FROM candidate_status_history WHERE candidateId = ? ORDER BY changedAt DESC, id DESC')
    .all(candidateId) as CandidateStatusHistoryRecord[]
}

function mapCandidateWithHistory(database: Database.Database, row: CandidateDatabaseRow): CandidateRecord {
  return mapCandidateRow(row, getCandidateStatusHistory(database, row.id))
}

function insertCandidateStatusHistory(
  database: Database.Database,
  candidateId: number | bigint,
  oldStatus: CandidateStatus | '',
  newStatus: CandidateStatus,
  user: AuthenticatedUser,
  notes = '',
  changedAt = new Date().toISOString()
): void {
  database
    .prepare(
      `INSERT INTO candidate_status_history (candidateId, oldStatus, newStatus, changedByUser, changedAt, notes)
       VALUES (@candidateId, @oldStatus, @newStatus, @changedByUser, @changedAt, @notes)`
    )
    .run({
      candidateId,
      oldStatus,
      newStatus,
      changedByUser: user.username,
      changedAt,
      notes: notes.trim()
    })
}

function assertCanAccessCandidate(database: Database.Database, candidateId: number, user: AuthenticatedUser): CandidateRecord {
  const candidate = database.prepare('SELECT * FROM candidates WHERE id = ?').get(candidateId) as (Omit<CandidateRecord, 'servingNotice'> & { servingNotice: number }) | undefined
  if (!candidate) {
    throw new Error('Candidate not found.')
  }

  assertCanAccessRequirement(database, candidate.requirementId, user)
  return mapCandidateRow(candidate)
}

export function createCandidate(input: CandidateInput, user?: AuthenticatedUser): CandidateRecord {
  if (!user) {
    throw new Error('You must be logged in to create candidates.')
  }

  const database = connectDatabase()
  assertCanAccessRequirement(database, input.requirementId, user)
  const candidate = prepareCandidateForStorage(database, input)
  const result = database
    .prepare(
      `INSERT INTO candidates (
         name, requirementId, requirementTitle, currentCompany, currentTitle, totalExperience, relevantExperience, location,
         currentCtc, expectedCtc, noticePeriod, servingNotice, lastWorkingDay, primarySkills, secondarySkills, sourceChannel,
         linkedinUrl, githubUrl, resumeFilePath, sourcerName, recruiterName, status, stage, remarks, followUpDate, updatedAt, assignedRecruiter, assignedSourcer
       ) VALUES (
         @name, @requirementId, @requirementTitle, @currentCompany, @currentTitle, @totalExperience, @relevantExperience, @location,
         @currentCtc, @expectedCtc, @noticePeriod, @servingNotice, @lastWorkingDay, @primarySkills, @secondarySkills, @sourceChannel,
         @linkedinUrl, @githubUrl, @resumeFilePath, @sourcerName, @recruiterName, @status, @stage, @remarks, @followUpDate, @updatedAt, @assignedRecruiter, @assignedSourcer
       )`
    )
    .run(candidate) as { lastInsertRowid: number | bigint }

  insertCandidateStatusHistory(database, result.lastInsertRowid, '', candidate.status as CandidateStatus, user, candidate.statusChangeNotes as string)

  const createdCandidate = mapCandidateWithHistory(database, database.prepare('SELECT * FROM candidates WHERE id = ?').get(result.lastInsertRowid) as CandidateDatabaseRow)
  recordAuditEvent(database, 'Candidate Created', user, `Created candidate ${createdCandidate.name} for ${createdCandidate.requirementTitle}.`, {
    entityType: 'Candidate',
    entityId: createdCandidate.id,
    details: JSON.stringify({ status: createdCandidate.status, requirementId: createdCandidate.requirementId })
  })
  return createdCandidate
}

export function updateCandidate(id: number, input: CandidateInput, user?: AuthenticatedUser): CandidateRecord {
  assertPositiveInteger(id, 'Candidate ID')
  if (!user) {
    throw new Error('You must be logged in to update candidates.')
  }

  const database = connectDatabase()
  const currentCandidate = assertCanAccessCandidate(database, id, user)
  assertCanAccessRequirement(database, input.requirementId, user)
  const candidate = prepareCandidateForStorage(database, input)
  database
    .prepare(
      `UPDATE candidates
       SET name = @name,
           requirementId = @requirementId,
           requirementTitle = @requirementTitle,
           currentCompany = @currentCompany,
           currentTitle = @currentTitle,
           totalExperience = @totalExperience,
           relevantExperience = @relevantExperience,
           location = @location,
           currentCtc = @currentCtc,
           expectedCtc = @expectedCtc,
           noticePeriod = @noticePeriod,
           servingNotice = @servingNotice,
           lastWorkingDay = @lastWorkingDay,
           primarySkills = @primarySkills,
           secondarySkills = @secondarySkills,
           sourceChannel = @sourceChannel,
           linkedinUrl = @linkedinUrl,
           githubUrl = @githubUrl,
           resumeFilePath = @resumeFilePath,
           sourcerName = @sourcerName,
           recruiterName = @recruiterName,
           status = @status,
           stage = @stage,
           remarks = @remarks,
           followUpDate = @followUpDate,
           updatedAt = @updatedAt,
           assignedRecruiter = @assignedRecruiter,
           assignedSourcer = @assignedSourcer
       WHERE id = @id`
    )
    .run({ ...candidate, id })

  if (currentCandidate.status !== candidate.status) {
    insertCandidateStatusHistory(database, id, currentCandidate.status, candidate.status as CandidateStatus, user, candidate.statusChangeNotes as string)
    recordAuditEvent(database, 'Candidate Status Changed', user, `Changed ${currentCandidate.name}'s status from ${currentCandidate.status} to ${candidate.status}.`, {
      entityType: 'Candidate',
      entityId: id,
      details: JSON.stringify({ oldStatus: currentCandidate.status, newStatus: candidate.status, notes: candidate.statusChangeNotes })
    })
  }

  const updatedCandidate = mapCandidateWithHistory(database, database.prepare('SELECT * FROM candidates WHERE id = ?').get(id) as CandidateDatabaseRow)
  recordAuditEvent(database, 'Candidate Updated', user, `Updated candidate ${updatedCandidate.name}.`, {
    entityType: 'Candidate',
    entityId: updatedCandidate.id,
    details: JSON.stringify({ status: updatedCandidate.status, requirementId: updatedCandidate.requirementId })
  })
  return updatedCandidate
}

export function deleteCandidate(id: number, user?: AuthenticatedUser): boolean {
  assertPositiveInteger(id, 'Candidate ID')
  if (!user) {
    throw new Error('You must be logged in to delete candidates.')
  }

  const database = connectDatabase()
  const candidate = assertCanAccessCandidate(database, id, user)
  database.prepare('DELETE FROM candidates WHERE id = ?').run(id)
  recordAuditEvent(database, 'Candidate Deleted', user, `Deleted candidate ${candidate.name}.`, {
    entityType: 'Candidate',
    entityId: id,
    details: JSON.stringify({ requirementId: candidate.requirementId, status: candidate.status })
  })
  return true
}


type RecruiterDashboardMetrics = PulseSnapshot['metrics']

type CandidateFunnelStage = 'contacted' | 'interested' | 'screenShortlisted' | 'interviewsScheduled' | 'offersReleased' | 'offersAccepted' | 'joined' | 'offerDropped'

const funnelStageMinimums: Record<CandidateFunnelStage, CandidateStatus[]> = {
  contacted: defaultCandidateStatuses.filter((status) => status !== 'New Profile'),
  interested: [
    'Interested',
    'Screen Shortlisted',
    'Screen Rejected',
    'HM Shortlisted',
    'Interview 1 Scheduled',
    'Interview 1 Selected',
    'Interview 1 Rejected',
    'Interview 2 Scheduled',
    'Interview 2 Selected',
    'Final Round',
    'Offer Discussion',
    'Offer Released',
    'Offer Accepted',
    'Offer Dropped',
    'Joined'
  ],
  screenShortlisted: [
    'Screen Shortlisted',
    'Screen Rejected',
    'HM Shortlisted',
    'Interview 1 Scheduled',
    'Interview 1 Selected',
    'Interview 1 Rejected',
    'Interview 2 Scheduled',
    'Interview 2 Selected',
    'Final Round',
    'Offer Discussion',
    'Offer Released',
    'Offer Accepted',
    'Offer Dropped',
    'Joined'
  ],
  interviewsScheduled: [
    'Interview 1 Scheduled',
    'Interview 1 Selected',
    'Interview 1 Rejected',
    'Interview 2 Scheduled',
    'Interview 2 Selected',
    'Final Round',
    'Offer Discussion',
    'Offer Released',
    'Offer Accepted',
    'Offer Dropped',
    'Joined'
  ],
  offersReleased: ['Offer Released', 'Offer Accepted', 'Offer Dropped', 'Joined'],
  offersAccepted: ['Offer Accepted', 'Offer Dropped', 'Joined'],
  joined: ['Joined'],
  offerDropped: ['Offer Dropped']
}

function hasReachedCandidateStage(candidate: CandidateRecord, stage: CandidateFunnelStage): boolean {
  const qualifyingStatuses = funnelStageMinimums[stage]
  return qualifyingStatuses.includes(candidate.status) || candidate.statusHistory.some((history) => qualifyingStatuses.includes(history.newStatus))
}

function countCandidatesAtOrBeyond(candidates: CandidateRecord[], stage: CandidateFunnelStage): number {
  return candidates.filter((candidate) => hasReachedCandidateStage(candidate, stage)).length
}

function calculateAverageDaysToClose(requirements: RequirementRecord[], candidates: CandidateRecord[]): number {
  const requirementCloseDurations = requirements
    .filter((requirement) => requirement.status === 'Closed' && requirement.createdAt && requirement.closedAt)
    .map((requirement) => daysBetween(requirement.createdAt, new Date(requirement.closedAt)))
    .filter((days) => days > 0)

  if (requirementCloseDurations.length > 0) {
    return Math.round(requirementCloseDurations.reduce((total, days) => total + days, 0) / requirementCloseDurations.length)
  }

  const acceptedCandidateDurations = candidates
    .filter((candidate) => candidate.status === 'Joined' || candidate.status === 'Offer Accepted')
    .map((candidate) => candidate.totalDaysInPipeline)
    .filter((days) => days > 0)

  if (acceptedCandidateDurations.length === 0) {
    return 0
  }

  return Math.round(acceptedCandidateDurations.reduce((total, days) => total + days, 0) / acceptedCandidateDurations.length)
}

function buildRecruiterMetrics(
  requirements: RequirementRecord[],
  candidates: CandidateRecord[],
  reports: ReportRecord[],
  user?: AuthenticatedUser
): RecruiterDashboardMetrics {
  const openRequirements = requirements.filter((item) => item.status === 'Open').length
  const riskItems = requirements.filter((item) => item.priority === 'Critical' || item.status === 'On Hold').length

  return {
    complianceScore: 92,
    openRequirements,
    reportsGenerated: user?.role === 'Admin' || !user ? reports.length : 0,
    riskItems,
    activeCandidates: candidates.length,
    profilesSourced: candidates.length,
    contacted: countCandidatesAtOrBeyond(candidates, 'contacted'),
    interested: countCandidatesAtOrBeyond(candidates, 'interested'),
    screenShortlisted: countCandidatesAtOrBeyond(candidates, 'screenShortlisted'),
    interviewsScheduled: countCandidatesAtOrBeyond(candidates, 'interviewsScheduled'),
    offersReleased: countCandidatesAtOrBeyond(candidates, 'offersReleased'),
    offersAccepted: countCandidatesAtOrBeyond(candidates, 'offersAccepted'),
    joined: countCandidatesAtOrBeyond(candidates, 'joined'),
    offerDrops: countCandidatesAtOrBeyond(candidates, 'offerDropped'),
    averageDaysToClose: calculateAverageDaysToClose(requirements, candidates)
  }
}

export function getPulseSnapshot(user?: AuthenticatedUser): PulseSnapshot {
  const database = connectDatabase()
  const allRequirements = attachRequirementDetails(database, database.prepare('SELECT * FROM requirements ORDER BY targetClosureDate ASC, reqId ASC').all() as RequirementRecord[])
  const allCandidates = (database.prepare('SELECT * FROM candidates ORDER BY updatedAt DESC').all() as CandidateDatabaseRow[]).map((candidate) => mapCandidateWithHistory(database, candidate))
  const reports = database.prepare('SELECT * FROM reports ORDER BY updatedAt DESC').all() as ReportRecord[]
  const settingsRow = database.prepare('SELECT * FROM settings WHERE id = 1').get() as {
    organizationName: string
    dataRegion: string
    notificationsEnabled: number
    defaultBackupFolder: string
    oneDriveBackupFolder: string
    backupFrequency: 'Daily' | 'Weekly' | 'Monthly'
    defaultCurrency: string
    defaultLocation: string
    lastBackupAt: string
    lastBackupStatus: string
    lastBackupPath: string
  }
  const users = database.prepare('SELECT id, username, role, displayName FROM users ORDER BY username COLLATE NOCASE').all() as UserManagementRecord[]

  const requirements = filterByUser(allRequirements, user)
  const candidates = filterByUser(allCandidates, user)

  return {
    requirements,
    candidates,
    reports: user?.role === 'Admin' || !user ? reports : [],
    settings: {
      organizationName: settingsRow.organizationName,
      dataRegion: settingsRow.dataRegion,
      notificationsEnabled: Boolean(settingsRow.notificationsEnabled),
      defaultBackupFolder: settingsRow.defaultBackupFolder || getDailyBackupDirectory(),
      oneDriveBackupFolder: settingsRow.oneDriveBackupFolder,
      localBackupFolder: getDailyBackupDirectory(),
      lastBackupAt: settingsRow.lastBackupAt,
      lastBackupStatus: settingsRow.lastBackupStatus,
      lastBackupPath: settingsRow.lastBackupPath,
      backupFrequency: settingsRow.backupFrequency,
      defaultCurrency: settingsRow.defaultCurrency,
      defaultLocation: settingsRow.defaultLocation,
      users: user?.role === 'Admin' || !user ? users : [],
      sourceChannels: getSourceChannels(database),
      candidateStatuses: getCandidateStatuses(database)
    },
    metrics: buildRecruiterMetrics(requirements, candidates, reports, user)
  }
}

export function getBackupSettings(): BackupSettings & { localBackupFolder: string } {
  const database = connectDatabase()
  const settings = database.prepare('SELECT defaultBackupFolder, oneDriveBackupFolder, lastBackupAt, lastBackupStatus, lastBackupPath FROM settings WHERE id = 1').get() as BackupSettings & { defaultBackupFolder: string }
  return { ...settings, localBackupFolder: getDailyBackupDirectory() }
}

export async function runBackupNow(user?: AuthenticatedUser): Promise<BackupResult> {
  const database = connectDatabase()
  const result = await createBackup(database, 'Manual')
  if (result.success) {
    recordAuditEvent(database, 'Backup Created', user, `Created backup at ${result.localBackupPath ?? result.lastBackupPath}.`, {
      entityType: 'Backup',
      entityId: result.localBackupPath ?? result.lastBackupPath,
      details: JSON.stringify({ status: result.lastBackupStatus, oneDriveBackupPath: result.oneDriveBackupPath ?? '' })
    })
  }
  return result
}

export async function runStartupBackup(): Promise<BackupResult | undefined> {
  const database = connectDatabase()
  const result = await createStartupBackupIfNeeded(database)
  if (result?.success) {
    recordAuditEvent(database, 'Backup Created', undefined, `Created startup backup at ${result.localBackupPath ?? result.lastBackupPath}.`, {
      entityType: 'Backup',
      entityId: result.localBackupPath ?? result.lastBackupPath,
      details: JSON.stringify({ status: result.lastBackupStatus, oneDriveBackupPath: result.oneDriveBackupPath ?? '' })
    })
  }
  return result
}

export function updateOneDriveBackupFolder(folderPath: string): BackupSettings & { localBackupFolder: string } {
  const settings = setOneDriveBackupFolder(connectDatabase(), folderPath)
  return { ...settings, localBackupFolder: getDailyBackupDirectory() }
}

export function restoreFromBackup(zipPath: string, user?: AuthenticatedUser): BackupResult {
  const database = connectDatabase()
  const result = restoreBackup(database, zipPath)
  db = undefined
  if (result.success) {
    const restoredDatabase = connectDatabase()
    recordAuditEvent(restoredDatabase, 'Restore Performed', user, `Restored backup ${zipPath}.`, {
      entityType: 'Backup',
      entityId: zipPath,
      details: JSON.stringify({ message: result.message })
    })
  }
  return result
}

export function closeDatabase(): void {
  db?.close()
  db = undefined
}
