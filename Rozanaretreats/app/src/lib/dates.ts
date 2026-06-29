const DISPLAY: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }

/** Resort operations timezone — kiosk punch_date and Ops "today" must match. */
export const PROPERTY_TIMEZONE = 'Asia/Kolkata'

function formatIsoDateInTz(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

export function todayIso(timeZone = PROPERTY_TIMEZONE): string {
  return formatIsoDateInTz(new Date(), timeZone)
}

export function daysAgoIso(days: number, timeZone = PROPERTY_TIMEZONE): string {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return formatIsoDateInTz(d, timeZone)
}

export function daysAheadIso(days: number, timeZone = PROPERTY_TIMEZONE): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return formatIsoDateInTz(d, timeZone)
}

export function startOfMonthIso(day = todayIso(), _timeZone = PROPERTY_TIMEZONE): string {
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

export function isoFromTimestamp(ts?: string, timeZone = PROPERTY_TIMEZONE): string | null {
  if (!ts) return null
  const d = new Date(ts)
  if (Number.isNaN(d.getTime())) return ts.slice(0, 10)
  return formatIsoDateInTz(d, timeZone)
}

export function formatPeriodLabel(from: string, to: string): string {
  if (from === to) return formatShortDate(from)
  return `${formatShortDate(from)} – ${formatShortDate(to)}`
}
