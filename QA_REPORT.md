# Experian Pulse QA Report

**QA date:** 2026-05-09  
**Scope:** Full application QA review of login, role-based access, requirement creation, intake save/edit, search string generation, candidate creation/editing/status workflow, dashboard calculations, Excel export/import, backup creation, settings, and audit logs.

## Executive summary

Full static and build-level QA was completed against the Electron + React + SQLite codebase. The application typechecked and built successfully after fixes. No blocking build crashes remain.

Critical and medium severity issues found during QA were fixed automatically. The key fixed areas were:

- Candidate SQLite validation gaps for optional dates and profile URLs.
- Candidate import date parsing for Excel serial/date values.
- Candidate owner persistence defaults when sourcer/recruiter values are blank.
- Dashboard average-days-to-close incorrectly using unfiltered global metrics while filters were active.
- Dashboard candidate status filters/charts not including custom status options from SQLite data.
- Settings and search-string changes missing from audit logs.
- Source channels could be deleted while referenced by candidate records.
- Candidate form requirement selectors could retain stale requirement IDs after workspace refreshes.
- Minor candidate pipeline header markup issue.

## Test matrix and findings

| Area | Result | Findings | Fix status |
| --- | --- | --- | --- |
| Login | Pass | Login path authenticates against hashed SQLite users and records login audit events. Invalid credentials return a safe error. | No fix needed |
| Role-based access | Pass | Main-process checks restrict admin settings/audit actions and requirement/candidate data by assigned recruiter/sourcer. | No fix needed |
| Requirement creation/editing | Pass | Requirement required fields and target closure date validation are enforced before SQLite writes. | No fix needed |
| Intake form save/edit | Pass | Intake upsert persists and refreshes through SQLite using requirement access checks. | No fix needed |
| Search string generation | Medium issue | Search strings saved correctly, but changes were not represented in audit filters/logs. | Fixed |
| Candidate creation | Medium issue | SQLite accepted invalid optional dates/URLs and could persist blank recruiter/sourcer display owner fields. | Fixed |
| Candidate editing | Medium issue | Same validation gaps applied to edits. GitHub URL was not prevalidated in the renderer. | Fixed |
| Candidate status workflow | Pass | Status changes append history and record status-change audit events. | No fix needed |
| Dashboard calculations | Medium issue | Average days to close remained global when dashboard filters were applied. Custom candidate statuses were absent from dashboard filter/status charts. | Fixed |
| Excel export/import | Medium issue | Excel date serials/dates could import as raw strings that later failed date inputs or DB validation expectations. | Fixed |
| Backup creation | Pass | Manual/startup backup paths call backup service and write audit events on success. | No fix needed |
| Settings page | Medium issue | Settings/user/source/status option changes updated SQLite but were under-audited. Source channels in use could be deleted. | Fixed |
| Audit logs | Medium issue | Audit filter list did not include settings/search-string/configuration actions. | Fixed |
| UI issues | Low issue | Candidate pipeline header contained duplicate wrapper markup. | Fixed |

## Detailed bug list

### BUG-001 — Candidate optional dates accepted invalid values

- **Severity:** Medium
- **Area:** Candidate create/edit, Excel import, SQLite save/retrieve
- **Issue:** `lastWorkingDay` and `followUpDate` were stored after trimming only. Invalid strings could be persisted and then fail to display properly in date inputs.
- **Fix:** Added optional `YYYY-MM-DD` normalization in the main-process database layer and imported Excel date normalization.
- **Status:** Fixed

### BUG-002 — Candidate URL validation incomplete

- **Severity:** Medium
- **Area:** Candidate create/edit validation
- **Issue:** LinkedIn URL was checked only in renderer with a loose `startsWith('http')` check, GitHub URL was not checked, and main-process SQLite writes accepted invalid URL text.
- **Fix:** Added authoritative main-process URL validation for LinkedIn/GitHub and renderer GitHub prevalidation.
- **Status:** Fixed

### BUG-003 — Imported Excel dates could save/retrieve incorrectly

- **Severity:** Medium
- **Area:** Excel import, candidate save/retrieve
- **Issue:** Excel date cells and serials could import as non-date strings.
- **Fix:** XLSX parsing now uses `cellDates: true`, converts Date/serial/string dates to `YYYY-MM-DD`, and flags invalid optional date cells before import.
- **Status:** Fixed

### BUG-004 — Blank candidate owner fields persisted despite requirement assignment

- **Severity:** Medium
- **Area:** Candidate creation/editing, role-based data display
- **Issue:** Blank `sourcerName` or `recruiterName` could remain blank even when the linked requirement had assigned owners.
- **Fix:** Candidate storage now falls back to the requirement's assigned sourcer/recruiter for display owner fields while also preserving assigned-owner fields.
- **Status:** Fixed

### BUG-005 — Dashboard average days to close ignored active filters

- **Severity:** Medium
- **Area:** Dashboard calculations
- **Issue:** The dashboard card used `snapshot.metrics.averageDaysToClose`, which reflected the whole snapshot and not the current dashboard slice.
- **Fix:** Added filtered average-days-to-close calculation using closed requirements first, then completed/joined candidate pipeline duration fallback.
- **Status:** Fixed

### BUG-006 — Dashboard missed custom candidate statuses

- **Severity:** Medium
- **Area:** Dashboard filters/calculations
- **Issue:** Status filters and distribution chart were based only on hard-coded statuses, excluding custom statuses saved in SQLite.
- **Fix:** Dashboard now augments the canonical status order with statuses present in candidate data.
- **Status:** Fixed

### BUG-007 — Search-string saves were not auditable as their own action

- **Severity:** Medium
- **Area:** Search string generation, audit logs
- **Issue:** Search-string upserts persisted but did not add an audit entry, making the flow incomplete for admin audit review.
- **Fix:** Added `Search Strings Updated` audit type and records on save.
- **Status:** Fixed

### BUG-008 — Settings/configuration changes under-audited

- **Severity:** Medium
- **Area:** Settings page, audit logs
- **Issue:** Workspace settings, user management, source channel, and candidate status option changes were not consistently recorded in audit logs or filterable by action type.
- **Fix:** Added audit action types and main-process audit writes for these configuration flows; updated audit filter options.
- **Status:** Fixed

### BUG-009 — Source channel deletion could orphan existing candidate references

- **Severity:** Medium
- **Area:** Settings page, SQLite data integrity
- **Issue:** Admins could delete a source channel currently used by candidate records.
- **Fix:** Deletion now checks candidate usage and blocks removal when in use.
- **Status:** Fixed

### BUG-010 — Candidate requirement selector could hold stale IDs after snapshot refresh

- **Severity:** Medium
- **Area:** Candidate creation/import UI
- **Issue:** When requirements refreshed or were deleted, candidate form/import selectors could keep IDs no longer present in the current role's requirement list.
- **Fix:** Added synchronization to reset candidate and Excel requirement IDs to an available requirement or `0` when none exist.
- **Status:** Fixed

### BUG-011 — Candidate pipeline header markup issue

- **Severity:** Low
- **Area:** UI
- **Issue:** Duplicate wrapper markup in the candidate pipeline header could affect layout readability/maintainability.
- **Fix:** Removed the duplicate wrapper.
- **Status:** Fixed

## Validation performed

- TypeScript typecheck passed.
- Production Electron/Vite build passed.
- Code review was performed across main-process database logic, preload IPC surface, shared types, renderer pages, Excel utilities, and audit/settings flows.

## Residual recommendations

- Add automated integration tests around SQLite CRUD and RBAC using an isolated Electron user-data directory.
- Add Playwright or similar E2E coverage for login, form submission, import/export, and role navigation.
- Add UI-level toast/confirmation feedback for successful requirement/intake/search-string saves.
- Consider exposing configured candidate statuses to dashboard directly from settings rather than deriving custom values from existing candidate rows only.
