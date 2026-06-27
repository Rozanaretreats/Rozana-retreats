import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from '../components/Sidebar'
import { StaffBottomNav } from '../components/StaffBottomNav'
import { ManagementBottomNav } from '../components/ManagementBottomNav'
import { ManagementMoreButton, ManagementMoreSheet } from '../components/ManagementMoreSheet'
import { PropertyToggle } from '../components/PropertyToggle'
import { useAuth } from '../context/AuthContext'
import { useOpsOptional } from '../context/OpsContext'
import { todayLabel } from '../data/mockData'
import { getProperty } from '../data/properties'

function roleLabel(role: string | undefined): string {
  if (role === 'owner') return 'Owner'
  if (role === 'operations-manager') return 'Operations manager'
  if (role === 'housekeeping-staff') return 'Housekeeping staff'
  return ''
}

export function SidebarLayout() {
  const { user } = useAuth()
  const [moreOpen, setMoreOpen] = useState(false)
  const dataSource = useOpsOptional()?.dataSource ?? 'local'
  const isStaff = user?.role === 'housekeeping-staff'
  const isManagement = user?.role === 'owner' || user?.role === 'operations-manager'
  const property = user && user.propertyId !== 'all' ? getProperty(user.propertyId) : null

  const mobileSubtitle = isStaff
    ? property?.shortName
    : isManagement
      ? property
        ? `${roleLabel(user?.role)} · ${property.shortName}`
        : `${roleLabel(user?.role)} · All properties`
      : roleLabel(user?.role)

  return (
    <div className="flex h-[100dvh] overflow-hidden">
      <Sidebar />

      <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-sand-dark bg-white/90 px-4 py-3 backdrop-blur-sm md:px-8">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-forest md:hidden">Rozana Ops</p>
            <p
              className={[
                'truncate text-forest/70',
                isManagement ? 'text-xs md:text-sm' : 'text-sm',
              ].join(' ')}
            >
              <span className="md:hidden">{mobileSubtitle}</span>
              <span className="hidden md:inline">{todayLabel}</span>
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {dataSource === 'supabase' ? (
              <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-medium text-green-800 sm:px-2.5 sm:text-xs">
                Live
              </span>
            ) : (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-900 sm:px-2.5 sm:text-xs">
                Demo
              </span>
            )}
            {isManagement && (
              <>
                <div className="hidden md:block">
                  <PropertyToggle />
                </div>
                <ManagementMoreButton onClick={() => setMoreOpen(true)} />
              </>
            )}
            {isStaff && property && (
              <p className="hidden truncate text-xs font-medium text-forest/50 sm:block">
                {property.shortName}
              </p>
            )}
          </div>
        </div>

        <div
          className={[
            'min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-4 py-4 sm:px-6 md:px-8 md:py-6',
            isStaff || isManagement
              ? 'pb-[calc(4.5rem+env(safe-area-inset-bottom))] md:pb-6'
              : '',
          ].join(' ')}
        >
          <Outlet />
        </div>
      </main>

      {isStaff && <StaffBottomNav />}
      {isManagement && <ManagementBottomNav />}
      {isManagement && (
        <ManagementMoreSheet open={moreOpen} onClose={() => setMoreOpen(false)} />
      )}
    </div>
  )
}
