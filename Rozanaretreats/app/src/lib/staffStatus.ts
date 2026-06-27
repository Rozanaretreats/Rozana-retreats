import { isOnLeaveToday, todayIso } from './dates'
import { isApprovedLeave } from './leave'
import { getShiftForProperty, isShiftStarted } from './shift'
import type {
  AbsenceRecord,
  BiometricPunch,
  LeaveRecord,
  PropertyId,
  ShiftConfig,
  Staff,
  StaffStatus,
} from '../types'

export function deriveStaffStatus(
  staffId: string,
  propertyId: PropertyId,
  leaves: LeaveRecord[],
  punches: BiometricPunch[],
  absences: AbsenceRecord[],
  shifts: Record<PropertyId, ShiftConfig>,
  day = todayIso(),
  now = new Date(),
): StaffStatus {
  if (
    leaves.some(
      (l) => l.staffId === staffId && isApprovedLeave(l) && isOnLeaveToday(l.fromDate, l.toDate, day),
    )
  ) {
    return 'on-leave'
  }

  const punchedIn = punches.some(
    (p) => p.staffId === staffId && p.type === 'in' && p.date === day,
  )
  if (punchedIn) return 'present'

  const marked = absences.find((a) => a.staffId === staffId && a.absenceDate === day)
  if (marked) return 'absent'

  const shift = getShiftForProperty(propertyId, shifts)
  if (!isShiftStarted(shift.start, now)) return 'not-in'

  return 'awaiting-checkin'
}

export function withDerivedStatus(
  staff: Staff[],
  leaves: LeaveRecord[],
  punches: BiometricPunch[],
  absences: AbsenceRecord[],
  shifts: Record<PropertyId, ShiftConfig>,
): Staff[] {
  const day = todayIso()
  return staff.map((s) => {
    const status = deriveStaffStatus(s.id, s.propertyId, leaves, punches, absences, shifts, day)
    const absence = absences.find((a) => a.staffId === s.id && a.absenceDate === day)
    return {
      ...s,
      status,
      absenceReason: absence?.reason,
    }
  })
}

export function isAvailableForHK(status: StaffStatus): boolean {
  return status === 'present'
}

export const ABSENCE_REASONS = [
  'Sick',
  'Personal emergency',
  'Family matter',
  'Transport / travel issue',
  'No show — unexplained',
  'Other',
] as const
