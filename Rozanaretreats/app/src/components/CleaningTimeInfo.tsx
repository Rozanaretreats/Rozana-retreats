import { Clock } from 'lucide-react'
import { cleaningTimeSummary } from '../lib/cleaningTime'
import type { RoomTask } from '../types'

export function CleaningTimeInfo({ task }: { task: RoomTask }) {
  const summary = cleaningTimeSummary(task)
  if (!summary) return null

  return (
    <p className="mb-3 flex items-center gap-1.5 text-xs text-forest/60">
      <Clock className="h-3.5 w-3.5 shrink-0" />
      <span>{summary}</span>
    </p>
  )
}
