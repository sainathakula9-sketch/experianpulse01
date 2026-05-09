# Bug Fix Summary

**Date:** 2026-05-09

## Fixed issues

1. **Candidate date validation hardened**
   - Added optional date validation in the main-process SQLite write path for `lastWorkingDay` and `followUpDate`.
   - Prevents invalid date strings from being saved and later breaking date inputs.

2. **Candidate URL validation hardened**
   - Added main-process validation for optional LinkedIn and GitHub URLs.
   - Added renderer GitHub URL prevalidation for faster user feedback.

3. **Excel date import corrected**
   - Excel candidate import now parses true Excel dates, serial numbers, and parseable strings into `YYYY-MM-DD`.
   - Invalid optional date cells are reported before import.

4. **Candidate owner defaults fixed**
   - Candidate persistence now falls back to the linked requirement's assigned sourcer and recruiter when display owner fields are blank.

5. **Dashboard filtered average-days-to-close fixed**
   - Dashboard now calculates average days to close from the currently filtered requirements/candidates instead of using the unfiltered global snapshot metric.

6. **Dashboard custom status handling fixed**
   - Candidate status filters and status distribution charts now include custom statuses found in SQLite candidate data.

7. **Search string audit coverage added**
   - Added `Search Strings Updated` as an audit action type.
   - Saving search strings now writes an audit event.

8. **Settings audit coverage added**
   - Added audit action types and records for workspace settings, user create/update/delete, source channel changes, and candidate status option changes.
   - Audit Trail filters now include these actions.

9. **Source channel deletion protected**
   - Admins can no longer delete source channels that existing candidates reference.

10. **Candidate requirement selector refresh bug fixed**
    - Candidate form and Excel import requirement selections now synchronize after requirement list changes.

11. **Candidate pipeline header markup fixed**
    - Removed duplicate wrapper markup in the candidate pipeline header.

## Files changed

- `src/shared/types.ts`
- `src/main/database.ts`
- `src/renderer/pages/AuditTrail.tsx`
- `src/renderer/pages/Candidates.tsx`
- `src/renderer/pages/Dashboard.tsx`
- `src/renderer/utils/excel.ts`
- `QA_REPORT.md`
- `BUG_FIX_SUMMARY.md`

## Verification

- `npm run typecheck` passed.
- `npm run build` passed.
