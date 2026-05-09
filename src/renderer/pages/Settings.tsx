import { useEffect, useMemo, useState } from 'react'
import { CheckCircle2, Cloud, Download, FolderOpen, HardDrive, RotateCcw, ShieldCheck } from 'lucide-react'
import type { BackupResult, SettingsRecord } from '../../shared/types'

interface SettingsProps {
  settings: SettingsRecord
  onSettingsChange: () => void
}

function formatDate(value: string): string {
  if (!value) {
    return 'No backup has run yet'
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(date)
}

function statusClassName(status: string): string {
  if (status === 'Success' || status === 'Restored') {
    return 'bg-emerald-50 text-emerald-700'
  }

  if (status === 'Warning') {
    return 'bg-amber-50 text-amber-700'
  }

  if (status === 'Failed') {
    return 'bg-rose-50 text-rose-700'
  }

  return 'bg-slate-100 text-slate-600'
}

export function SettingsPage({ settings, onSettingsChange }: SettingsProps): JSX.Element {
  const [folderPath, setFolderPath] = useState(settings.oneDriveBackupFolder)
  const [selectedRestorePath, setSelectedRestorePath] = useState('')
  const [isWorking, setIsWorking] = useState(false)
  const [message, setMessage] = useState('')

  const lastBackupDate = useMemo(() => formatDate(settings.lastBackupAt), [settings.lastBackupAt])

  useEffect(() => {
    setFolderPath(settings.oneDriveBackupFolder)
  }, [settings.oneDriveBackupFolder])

  const handleChooseFolder = async (): Promise<void> => {
    setIsWorking(true)
    setMessage('')
    try {
      const nextSettings = await window.experianPulse.chooseOneDriveBackupFolder()
      setFolderPath(nextSettings.oneDriveBackupFolder)
      onSettingsChange()
      setMessage(nextSettings.oneDriveBackupFolder ? 'OneDrive backup folder updated.' : 'Folder selection was cancelled.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to choose the OneDrive folder.')
    } finally {
      setIsWorking(false)
    }
  }

  const handleSaveFolder = async (): Promise<void> => {
    setIsWorking(true)
    setMessage('')
    try {
      const nextSettings = await window.experianPulse.setOneDriveBackupFolder(folderPath.trim())
      setFolderPath(nextSettings.oneDriveBackupFolder)
      onSettingsChange()
      setMessage('OneDrive backup folder saved.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to save the OneDrive folder.')
    } finally {
      setIsWorking(false)
    }
  }

  const handleBackupNow = async (): Promise<void> => {
    setIsWorking(true)
    setMessage('')
    try {
      const result: BackupResult = await window.experianPulse.runBackupNow()
      onSettingsChange()
      setMessage(result.message)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Backup failed.')
    } finally {
      setIsWorking(false)
    }
  }

  const handleChooseRestoreZip = async (): Promise<void> => {
    setIsWorking(true)
    setMessage('')
    try {
      const zipPath = await window.experianPulse.chooseRestoreBackupZip()
      setSelectedRestorePath(zipPath)
      setMessage(zipPath ? 'Backup ZIP selected. Click Restore Backup to continue.' : 'Restore selection was cancelled.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to choose a backup ZIP.')
    } finally {
      setIsWorking(false)
    }
  }

  const handleRestore = async (): Promise<void> => {
    if (!selectedRestorePath) {
      setMessage('Choose a backup ZIP before restoring.')
      return
    }

    setIsWorking(true)
    setMessage('')
    try {
      const result = await window.experianPulse.restoreBackup(selectedRestorePath)
      onSettingsChange()
      setMessage(result.message)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Restore failed.')
    } finally {
      setIsWorking(false)
    }
  }

  return (
    <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
      <article className="rounded-3xl bg-white p-6 shadow-sm">
        <h3 className="text-xl font-bold">Workspace settings</h3>
        <p className="mt-1 text-sm text-experian-slate">Application preferences stored in the local SQLite database.</p>

        <div className="mt-6 space-y-4">
          <label className="block text-sm font-semibold text-experian-slate">
            Organization name
            <input className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-experian-ink" readOnly value={settings.organizationName} />
          </label>
          <label className="block text-sm font-semibold text-experian-slate">
            Data region
            <input className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-experian-ink" readOnly value={settings.dataRegion} />
          </label>
          <div className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3">
            <div>
              <p className="font-semibold">Notifications</p>
              <p className="text-sm text-experian-slate">Mock preference for desktop alerts.</p>
            </div>
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
              {settings.notificationsEnabled ? 'Enabled' : 'Disabled'}
            </span>
          </div>
        </div>
      </article>

      <article className="rounded-3xl bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.25em] text-experian-blue">Backup & restore</p>
            <h3 className="mt-2 text-2xl font-bold">Daily local and OneDrive backups</h3>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-experian-slate">
              The app creates one ZIP backup per day under /Backups/Daily when it starts. Use Backup Now for an on-demand ZIP, then optionally copy the same file to your local OneDrive sync folder.
            </p>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-bold ${statusClassName(settings.lastBackupStatus)}`}>{settings.lastBackupStatus}</span>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 p-4">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            <p className="mt-3 text-sm font-semibold text-experian-slate">Last backup</p>
            <p className="mt-1 text-sm font-bold text-experian-ink">{lastBackupDate}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 p-4">
            <HardDrive className="h-5 w-5 text-experian-blue" />
            <p className="mt-3 text-sm font-semibold text-experian-slate">Local folder</p>
            <p className="mt-1 break-all text-xs font-semibold text-experian-ink">{settings.localBackupFolder || '/Backups/Daily'}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 p-4">
            <Cloud className="h-5 w-5 text-sky-600" />
            <p className="mt-3 text-sm font-semibold text-experian-slate">OneDrive copy</p>
            <p className="mt-1 break-all text-xs font-semibold text-experian-ink">{settings.oneDriveBackupFolder || 'Not configured'}</p>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-slate-200 p-4">
          <label className="block text-sm font-semibold text-experian-slate">
            OneDrive backup folder
            <input
              className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-experian-ink"
              onChange={(event) => setFolderPath(event.target.value)}
              placeholder="Choose or paste your local OneDrive sync folder"
              value={folderPath}
            />
          </label>
          <div className="mt-4 flex flex-wrap gap-3">
            <button className="inline-flex items-center gap-2 rounded-2xl border border-experian-blue px-4 py-2 text-sm font-bold text-experian-blue disabled:opacity-50" disabled={isWorking} onClick={handleChooseFolder} type="button">
              <FolderOpen className="h-4 w-4" /> Choose folder
            </button>
            <button className="rounded-2xl bg-experian-blue px-4 py-2 text-sm font-bold text-white disabled:opacity-50" disabled={isWorking} onClick={handleSaveFolder} type="button">
              Save OneDrive folder
            </button>
            <button className="inline-flex items-center gap-2 rounded-2xl bg-experian-magenta px-4 py-2 text-sm font-bold text-white disabled:opacity-50" disabled={isWorking} onClick={handleBackupNow} type="button">
              <Download className="h-4 w-4" /> Backup Now
            </button>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50/60 p-4">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-1 h-5 w-5 text-amber-600" />
            <div>
              <p className="font-bold text-amber-900">Restore from backup ZIP</p>
              <p className="mt-1 text-sm leading-6 text-amber-800">Choose a backup ZIP created by Experian Pulse. Restoring replaces the local SQLite database and requires an app restart.</p>
              <p className="mt-2 break-all text-xs font-semibold text-amber-900">{selectedRestorePath || 'No restore ZIP selected.'}</p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <button className="inline-flex items-center gap-2 rounded-2xl border border-amber-500 px-4 py-2 text-sm font-bold text-amber-700 disabled:opacity-50" disabled={isWorking} onClick={handleChooseRestoreZip} type="button">
              <FolderOpen className="h-4 w-4" /> Choose ZIP
            </button>
            <button className="inline-flex items-center gap-2 rounded-2xl bg-amber-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50" disabled={isWorking || !selectedRestorePath} onClick={handleRestore} type="button">
              <RotateCcw className="h-4 w-4" /> Restore Backup
            </button>
          </div>
        </div>

        {message ? <p className="mt-5 rounded-2xl bg-slate-100 px-4 py-3 text-sm font-semibold text-experian-slate">{message}</p> : null}
        {settings.lastBackupPath ? <p className="mt-3 break-all text-xs text-experian-slate">Last backup path: {settings.lastBackupPath}</p> : null}
      </article>
    </section>
  )
}
