# Experian Pulse Performance Report

## Scope

Stress testing was performed against the Experian Pulse recruiting workflow on May 17, 2026. The workload simulated:

- 10,000 candidate records.
- 500 requirements.
- 10 recruiters and 12 sourcers accessing role-filtered data.
- Multiple simultaneous-style candidate filters.
- Dashboard aggregate loading.
- Excel export generation for a 10,000-row candidate dataset.

## Test Harness

A repeatable Node.js benchmark was added at `scripts/performance-stress-test.mjs` and exposed through `npm run test:performance`. The harness creates an isolated temporary SQLite database, seeds the large dataset in a transaction, applies the same high-volume access patterns used by the app, and prints duration, heap delta, output size, and SQLite query plans.

## Results

| Scenario | Duration | Heap delta | Notes |
| --- | ---: | ---: | --- |
| Seed 500 requirements and 10,000 candidates | 312.45 ms | -1.45 MB | Transactional seed completed without lock contention. |
| Admin dashboard snapshot | 225.52 ms | +11.22 MB | Includes 10,000 candidates and batched status history hydration. |
| 10 recruiter/sourcer snapshots | 277.82 ms | -3.80 MB | Role-scoped queries completed quickly using owner indexes. |
| Simultaneous-style filtering across 5 filter sets | 18.74 ms | +15.06 MB | Filtering is CPU-light; rendering all rows was the primary UI risk. |
| Dashboard aggregate calculations | 2.77 ms | +0.41 MB | Aggregates are not a bottleneck at this dataset size. |
| Excel export buffer for 10,000 rows | 576.90 ms | +15.68 MB | Produces a compressed 712,710-byte workbook buffer. |

## Slow Queries and Bottlenecks Identified

### 1. Candidate status history N+1 query pattern

**Issue:** The previous dashboard snapshot path loaded every candidate and then queried `candidate_status_history` once per candidate. At 10,000 candidates, that becomes 10,001 candidate-related queries before the dashboard can render.

**Optimization:** Candidate histories are now fetched in batched `IN (...)` queries and mapped in memory. This preserves complete status history while avoiding thousands of round trips through SQLite.

### 2. Role filtering after full-table reads

**Issue:** Recruiter and sourcer views previously loaded all requirements and candidates and then filtered them in JavaScript. With multiple recruiters loading at the same time, this inflated SQLite reads, JavaScript allocations, and IPC payload size.

**Optimization:** Snapshot loading now applies recruiter/sourcer access control in SQL with indexed `WHERE recruiterOwner = @username`, `WHERE assignedRecruiter = @username`, and `WHERE assignedSourcer = @username` predicates.

### 3. Missing SQLite indexes for high-volume dashboard access

**Issue:** Candidate filtering, dashboard snapshot ordering, and status history hydration did not have enough covering/high-selectivity indexes for the simulated 10,000-candidate workload.

**Optimization:** Added indexes for requirement ownership/status, candidate requirement joins, assigned recruiter/sourcer snapshot reads, candidate filter fields, and candidate history lookup. Query plan validation confirmed index usage for recruiter candidate lookups and batched history lookups:

- `SEARCH candidates USING INDEX idx_candidates_assigned_recruiter_updated (assignedRecruiter=?)`
- `SEARCH candidate_status_history USING INDEX idx_candidate_status_history_candidate_changed (candidateId=?)`

### 4. UI lag from rendering all filtered candidates

**Issue:** Filtering itself was fast, but rendering thousands of table rows can cause visible browser main-thread lag in Electron.

**Optimization:** The candidate table now renders the first 250 matching rows and shows the matched/rendered counts plus guidance to narrow filters or export the full requirement dataset. This avoids DOM inflation while preserving full in-memory filtering and Excel export coverage.

### 5. Excel export memory pressure

**Issue:** Generating a 10,000-row workbook is one of the heaviest client operations. The stress run completed successfully but consumed the largest measured heap increase alongside filtering.

**Optimization:** Workbook writes now enable XLSX compression and avoid shared-string-table generation (`bookSST: false`) to reduce output size and avoid extra memory overhead during large exports.

### 6. SQLite write/read contention risk

**Issue:** SQLite is single-writer by design. Large imports or exports performed alongside dashboard refreshes can contend if writes are not short-lived.

**Optimization:** The database connection now sets WAL mode with `synchronous = NORMAL`, `temp_store = MEMORY`, and a 5-second busy timeout. WAL allows readers to proceed while writes are active, and the busy timeout prevents transient lock conflicts from immediately failing under multi-recruiter activity.

## Memory Findings

- No runaway memory growth was observed in the stress harness.
- The largest heap deltas were from the 10,000-row Excel workbook generation (+15.68 MB) and array filtering (+15.06 MB).
- Admin snapshot hydration used +11.22 MB, which is acceptable for the simulated dataset but should be watched if the application grows beyond 50,000 candidates.

## SQLite Findings

- WAL mode remains appropriate for an Electron desktop app with many reads and short writes.
- Indexed role-scoped snapshots remove unnecessary full-table reads for non-admin users.
- Batched status history hydration removes the biggest query-count bottleneck.
- The next scaling limit is likely IPC payload size and renderer memory, not raw SQLite read performance, for datasets around 10,000 candidates.

## Recommendations

1. Keep `npm run test:performance` in CI or release validation when database access code changes.
2. Consider true table virtualization if users need to browse more than 250 candidates directly in the UI without narrowing filters.
3. For datasets above 50,000 candidates, move candidate filtering and pagination into SQLite-backed IPC endpoints instead of sending the entire candidate list to the renderer.
4. For very large Excel exports, consider a main-process export path or chunked export progress UI so the renderer stays responsive.

## Validation Commands

- `npm run test:performance`
- `npm run typecheck`
