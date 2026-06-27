import type { BiometricPunch } from '../types'
import { todayIso } from './dates'

export function punchesInRange(
  punches: BiometricPunch[],
  from: string,
  to: string,
): BiometricPunch[] {
  return punches
    .filter((p) => p.date >= from && p.date <= to)
    .sort((a, b) => b.date.localeCompare(a.date) || a.timestamp.localeCompare(b.timestamp))
}

export function punchesForToday(punches: BiometricPunch[], day = todayIso()): BiometricPunch[] {
  return punches.filter((p) => p.date === day)
}

export function punchesForStaffToday(
  punches: BiometricPunch[],
  staffId: string,
  day = todayIso(),
): BiometricPunch[] {
  return punchesForToday(punches, day)
    .filter((p) => p.staffId === staffId)
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp))
}

export function firstCheckInToday(
  punches: BiometricPunch[],
  staffId: string,
  day = todayIso(),
): string | null {
  return punchesForStaffToday(punches, staffId, day).find((p) => p.type === 'in')?.timestamp ?? null
}

export function punchSummaryToday(
  punches: BiometricPunch[],
  staffId: string,
  day = todayIso(),
): string {
  const staffPunches = punchesForStaffToday(punches, staffId, day)
  if (!staffPunches.length) return ''
  return staffPunches
    .map((p) => `${p.type === 'in' ? 'In' : 'Out'} ${p.timestamp}`)
    .join(' · ')
}

function parsePunchMinutes(timestamp: string): number {
  const [h, m] = timestamp.split(':').map(Number)
  return h * 60 + (m || 0)
}

export function formatDuration(mins: number): string {
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return `${h}h ${String(m).padStart(2, '0')}m`
}

/** AT02 — hours from first check-in to last check-out today */
export function computeHoursToday(
  punches: BiometricPunch[],
  staffId: string,
  day = todayIso(),
): string | null {
  const staffPunches = punchesForToday(punches, day)
    .filter((p) => p.staffId === staffId)
    .sort((a, b) => parsePunchMinutes(a.timestamp) - parsePunchMinutes(b.timestamp))

  const firstIn = staffPunches.find((p) => p.type === 'in')
  if (!firstIn) return null

  const lastOut = [...staffPunches].reverse().find((p) => p.type === 'out')
  if (!lastOut) return 'On site'

  const mins = parsePunchMinutes(lastOut.timestamp) - parsePunchMinutes(firstIn.timestamp)
  if (mins <= 0) return null
  return formatDuration(mins)
}

/** AT05 — device IDs seen in punch log for a property */
export function deviceIdsForProperty(punches: BiometricPunch[], propertyId: string): string[] {
  return [...new Set(punches.filter((p) => p.propertyId === propertyId).map((p) => p.deviceId))].sort()
}
