import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import type { CleaningChecklist, RoomTask } from '../types'
import { AssignChecklistEditor } from './AssignChecklistEditor'
import { checklistForAssignment, createDefaultChecklist } from '../lib/cleaningChecklist'

type EditAssignmentChecklistModalProps = {
  open: boolean
  task: RoomTask | null
  onClose: () => void
  onSave: (checklist: CleaningChecklist) => Promise<void>
}

export function EditAssignmentChecklistModal({
  open,
  task,
  onClose,
  onSave,
}: EditAssignmentChecklistModalProps) {
  const [checklist, setChecklist] = useState<CleaningChecklist>(createDefaultChecklist())
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open || !task) return
    setChecklist(
      task.cleaningChecklist?.items.length
        ? checklistForAssignment(task.cleaningChecklist)
        : createDefaultChecklist(),
    )
  }, [open, task])

  if (!open || !task) return null

  const handleSave = async () => {
    setBusy(true)
    try {
      await onSave(checklistForAssignment(checklist))
      onClose()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex bg-forest/50 p-4 backdrop-blur-[2px] sm:items-center sm:justify-center">
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-sand-dark bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-sand-dark px-5 py-4">
          <div>
            <p className="font-semibold text-forest">Edit tasks — Room {task.room}</p>
            <p className="text-sm text-forest/55">Changes apply before HK staff starts cleaning.</p>
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

        <div className="flex-1 overflow-y-auto p-4">
          <AssignChecklistEditor checklist={checklist} onChange={setChecklist} disabled={busy} />
        </div>

        <div className="flex gap-3 border-t border-sand-dark px-5 py-4">
          <button
            type="button"
            disabled={busy}
            onClick={handleSave}
            className="flex-1 rounded-xl bg-forest py-2.5 text-sm font-semibold text-white hover:bg-forest-light disabled:opacity-50"
          >
            Save tasks
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className="rounded-xl px-5 py-2.5 text-sm text-forest/60 hover:bg-sand"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
