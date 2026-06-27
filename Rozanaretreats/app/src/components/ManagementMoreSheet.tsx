import { LogOut, MoreHorizontal, X } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useProperty } from '../context/PropertyContext'
import { getProperty } from '../data/properties'
import { PropertyToggle } from './PropertyToggle'

function roleLabel(role: string | undefined): string {
  if (role === 'owner') return 'Owner'
  if (role === 'operations-manager') return 'Operations manager'
  return ''
}

type ManagementMoreSheetProps = {
  open: boolean
  onClose: () => void
}

export function ManagementMoreSheet({ open, onClose }: ManagementMoreSheetProps) {
  const { user, logout } = useAuth()
  const { canToggle } = useProperty()

  if (!open || !user) return null

  const property =
    user.propertyId !== 'all' ? getProperty(user.propertyId) : null

  const handleSignOut = () => {
    onClose()
    logout()
  }

  return (
    <div className="fixed inset-0 z-50 md:hidden">
      <button
        type="button"
        className="absolute inset-0 bg-forest/40 backdrop-blur-[1px]"
        aria-label="Close menu"
        onClick={onClose}
      />
      <div className="absolute inset-x-0 bottom-0 max-h-[min(85dvh,520px)] overflow-hidden rounded-t-2xl border border-sand-dark bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-sand-dark px-5 py-4">
          <div className="min-w-0">
            <p className="truncate font-semibold text-forest">{user.name}</p>
            <p className="truncate text-sm text-forest/55">
              {roleLabel(user.role)}
              {property ? ` · ${property.shortName}` : user.role === 'owner' ? ' · All properties' : ''}
            </p>
            <p className="truncate text-xs text-forest/40">{user.email}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-forest/50 hover:bg-sand"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[calc(85dvh-5rem)] space-y-6 overflow-y-auto px-5 py-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
          {canToggle && (
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-forest/45">
                Property view
              </p>
              <PropertyToggle layout="stacked" />
            </div>
          )}

          <button
            type="button"
            onClick={handleSignOut}
            className="flex min-h-12 w-full items-center gap-3 rounded-xl border border-red-100 bg-red-50/80 px-4 text-left text-sm font-semibold text-red-900 active:bg-red-100"
          >
            <LogOut className="h-5 w-5 text-red-700/70" />
            Sign out
          </button>
        </div>
      </div>
    </div>
  )
}

type ManagementMoreButtonProps = {
  onClick: () => void
}

export function ManagementMoreButton({ onClick }: ManagementMoreButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-sand-dark text-forest md:hidden"
      aria-label="Account and settings"
    >
      <MoreHorizontal className="h-5 w-5" />
    </button>
  )
}
