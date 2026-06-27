import { NavLink } from 'react-router-dom'
import { CalendarOff, ClipboardList, Clock } from 'lucide-react'

const links = [
  { to: '/my-tasks', icon: ClipboardList, label: 'Tasks' },
  { to: '/my-attendance', icon: Clock, label: 'Attendance' },
  { to: '/my-leave', icon: CalendarOff, label: 'Leave' },
] as const

export function StaffBottomNav() {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-sand-dark bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
      aria-label="Staff navigation"
    >
      <div className="grid grid-cols-3">
        {links.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              [
                'flex min-h-[3.25rem] flex-col items-center justify-center gap-0.5 px-2 py-2 text-[11px] font-semibold transition-colors',
                isActive ? 'text-forest' : 'text-forest/45',
              ].join(' ')
            }
          >
            {({ isActive }) => (
              <>
                <Icon className="h-5 w-5" strokeWidth={isActive ? 2.25 : 2} />
                <span>{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
