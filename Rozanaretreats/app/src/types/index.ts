export type PropertyId = 'ooty-skyview' | 'kannur-beachview'

export type UserRole = 'owner' | 'operations-manager' | 'housekeeping-staff'

export type StaffStatus = 'present' | 'absent' | 'on-leave' | 'not-in' | 'awaiting-checkin'

export type RoomStatus = 'todo' | 'cleaning' | 'done'

export type RoomType = 'standard' | 'premium' | 'classic' | 'club' | 'panorama' | 'dorm'

export interface Room {
  id: string
  propertyId: PropertyId
  number: string
  building: string
  type: RoomType
}

export interface Property {
  id: PropertyId
  name: string
  shortName: string
  roomCount: number
  managerName: string
  shiftStart?: string
  shiftEnd?: string
}

export interface User {
  id: string
  name: string
  role: UserRole
  propertyId: PropertyId | 'all'
  email: string
  /** Roster row id — required for housekeeping-staff login */
  staffId?: string
}

export interface ShiftConfig {
  start: string
  end: string
}

export interface Staff {
  id: string
  propertyId: PropertyId
  name: string
  role: string
  phone?: string
  status: StaffStatus
  absenceReason?: string
}

export interface AbsenceRecord {
  id: string
  propertyId: PropertyId
  staffId: string
  staffName?: string
  absenceDate: string
  reason: string
  markedBy: string
}

export interface BiometricPunch {
  id: string
  propertyId: PropertyId
  staffId: string
  staffName: string
  type: 'in' | 'out'
  date: string
  timestamp: string
  deviceId: string
  /** kiosk | manual | edge | import — from attendance_punches.source */
  source?: string
  matchScore?: number
  hoursToday?: string
}

export type LeaveStatus = 'pending' | 'approved' | 'rejected'

export interface LeaveRecord {
  id: string
  propertyId: PropertyId
  staffId: string
  staffName: string
  fromDate: string
  toDate: string
  type: string
  status: LeaveStatus
  requestedBy: 'staff' | 'manager'
  staffNote?: string
  reviewedBy?: string
  reviewedAt?: string
}

export interface ChecklistItem {
  id: string
  label: string
  completedAt?: string
}

export type VerificationPhotoRecord = {
  itemId: string
  itemLabel: string
  photoUrl: string
}

export type CleaningChecklist = {
  items: ChecklistItem[]
  /** @deprecated use verificationPhotos — kept for older completed tasks */
  verificationItemId?: string
  /** @deprecated use verificationPhotos */
  verificationItemLabel?: string
  verificationPhotos?: VerificationPhotoRecord[]
}

export interface RoomTask {
  id: string
  propertyId: PropertyId
  roomId: string
  room: string
  building: string
  roomType: RoomType
  assignedTo?: string
  assignedStaffId?: string
  status: RoomStatus
  photoBeforeUrl?: string
  photoAfterUrl?: string
  cleaningStartedAt?: string
  cleaningFinishedAt?: string
  cleaningChecklist?: CleaningChecklist
}
