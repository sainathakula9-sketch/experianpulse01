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

   | Role | Username | Password | Notes |
   | --- | --- | --- | --- |
   | Admin | `admin` | `admin123` | Full access to all seeded recruitment data. |
   | Recruiter | `recruiter1` through `recruiter5` | `recruiter123` | Five recruiter workspaces with owned requirements and candidates. |
   | Sourcer | `sourcer1` through `sourcer3` | `sourcer123` | Three sourcer workspaces with assigned sourcing pipelines. |

   Fresh SQLite workspaces are populated with a realistic Experian Pulse recruitment demo set: 15 requirements, 250 candidates, 5 recruiters, 3 sourcers, varied statuses, offer drops, joined candidates, source channels, business units, and locations.

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

Build the Windows installer and portable executable:

```bash
npm run build:win
```

This runs the TypeScript checks, creates the Electron production bundle, and then asks `electron-builder` to generate both Windows targets. The generated artifacts are written to `release/`:

- `Experian Pulse-Setup-0.1.0.exe` — NSIS setup installer.
- `Experian Pulse-Portable-0.1.0.exe` — portable executable that can run without a full install.

You can also build each Windows artifact separately:

```bash
npm run build:win:installer
npm run build:win:portable
```

The Windows package uses a generated placeholder icon at `build/icon.ico`. The source placeholder is `build/icon.svg`, and `npm run icon:win` regenerates the ignored `.ico` file before Windows packaging. Replace the SVG/source artwork with a production icon before code signing or enterprise distribution.

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

## Windows installation steps

1. Build or obtain the latest `Experian Pulse-Setup-<version>.exe` from the `release/` folder.
2. On Windows 10/11, double-click the setup `.exe`.
3. If Windows SmartScreen appears for an unsigned local build, choose **More info** and then **Run anyway** only if you trust the build source.
4. Select the installation directory when prompted, or accept the default per-user location.
5. Keep the desktop and Start Menu shortcut options selected if you want shortcuts created automatically.
6. Finish the installer and launch **Experian Pulse** from the final installer page, desktop shortcut, or Start Menu.

For no-install validation, run `Experian Pulse-Portable-<version>.exe` from the `release/` folder. The portable executable still stores application data in the normal Electron user data location for the current Windows user.

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
