import { useEffect } from 'react'
import { AlertTriangle } from 'lucide-react'

type ConfirmDialogProps = {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  tone?: 'danger' | 'default'
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'default',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onCancel])

  if (!open) return null

  const confirmClass =
    tone === 'danger'
      ? 'bg-red-700 text-white hover:bg-red-800'
      : 'bg-forest text-white hover:bg-forest-light'

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-forest/70 p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-2xl border border-sand-dark bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3 border-b border-sand-dark px-5 py-4">
          <div
            className={[
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
              tone === 'danger' ? 'bg-red-100 text-red-700' : 'bg-green-50 text-forest',
            ].join(' ')}
          >
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="min-w-0 pt-0.5">
            <h2 id="confirm-dialog-title" className="font-semibold text-forest">
              {title}
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-forest/65">{message}</p>
          </div>
        </div>

        <div className="flex flex-wrap justify-end gap-2 bg-sand/40 px-5 py-4">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-sand-dark bg-white px-4 py-2.5 text-sm font-medium text-forest/80 hover:bg-sand"
          >
            {cancelLabel}
          </button>
          <button type="button" onClick={onConfirm} className={`rounded-xl px-4 py-2.5 text-sm font-semibold shadow-sm ${confirmClass}`}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
