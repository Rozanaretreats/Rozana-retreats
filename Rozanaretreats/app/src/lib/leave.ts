import type { LeaveRecord } from '../types'

export function isApprovedLeave(leave: LeaveRecord): boolean {
  return leave.status === 'approved'
}

export function approvedLeaves(leaves: LeaveRecord[]): LeaveRecord[] {
  return leaves.filter(isApprovedLeave)
}

export const LEAVE_TYPES = ['Personal', 'Sick', 'Other'] as const

export type LeaveType = (typeof LEAVE_TYPES)[number]
