# Experian Pulse

Experian Pulse is a local-first Electron, React, TypeScript, and SQLite desktop application for governed talent acquisition workflows. It provides role-based workspaces for requirements, sourcing intake, candidate pipelines, reporting, audit review, settings, and backup/restore operations.

> Current target platform: Windows 10/11 desktop. Development can run on macOS or Linux, but packaging and installer validation should be performed on Windows.

## Key capabilities

- Secure Electron shell with a preload API boundary.
- SQLite persistence with seeded admin, recruiter, and sourcer users.
- Role-aware navigation and filtered requirement/candidate views.
- Requirement folders with intake notes, generated search strings, pipeline context, and Excel summary export.
- Candidate pipeline with status history, Excel import/export, and configurable statuses/source channels.
- Admin audit trail, reporting placeholders, and settings management.
- Local ZIP backups with optional OneDrive sync-folder copy and restore workflow.
- Responsive layouts for smaller laptop screens and improved keyboard focus for Windows desktop use.

## Prerequisites

- Node.js 20 or newer.
- npm 10 or newer.
- Windows 10/11 for the intended desktop experience and installer generation.
- OneDrive desktop sync client, if you want backup copies in a OneDrive folder.

## Setup instructions

1. Clone or copy this repository.
2. Install dependencies:

   ```bash
   npm install
   ```

3. Start the development Electron app:

   ```bash
   npm run dev
   ```

4. Sign in with one of the seeded local accounts:

   | Role | Username | Password |
   | --- | --- | --- |
   | Admin | `admin` | `admin123` |
   | Recruiter | `recruiter` | `recruiter123` |
   | Sourcer | `sourcer` | `sourcer123` |

## Common commands

Run TypeScript checks:

```bash
npm run typecheck
```

Create the production build output:

```bash
npm run build
```

Preview the production build locally:

```bash
npm run preview
```

Build a Windows NSIS installer:

```bash
npm run build:win
```

The installer artifact is configured to be written to `release/` with a name similar to `Experian Pulse-Setup-0.1.0.exe`.

## Project structure

```text
.
├── src
│   ├── main          # Electron main process, SQLite access, backup/restore
│   ├── preload       # Safe context bridge exposed to the renderer
│   └── renderer      # React pages, components, services, utilities, styles
├── electron.vite.config.ts
├── package.json      # Scripts and Windows installer metadata
├── tailwind.config.js
└── tsconfig*.json
```

## Data and backup behavior

- The SQLite database is created in Electron's `userData` directory under `data/experian-pulse.sqlite`.
- Backups are ZIP files containing the SQLite database, a manifest, and selected local config files.
- Backup Now always attempts to create a local ZIP first. If the optional OneDrive copy fails, the local ZIP is retained and the backup status becomes `Warning` instead of failing the entire operation.
- Restoring a backup replaces the local SQLite database and requires an application restart.

## Known limitations

- Authentication is local demo authentication only; it is not integrated with SSO, MFA, or enterprise identity providers.
- Password hashing uses a simple local SHA-256 hash and should be replaced before production use.
- AI Assistant content is rule-based placeholder output; no external model provider is connected.
- Excel import validation is intentionally basic and should be expanded for production templates.
- Backups are stored and copied locally; they are not encrypted by the app.
- Windows installer signing, auto-update, and enterprise deployment policies are not yet configured.
- Automated unit, integration, and end-to-end tests are not yet included.

## Future enhancements

- Add enterprise SSO/MFA and stronger password storage for local fallback accounts.
- Add encrypted database and encrypted backup options.
- Add signed Windows installer, auto-update channels, and group-policy-friendly deployment settings.
- Add richer workflow automation for approvals, interview loops, and offer management.
- Add real AI provider integration behind the existing assistant provider boundary.
- Add automated test coverage for renderer flows, SQLite migrations, backup/restore, and Excel import/export.
- Add configurable dashboard widgets and saved report exports.
- Add accessible high-contrast theme and deeper keyboard shortcuts for Windows power users.
