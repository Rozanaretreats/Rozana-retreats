import type { User, UserRole } from '../types'

export function homePathForRole(role: UserRole): string {
  if (role === 'housekeeping-staff') return '/my-tasks'
  return '/attendance'
}

export function homePathForUser(user: User | null): string {
  if (!user) return '/login'
  return homePathForRole(user.role)
}
