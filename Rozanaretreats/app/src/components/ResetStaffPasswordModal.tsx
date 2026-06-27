import { useState } from 'react'
import { KeyRound, X } from 'lucide-react'
import { formInputClass } from './FormSelect'

type ResetStaffPasswordModalProps = {
  open: boolean
  staffName: string
  staffEmail: string
  onClose: () => void
  onSave: (password: string) => Promise<void>
}

const inputClass = formInputClass

export function ResetStaffPasswordModal({
  open,
  staffName,
  staffEmail,
  onClose,
  onSave,
}: ResetStaffPasswordModalProps) {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (!open) return null

  const handleClose = () => {
    setPassword('')
    setConfirm('')
    setError('')
    onClose()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    if (password.length < 4) {
      setError('Password must be at least 4 characters.')
      return
    }
    setBusy(true)
    try {
      await onSave(password)
      handleClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not reset password.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center p-0 sm:items-center sm:p-4">
      <button
        type="button"
        className="absolute inset-0 bg-forest/40 backdrop-blur-[1px]"
        aria-label="Close"
        onClick={handleClose}
      />
      <form
        onSubmit={handleSubmit}
        className="relative w-full max-w-md overflow-hidden rounded-t-2xl border border-sand-dark bg-white shadow-2xl sm:rounded-2xl"
      >
        <div className="flex items-center justify-between border-b border-sand-dark px-5 py-4">
          <div className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-forest" />
            <h2 className="text-lg font-semibold text-forest">Reset app password</h2>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-lg p-2 text-forest/50 hover:bg-sand"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 px-5 py-5">
          <p className="text-sm text-forest/60">
            Set a new password for <span className="font-semibold text-forest">{staffName}</span>. Share
            it with them in person — they sign in with{' '}
            <span className="font-mono text-forest/80">{staffEmail}</span>.
          </p>

          {error && (
            <p className="rounded-xl border border-red-100 bg-red-50 px-4 py-2.5 text-sm text-red-800">
              {error}
            </p>
          )}

          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-forest/45">
              New password
            </span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
              autoComplete="new-password"
              required
              minLength={4}
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-forest/45">
              Confirm password
            </span>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className={inputClass}
              autoComplete="new-password"
              required
              minLength={4}
            />
          </label>
        </div>

        <div className="flex gap-2 border-t border-sand-dark px-5 py-4">
          <button
            type="button"
            onClick={handleClose}
            className="min-h-11 flex-1 rounded-xl border border-sand-dark py-2.5 text-sm font-semibold text-forest/70"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy}
            className="min-h-11 flex-1 rounded-xl bg-forest py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            {busy ? 'Saving…' : 'Save password'}
          </button>
        </div>
      </form>
    </div>
  )
}
