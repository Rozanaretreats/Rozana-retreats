import { createContext, useContext, useState, type ReactNode } from 'react'

import type { User } from '../types'

import { demoUsers } from '../data/mockData'

import { authenticateStaffLogin } from '../lib/staffAuth'

interface AuthContextValue {
  user: User | null
  login: (email: string, password: string) => Promise<boolean>
  logout: () => void
  isOwner: boolean
  isOperationsManager: boolean
  isHousekeepingStaff: boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

const STORAGE_KEY = 'rozana_session'
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000

/** Dev: session ends when the browser tab closes. Prod: 7-day remember-me in localStorage. */
const authStorage = import.meta.env.DEV ? sessionStorage : localStorage

if (import.meta.env.DEV) {
  localStorage.removeItem(STORAGE_KEY)
}

type StoredSession = {
  user: User
  expiresAt: number
}

function repairDemoUser(stored: User): User {
  const match = demoUsers.find((d) => d.user.email.toLowerCase() === stored.email.toLowerCase())
  if (!match) return stored
  const canonical = match.user as User
  return {
    ...canonical,
    ...stored,
    staffId: stored.staffId ?? canonical.staffId,
  }
}

function loadSessionUser(): User | null {
  try {
    const raw = authStorage.getItem(STORAGE_KEY)
    if (!raw) return null

    const parsed = JSON.parse(raw) as StoredSession | User
    if ('expiresAt' in parsed && typeof parsed.expiresAt === 'number') {
      if (Date.now() > parsed.expiresAt) {
        authStorage.removeItem(STORAGE_KEY)
        return null
      }
      return repairDemoUser(parsed.user)
    }

    return repairDemoUser(parsed as User)
  } catch {
    return null
  }
}

function persistSession(user: User) {
  const payload: StoredSession = {
    user,
    expiresAt: Date.now() + SESSION_TTL_MS,
  }
  authStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(loadSessionUser)

  const login = async (email: string, password: string) => {
    const demo = demoUsers.find(
      (d) => d.email.toLowerCase() === email.toLowerCase() && d.password === password,
    )
    if (demo) {
      const sessionUser = repairDemoUser(demo.user as User)
      setUser(sessionUser)
      persistSession(sessionUser)
      return true
    }

    const staffUser = await authenticateStaffLogin(email, password)
    if (!staffUser) return false

    setUser(staffUser)
    persistSession(staffUser)
    return true
  }

  const logout = () => {
    setUser(null)
    authStorage.removeItem(STORAGE_KEY)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        isOwner: user?.role === 'owner',
        isOperationsManager: user?.role === 'operations-manager',
        isHousekeepingStaff: user?.role === 'housekeeping-staff',
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
