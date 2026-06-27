import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { homePathForUser } from '../lib/homeRoute'

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

export function OwnerOnlyRoute({ children }: { children: React.ReactNode }) {
  const { user, isOwner } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (!isOwner) return <Navigate to={homePathForUser(user)} replace />
  return <>{children}</>
}

/** Owner + operations manager screens — housekeeping staff redirected to their portal */
export function ManagementOnlyRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (user.role === 'housekeeping-staff') {
    return <Navigate to="/my-tasks" replace />
  }
  return <>{children}</>
}

/** Housekeeping staff portal only */
export function StaffOnlyRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (user.role !== 'housekeeping-staff') {
    return <Navigate to={homePathForUser(user)} replace />
  }
  return <>{children}</>
}

export function HomeRedirect() {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  return <Navigate to={homePathForUser(user)} replace />
}
