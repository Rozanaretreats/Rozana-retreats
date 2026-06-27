import type { PropertyId } from '../types'
import { getProperty } from '../data/properties'

export function PropertyBadge({ propertyId }: { propertyId: PropertyId }) {
  const p = getProperty(propertyId)
  if (!p) return null
  return (
    <span className="rounded-full bg-forest/10 px-2.5 py-0.5 text-xs font-medium text-forest">
      {p.shortName}
    </span>
  )
}
