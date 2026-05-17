import Database from 'better-sqlite3'
import XLSX from 'xlsx'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { performance } from 'node:perf_hooks'

const requirementCount = 500
const candidateCount = 10_000
const recruiters = Array.from({ length: 10 }, (_, index) => `recruiter${index + 1}`)
const sourcers = Array.from({ length: 12 }, (_, index) => `sourcer${index + 1}`)
const statuses = [
  'New Profile',
  'Contacted',
  'Interested',
  'Screen Shortlisted',
  'HM Shortlisted',
  'Interview 1 Scheduled',
  'Offer Released',
  'Offer Accepted',
  'Offer Dropped',
  'Joined'
]
const sources = ['LinkedIn', 'Referral', 'Naukri', 'Indeed', 'GitHub', 'Agency']
const locations = ['New York', 'Atlanta', 'Costa Mesa', 'Remote', 'Hyderabad', 'Bengaluru']

function timed(label, fn) {
  const startMemory = process.memoryUsage().heapUsed
  const start = performance.now()
  const value = fn()
  const durationMs = performance.now() - start
  const heapDeltaMb = (process.memoryUsage().heapUsed - startMemory) / 1024 / 1024
  return { label, durationMs, heapDeltaMb, value }
}

function createDatabase() {
  const dir = mkdtempSync(join(tmpdir(), 'experian-pulse-stress-'))
  const dbPath = join(dir, 'pulse.sqlite')
  const db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  db.pragma('synchronous = NORMAL')
  db.pragma('temp_store = MEMORY')
  db.pragma('busy_timeout = 5000')
  db.exec(`
    CREATE TABLE requirements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reqId TEXT NOT NULL UNIQUE,
      roleTitle TEXT NOT NULL,
      businessUnit TEXT NOT NULL,
      priority TEXT NOT NULL,
      targetClosureDate TEXT NOT NULL,
      recruiterOwner TEXT NOT NULL,
      assignedSourcer TEXT NOT NULL,
      status TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      closedAt TEXT NOT NULL DEFAULT ''
    );
    CREATE TABLE candidates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      requirementId INTEGER NOT NULL,
      requirementTitle TEXT NOT NULL,
      sourceChannel TEXT NOT NULL,
      sourcerName TEXT NOT NULL,
      recruiterName TEXT NOT NULL,
      assignedRecruiter TEXT NOT NULL,
      assignedSourcer TEXT NOT NULL,
      location TEXT NOT NULL,
      status TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      FOREIGN KEY (requirementId) REFERENCES requirements(id) ON DELETE CASCADE
    );
    CREATE TABLE candidate_status_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      candidateId INTEGER NOT NULL,
      oldStatus TEXT NOT NULL DEFAULT '',
      newStatus TEXT NOT NULL,
      changedByUser TEXT NOT NULL,
      changedAt TEXT NOT NULL,
      notes TEXT NOT NULL DEFAULT ''
    );
    CREATE INDEX idx_requirements_recruiter_owner ON requirements(recruiterOwner);
    CREATE INDEX idx_requirements_assigned_sourcer ON requirements(assignedSourcer);
    CREATE INDEX idx_requirements_status_target_date ON requirements(status, targetClosureDate);
    CREATE INDEX idx_candidates_requirement_id ON candidates(requirementId);
    CREATE INDEX idx_candidates_assigned_recruiter_updated ON candidates(assignedRecruiter, updatedAt DESC);
    CREATE INDEX idx_candidates_assigned_sourcer_updated ON candidates(assignedSourcer, updatedAt DESC);
    CREATE INDEX idx_candidates_status ON candidates(status);
    CREATE INDEX idx_candidates_filter_status_sourcer_source_location ON candidates(status, sourcerName, sourceChannel, location);
    CREATE INDEX idx_candidate_status_history_candidate_changed ON candidate_status_history(candidateId, changedAt DESC, id DESC);
  `)
  return { db, dir }
}

function seed(db) {
  const insertReq = db.prepare(`INSERT INTO requirements (reqId, roleTitle, businessUnit, priority, targetClosureDate, recruiterOwner, assignedSourcer, status, createdAt)
    VALUES (@reqId, @roleTitle, @businessUnit, @priority, @targetClosureDate, @recruiterOwner, @assignedSourcer, @status, @createdAt)`)
  const insertCandidate = db.prepare(`INSERT INTO candidates (name, requirementId, requirementTitle, sourceChannel, sourcerName, recruiterName, assignedRecruiter, assignedSourcer, location, status, updatedAt)
    VALUES (@name, @requirementId, @requirementTitle, @sourceChannel, @sourcerName, @recruiterName, @assignedRecruiter, @assignedSourcer, @location, @status, @updatedAt)`)
  const insertHistory = db.prepare(`INSERT INTO candidate_status_history (candidateId, oldStatus, newStatus, changedByUser, changedAt, notes)
    VALUES (@candidateId, @oldStatus, @newStatus, @changedByUser, @changedAt, @notes)`)

  db.transaction(() => {
    for (let index = 1; index <= requirementCount; index += 1) {
      insertReq.run({
        reqId: `REQ-STRESS-${String(index).padStart(4, '0')}`,
        roleTitle: `Role ${index}`,
        businessUnit: `BU ${index % 8}`,
        priority: ['Low', 'Medium', 'High', 'Critical'][index % 4],
        targetClosureDate: `2026-06-${String((index % 28) + 1).padStart(2, '0')}`,
        recruiterOwner: recruiters[index % recruiters.length],
        assignedSourcer: sourcers[index % sourcers.length],
        status: ['Open', 'Open', 'On Hold', 'Closed'][index % 4],
        createdAt: new Date(2026, 0, (index % 90) + 1).toISOString()
      })
    }

    const requirements = db.prepare('SELECT id, roleTitle, recruiterOwner, assignedSourcer FROM requirements').all()
    for (let index = 1; index <= candidateCount; index += 1) {
      const requirement = requirements[index % requirements.length]
      const status = statuses[index % statuses.length]
      const updatedAt = new Date(2026, 2, (index % 60) + 1, index % 24, index % 60).toISOString()
      const result = insertCandidate.run({
        name: `Candidate ${index}`,
        requirementId: requirement.id,
        requirementTitle: requirement.roleTitle,
        sourceChannel: sources[index % sources.length],
        sourcerName: requirement.assignedSourcer,
        recruiterName: requirement.recruiterOwner,
        assignedRecruiter: requirement.recruiterOwner,
        assignedSourcer: requirement.assignedSourcer,
        location: locations[index % locations.length],
        status,
        updatedAt
      })
      insertHistory.run({ candidateId: result.lastInsertRowid, oldStatus: '', newStatus: 'New Profile', changedByUser: requirement.recruiterOwner, changedAt: updatedAt, notes: 'Seeded' })
      if (status !== 'New Profile') {
        insertHistory.run({ candidateId: result.lastInsertRowid, oldStatus: 'New Profile', newStatus: status, changedByUser: requirement.recruiterOwner, changedAt: updatedAt, notes: 'Advanced' })
      }
    }
  })()
}

function getSnapshot(db, user) {
  const reqWhere = user?.role === 'Recruiter' ? 'WHERE recruiterOwner = @username' : user?.role === 'Sourcer' ? 'WHERE assignedSourcer = @username' : ''
  const candWhere = user?.role === 'Recruiter' ? 'WHERE assignedRecruiter = @username' : user?.role === 'Sourcer' ? 'WHERE assignedSourcer = @username' : ''
  const params = user ? { username: user.username } : {}
  const requirements = db.prepare(`SELECT * FROM requirements ${reqWhere} ORDER BY targetClosureDate ASC, reqId ASC`).all(params)
  const candidateRows = db.prepare(`SELECT * FROM candidates ${candWhere} ORDER BY updatedAt DESC`).all(params)
  const ids = candidateRows.map((candidate) => candidate.id)
  const histories = new Map()
  for (let index = 0; index < ids.length; index += 900) {
    const chunk = ids.slice(index, index + 900)
    if (chunk.length === 0) continue
    const rows = db.prepare(`SELECT * FROM candidate_status_history WHERE candidateId IN (${chunk.map(() => '?').join(',')}) ORDER BY candidateId ASC, changedAt DESC, id DESC`).all(...chunk)
    for (const row of rows) {
      const list = histories.get(row.candidateId) ?? []
      list.push(row)
      histories.set(row.candidateId, list)
    }
  }
  const candidates = candidateRows.map((candidate) => ({ ...candidate, statusHistory: histories.get(candidate.id) ?? [] }))
  return { requirements, candidates }
}

function runFilters(snapshot) {
  const filterSet = [
    { status: 'Interested', sourceChannel: 'LinkedIn' },
    { sourcerName: 'sourcer4', location: 'Remote' },
    { status: 'Offer Released', location: 'Atlanta' },
    { sourceChannel: 'Referral' },
    { status: 'Joined' }
  ]
  return filterSet.map((filter) => snapshot.candidates.filter((candidate) => Object.entries(filter).every(([key, value]) => candidate[key] === value)).length)
}

function runDashboard(snapshot) {
  const statusCounts = new Map()
  for (const candidate of snapshot.candidates) {
    statusCounts.set(candidate.status, (statusCounts.get(candidate.status) ?? 0) + 1)
  }
  const openRequirements = snapshot.requirements.filter((requirement) => requirement.status === 'Open').length
  const riskItems = snapshot.requirements.filter((requirement) => requirement.priority === 'Critical' || requirement.status === 'On Hold').length
  return { statusCounts: Object.fromEntries(statusCounts), openRequirements, riskItems }
}

function runExcel(snapshot) {
  const workbook = XLSX.utils.book_new()
  const rows = snapshot.candidates.map((candidate) => ({
    Name: candidate.name,
    Requirement: candidate.requirementTitle,
    Status: candidate.status,
    Source: candidate.sourceChannel,
    Recruiter: candidate.assignedRecruiter,
    Sourcer: candidate.assignedSourcer,
    Location: candidate.location
  }))
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), 'Candidates')
  return XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer', bookSST: false, compression: true }).byteLength
}

const { db, dir } = createDatabase()
try {
  const results = []
  results.push(timed('seed 500 requirements and 10,000 candidates', () => seed(db)))
  const adminSnapshotResult = timed('admin dashboard snapshot', () => getSnapshot(db))
  results.push(adminSnapshotResult)
  results.push(timed('10 recruiter/sourcer snapshots', () => {
    for (const username of recruiters) getSnapshot(db, { role: 'Recruiter', username })
    for (const username of sourcers.slice(0, 2)) getSnapshot(db, { role: 'Sourcer', username })
  }))
  results.push(timed('simultaneous-style filtering across 5 filter sets', () => runFilters(adminSnapshotResult.value)))
  results.push(timed('dashboard aggregate calculations', () => runDashboard(adminSnapshotResult.value)))
  results.push(timed('Excel export buffer for 10,000 rows', () => runExcel(adminSnapshotResult.value)))

  const plans = {
    recruiterCandidateLookup: db.prepare("EXPLAIN QUERY PLAN SELECT * FROM candidates WHERE assignedRecruiter = 'recruiter1' ORDER BY updatedAt DESC").all(),
    historyBatchLookup: db.prepare('EXPLAIN QUERY PLAN SELECT * FROM candidate_status_history WHERE candidateId IN (1,2,3) ORDER BY candidateId ASC, changedAt DESC, id DESC').all()
  }

  console.log(JSON.stringify({
    dataset: { requirementCount, candidateCount, recruiters: recruiters.length, sourcers: sourcers.length },
    results: results.map(({ label, durationMs, heapDeltaMb, value }) => ({
      label,
      durationMs: Number(durationMs.toFixed(2)),
      heapDeltaMb: Number(heapDeltaMb.toFixed(2)),
      value: typeof value === 'number' ? value : undefined
    })),
    plans
  }, null, 2))
} finally {
  db.close()
  rmSync(dir, { recursive: true, force: true })
}
