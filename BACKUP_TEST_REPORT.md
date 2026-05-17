# Backup and Restore Test Report

**Date:** 2026-05-17  
**Scope:** ZIP backup creation, local backup folder creation, OneDrive folder copy, backup integrity validation, restore workflow, corrupted backup handling, and missing backup handling.

## Summary

All requested backup and restore scenarios passed after adding stronger ZIP integrity validation and a repeatable automated backup/restore test harness.

| Validation area | Result | Evidence |
| --- | --- | --- |
| ZIP backup creation | Pass | `createBackup` produced a non-empty `.zip` file in the configured backup directory. |
| Backup folder creation | Pass | The configured default backup folder was created recursively before writing the ZIP. |
| OneDrive folder copy | Pass | The backup ZIP was copied to the configured OneDrive sync folder and byte-matched the local backup. |
| Backup integrity | Pass | The backup ZIP contained `backup-manifest.json`, `config/app-settings.json`, and `database/experian-pulse.sqlite`; CRC checksum validation passed for all entries. |
| Restore process | Pass | Restoring a backup replaced the modified SQLite database with the original backed-up data. |
| Corrupted backup handling | Pass | A ZIP with a deliberately corrupted database payload failed restore with checksum validation and did not modify the live database. |
| Missing backup handling | Pass | Restoring a nonexistent ZIP returned a controlled “Backup ZIP was not found.” failure. |

## Fixes Applied

1. Added ZIP reader bounds checks, local header validation, stored-size consistency checks, and CRC32 checksum verification.
2. Added `validateBackupFile` so backup integrity can be checked directly before restore and by automated tests.
3. Improved missing backup behavior with a clear not-found result instead of surfacing a raw filesystem error.
4. Added SQLite `quick_check` validation on the temporary restore file before replacing the live database.
5. Tightened restore target path validation using path-relative checks.
6. Added an automated `npm run test:backup` script that runs all requested backup/restore scenarios in an isolated temporary workspace.

## Commands Run

```bash
npm run test:backup
npm run typecheck
```

## Latest Test Output

```text
Backup/restore tests passed.
```

## Notes

- The test harness bundles `src/main/backup.ts` with an Electron app/dialog stub so it can run in CI/headless environments without launching Electron.
- The first attempted Electron-runtime execution could not run in this container because a system GUI library (`libatk-1.0.so.0`) is missing. The final automated test avoids that environment dependency while exercising the same backup module logic.
