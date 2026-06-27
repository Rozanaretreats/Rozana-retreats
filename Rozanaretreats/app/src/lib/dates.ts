const DISPLAY: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

export function daysAgoIso(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString().slice(0, 10)
}

export function daysAheadIso(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

export function startOfMonthIso(day = todayIso()): string {
  return day.slice(0, 8) + '01'
}

export function defaultTodayRange(): { from: string; to: string } {
  const t = todayIso()
  return { from: t, to: t }
}

export function defaultMonthToDateRange(): { from: string; to: string } {
  return { from: startOfMonthIso(), to: todayIso() }
}

export function defaultLeaveListRange(): { from: string; to: string } {
  return { from: daysAgoIso(30), to: daysAheadIso(90) }
}

export function formatShortDate(iso: string): string {
  const d = new Date(iso + 'T12:00:00')
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('en-IN', DISPLAY)
}

export function formatRange(from: string, to: string): string {
  if (from === to) return formatShortDate(from)
  return `${formatShortDate(from)} → ${formatShortDate(to)}`
}

export function isWithinRange(iso: string, from: string, to: string): boolean {
  return iso >= from && iso <= to
}

export function isOnLeaveToday(from: string, to: string, day = todayIso()): boolean {
  return isWithinRange(day, from, to)
}

export function rangesOverlap(aFrom: string, aTo: string, bFrom: string, bTo: string): boolean {
  return aFrom <= bTo && aTo >= bFrom
}

export function isoFromTimestamp(ts?: string): string | null {
  if (!ts) return null
  return ts.slice(0, 10)
}

export function formatPeriodLabel(from: string, to: string): string {
  if (from === to) return formatShortDate(from)
  return `${formatShortDate(from)} – ${formatShortDate(to)}`
}
