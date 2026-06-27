import type { LeaveStatus, RoomStatus, StaffStatus } from '../types'

const staffStyles: Record<StaffStatus, string> = {
  present: 'bg-green-100 text-green-800',
  'on-leave': 'bg-amber-100 text-amber-800',
  absent: 'bg-red-100 text-red-800',
  'not-in': 'bg-sand-dark text-forest/60',
  'awaiting-checkin': 'bg-orange-100 text-orange-900',
}

const staffLabels: Record<StaffStatus, string> = {
  present: 'Present',
  'on-leave': 'On leave',
  absent: 'Absent',
  'not-in': 'Not in yet',
  'awaiting-checkin': 'Action needed',
}

const roomStyles: Record<RoomStatus, string> = {
  todo: 'bg-red-100 text-red-800',
  cleaning: 'bg-amber-100 text-amber-800',
  done: 'bg-green-100 text-green-800',
}

const roomLabels: Record<RoomStatus, string> = {
  todo: 'To do',
  cleaning: 'In progress',
  done: 'Done',
}

export function StaffStatusBadge({ status }: { status: StaffStatus }) {
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${staffStyles[status]}`}>
      {staffLabels[status]}
    </span>
  )
}

export function RoomStatusBadge({ status }: { status: RoomStatus }) {
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${roomStyles[status]}`}>
      {roomLabels[status]}
    </span>
  )
}

const leaveStyles: Record<LeaveStatus, string> = {
  pending: 'bg-amber-100 text-amber-900',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
}

const leaveLabels: Record<LeaveStatus, string> = {
  pending: 'Pending approval',
  approved: 'Approved',
  rejected: 'Rejected',
}

export function LeaveStatusBadge({ status }: { status: LeaveStatus }) {
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${leaveStyles[status]}`}>
      {leaveLabels[status]}
    </span>
  )
}
