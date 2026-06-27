import type { PropertyId, ShiftConfig } from '../types'

const DEFAULT_SHIFT: ShiftConfig = { start: '10:00', end: '17:00' }

/** Fallback when DB columns not migrated yet */
export const defaultShifts: Record<PropertyId, ShiftConfig> = {
  'ooty-skyview': { ...DEFAULT_SHIFT },
  'kannur-beachview': { ...DEFAULT_SHIFT },
}

function parseTimeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + (m || 0)
}

export function isShiftStarted(shiftStart: string, now = new Date()): boolean {
  const nowMins = now.getHours() * 60 + now.getMinutes()
  return nowMins >= parseTimeToMinutes(shiftStart)
}

export function formatShiftLabel(shift: ShiftConfig): string {
  return `${format12h(shift.start)} – ${format12h(shift.end)}`
}

function format12h(time: string): string {
  const [h, m] = time.split(':').map(Number)
  const suffix = h >= 12 ? 'PM' : 'AM'
  const hour12 = h % 12 || 12
  return `${hour12}:${String(m).padStart(2, '0')} ${suffix}`
}

export function getShiftForProperty(
  propertyId: PropertyId,
  shifts: Record<PropertyId, ShiftConfig>,
): ShiftConfig {
  return shifts[propertyId] ?? defaultShifts[propertyId] ?? DEFAULT_SHIFT
}
