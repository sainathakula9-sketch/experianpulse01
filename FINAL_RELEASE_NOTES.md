# Experian Pulse Final Release Notes

**Release:** Experian Pulse 0.1.0 release candidate
**Date:** 2026-05-17
**Target platform:** Windows 10/11 desktop

## Overview

Experian Pulse is a local-first Electron desktop workspace for governed talent acquisition operations. This release candidate includes role-aware workspaces for administrators, recruiters, and sourcers; SQLite persistence; candidate pipeline management; requirement intake and search-string capture; audit review; reports placeholders; settings management; and local backup/restore support with optional OneDrive folder copy.

## Final hardening completed

### Security and authentication

- Replaced deterministic SHA-256 password hashes with PBKDF2 hashes using random salts.
- Added compatibility for existing legacy password hashes with automatic upgrade on successful login.
- Prevented seeded users from overwriting local user changes on every startup.
- Added password policy checks for newly created or changed local passwords.
- Added audit records for failed login attempts.
- Required authentication before returning workspace snapshots.

### Role permissions

- Confirmed admin-only protections for settings, user management, audit trail, and backup administration.
- Fixed requirement update authorization so non-admin users cannot update requirements outside their assigned scope.
- Added safeguards to prevent demoting the last admin account or self-removing the active admin role.

### Backup and restore

- Strengthened backup ZIP validation by checking Experian Pulse manifest metadata.
- Preserved SQLite integrity checks before restore.
- Improved restore replacement behavior for Windows by removing the old database/WAL/SHM files before renaming the validated restored database.
- Kept local backup success independent from optional OneDrive copy failures; OneDrive failures produce a warning rather than losing the local backup.

### SQLite and data integrity

- Confirmed WAL mode, foreign keys, busy timeout, prepared statements, and query indexes.
- Confirmed status history recording for candidate stage transitions.
- Confirmed requirement intake/search-string uniqueness per requirement.
- Confirmed backup restore validates both ZIP CRCs and SQLite `quick_check`.

## Included product capabilities

- Admin, recruiter, and sourcer local user roles.
- Role-filtered requirements and candidate pipelines.
- Candidate status history and configurable candidate statuses.
- Requirement intake notes and sourcing search strings.
- Source-channel configuration.
- Admin audit trail with filters.
- Workspace settings management.
- Manual and startup backups.
- Restore from validated backup ZIP.
- Optional OneDrive sync-folder backup copy.
- Windows NSIS installer configuration.

## Known limitations

- Enterprise SSO/MFA is not included in this release candidate.
- SQLite database encryption is not built into the app.
- Backup ZIP encryption is not built into the app.
- Windows installer signing and SmartScreen validation must be completed in the Windows release pipeline.
- AI Assistant responses are rule-based placeholders; no external AI provider is connected.
- Automated UI regression coverage is not yet comprehensive.
- Installer validation must be completed on actual Windows 10/11 devices before broad deployment.

## Validation performed

- TypeScript project type checking completed successfully.
- Backup/restore regression script completed successfully.
- Production build completed successfully.

## Recommended deployment plan

1. Build the Windows NSIS installer on a Windows release machine.
2. Sign the installer with the approved certificate.
3. Install on clean Windows 10 and Windows 11 machines.
4. Confirm first launch, seeded login, role filtering, CRUD flows, backup creation, restore flow, and uninstall behavior.
5. Confirm local data location and backup folder behavior satisfy enterprise endpoint policy.
6. Run a controlled pilot with a small recruiting operations cohort.
7. Collect audit, backup, and workflow feedback before broad rollout.

## Release status

**Status:** Release candidate ready for controlled pilot packaging.

**GA blockers:** code signing, Windows smoke testing, backup encryption/storage policy, SSO/MFA risk decision, and automated regression expansion.
