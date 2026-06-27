import type { ReactNode } from 'react'
import { useAuth } from '../context/AuthContext'
import { useOps } from '../context/OpsContext'
import { useLinkedStaff } from '../hooks/useLinkedStaff'
import type { Staff } from '../types'

type StaffPortalGateProps = {
  children: (staff: Staff) => ReactNode
}

export function StaffPortalGate({ children }: StaffPortalGateProps) {
  const { user } = useAuth()
  const { loading } = useOps()
  const linked = useLinkedStaff()

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-sm text-forest/50">
        Loading your profile…
      </div>
    )
  }

  if (!user?.staffId) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-6 py-10 text-center text-sm text-amber-900">
        <p className="font-medium">Account not linked to roster</p>
        <p className="mt-2 text-amber-800/80">
          Sign out and sign in again with your housekeeping staff account. If this continues, ask
          your operations manager to add you on the Team tab with the same profile.
        </p>
      </div>
    )
  }

  if (!linked) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-6 py-10 text-center text-sm text-amber-900">
        <p className="font-medium">Roster profile not found</p>
        <p className="mt-2 text-amber-800/80">
          Your login is linked to roster id <code className="font-mono">{user.staffId}</code>, but
          that person is not on the team yet. Ask your operations manager to add you under
          Housekeeping → Team.
        </p>
      </div>
    )
  }

  return <>{children(linked)}</>
}
