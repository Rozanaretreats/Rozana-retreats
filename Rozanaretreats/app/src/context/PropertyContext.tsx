import { createContext, useContext, useState, type ReactNode } from 'react'
import type { PropertyId } from '../types'
import { useAuth } from './AuthContext'

export type PropertyFilter = PropertyId | 'all'

interface PropertyContextValue {
  filter: PropertyFilter
  setFilter: (f: PropertyFilter) => void
  canToggle: boolean
  /** Property IDs visible for current user + filter */
  visiblePropertyIds: PropertyId[]
}

const PropertyContext = createContext<PropertyContextValue | null>(null)

export function PropertyProvider({ children }: { children: ReactNode }) {
  const { user, isOwner } = useAuth()
  const [filter, setFilter] = useState<PropertyFilter>('all')

  const canToggle = isOwner

  const visiblePropertyIds: PropertyId[] = (() => {
    if (!user) return []
    if (user.role === 'operations-manager' && user.propertyId !== 'all') {
      return [user.propertyId]
    }
    if (user.role === 'housekeeping-staff' && user.propertyId !== 'all') {
      return [user.propertyId]
    }
    if (filter === 'all') return ['ooty-skyview', 'kannur-beachview']
    return [filter]
  })()

  return (
    <PropertyContext.Provider value={{ filter, setFilter, canToggle, visiblePropertyIds }}>
      {children}
    </PropertyContext.Provider>
  )
}

export function useProperty() {
  const ctx = useContext(PropertyContext)
  if (!ctx) throw new Error('useProperty must be used within PropertyProvider')
  return ctx
}

export function usePropertyFilter<T extends { propertyId: PropertyId }>(items: T[]): T[] {
  const { visiblePropertyIds } = useProperty()
  return items.filter((i) => visiblePropertyIds.includes(i.propertyId))
}
