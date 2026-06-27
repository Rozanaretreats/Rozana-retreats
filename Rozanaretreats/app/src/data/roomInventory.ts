import type { PropertyId, Room, RoomType } from '../types'

/** Operational room counts (excludes closed / storage rooms at Skyview) */
export const OPERATIONAL_ROOM_COUNTS: Record<PropertyId, number> = {
  'ooty-skyview': 24,
  'kannur-beachview': 8,
}

/** Skyview: 26 physical rooms — 2 closed for storage, 24 guest-facing */
export const SKYVIEW_PHYSICAL_TOTAL = 26
export const SKYVIEW_CLOSED_FOR_STORAGE = 2

export const ROOM_TYPE_LABELS: Record<RoomType, string> = {
  standard: 'Standard',
  premium: 'Premium',
  classic: 'Classic',
  club: 'Club',
  panorama: 'Panorama',
  dorm: 'Travellers dorm (12 bed)',
}

export function formatRoomType(type: RoomType): string {
  return ROOM_TYPE_LABELS[type] ?? type
}

/** Building + type line — avoids "Panorama · Panorama" when both mean the same */
export function formatRoomSubtitle(building: string, type: RoomType): string {
  const typeLabel = formatRoomType(type)
  if (building.trim().toLowerCase() === typeLabel.trim().toLowerCase()) {
    return typeLabel
  }
  return `${building} · ${typeLabel}`
}

function ootyRoom(id: string, number: string, building: string, type: RoomType): Room {
  return { id, propertyId: 'ooty-skyview', number, building, type }
}

function kannurRoom(id: string, number: string, building: string, type: RoomType): Room {
  return { id, propertyId: 'kannur-beachview', number, building, type }
}

/** Ooty Skyview — 17 classic · 4 club · 2 panorama · 1 dorm */
export function buildOotyRooms(): Room[] {
  const rooms: Room[] = []

  for (let i = 1; i <= 17; i++) {
    const n = String(i).padStart(2, '0')
    rooms.push(ootyRoom(`ooty-cl-${n}`, `C${n}`, 'Classic', 'classic'))
  }
  for (let i = 1; i <= 4; i++) {
    const n = String(i).padStart(2, '0')
    rooms.push(ootyRoom(`ooty-cb-${n}`, `CL${n}`, 'Club', 'club'))
  }
  for (let i = 1; i <= 2; i++) {
    const n = String(i).padStart(2, '0')
    rooms.push(ootyRoom(`ooty-pn-${n}`, `P${n}`, 'Panorama', 'panorama'))
  }
  rooms.push(ootyRoom('ooty-dm-01', 'Dorm', 'Travellers', 'dorm'))

  return rooms
}

/** Kannur Beachvibe — 5 standard · 3 premium */
export function buildKannurRooms(): Room[] {
  const standard = Array.from({ length: 5 }, (_, i) =>
    kannurRoom(`knr-s${i + 1}`, `S${i + 1}`, 'Standard', 'standard'),
  )
  const premium = Array.from({ length: 3 }, (_, i) =>
    kannurRoom(`knr-p${i + 1}`, `P${i + 1}`, 'Premium', 'premium'),
  )
  return [...standard, ...premium]
}

export const roomsOoty = buildOotyRooms()
export const roomsKannur = buildKannurRooms()
export const allRooms: Room[] = [...roomsOoty, ...roomsKannur]
