import { CalendarOff, Clock, FileBarChart, Sparkles } from 'lucide-react'
import type { UserRole } from '../types'
import { labels } from '../i18n/labels'

export type ManagementNavLink = {
  to: string
  icon: typeof Clock
  label: string
  shortLabel: string
  roles: UserRole[]
}

export const managementNavLinks: ManagementNavLink[] = [
  {
    to: '/attendance',
    icon: Clock,
    label: labels.attendance,
    shortLabel: 'Attendance',
    roles: ['owner', 'operations-manager'],
  },
  {
    to: '/leave',
    icon: CalendarOff,
    label: labels.leave,
    shortLabel: 'Leave',
    roles: ['owner', 'operations-manager'],
  },
  {
    to: '/housekeeping',
    icon: Sparkles,
    label: labels.housekeeping,
    shortLabel: 'HK',
    roles: ['owner', 'operations-manager'],
  },
  {
    to: '/reports',
    icon: FileBarChart,
    label: labels.reports,
    shortLabel: 'Reports',
    roles: ['owner'],
  },
]

export function managementLinksForRole(role: UserRole | undefined): ManagementNavLink[] {
  if (!role) return []
  return managementNavLinks.filter((l) => l.roles.includes(role))
}
