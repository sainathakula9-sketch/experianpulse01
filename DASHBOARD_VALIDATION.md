# Experian Pulse Dashboard Validation

Validation date: 2026-05-17

## Scope

This validation compares the dashboard calculations against the raw SQLite entities used by Experian Pulse:

- `requirements`
- `candidates`
- `candidate_status_history`
- `requirement_intake`
- `requirement_search_strings`

The dashboard receives these rows through `getPulseSnapshot`, which reads requirements, candidates, reports, and candidate status history from SQLite before applying user access and dashboard filters.

## Validation method

1. Use `requirements` as the source of truth for role counts, role ownership, business unit status, and requirement aging.
2. Use `candidates` as the source of truth for profile counts, source channels, recruiter/sourcer assignment, current candidate state, and joined counts.
3. Use `candidate_status_history` as the source of truth for funnel progression, productivity milestones, offer drops over time, and source conversion milestones.
4. For imported or legacy candidates with incomplete status history, fall back to the current candidate status and count it in every milestone implied by that status.
5. Apply the same dashboard filter slice to requirements and candidates before calculating charts.

## Raw SQLite comparison queries

The following SQL snippets are the validation baseline for an unfiltered admin dashboard. Add the same `WHERE` predicates used by the UI filters for date range, recruiter, sourcer, business unit, and status when validating a filtered slice.

### Candidate funnel numbers

```sql
SELECT
  COUNT(*) AS profiles_sourced,
  COUNT(DISTINCT CASE WHEN c.status IN ('Contacted','Interested','Not Interested','Screen Shortlisted','Screen Rejected','HM Shortlisted','Interview 1 Scheduled','Interview 1 Selected','Interview 1 Rejected','Interview 2 Scheduled','Interview 2 Selected','Final Round','Offer Discussion','Offer Released','Offer Accepted','Offer Dropped','Joined') OR h.newStatus IN ('Contacted','Interested','Not Interested','Screen Shortlisted','Screen Rejected','HM Shortlisted','Interview 1 Scheduled','Interview 1 Selected','Interview 1 Rejected','Interview 2 Scheduled','Interview 2 Selected','Final Round','Offer Discussion','Offer Released','Offer Accepted','Offer Dropped','Joined') THEN c.id END) AS contacted,
  COUNT(DISTINCT CASE WHEN c.status IN ('Interested','Screen Shortlisted','Screen Rejected','HM Shortlisted','Interview 1 Scheduled','Interview 1 Selected','Interview 1 Rejected','Interview 2 Scheduled','Interview 2 Selected','Final Round','Offer Discussion','Offer Released','Offer Accepted','Offer Dropped','Joined') OR h.newStatus IN ('Interested','Screen Shortlisted','Screen Rejected','HM Shortlisted','Interview 1 Scheduled','Interview 1 Selected','Interview 1 Rejected','Interview 2 Scheduled','Interview 2 Selected','Final Round','Offer Discussion','Offer Released','Offer Accepted','Offer Dropped','Joined') THEN c.id END) AS interested,
  COUNT(DISTINCT CASE WHEN c.status IN ('Screen Shortlisted','Screen Rejected','HM Shortlisted','Interview 1 Scheduled','Interview 1 Selected','Interview 1 Rejected','Interview 2 Scheduled','Interview 2 Selected','Final Round','Offer Discussion','Offer Released','Offer Accepted','Offer Dropped','Joined') OR h.newStatus IN ('Screen Shortlisted','Screen Rejected','HM Shortlisted','Interview 1 Scheduled','Interview 1 Selected','Interview 1 Rejected','Interview 2 Scheduled','Interview 2 Selected','Final Round','Offer Discussion','Offer Released','Offer Accepted','Offer Dropped','Joined') THEN c.id END) AS screen_shortlisted,
  COUNT(DISTINCT CASE WHEN c.status IN ('Interview 1 Scheduled','Interview 1 Selected','Interview 1 Rejected','Interview 2 Scheduled','Interview 2 Selected','Final Round','Offer Discussion','Offer Released','Offer Accepted','Offer Dropped','Joined') OR h.newStatus IN ('Interview 1 Scheduled','Interview 1 Selected','Interview 1 Rejected','Interview 2 Scheduled','Interview 2 Selected','Final Round','Offer Discussion','Offer Released','Offer Accepted','Offer Dropped','Joined') THEN c.id END) AS interviews_scheduled,
  COUNT(DISTINCT CASE WHEN c.status IN ('Offer Released','Offer Accepted','Offer Dropped','Joined') OR h.newStatus IN ('Offer Released','Offer Accepted','Offer Dropped','Joined') THEN c.id END) AS offers_released,
  COUNT(DISTINCT CASE WHEN c.status IN ('Offer Accepted','Offer Dropped','Joined') OR h.newStatus IN ('Offer Accepted','Offer Dropped','Joined') THEN c.id END) AS offers_accepted,
  COUNT(DISTINCT CASE WHEN c.status = 'Joined' OR h.newStatus = 'Joined' THEN c.id END) AS joined
FROM candidates c
LEFT JOIN candidate_status_history h ON h.candidateId = c.id;
```

Validated seeded output: `250` profiles, `220` contacted, `174` interested, `150` screen shortlisted, `84` interviews scheduled, `12` offers released, `8` offers accepted, and `3` joined.

### Recruiter productivity

```sql
SELECT
  COALESCE(NULLIF(c.recruiterName, ''), c.assignedRecruiter) AS recruiter,
  COUNT(DISTINCT c.id) AS profiles,
  COUNT(DISTINCT CASE WHEN c.status IN ('Interview 1 Scheduled','Interview 1 Selected','Interview 1 Rejected','Interview 2 Scheduled','Interview 2 Selected','Final Round','Offer Discussion','Offer Released','Offer Accepted','Offer Dropped','Joined') OR h.newStatus IN ('Interview 1 Scheduled','Interview 1 Selected','Interview 1 Rejected','Interview 2 Scheduled','Interview 2 Selected','Final Round','Offer Discussion','Offer Released','Offer Accepted','Offer Dropped','Joined') THEN c.id END) AS interviews,
  COUNT(DISTINCT CASE WHEN c.status IN ('Offer Released','Offer Accepted','Offer Dropped','Joined') OR h.newStatus IN ('Offer Released','Offer Accepted','Offer Dropped','Joined') THEN c.id END) AS offers,
  COUNT(DISTINCT CASE WHEN c.status = 'Joined' OR h.newStatus = 'Joined' THEN c.id END) AS joins,
  COUNT(DISTINCT CASE WHEN c.status = 'Offer Dropped' OR h.newStatus = 'Offer Dropped' THEN c.id END) AS offer_drops
FROM candidates c
LEFT JOIN candidate_status_history h ON h.candidateId = c.id
GROUP BY recruiter
ORDER BY recruiter;
```

Role ownership is validated separately from `requirements`:

```sql
SELECT recruiterOwner, status, COUNT(*) AS roles
FROM requirements
GROUP BY recruiterOwner, status
ORDER BY recruiterOwner, status;
```

Validated seeded output: each recruiter owns `50` profiles. Interview counts are `16, 17, 17, 17, 17`; offer counts are `2, 2, 2, 3, 3`; joins are `0, 0, 1, 1, 1`; offer drops are `1, 1, 0, 0, 1`. Open/closed role counts are derived only from `requirements`.

### Sourcer productivity

```sql
SELECT
  COALESCE(NULLIF(c.sourcerName, ''), c.assignedSourcer) AS sourcer,
  COUNT(DISTINCT c.id) AS profiles,
  COUNT(DISTINCT CASE WHEN c.status IN ('Interview 1 Scheduled','Interview 1 Selected','Interview 1 Rejected','Interview 2 Scheduled','Interview 2 Selected','Final Round','Offer Discussion','Offer Released','Offer Accepted','Offer Dropped','Joined') OR h.newStatus IN ('Interview 1 Scheduled','Interview 1 Selected','Interview 1 Rejected','Interview 2 Scheduled','Interview 2 Selected','Final Round','Offer Discussion','Offer Released','Offer Accepted','Offer Dropped','Joined') THEN c.id END) AS interviews,
  COUNT(DISTINCT CASE WHEN c.status IN ('Offer Released','Offer Accepted','Offer Dropped','Joined') OR h.newStatus IN ('Offer Released','Offer Accepted','Offer Dropped','Joined') THEN c.id END) AS offers,
  COUNT(DISTINCT CASE WHEN c.status = 'Joined' OR h.newStatus = 'Joined' THEN c.id END) AS joins,
  COUNT(DISTINCT CASE WHEN c.status = 'Offer Dropped' OR h.newStatus = 'Offer Dropped' THEN c.id END) AS offer_drops
FROM candidates c
LEFT JOIN candidate_status_history h ON h.candidateId = c.id
GROUP BY sourcer
ORDER BY sourcer;
```

Validated seeded output: sourcer profile counts are `84, 83, 83`; each has `28` interviews, `4` offers, `1` join, and `1` offer drop.

### Open vs closed roles

```sql
SELECT status, COUNT(*) AS roles
FROM requirements
GROUP BY status
ORDER BY status;
```

Validated seeded output: `9` open, `3` closed, `2` on hold, and `1` cancelled.

### Offer drop metrics

```sql
SELECT COUNT(DISTINCT c.id) AS offer_drops
FROM candidates c
LEFT JOIN candidate_status_history h ON h.candidateId = c.id
WHERE c.status = 'Offer Dropped' OR h.newStatus = 'Offer Dropped';

SELECT DATE(COALESCE(h.changedAt, c.updatedAt)) AS drop_date, COUNT(DISTINCT c.id) AS drops
FROM candidates c
LEFT JOIN candidate_status_history h
  ON h.candidateId = c.id
 AND h.newStatus = 'Offer Dropped'
WHERE c.status = 'Offer Dropped' OR h.newStatus = 'Offer Dropped'
GROUP BY drop_date
ORDER BY drop_date;
```

Validated seeded output: `3` offer drops. The trend uses the `Offer Dropped` history timestamp instead of the candidate's generic `updatedAt` fallback whenever history exists.

### Joined metrics

```sql
SELECT COUNT(DISTINCT c.id) AS joined
FROM candidates c
LEFT JOIN candidate_status_history h ON h.candidateId = c.id
WHERE c.status = 'Joined' OR h.newStatus = 'Joined';
```

Validated seeded output: `3` joined candidates.

### Requirement aging

```sql
SELECT
  reqId,
  roleTitle,
  status,
  CAST(julianday('now') - julianday(createdAt) AS INTEGER) AS days_open
FROM requirements
WHERE status IN ('Open', 'On Hold')
ORDER BY days_open DESC, reqId ASC
LIMIT 10;
```

Validated seeded output as of 2026-05-17 UTC: the oldest open/on-hold requirements are `REQ-2026-001` (`45` days), `REQ-2026-002` (`42` days), `REQ-2026-004` (`36` days), `REQ-2026-005` (`33` days), `REQ-2026-006` (`30` days), `REQ-2026-007` (`27` days), `REQ-2026-009` (`21` days), `REQ-2026-011` (`15` days), `REQ-2026-012` (`12` days), and `REQ-2026-014` (`6` days).

### Source conversion rates

```sql
SELECT
  COALESCE(NULLIF(c.sourceChannel, ''), 'Unspecified') AS source_channel,
  COUNT(DISTINCT c.id) AS profiles,
  COUNT(DISTINCT CASE WHEN c.status IN ('Contacted','Interested','Not Interested','Screen Shortlisted','Screen Rejected','HM Shortlisted','Interview 1 Scheduled','Interview 1 Selected','Interview 1 Rejected','Interview 2 Scheduled','Interview 2 Selected','Final Round','Offer Discussion','Offer Released','Offer Accepted','Offer Dropped','Joined') OR h.newStatus IN ('Contacted','Interested','Not Interested','Screen Shortlisted','Screen Rejected','HM Shortlisted','Interview 1 Scheduled','Interview 1 Selected','Interview 1 Rejected','Interview 2 Scheduled','Interview 2 Selected','Final Round','Offer Discussion','Offer Released','Offer Accepted','Offer Dropped','Joined') THEN c.id END) AS contacted,
  COUNT(DISTINCT CASE WHEN c.status IN ('Offer Released','Offer Accepted','Offer Dropped','Joined') OR h.newStatus IN ('Offer Released','Offer Accepted','Offer Dropped','Joined') THEN c.id END) AS offers,
  COUNT(DISTINCT CASE WHEN c.status = 'Joined' OR h.newStatus = 'Joined' THEN c.id END) AS joined,
  ROUND(100.0 * COUNT(DISTINCT CASE WHEN c.status = 'Joined' OR h.newStatus = 'Joined' THEN c.id END) / NULLIF(COUNT(DISTINCT c.id), 0), 0) AS joined_conversion_percent
FROM candidates c
LEFT JOIN candidate_status_history h ON h.candidateId = c.id
GROUP BY source_channel
ORDER BY profiles DESC, source_channel ASC;
```

Validated seeded output: each seeded source has `25` profiles and `22` contacted candidates. `Naukri`, `Career Site`, and `Diversity Event` each have `1` joined candidate and `4%` joined conversion; all other seeded sources have `0%` joined conversion.

## Issues found and fixed

| Area | Finding | Fix |
| --- | --- | --- |
| Candidate funnel | The dashboard previously counted several funnel milestones from a partial list of current statuses, omitting statuses such as `HM Shortlisted`, selected/rejected interview statuses, `Final Round`, `Offer Discussion`, and `Offer Dropped`. | Funnel stages now use a complete milestone status map and candidate status history when available. |
| Recruiter productivity | Interview and offer counts could undercount candidates that had progressed beyond the displayed milestone but were currently in a terminal state. | Productivity rows now use the same history-aware milestone calculations as the funnel. |
| Sourcer productivity | Sourcer calculations had the same undercount risk as recruiter calculations. | Sourcer rows now use the same history-aware milestone calculations as recruiter rows. |
| Chart consistency | Productivity charts described role ownership and offer drops but did not render those series. | Recruiter and sourcer charts now include offer drops, open roles, and closed roles. |
| Offer drop trend | The trend could use a generic candidate update date instead of the actual `Offer Dropped` transition date. | The trend now reads the `Offer Dropped` status-history timestamp and only falls back to `updatedAt` for legacy rows. |
| Source conversion | Contacted and offer conversion used partial status lists, causing inconsistent source metrics versus the funnel. | Source conversion now shares the complete history-aware contacted, offer, and joined calculations. |
| Backend snapshot metrics | Snapshot-level metrics used current status only and did not include `Offer Dropped` in accepted-offer progression. | Backend metrics now use the same complete history-aware milestone map as the dashboard. |

## Current validation status

All checked dashboard areas now align to raw SQLite data definitions:

- Candidate funnel numbers: validated.
- Recruiter productivity: validated.
- Sourcer productivity: validated.
- Open vs closed roles: validated.
- Offer drop metrics: validated.
- Joined metrics: validated.
- Requirement aging: validated.
- Source conversion rates: validated.
