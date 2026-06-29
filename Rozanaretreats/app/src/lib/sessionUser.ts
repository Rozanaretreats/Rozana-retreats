import type { Session } from '@supabase/supabase-js'

import type { PropertyId, User, UserRole } from '../types'

import { supabase } from './supabase'

function roleFromProfile(dbRole: string): UserRole {
  if (dbRole === 'owner') return 'owner'
  if (dbRole === 'manager') return 'operations-manager'
  return 'housekeeping-staff'
}

/** Build app User from Supabase Auth session (profiles or HK app_metadata). */
export async function userFromSession(session: Session): Promise<User | null> {
  if (!supabase) return null

  const { user } = session
  const email = user.email ?? ''

  const meta = user.app_metadata as Record<string, unknown>
  const metaRole = meta.rozana_role as string | undefined
  if (metaRole === 'housekeeping-staff') {
    const staffId = meta.rozana_staff_id as string | undefined
    const propertyId = meta.rozana_property_id as PropertyId | undefined
    const name = (meta.rozana_name as string | undefined) ?? email
    if (!staffId || !propertyId) return null
    return {
      id: user.id,
      email,
      name,
      role: 'housekeeping-staff',
      propertyId,
      staffId,
    }
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('name, role, property_scope')
    .eq('id', user.id)
    .maybeSingle()

  if (error || !profile) return null

  const propertyId =
    profile.property_scope === 'all' ? ('all' as const) : (profile.property_scope as PropertyId)

  return {
    id: user.id,
    email,
    name: profile.name,
    role: roleFromProfile(profile.role),
    propertyId,
  }
}
