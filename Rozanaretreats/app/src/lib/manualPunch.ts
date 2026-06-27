import type { BiometricPunch } from '../types'

/** Stored in attendance_punches.device_id — distinct from real biometric devices */
export const MANUAL_PUNCH_DEVICE_ID = 'manual-test'

export function allowManualPunches(): boolean {
  return import.meta.env.VITE_ALLOW_MANUAL_PUNCHES === 'true'
}

export function isManualPunch(punch: BiometricPunch): boolean {
  return punch.deviceId === MANUAL_PUNCH_DEVICE_ID
}

export function nowPunchTime(): string {
  const now = new Date()
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
}
