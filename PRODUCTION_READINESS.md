# Experian Pulse Production Readiness Review

**Review date:** 2026-05-17
**Reviewer:** Senior Product Engineering final readiness pass
**Target:** Windows 10/11 Electron desktop application with local SQLite persistence

## Executive summary

Experian Pulse is close to a controlled pilot / release-candidate state for local-first desktop usage. The application has a clear Electron preload boundary, SQLite-backed role workspaces, seeded recruitment data, WAL-mode persistence, backup/restore workflows, role-aware UI navigation, and installer metadata.

During this final review, several release-blocking or high-priority hardening items were fixed automatically:

- Replaced simple deterministic SHA-256 password storage with per-user PBKDF2 hashes and legacy-hash upgrade on next successful login.
- Stopped startup seed logic from overwriting existing local users, passwords, roles, and display names.
- Added failed-login audit events.
- Added admin-role integrity checks so the last admin cannot be demoted.
- Closed a requirement update authorization gap for recruiters and sourcers.
- Required authentication for workspace snapshots and admin authorization for backup administration operations.
- Hardened backup validation by checking manifest metadata, and made restore replacement safer on Windows by removing the old database/WAL/SHM files before renaming the validated restore database.

## Readiness rating

| Area | Rating | Notes |
| --- | --- | --- |
| Code quality | Release candidate | TypeScript compiles; code is understandable and module boundaries are clear. More automated tests are still recommended before broad rollout. |
| Security | Release candidate with enterprise caveats | Local auth is hardened, but SSO/MFA, database encryption, signed installers, and encrypted backups are still future production enhancements. |
| SQLite usage | Release candidate | WAL, foreign keys, busy timeout, indexes, prepared statements, and restore integrity checks are in place. |
| Error handling | Release candidate | Startup DB recovery and user-facing restore/backup failures are handled. Renderer still needs broader error boundary coverage for future releases. |
| Backups | Release candidate | Manual/startup backups, ZIP validation, OneDrive-folder copy warning behavior, and restore checkpointing are present. Backup encryption is not yet implemented. |
| Role permissions | Release candidate | Admin-only settings/audit/backup operations and recruiter/sourcer scoped data access are enforced in main-process data operations. |
| Audit logging | Release candidate | Login, failed login, CRUD, settings, backup, restore, intake, search-string, and status-change events are recorded. |
| Data integrity | Release candidate | Foreign keys, status history, input normalization, date/url checks, and backup quick-check validation are present. |
| UI consistency | Pilot ready | Main pages use a consistent card/table/form language and role-aware navigation. Login copy should continue to align with seeded usernames. |
| Installer readiness | Pilot ready | Electron Builder NSIS metadata exists. Final enterprise production requires Windows code signing, SmartScreen validation, and Windows packaging smoke tests. |

## Detailed review

### 1. Code quality

**Strengths**

- Main-process persistence, backup, and IPC responsibilities are separated from renderer UI code.
- SQLite calls use prepared statements and typed DTOs.
- The preload bridge exposes a constrained API instead of enabling renderer Node integration.
- TypeScript type checking passes across renderer and main-process projects.

**Follow-ups**

- Add unit tests around auth hashing, authorization boundaries, migrations, and backup validation.
- Add renderer integration tests for admin/recruiter/sourcer navigation and edit permissions.
- Consider extracting the large database module into auth, requirements, candidates, settings, audit, and reporting repositories as the product grows.

### 2. Security

**Fixed in this pass**

- Passwords now use per-user PBKDF2 hashes with random salts.
- Legacy SHA-256 hashes are still accepted for compatibility and are upgraded after successful login.
- Startup seed logic no longer overwrites existing users and passwords.
- Failed logins are recorded in the audit trail.
- Workspace snapshots now require an authenticated session.
- Backup folder selection, manual backups, and restore operations require admin authorization.

**Remaining enterprise items**

- Add Experian enterprise SSO/MFA for production identity.
- Encrypt local SQLite databases or protect with OS-level enterprise controls.
- Encrypt backup ZIP contents or store backups only in approved encrypted storage.
- Sign the Windows installer and configure enterprise deployment/update policies.

### 3. SQLite usage

**Strengths**

- WAL mode is enabled for better local concurrency.
- Foreign keys are enabled.
- Prepared statements are used for dynamic values.
- Migration helpers add missing columns for older local databases.
- Indexes exist for common recruiter, sourcer, status, requirement, and audit queries.
- Backup restore validates ZIP contents and runs SQLite `quick_check` before replacement.

**Follow-ups**

- Add explicit schema versioning using `PRAGMA user_version` for future migrations.
- Add migration tests from older DB snapshots.
- Consider `synchronous = FULL` for environments prioritizing durability over write performance.

### 4. Error handling

**Strengths**

- Startup DB open failures move broken database/WAL/SHM files aside and create a recoverable workspace.
- Backup failures update backup status without crashing the app.
- Restore failures keep the live database intact.
- Form validations surface actionable messages to users.

**Follow-ups**

- Add a renderer-level error boundary.
- Normalize all IPC errors into user-safe messages and structured support details.
- Add log rotation for main-process operational diagnostics.

### 5. Backups and restore

**Strengths**

- Daily local backup path is configured under Electron `userData`.
- Backup Now retains local ZIPs even when OneDrive copy fails.
- Restore creates a pre-restore checkpoint copy.
- Backup ZIP validation verifies manifest presence, database entry presence, CRC checks, manifest metadata, and SQLite integrity.

**Follow-ups**

- Encrypt backups before broad production use.
- Add retention policy controls.
- Add periodic restore drills against representative production-size databases.

### 6. Role permissions

**Strengths**

- Admin has full access.
- Recruiters are scoped to owned requirements and assigned candidates.
- Sourcers are scoped to assigned requirements/candidates.
- Admin-only screens are hidden by the UI and protected in main-process functions.

**Fixed in this pass**

- Requirement updates now verify the signed-in user can access the specific requirement being edited.
- Backup administration cannot be invoked through IPC by non-admin users.
- Workspace data cannot be requested before login.

### 7. Audit logging

**Strengths**

- Audit trail covers important business and administrative events.
- Audit trail is admin-only.
- Audit filters support user, action, start date, and end date.

**Fixed in this pass**

- Failed login attempts are now captured as audit events.

**Follow-ups**

- Add audit retention/export policy.
- Add immutable audit-export signing for regulated workflows.

### 8. Data integrity

**Strengths**

- Requirement/candidate CRUD validates IDs, required fields, dates, URLs, candidate statuses, and requirement existence.
- Candidate status history is inserted on status changes.
- Requirement intake and search strings use one-row-per-requirement uniqueness.
- Restore validates the database before replacing the live file.

**Follow-ups**

- Add uniqueness and normalization rules for candidate duplicate detection.
- Add bulk import validation with row-level rejection reports.
- Add constraints or guarded migrations for all enum-like columns added after initial schema creation.

### 9. UI consistency

**Strengths**

- Pages consistently use the Experian palette, rounded cards, concise labels, and role-aware layouts.
- Login, dashboard, requirements, candidates, reports, audit, and settings share navigation and page-shell conventions.
- Admin-only pages are hidden from non-admin roles.

**Follow-ups**

- Update login helper text when seeded user naming changes.
- Add high-contrast theme verification.
- Add keyboard-only workflow acceptance tests.

### 10. Installer readiness

**Strengths**

- Electron Builder NSIS configuration exists.
- Output directory and artifact naming are configured.
- One-click install is disabled, install location can be changed, and desktop/start-menu shortcuts are configured.

**Follow-ups before general availability**

- Build and smoke test the installer on Windows 10 and Windows 11.
- Sign the installer with the approved certificate.
- Validate SmartScreen behavior.
- Confirm install/uninstall behavior preserves or intentionally removes local user data according to policy.
- Add auto-update or documented manual update flow.

## Release decision

**Decision:** Approved for release-candidate packaging / controlled pilot after successful Windows installer smoke test.

**Do not proceed to broad enterprise GA until:**

1. Windows installer is code-signed and tested on target devices.
2. Backup encryption and/or approved encrypted storage policy is in place.
3. SSO/MFA production identity plan is approved or local-only deployment is formally risk accepted.
4. Automated regression coverage is added for auth, roles, SQLite migrations, backup/restore, and critical renderer workflows.
