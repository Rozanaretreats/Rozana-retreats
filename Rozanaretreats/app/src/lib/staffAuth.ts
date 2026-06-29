import { supabase } from './supabase'
import { userFromSession } from './sessionUser'
import { demoUsers } from '../data/mockData'
import type { PropertyId, User } from '../types'

export type StaffLoginMeta = {
  staffId: string
  email: string
  name: string
  propertyId: PropertyId
}

const LOCAL_LOGINS_KEY = 'rozana_staff_logins'
const LOCAL_HASH_PREFIX = 'sha256:'
const RPC_AVAIL_CACHE_KEY = 'rozana_staff_login_rpc_ok'

export const STAFF_LOGIN_SQL_HINT =
  'HK login RPC missing in Supabase. SQL Editor → run supabase/migrations/016_rozana_staff_login_rpc.sql (or npm run db:fix-login), then Supabase → Settings → Data API → Reload schema cache, then hard-refresh the app.'

function readRpcAvailabilityCache(): boolean | null {
  try {
    const v = sessionStorage.getItem(RPC_AVAIL_CACHE_KEY)
    if (v === '1') return true
    if (v === '0') return false
  } catch {
    /* ignore */
  }
  return null
}

function writeRpcAvailabilityCache(ready: boolean) {
  try {
    sessionStorage.setItem(RPC_AVAIL_CACHE_KEY, ready ? '1' : '0')
  } catch {
    /* ignore */
  }
}

type StoredLogin = StaffLoginMeta & { password: string }

type RpcError = { code?: string; message?: string; status?: number } | null

function readLocalLogins(): StoredLogin[] {
  try {
    const raw = localStorage.getItem(LOCAL_LOGINS_KEY)
    return raw ? (JSON.parse(raw) as StoredLogin[]) : []
  } catch {
    return []
  }
}

function writeLocalLogins(logins: StoredLogin[]) {
  localStorage.setItem(LOCAL_LOGINS_KEY, JSON.stringify(logins))
}

async function hashLocalPassword(password: string): Promise<string> {
  const data = new TextEncoder().encode(`${password}:rozana-local-v1`)
  const buf = await crypto.subtle.digest('SHA-256', data)
  const hex = Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
  return `${LOCAL_HASH_PREFIX}${hex}`
}

async function verifyLocalPassword(stored: string, password: string): Promise<boolean> {
  if (stored.startsWith(LOCAL_HASH_PREFIX)) {
    const hash = await hashLocalPassword(password)
    return stored === hash
  }
  return stored === password
}

function isRpcMissing(error: RpcError): boolean {
  if (!error) return false
  return (
    error.status === 404 ||
    error.code === 'PGRST202' ||
    error.code === '42883' ||
    /function.*does not exist/i.test(error.message ?? '') ||
    /could not find the function/i.test(error.message ?? '')
  )
}

/** null = not probed yet · true = rozana_* RPCs work · false = unavailable */
let staffLoginRpcReady: boolean | null = readRpcAvailabilityCache()
let probePromise: Promise<boolean> | null = null

async function probeStaffLoginRpc(): Promise<boolean> {
  if (!supabase) return false
  if (staffLoginRpcReady !== null) return staffLoginRpcReady

  if (!probePromise) {
    probePromise = (async () => {
      const { error } = await supabase.rpc('rozana_list_staff_login_emails')
      const ready = !error && !isRpcMissing(error)
      staffLoginRpcReady = ready
      writeRpcAvailabilityCache(ready)
      return ready
    })()
  }

  return probePromise
}

async function rpcEmailTaken(email: string, excludeStaffId?: string) {
  if (!supabase) return { data: null as boolean | null, error: null as RpcError, attempted: false }

  if (!(await probeStaffLoginRpc())) {
    return { data: null, error: null as RpcError, attempted: false }
  }

  const result = await supabase.rpc('rozana_is_staff_email_taken', {
    body: {
      check_email: email,
      exclude_staff_id: excludeStaffId ?? null,
    },
  })
  return { ...result, attempted: true }
}

async function rpcListEmails() {
  if (!supabase) return { data: null, error: null as RpcError, attempted: false }

  if (!(await probeStaffLoginRpc())) {
    return { data: null, error: null as RpcError, attempted: false }
  }

  const result = await supabase.rpc('rozana_list_staff_login_emails')
  return { ...result, attempted: true }
}

export async function fetchStaffLoginMeta(): Promise<{ staffId: string; email: string }[]> {
  if (!supabase) return readLocalLogins().map(({ staffId, email }) => ({ staffId, email }))

  const { data, error } = await rpcListEmails()
  if (!error) {
    return ((data ?? []) as { staff_id: string; email: string }[]).map((row) => ({
      staffId: row.staff_id,
      email: row.email,
    }))
  }

  console.warn(STAFF_LOGIN_SQL_HINT)
  return []
}

export async function insertStaffLogin(input: {
  staffId: string
  email: string
  password: string
  name: string
  propertyId: PropertyId
}): Promise<void> {
  const email = input.email.trim().toLowerCase()

  if (!supabase) {
    const password = await hashLocalPassword(input.password)
    const logins = readLocalLogins().filter((l) => l.staffId !== input.staffId)
    logins.push({
      staffId: input.staffId,
      email,
      password,
      name: input.name,
      propertyId: input.propertyId,
    })
    writeLocalLogins(logins)
    return
  }

  const { error } = await supabase.functions.invoke('provision-staff-auth', {
    body: {
      action: 'provision',
      staff_id: input.staffId,
      email,
      password: input.password,
      name: input.name,
      property_id: input.propertyId,
    },
  })
  if (error) throw new Error(error.message ?? 'Failed to create staff login')
}

export async function resetStaffLoginPassword(
  staffId: string,
  _email: string,
  password: string,
): Promise<void> {
  if (!password.trim()) {
    throw new Error('Password is required.')
  }

  if (!supabase) {
    const logins = readLocalLogins()
    const existing = logins.find((l) => l.staffId === staffId)
    if (!existing) {
      throw new Error('No app login found for this staff member.')
    }
    existing.password = await hashLocalPassword(password)
    writeLocalLogins(logins)
    return
  }

  const { data: meta } = await supabase.rpc('rozana_list_staff_login_emails')
  const row = ((meta ?? []) as { staff_id: string; email: string }[]).find(
    (r) => r.staff_id === staffId,
  )
  if (!row) throw new Error('No app login found for this staff member.')

  const { data: staffRow } = await supabase
    .from('staff')
    .select('name, property_id')
    .eq('id', staffId)
    .maybeSingle()

  const { error } = await supabase.functions.invoke('provision-staff-auth', {
    body: {
      action: 'provision',
      staff_id: staffId,
      email: row.email,
      password,
      name: staffRow?.name ?? row.email,
      property_id: staffRow?.property_id,
    },
  })
  if (error) throw new Error(error.message ?? 'Failed to reset password')
}

export async function deleteStaffLogin(staffId: string): Promise<void> {
  if (!supabase) {
    writeLocalLogins(readLocalLogins().filter((l) => l.staffId !== staffId))
    return
  }

  const { error } = await supabase.functions.invoke('provision-staff-auth', {
    body: { action: 'delete', staff_id: staffId },
  })
  if (error) throw new Error(error.message ?? 'Failed to delete staff login')
}

export async function isStaffLoginEmailTaken(
  email: string,
  excludeStaffId?: string,
): Promise<boolean> {
  const normalized = email.trim().toLowerCase()
  if (demoUsers.some((d) => d.email.toLowerCase() === normalized)) return true

  if (!supabase) {
    return readLocalLogins().some(
      (l) => l.email.toLowerCase() === normalized && l.staffId !== excludeStaffId,
    )
  }

  const { data, error } = await rpcEmailTaken(normalized, excludeStaffId)

  if (!error && typeof data === 'boolean') return data

  return false
}

export async function authenticateStaffLogin(
  email: string,
  password: string,
): Promise<User | null> {
  const normalized = email.trim().toLowerCase()

  if (!supabase) {
    const match = readLocalLogins().find((l) => l.email.toLowerCase() === normalized)
    if (!match) return null
    const ok = await verifyLocalPassword(match.password, password)
    if (!ok) return null
    if (!match.password.startsWith(LOCAL_HASH_PREFIX)) {
      match.password = await hashLocalPassword(password)
      writeLocalLogins(
        readLocalLogins().map((l) => (l.staffId === match.staffId ? match : l)),
      )
    }
    return {
      id: `login-${match.staffId}`,
      name: match.name,
      role: 'housekeeping-staff',
      propertyId: match.propertyId,
      email: match.email,
      staffId: match.staffId,
    }
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: normalized,
    password,
  })
  if (error || !data.session) return null

  return userFromSession(data.session)
}
