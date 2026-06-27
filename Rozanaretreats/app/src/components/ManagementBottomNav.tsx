import { NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { managementLinksForRole } from '../lib/managementNav'

export function ManagementBottomNav() {
  const { user } = useAuth()
  const links = managementLinksForRole(user?.role)

  if (links.length === 0) return null

  const cols = links.length

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-sand-dark bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
      aria-label="Management navigation"
    >
      <div
        className="grid"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
      >
        {links.map(({ to, icon: Icon, shortLabel }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              [
                'flex min-h-[3.25rem] flex-col items-center justify-center gap-0.5 px-1 py-2 text-[10px] font-semibold transition-colors sm:text-[11px]',
                isActive ? 'text-forest' : 'text-forest/45',
              ].join(' ')
            }
          >
            {({ isActive }) => (
              <>
                <Icon className="h-5 w-5" strokeWidth={isActive ? 2.25 : 2} />
                <span className="max-w-full truncate">{shortLabel}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
