import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import type { CleaningChecklist } from '../types'
import {
  addChecklistItem,
  isDefaultChecklistItemId,
  removeChecklistItem,
} from '../lib/cleaningChecklist'
import { formInputClass } from './FormSelect'

type AssignChecklistEditorProps = {
  checklist: CleaningChecklist
  onChange: (checklist: CleaningChecklist) => void
  disabled?: boolean
}

export function AssignChecklistEditor({
  checklist,
  onChange,
  disabled = false,
}: AssignChecklistEditorProps) {
  const [newLabel, setNewLabel] = useState('')

  const handleAdd = () => {
    const label = newLabel.trim()
    if (!label) return
    onChange(addChecklistItem(checklist, label))
    setNewLabel('')
  }

  return (
    <div className="rounded-2xl border border-sand-dark bg-white p-4 shadow-sm md:p-5">
      <div className="mb-3">
        <p className="font-semibold text-forest">Cleaning tasks for this room</p>
        <p className="mt-0.5 text-sm text-forest/55">
          Standard tasks are pre-filled — remove or add tasks before assigning. HK staff see this list
          in My tasks.
        </p>
      </div>

      <ul className="divide-y divide-sand-dark rounded-xl border border-sand-dark">
        {checklist.items.map((item) => (
          <li key={item.id} className="flex items-center gap-3 px-3 py-2.5 sm:px-4">
            <span className="min-w-0 flex-1 text-sm text-forest">{item.label}</span>
            {isDefaultChecklistItemId(item.id) && (
              <span className="shrink-0 rounded-full bg-sand px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-forest/50">
                Standard
              </span>
            )}
            <button
              type="button"
              disabled={disabled || checklist.items.length <= 1}
              onClick={() => onChange(removeChecklistItem(checklist, item.id))}
              className="shrink-0 rounded-lg p-1.5 text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-30"
              aria-label={`Remove ${item.label}`}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </li>
        ))}
      </ul>

      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input
          type="text"
          value={newLabel}
          disabled={disabled}
          onChange={(e) => setNewLabel(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              handleAdd()
            }
          }}
          placeholder="Add a custom task…"
          className={formInputClass}
        />
        <button
          type="button"
          disabled={disabled || !newLabel.trim()}
          onClick={handleAdd}
          className="flex shrink-0 items-center justify-center gap-1.5 rounded-xl border border-sand-dark px-4 py-2.5 text-sm font-semibold text-forest hover:bg-sand disabled:opacity-40"
        >
          <Plus className="h-4 w-4" />
          Add task
        </button>
      </div>
    </div>
  )
}
