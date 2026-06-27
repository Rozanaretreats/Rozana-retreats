import { supabase } from './supabase'
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

function markRpcUnavailable() {
  staffLoginRpcReady = false
  writeRpcAvailabilityCache(false)
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

function isRlsDenied(error: RpcError): boolean {
  if (!error) return false
  return error.code === '42501' || /row-level security/i.test(error.message ?? '')
}

function staffLoginConfigError(rpcError: RpcError, legacyError?: RpcError): Error {
  if (isRpcMissing(rpcError)) {
    const detail = legacyError?.message ? ` Table fallback: ${legacyError.message}` : ''
    return new Error(STAFF_LOGIN_SQL_HINT + detail)
  }
  if (legacyError && isRlsDenied(legacyError)) {
    return new Error(STAFF_LOGIN_SQL_HINT)
  }
  return new Error(legacyError?.message ?? rpcError?.message ?? 'Staff login failed')
}

type VerifyStaffLoginRow = {
  staff_id: string
  email: string
  name: string
  property_id: PropertyId
}

/** null = not probed yet · true = rozana_* RPCs work · false = use table fallback only */
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

async function rpcVerify(email: string, password: string) {
  if (!supabase) return { data: null, error: null as RpcError, attempted: false }

  if (!(await probeStaffLoginRpc())) {
    return { data: null, error: null as RpcError, attempted: false }
  }

  const result = await supabase.rpc('rozana_verify_staff_login', {
    body: { login_email: email, login_password: password },
  })
  if (isRpcMissing(result.error)) markRpcUnavailable()
  return { ...result, attempted: true }
}

async function rpcUpsert(staffId: string, email: string, password: string) {
  if (!supabase) return { error: null as RpcError, attempted: false }

  if (!(await probeStaffLoginRpc())) {
    return { error: null as RpcError, attempted: false }
  }

  const result = await supabase.rpc('rozana_upsert_staff_login', {
    body: { staff_id: staffId, email, password },
  })
  if (isRpcMissing(result.error)) markRpcUnavailable()
  return { ...result, attempted: true }
}

async function rpcDelete(staffId: string) {
  if (!supabase) return { error: null as RpcError, attempted: false }

  if (!(await probeStaffLoginRpc())) {
    return { error: null as RpcError, attempted: false }
  }

  const result = await supabase.rpc('rozana_delete_staff_login', {
    body: { staff_id: staffId },
  })
  return { ...result, attempted: true }
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

  const legacy = await supabase.from('staff_logins').select('staff_id, email')
  if (!legacy.error) {
    return (legacy.data ?? []).map((row) => ({
      staffId: row.staff_id as string,
      email: row.email as string,
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

  const rpc = await rpcUpsert(input.staffId, email, input.password)
  if (rpc.attempted && !rpc.error) return

  const legacy = await supabase.from('staff_logins').upsert(
    { staff_id: input.staffId, email, password: input.password },
    { onConflict: 'staff_id' },
  )

  if (legacy.error) {
    throw staffLoginConfigError(rpc.error, legacy.error)
  }
}

export async function resetStaffLoginPassword(
  staffId: string,
  email: string,
  password: string,
): Promise<void> {
  const normalizedEmail = email.trim().toLowerCase()
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

  const rpc = await rpcUpsert(staffId, normalizedEmail, password)
  if (rpc.attempted && !rpc.error) return

  const legacy = await supabase.from('staff_logins').upsert(
    { staff_id: staffId, email: normalizedEmail, password },
    { onConflict: 'staff_id' },
  )

  if (legacy.error) {
    throw staffLoginConfigError(rpc.error, legacy.error)
  }
}

export async function deleteStaffLogin(staffId: string): Promise<void> {
  if (!supabase) {
    writeLocalLogins(readLocalLogins().filter((l) => l.staffId !== staffId))
    return
  }

  const rpc = await rpcDelete(staffId)
  if (rpc.attempted && !rpc.error) return

  const legacy = await supabase.from('staff_logins').delete().eq('staff_id', staffId)
  if (legacy.error) throw staffLoginConfigError(rpc.error, legacy.error)
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

  const legacy = await supabase
    .from('staff_logins')
    .select('staff_id')
    .eq('email', normalized)
    .maybeSingle()

  if (legacy.error || !legacy.data) return false
  return legacy.data.staff_id !== excludeStaffId
}

async function loginViaStaffLoginsTable(
  normalized: string,
  password: string,
): Promise<User | null> {
  if (!supabase) return null

  const legacy = await supabase
    .from('staff_logins')
    .select('staff_id, email, password, staff:staff_id(name, property_id, active)')
    .eq('email', normalized)
    .maybeSingle()

  if (legacy.error || !legacy.data) return null

  const stored = legacy.data.password as string
  const plainOk = stored === password
  if (!plainOk) return null

  const staffRow = legacy.data.staff
  const staff = (Array.isArray(staffRow) ? staffRow[0] : staffRow) as {
    name: string
    property_id: PropertyId
    active: boolean
  } | null
  if (!staff?.active) return null

  return {
    id: `login-${legacy.data.staff_id}`,
    name: staff.name,
    role: 'housekeeping-staff',
    propertyId: staff.property_id,
    email: legacy.data.email,
    staffId: legacy.data.staff_id,
  }
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

  // Table login first — avoids RPC 404 noise when fallback is what works
  const tableUser = await loginViaStaffLoginsTable(normalized, password)
  if (tableUser) return tableUser

  const { data, error: rpcError, attempted } = await rpcVerify(normalized, password)

  if (attempted && !rpcError && data && typeof data === 'object') {
    const row = data as VerifyStaffLoginRow
    if (row.staff_id && row.name && row.property_id) {
      return {
        id: `login-${row.staff_id}`,
        name: row.name,
        role: 'housekeeping-staff',
        propertyId: row.property_id,
        email: row.email,
        staffId: row.staff_id,
      }
    }
  }

  if (attempted && rpcError && !isRpcMissing(rpcError)) {
    console.warn('Staff login RPC error', rpcError.message)
  }

  return null
}
