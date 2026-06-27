import type { BiometricPunch, LeaveRecord, RoomTask, Staff } from '../types'

export { allRooms, roomsOoty, roomsKannur, OPERATIONAL_ROOM_COUNTS } from './roomInventory'

export const todayLabel = new Date().toLocaleDateString('en-IN', {
  weekday: 'long',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

/** Fresh start — operational data entered in the app / Supabase */
export const allStaff: Staff[] = []
export const biometricPunches: BiometricPunch[] = []
export const leaveRecords: LeaveRecord[] = []
export const roomTasks: RoomTask[] = []

/** Demo app logins (owner + operations manager only until Supabase Auth go-live) */
export const demoUsers = [
  {
    email: 'ruheed@rozana.com',
    password: 'ruheed',
    user: {
      id: 'u1',
      name: 'Ruheed',
      role: 'owner' as const,
      propertyId: 'all' as const,
      email: 'ruheed@rozana.com',
    },
  },
  {
    email: 'firoz@rozana.com',
    password: 'firoz',
    user: {
      id: 'u2',
      name: 'Firoz',
      role: 'operations-manager' as const,
      propertyId: 'ooty-skyview' as const,
      email: 'firoz@rozana.com',
    },
  },
]
