# Experian Pulse

Experian Pulse is an Electron, React, and TypeScript desktop application foundation for a governed compliance workspace. This initial build focuses on a clean enterprise shell with mock data only, ready for later workflow, authentication, reporting, and Windows packaging work.

## Tech stack

- Electron for the Windows desktop shell
- React and TypeScript for the renderer
- SQLite via `better-sqlite3` for local persistence
- Tailwind CSS for styling
- Recharts for dashboard and reporting charts
- `xlsx` for future Excel import/export flows
- Electron Vite for local development and production builds

## What is included

- Electron main process with a secure preload bridge
- SQLite database connection created under Electron's `userData` directory
- Mock seeded requirements, reports, and workspace settings
- React renderer with sidebar navigation
- Pages for Login, Dashboard, Requirements, Reports, and Settings
- Experian-inspired professional theme using purple, magenta, blue, and neutral enterprise colors
- Recharts examples on the Dashboard and Reports pages
- Placeholder XLSX import/export actions on the Requirements page

## Prerequisites

- Node.js 20 or newer
- npm 10 or newer
- Windows 10/11 for the target desktop experience

> The app can be developed on other operating systems, but the product target is Windows desktop.

## Run locally

Install dependencies:

```bash
npm install
```

Start the Electron desktop app in development mode:

```bash
npm run dev
```

Run TypeScript checks:

```bash
npm run typecheck
```

Create a production build output:

```bash
npm run build
```

Preview the production build locally:

```bash
npm run preview
```

## Project structure

```text
.
├── src
│   ├── main          # Electron main process and SQLite setup
│   ├── preload       # Context bridge exposed to the renderer
│   └── renderer      # React application, pages, components, mock data, styles
├── electron.vite.config.ts
├── tailwind.config.js
├── postcss.config.js
└── package.json
```

## Notes for next milestones

This is intentionally a foundation-only implementation. Future work should add real authentication, editable workflows, role-based access, real Excel import/export handlers, fuller SQLite migrations, automated testing, and signed Windows packaging.
