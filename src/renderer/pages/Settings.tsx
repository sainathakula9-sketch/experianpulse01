import { useEffect, useMemo, useState } from 'react'
import { CheckCircle2, Cloud, Download, FolderOpen, HardDrive, Plus, RotateCcw, Save, ShieldCheck, Trash2, Users } from 'lucide-react'
import type { AuthenticatedUser, BackupFrequency, BackupResult, SettingsRecord, UserManagementInput, UserManagementRecord, UserRole, WorkspaceSettingsInput } from '../../shared/types'

interface SettingsProps {
  settings: SettingsRecord
  user: AuthenticatedUser
  onSettingsChange: () => void
}

const roles: UserRole[] = ['Admin', 'Recruiter', 'Sourcer']
const backupFrequencies: BackupFrequency[] = ['Daily', 'Weekly', 'Monthly']

const blankUser: UserManagementInput = {
  username: '',
  displayName: '',
  role: 'Recruiter',
  password: ''
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

function toSettingsForm(settings: SettingsRecord): WorkspaceSettingsInput {
  return {
    organizationName: settings.organizationName,
    defaultBackupFolder: settings.defaultBackupFolder,
    oneDriveBackupFolder: settings.oneDriveBackupFolder,
    backupFrequency: settings.backupFrequency,
    defaultCurrency: settings.defaultCurrency,
    defaultLocation: settings.defaultLocation
  }
}

export function SettingsPage({ settings, user, onSettingsChange }: SettingsProps): JSX.Element {
  const [settingsForm, setSettingsForm] = useState<WorkspaceSettingsInput>(() => toSettingsForm(settings))
  const [selectedRestorePath, setSelectedRestorePath] = useState('')
  const [userForm, setUserForm] = useState<UserManagementInput>(blankUser)
  const [editingUserId, setEditingUserId] = useState<number | undefined>()
  const [newSourceChannel, setNewSourceChannel] = useState('')
  const [newCandidateStatus, setNewCandidateStatus] = useState('')
  const [isWorking, setIsWorking] = useState(false)
  const [message, setMessage] = useState('')

  const lastBackupDate = useMemo(() => formatDate(settings.lastBackupAt), [settings.lastBackupAt])
  const canManageUsers = user.role === 'Admin'

  useEffect(() => {
    setSettingsForm(toSettingsForm(settings))
  }, [settings])

  const runSettingsAction = async (action: () => Promise<unknown>, successMessage: string): Promise<void> => {
    setIsWorking(true)
    setMessage('')
    try {
      await action()
      onSettingsChange()
      setMessage(successMessage)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Settings action failed.')
    } finally {
      setIsWorking(false)
    }
  }

  const handleSaveSettings = (): void => {
    void runSettingsAction(() => window.experianPulse.updateWorkspaceSettings(settingsForm), 'Workspace settings saved to SQLite.')
  }

  const handleChooseFolder = async (): Promise<void> => {
    setIsWorking(true)
    setMessage('')
    try {
      const nextSettings = await window.experianPulse.chooseOneDriveBackupFolder()
      setSettingsForm((current) => ({ ...current, oneDriveBackupFolder: nextSettings.oneDriveBackupFolder }))
      onSettingsChange()
      setMessage(nextSettings.oneDriveBackupFolder ? 'OneDrive backup folder updated.' : 'Folder selection was cancelled.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to choose the OneDrive folder.')
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

  const handleEditUser = (targetUser: UserManagementRecord): void => {
    setEditingUserId(targetUser.id)
    setUserForm({ username: targetUser.username, displayName: targetUser.displayName, role: targetUser.role, password: '' })
  }

  const handleSaveUser = (): void => {
    const action = editingUserId ? () => window.experianPulse.updateUser(editingUserId, userForm) : () => window.experianPulse.createUser(userForm)
    void runSettingsAction(action, editingUserId ? 'User updated.' : 'User created.').then(() => {
      setEditingUserId(undefined)
      setUserForm(blankUser)
    })
  }

  const handleCancelUser = (): void => {
    setEditingUserId(undefined)
    setUserForm(blankUser)
  }

  const handleAddSourceChannel = (): void => {
    void runSettingsAction(() => window.experianPulse.addSourceChannel(newSourceChannel), 'Source channel added.').then(() => setNewSourceChannel(''))
  }

  const handleAddCandidateStatus = (): void => {
    void runSettingsAction(() => window.experianPulse.addCandidateStatus(newCandidateStatus), 'Candidate status added.').then(() => setNewCandidateStatus(''))
  }

  return (
    <section className="space-y-6">
      <article className="rounded-3xl bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.25em] text-experian-blue">Settings</p>
            <h3 className="mt-2 text-2xl font-bold">Workspace defaults</h3>
            <p className="mt-2 text-sm text-experian-slate">Application preferences are persisted in the local SQLite database.</p>
          </div>
          <button className="inline-flex items-center gap-2 rounded-2xl bg-experian-blue px-4 py-2 text-sm font-bold text-white disabled:opacity-50" disabled={isWorking} onClick={handleSaveSettings} type="button">
            <Save className="h-4 w-4" /> Save settings
          </button>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          <label className="block text-sm font-semibold text-experian-slate">
            Organization name
            <input className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-experian-ink" onChange={(event) => setSettingsForm({ ...settingsForm, organizationName: event.target.value })} value={settingsForm.organizationName} />
          </label>
          <label className="block text-sm font-semibold text-experian-slate">
            Default backup folder
            <input className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-experian-ink" onChange={(event) => setSettingsForm({ ...settingsForm, defaultBackupFolder: event.target.value })} value={settingsForm.defaultBackupFolder} />
          </label>
          <label className="block text-sm font-semibold text-experian-slate">
            OneDrive backup folder path
            <input className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-experian-ink" onChange={(event) => setSettingsForm({ ...settingsForm, oneDriveBackupFolder: event.target.value })} value={settingsForm.oneDriveBackupFolder} />
          </label>
          <label className="block text-sm font-semibold text-experian-slate">
            Backup frequency
            <select className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-experian-ink" onChange={(event) => setSettingsForm({ ...settingsForm, backupFrequency: event.target.value as BackupFrequency })} value={settingsForm.backupFrequency}>
              {backupFrequencies.map((frequency) => <option key={frequency}>{frequency}</option>)}
            </select>
          </label>
          <label className="block text-sm font-semibold text-experian-slate">
            Default currency
            <input className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-experian-ink" onChange={(event) => setSettingsForm({ ...settingsForm, defaultCurrency: event.target.value })} value={settingsForm.defaultCurrency} />
          </label>
          <label className="block text-sm font-semibold text-experian-slate">
            Default location
            <input className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-experian-ink" onChange={(event) => setSettingsForm({ ...settingsForm, defaultLocation: event.target.value })} value={settingsForm.defaultLocation} />
          </label>
        </div>
      </article>

      <article className="rounded-3xl bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.25em] text-experian-blue">Backup & restore</p>
            <h3 className="mt-2 text-2xl font-bold">Local and OneDrive backups</h3>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-experian-slate">Use Backup Now for an on-demand ZIP, then optionally copy the same file to your local OneDrive sync folder.</p>
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
            <p className="mt-3 text-sm font-semibold text-experian-slate">Default folder</p>
            <p className="mt-1 break-all text-xs font-semibold text-experian-ink">{settings.defaultBackupFolder || settings.localBackupFolder}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 p-4">
            <Cloud className="h-5 w-5 text-sky-600" />
            <p className="mt-3 text-sm font-semibold text-experian-slate">OneDrive copy</p>
            <p className="mt-1 break-all text-xs font-semibold text-experian-ink">{settings.oneDriveBackupFolder || 'Not configured'}</p>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button className="inline-flex items-center gap-2 rounded-2xl border border-experian-blue px-4 py-2 text-sm font-bold text-experian-blue disabled:opacity-50" disabled={isWorking} onClick={handleChooseFolder} type="button">
            <FolderOpen className="h-4 w-4" /> Choose OneDrive folder
          </button>
          <button className="inline-flex items-center gap-2 rounded-2xl bg-experian-magenta px-4 py-2 text-sm font-bold text-white disabled:opacity-50" disabled={isWorking} onClick={handleBackupNow} type="button">
            <Download className="h-4 w-4" /> Backup Now
          </button>
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
      </article>

      <article className="rounded-3xl bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <Users className="h-5 w-5 text-experian-blue" />
          <div>
            <h3 className="text-xl font-bold">Manage users</h3>
            <p className="mt-1 text-sm text-experian-slate">Only Admin accounts can create, edit, or delete users.</p>
          </div>
        </div>

        {canManageUsers ? (
          <div className="mt-6 grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
            <div className="rounded-2xl border border-slate-200 p-4">
              <h4 className="font-bold">{editingUserId ? 'Edit user' : 'Add user'}</h4>
              <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-1">
                <input className="rounded-2xl border border-slate-200 px-4 py-3" onChange={(event) => setUserForm({ ...userForm, username: event.target.value })} placeholder="Username" value={userForm.username} />
                <input className="rounded-2xl border border-slate-200 px-4 py-3" onChange={(event) => setUserForm({ ...userForm, displayName: event.target.value })} placeholder="Display name" value={userForm.displayName} />
                <select className="rounded-2xl border border-slate-200 px-4 py-3" onChange={(event) => setUserForm({ ...userForm, role: event.target.value as UserRole })} value={userForm.role}>
                  {roles.map((role) => <option key={role}>{role}</option>)}
                </select>
                <input className="rounded-2xl border border-slate-200 px-4 py-3" onChange={(event) => setUserForm({ ...userForm, password: event.target.value })} placeholder={editingUserId ? 'New password (optional)' : 'Password'} type="password" value={userForm.password ?? ''} />
              </div>
              <div className="mt-4 flex gap-3">
                <button className="rounded-2xl bg-experian-blue px-4 py-2 text-sm font-bold text-white disabled:opacity-50" disabled={isWorking} onClick={handleSaveUser} type="button">{editingUserId ? 'Update user' : 'Create user'}</button>
                {editingUserId ? <button className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-bold text-experian-slate" onClick={handleCancelUser} type="button">Cancel</button> : null}
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-200">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-[0.18em] text-experian-slate">
                  <tr><th className="px-4 py-3">User</th><th className="px-4 py-3">Role</th><th className="px-4 py-3">Actions</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {settings.users.map((managedUser) => (
                    <tr key={managedUser.id}>
                      <td className="px-4 py-3"><p className="font-bold">{managedUser.displayName}</p><p className="text-xs text-experian-slate">{managedUser.username}</p></td>
                      <td className="px-4 py-3"><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-experian-slate">{managedUser.role}</span></td>
                      <td className="px-4 py-3"><div className="flex gap-2"><button className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold" onClick={() => handleEditUser(managedUser)} type="button">Edit</button><button className="rounded-xl border border-rose-200 px-3 py-2 text-xs font-bold text-rose-600" disabled={managedUser.id === user.id || isWorking} onClick={() => void runSettingsAction(() => window.experianPulse.deleteUser(managedUser.id), 'User deleted.')} type="button">Delete</button></div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <p className="mt-5 rounded-2xl bg-slate-100 px-4 py-3 text-sm font-semibold text-experian-slate">User management is restricted to Admin accounts.</p>
        )}
      </article>

      <div className="grid gap-6 lg:grid-cols-2">
        <article className="rounded-3xl bg-white p-6 shadow-sm">
          <h3 className="text-xl font-bold">Manage source channels</h3>
          <div className="mt-4 flex gap-3">
            <input className="min-w-0 flex-1 rounded-2xl border border-slate-200 px-4 py-3" onChange={(event) => setNewSourceChannel(event.target.value)} placeholder="Add channel" value={newSourceChannel} />
            <button className="inline-flex items-center gap-2 rounded-2xl bg-experian-blue px-4 py-2 text-sm font-bold text-white" onClick={handleAddSourceChannel} type="button"><Plus className="h-4 w-4" /> Add</button>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {settings.sourceChannels.map((channel) => <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-2 text-sm font-bold text-experian-slate" key={channel}>{channel}<button aria-label={`Delete ${channel}`} onClick={() => void runSettingsAction(() => window.experianPulse.deleteSourceChannel(channel), 'Source channel deleted.')} type="button"><Trash2 className="h-3.5 w-3.5 text-rose-500" /></button></span>)}
          </div>
        </article>

        <article className="rounded-3xl bg-white p-6 shadow-sm">
          <h3 className="text-xl font-bold">Manage candidate statuses</h3>
          <div className="mt-4 flex gap-3">
            <input className="min-w-0 flex-1 rounded-2xl border border-slate-200 px-4 py-3" onChange={(event) => setNewCandidateStatus(event.target.value)} placeholder="Add status" value={newCandidateStatus} />
            <button className="inline-flex items-center gap-2 rounded-2xl bg-experian-blue px-4 py-2 text-sm font-bold text-white" onClick={handleAddCandidateStatus} type="button"><Plus className="h-4 w-4" /> Add</button>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {settings.candidateStatuses.map((status) => <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-2 text-sm font-bold text-experian-slate" key={status}>{status}<button aria-label={`Delete ${status}`} onClick={() => void runSettingsAction(() => window.experianPulse.deleteCandidateStatus(status), 'Candidate status deleted.')} type="button"><Trash2 className="h-3.5 w-3.5 text-rose-500" /></button></span>)}
          </div>
        </article>
      </div>

      {message ? <p className="rounded-2xl bg-slate-100 px-4 py-3 text-sm font-semibold text-experian-slate">{message}</p> : null}
      {settings.lastBackupPath ? <p className="break-all text-xs text-experian-slate">Last backup path: {settings.lastBackupPath}</p> : null}
    </section>
  )
}
