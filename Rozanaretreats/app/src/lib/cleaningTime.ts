import type { RoomTask } from '../types'

export function formatCleaningClock(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
}

export function formatCleaningDuration(startedAt: string, finishedAt?: string): string {
  const start = new Date(startedAt).getTime()
  const end = finishedAt ? new Date(finishedAt).getTime() : Date.now()
  const mins = Math.max(0, Math.floor((end - start) / 60000))
  if (mins < 1) return '< 1 min'
  const h = Math.floor(mins / 60)
  const m = mins % 60
  if (h === 0) return `${m} min`
  return `${h}h ${m}m`
}

export function cleaningTimeSummary(task: RoomTask): string | null {
  if (!task.cleaningStartedAt) return null
  const started = formatCleaningClock(task.cleaningStartedAt)
  if (task.cleaningFinishedAt) {
    const duration = formatCleaningDuration(task.cleaningStartedAt, task.cleaningFinishedAt)
    const finished = formatCleaningClock(task.cleaningFinishedAt)
    return `${started} → ${finished} · ${duration}`
  }
  const elapsed = formatCleaningDuration(task.cleaningStartedAt)
  return `Started ${started} · ${elapsed} elapsed`
}
