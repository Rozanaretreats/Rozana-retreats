import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

import type { User } from '../types'

import { demoUsers } from '../data/mockData'

import { authenticateStaffLogin } from '../lib/staffAuth'
import { userFromSession } from '../lib/sessionUser'
import { supabase } from '../lib/supabase'

interface AuthContextValue {
  user: User | null
  authReady: boolean
  login: (email: string, password: string) => Promise<boolean>
  logout: () => Promise<void>
  isOwner: boolean
  isOperationsManager: boolean
  isHousekeepingStaff: boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

const STORAGE_KEY = 'rozana_session'

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

function loadDevDemoSession(): User | null {
  if (!import.meta.env.DEV) return null
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return repairDemoUser(JSON.parse(raw) as User)
  } catch {
    return null
  }
}

function persistDevDemoSession(user: User) {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(user))
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(loadDevDemoSession)
  const [authReady, setAuthReady] = useState(!supabase)

  useEffect(() => {
    if (!supabase) return

    let mounted = true

    const sync = async () => {
      if (!supabase) return
      const { data } = await supabase.auth.getSession()
      if (!mounted) return
      if (data.session) {
        const appUser = await userFromSession(data.session)
        if (appUser) setUser(appUser)
      }
      setAuthReady(true)
    }

    void sync()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return
      if (!session) {
        if (!import.meta.env.DEV) setUser(null)
        return
      }
      const appUser = await userFromSession(session)
      if (appUser) setUser(appUser)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  const login = async (email: string, password: string) => {
    if (import.meta.env.DEV) {
      const demo = demoUsers.find(
        (d) => d.email.toLowerCase() === email.toLowerCase() && d.password === password,
      )
      if (demo) {
        const sessionUser = repairDemoUser(demo.user as User)
        setUser(sessionUser)
        persistDevDemoSession(sessionUser)
        return true
      }
    }

    if (!supabase) {
      const staffUser = await authenticateStaffLogin(email, password)
      if (!staffUser) return false
      setUser(staffUser)
      return true
    }

    const normalized = email.trim().toLowerCase()
    const { data, error } = await supabase.auth.signInWithPassword({
      email: normalized,
      password,
    })
    if (error || !data.session) return false

    const appUser = await userFromSession(data.session)
    if (!appUser) return false

    setUser(appUser)
    return true
  }

  const logout = async () => {
    setUser(null)
    if (import.meta.env.DEV) sessionStorage.removeItem(STORAGE_KEY)
    if (supabase) await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        authReady,
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
