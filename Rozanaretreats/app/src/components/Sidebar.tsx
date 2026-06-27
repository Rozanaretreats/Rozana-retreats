import { NavLink } from 'react-router-dom'
import {
  Clock,
  CalendarOff,
  Leaf,
  LogOut,
  ClipboardList,
} from 'lucide-react'
import type { UserRole } from '../types'
import { useAuth } from '../context/AuthContext'
import { getProperty } from '../data/properties'
import { managementLinksForRole } from '../lib/managementNav'

const staffLinks: { to: string; icon: typeof ClipboardList; label: string }[] = [
  { to: '/my-tasks', icon: ClipboardList, label: 'My tasks' },
  { to: '/my-attendance', icon: Clock, label: 'My attendance' },
  { to: '/my-leave', icon: CalendarOff, label: 'My leave' },
]

function roleLabel(role: UserRole | undefined): string {
  if (role === 'owner') return 'Owner'
  if (role === 'operations-manager') return 'Operations manager'
  if (role === 'housekeeping-staff') return 'Housekeeping staff'
  return ''
}

function SidebarPanel() {
  const { user, logout } = useAuth()
  const property = user && user.propertyId !== 'all' ? getProperty(user.propertyId) : null

  const links =
    user?.role === 'housekeeping-staff'
      ? staffLinks
      : managementLinksForRole(user?.role).map(({ to, icon, label }) => ({
          to,
          icon,
          label,
        }))

  return (
    <>
      <div className="shrink-0 border-b border-white/10 px-5 py-5 md:py-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber/20">
            <Leaf className="h-5 w-5 text-amber" strokeWidth={2.2} />
          </div>
          <div>
            <p className="text-sm font-semibold tracking-wide">Rozana Ops</p>
          </div>
        </div>
        {property && (
          <p className="mt-4 rounded-lg bg-white/10 px-3 py-2 text-xs text-white/80">{property.name}</p>
        )}
      </div>

      <nav className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto p-3">
        {links.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              [
                'flex min-h-[3rem] items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-white text-forest shadow-sm'
                  : 'text-white/80 hover:bg-white/10 hover:text-white',
              ].join(' ')
            }
          >
            <Icon className="h-5 w-5 shrink-0" strokeWidth={2} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="shrink-0 border-t border-white/10 p-4">
        <div className="flex items-center gap-3 rounded-xl bg-white/5 px-3 py-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber text-sm font-bold text-forest">
            {user?.name[0] ?? '?'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{user?.name}</p>
            {user?.role && <p className="text-xs text-white/50">{roleLabel(user.role)}</p>}
          </div>
        </div>
        <button
          type="button"
          onClick={logout}
          className="mt-3 flex min-h-[2.75rem] w-full items-center justify-center gap-2 rounded-lg py-2 text-xs text-white/70 hover:bg-white/10 hover:text-white"
        >
          <LogOut className="h-3.5 w-3.5" />
          Sign out
        </button>
      </div>
    </>
  )
}

export function Sidebar() {
  return (
    <aside className="hidden h-screen w-64 shrink-0 flex-col overflow-hidden bg-forest text-white md:flex">
      <SidebarPanel />
    </aside>
  )
}
