import { useState } from 'react'
import { Check, ClipboardList, X } from 'lucide-react'
import type { CleaningChecklist, RoomTask } from '../types'
import {
  allChecklistItemsComplete,
  completedChecklistCount,
  createDefaultChecklist,
  toggleChecklistItem,
} from '../lib/cleaningChecklist'

type CleaningChecklistModalProps = {
  open: boolean
  task: RoomTask | null
  onClose: () => void
  onSaveChecklist: (checklist: CleaningChecklist) => Promise<void>
  onFinish: () => void
}

export function CleaningChecklistModal({
  open,
  task,
  onClose,
  onSaveChecklist,
  onFinish,
}: CleaningChecklistModalProps) {
  const [busy, setBusy] = useState(false)

  if (!open || !task) return null

  const checklist = task.cleaningChecklist ?? createDefaultChecklist()
  const complete = allChecklistItemsComplete(checklist)
  const doneCount = completedChecklistCount(checklist)
  const total = checklist.items.length

  const handleToggle = async (itemId: string, checked: boolean) => {
    const next = toggleChecklistItem(checklist, itemId, checked)
    setBusy(true)
    try {
      await onSaveChecklist(next)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex bg-forest/50 p-0 backdrop-blur-[2px] sm:items-center sm:justify-center sm:p-4">
      <div className="flex h-full max-h-[100dvh] w-full flex-col overflow-hidden border-sand-dark bg-white sm:h-auto sm:max-h-[90vh] sm:max-w-md sm:rounded-2xl sm:border sm:shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-sand-dark px-4 py-4 sm:px-5">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-50 text-forest">
              <ClipboardList className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold text-forest">Room {task.room} — cleaning checklist</p>
              <p className="text-sm text-forest/60">
                {doneCount} of {total} done
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-forest/50 hover:bg-sand"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <ul className="flex-1 overflow-y-auto divide-y divide-sand-dark">
          {checklist.items.map((item) => {
            const checked = !!item.completedAt
            return (
              <li key={item.id}>
                <label
                  className={[
                    'flex cursor-pointer items-start gap-3 px-4 py-4 transition-colors sm:px-5 sm:py-3.5',
                    'active:bg-green-50/50 sm:hover:bg-green-50/50',
                    checked ? 'bg-green-50/40' : '',
                  ].join(' ')}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={busy}
                    onChange={(e) => handleToggle(item.id, e.target.checked)}
                    className="mt-0.5 h-5 w-5 shrink-0 rounded border-sand-dark text-forest focus:ring-forest/20"
                  />
                  <span className={`text-base sm:text-sm ${checked ? 'text-forest line-through decoration-forest/30' : 'text-forest'}`}>
                    {item.label}
                  </span>
                  {checked && <Check className="ml-auto h-4 w-4 shrink-0 text-forest" />}
                </label>
              </li>
            )
          })}
        </ul>

        <div className="border-t border-sand-dark bg-sand/30 px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-5">
          {complete ? (
            <button
              type="button"
              disabled={busy}
              onClick={onFinish}
              className="min-h-12 w-full rounded-xl bg-forest py-3.5 text-base font-semibold text-white active:bg-forest-light disabled:opacity-50 sm:py-3 sm:text-sm"
            >
              All done — verify with photos
            </button>
          ) : (
            <p className="text-center text-sm text-forest/55">
              Mark each task done, then you&apos;ll be asked for two random verification photos.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
