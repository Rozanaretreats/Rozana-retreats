import type { Property } from '../types'
import { OPERATIONAL_ROOM_COUNTS } from './roomInventory'

export const properties: Property[] = [
  {
    id: 'ooty-skyview',
    name: 'Rozana Retreats Skyview',
    shortName: 'Ooty · Skyview',
    roomCount: OPERATIONAL_ROOM_COUNTS['ooty-skyview'],
    managerName: 'Firoz',
  },
  {
    id: 'kannur-beachview',
    name: 'Rozana Retreats Beachvibe',
    shortName: 'Kannur · Beachvibe',
    roomCount: OPERATIONAL_ROOM_COUNTS['kannur-beachview'],
    managerName: 'Vijay (planned)',
  },
]

export function getProperty(id: string) {
  return properties.find((p) => p.id === id)
}
