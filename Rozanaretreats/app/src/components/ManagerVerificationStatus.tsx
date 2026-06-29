import { CheckCircle2, ShieldCheck } from 'lucide-react'
import type { RoomTask } from '../types'

function formatVerifiedAt(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

type Props = {
  task: RoomTask
  /** Ops manager portal — show verify button when provided */
  onVerify?: () => void
  verifying?: boolean
}

export function ManagerVerificationStatus({ task, onVerify, verifying }: Props) {
  if (task.status !== 'done') return null

  if (task.managerVerifiedAt) {
    return (
      <div className="mt-auto flex items-start gap-2 rounded-xl border border-green-300 bg-green-50 px-3 py-2.5 text-sm text-green-900">
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-700" />
        <div>
          <p className="font-semibold">Verified by manager</p>
          <p className="text-xs text-green-800/80">
            {task.managerVerifiedBy ?? 'Manager'} · {formatVerifiedAt(task.managerVerifiedAt)}
          </p>
        </div>
      </div>
    )
  }

  if (onVerify) {
    return (
      <button
        type="button"
        disabled={verifying}
        onClick={onVerify}
        className="mt-auto flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-forest py-3 text-sm font-semibold text-white active:bg-forest-light disabled:opacity-60"
      >
        <ShieldCheck className="h-4 w-4" />
        {verifying ? 'Saving…' : 'I have checked the room'}
      </button>
    )
  }

  return (
    <p className="mt-auto flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-900">
      <ShieldCheck className="h-4 w-4 shrink-0 text-amber-700" />
      <span>Awaiting manager check</span>
    </p>
  )
}
