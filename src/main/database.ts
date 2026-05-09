import Database from 'better-sqlite3'
import { app } from 'electron'
import type { AuthenticatedUser, CandidateRecord, LoginResult, PulseSnapshot, ReportRecord, RequirementInput, RequirementIntakeInput, RequirementIntakeRecord, RequirementRecord, RequirementSearchStringInput, RequirementSearchStringRecord, UserRole } from '../shared/types'
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

const mockRequirements: RequirementInput[] = [
  {
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
    status: 'Open'
  },
  {
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
    status: 'Open'
  },
  {
    reqId: 'REQ-2026-003',
    roleTitle: 'Data Retention Specialist',
    businessUnit: 'Consumer Services',
    hiringManager: 'Elena Brooks',
    grade: 'G5',
    location: 'New York, NY',
    workMode: 'Onsite',
    budgetRange: '$88k - $102k',
    priority: 'Medium',
    targetClosureDate: '2026-05-03',
    recruiterOwner: 'admin',
    assignedSourcer: 'admin',
    status: 'Closed'
  },
  {
    reqId: 'REQ-2026-004',
    roleTitle: 'Incident Response Manager',
    businessUnit: 'Security Operations',
    hiringManager: 'Noah Patel',
    grade: 'G8',
    location: 'Schaumburg, IL',
    workMode: 'Hybrid',
    budgetRange: '$140k - $165k',
    priority: 'High',
    targetClosureDate: '2026-07-02',
    recruiterOwner: 'admin',
    assignedSourcer: 'sourcer',
    status: 'On Hold'
  }
]

const mockCandidates: Omit<CandidateRecord, 'id'>[] = [
  {
    name: 'Avery Johnson',
    requirementId: 1,
    requirementTitle: 'Senior Risk Analyst',
    stage: 'Recruiter screen',
    updatedAt: '2026-05-07',
    assignedRecruiter: 'recruiter',
    assignedSourcer: 'sourcer'
  },
  {
    name: 'Morgan Smith',
    requirementId: 2,
    requirementTitle: 'Procurement Controls Lead',
    stage: 'Submitted',
    updatedAt: '2026-05-06',
    assignedRecruiter: 'recruiter',
    assignedSourcer: 'sourcer'
  },
  {
    name: 'Riley Chen',
    requirementId: 4,
    requirementTitle: 'Incident Response Manager',
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
      status TEXT NOT NULL CHECK (status IN ('Open', 'On Hold', 'Closed', 'Cancelled'))
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
  migrateLegacyRequirements(database)
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
      INSERT INTO requirements (reqId, roleTitle, businessUnit, hiringManager, grade, location, workMode, budgetRange, priority, targetClosureDate, recruiterOwner, assignedSourcer, status)
      VALUES (@reqId, @roleTitle, @businessUnit, @hiringManager, @grade, @location, @workMode, @budgetRange, @priority, @targetClosureDate, @recruiterOwner, @assignedSourcer, @status)
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

function filterByUser<T extends { recruiterOwner?: string; assignedRecruiter?: string; assignedSourcer: string }>(items: T[], user?: AuthenticatedUser): T[] {
  if (!user || user.role === 'Admin') {
    return items
  }

  if (user.role === 'Recruiter') {
    return items.filter((item) => (item.recruiterOwner ?? item.assignedRecruiter) === user.username)
  }

  return items.filter((item) => item.assignedSourcer === user.username)
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
    targetClosureDate: input.targetClosureDate,
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
      `INSERT INTO requirements (reqId, roleTitle, businessUnit, hiringManager, grade, location, workMode, budgetRange, priority, targetClosureDate, recruiterOwner, assignedSourcer, status)
       VALUES (@reqId, @roleTitle, @businessUnit, @hiringManager, @grade, @location, @workMode, @budgetRange, @priority, @targetClosureDate, @recruiterOwner, @assignedSourcer, @status)`
    )
    .run(requirement) as { lastInsertRowid: number | bigint }

  return database.prepare('SELECT * FROM requirements WHERE id = ?').get(result.lastInsertRowid) as RequirementRecord
}

export function updateRequirement(id: number, input: RequirementInput, user?: AuthenticatedUser): RequirementRecord {
  assertCanManageRequirements(user)
  const database = connectDatabase()
  const requirement = normalizeRequirementInput(input, user)
  assertRequirementInput(requirement)

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
           status = @status
       WHERE id = @id`
    )
    .run({ ...requirement, id })

  const updatedRequirement = database.prepare('SELECT * FROM requirements WHERE id = ?').get(id) as RequirementRecord | undefined
  if (!updatedRequirement) {
    throw new Error('Requirement not found.')
  }

  return updatedRequirement
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

  return database.prepare('SELECT * FROM requirement_intake WHERE requirementId = ?').get(requirementId) as RequirementIntakeRecord
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
  if (!user) {
    throw new Error('You must be logged in to save search strings.')
  }

  const database = connectDatabase()
  assertCanAccessRequirement(database, requirementId, user)

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

  return database.prepare('SELECT * FROM requirement_search_strings WHERE requirementId = ?').get(requirementId) as RequirementSearchStringRecord
}

export function getPulseSnapshot(user?: AuthenticatedUser): PulseSnapshot {
  const database = connectDatabase()
  const allRequirements = attachRequirementDetails(database, database.prepare('SELECT * FROM requirements ORDER BY targetClosureDate ASC, reqId ASC').all() as RequirementRecord[])
  const allCandidates = database.prepare('SELECT * FROM candidates ORDER BY updatedAt DESC').all() as CandidateRecord[]
  const reports = database.prepare('SELECT * FROM reports ORDER BY updatedAt DESC').all() as ReportRecord[]
  const settingsRow = database.prepare('SELECT * FROM settings WHERE id = 1').get() as {
    organizationName: string
    dataRegion: string
    notificationsEnabled: number
  }

  const requirements = filterByUser(allRequirements, user)
  const candidates = filterByUser(allCandidates, user)
  const openRequirements = requirements.filter((item) => item.status === 'Open').length
  const riskItems = requirements.filter((item) => item.priority === 'Critical' || item.status === 'On Hold').length

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
