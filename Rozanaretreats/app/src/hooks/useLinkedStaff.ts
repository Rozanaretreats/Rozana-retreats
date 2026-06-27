import { useAuth } from '../context/AuthContext'
import { useOps } from '../context/OpsContext'
import type { Staff } from '../types'

/** Roster row linked to the logged-in housekeeping staff user */
export function useLinkedStaff(): Staff | null {
  const { user } = useAuth()
  const { getStaffById } = useOps()
  if (!user?.staffId) return null
  return getStaffById(user.staffId) ?? null
}
