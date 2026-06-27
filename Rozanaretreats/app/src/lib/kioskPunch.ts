import type { BiometricPunch } from '../types'
import { MANUAL_PUNCH_DEVICE_ID } from './manualPunch'

export const KIOSK_PUNCH_SOURCE = 'kiosk' as const

/** Punch from the Flutter attendance kiosk (or legacy device rows before source column). */
export function isKioskPunch(punch: BiometricPunch): boolean {
  if (punch.source === KIOSK_PUNCH_SOURCE) return true
  if (punch.source && punch.source !== KIOSK_PUNCH_SOURCE) return false
  return punch.deviceId !== MANUAL_PUNCH_DEVICE_ID && punch.deviceId !== 'manual-test'
}

export function kioskDeviceLabel(deviceId: string): string {
  if (deviceId.startsWith('kiosk-') || deviceId.startsWith('laptop-')) {
    return deviceId.replace(/-/g, ' ')
  }
  return deviceId
}
