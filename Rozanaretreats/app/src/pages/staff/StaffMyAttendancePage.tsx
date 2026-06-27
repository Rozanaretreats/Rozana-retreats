import { useMemo, useState } from 'react'
import { PageHeader } from '../../components/PageHeader'
import { StatCard } from '../../components/StatCard'
import { PropertyBadge } from '../../components/PropertyBadge'
import { StaffStatusBadge } from '../../components/StatusBadge'
import { StaffPortalGate } from '../../components/StaffPortalGate'
import { DateRangeFilter } from '../../components/DateRangeFilter'
import { useOps } from '../../context/OpsContext'
import { getShiftForProperty, formatShiftLabel } from '../../lib/shift'
import { computeHoursToday, punchesInRange, punchesForToday } from '../../lib/attendance'
import { defaultMonthToDateRange, formatPeriodLabel, todayIso } from '../../lib/dates'
import { getProperty } from '../../data/properties'
import type { Staff } from '../../types'
import { Clock } from 'lucide-react'

function StaffMyAttendanceContent({ linked }: { linked: Staff }) {
  const { punches, shifts } = useOps()
  const [range, setRange] = useState(defaultMonthToDateRange)

  const myPunches = punches.filter((p) => p.staffId === linked.id)
  const todayPunches = punchesForToday(myPunches).sort((a, b) => a.timestamp.localeCompare(b.timestamp))
  const rangePunches = useMemo(
    () => punchesInRange(myPunches, range.from, range.to),
    [myPunches, range],
  )
  const isTodayOnly = range.from === range.to && range.from === todayIso()
  const hoursToday = computeHoursToday(punches, linked.id) ?? '—'
  const shift = getShiftForProperty(linked.propertyId, shifts)
  const property = getProperty(linked.propertyId)

  return (
    <div>
      <PageHeader title="My attendance" subtitle="Your check-in log" />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <span className="text-sm text-forest/60">Status today</span>
        <StaffStatusBadge status={linked.status} />
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-2">
        <StatCard label="Hours today" value={hoursToday} tone="default" />
        <StatCard label="Shift" value={formatShiftLabel(shift)} tone="default" />
      </div>

      {property && (
        <p className="mb-4 text-sm text-forest/60">
          <PropertyBadge propertyId={linked.propertyId} /> {property.name}
        </p>
      )}

      <section className="overflow-hidden rounded-2xl border border-sand-dark bg-white shadow-sm">
        <div className="flex items-center gap-2 border-b border-sand-dark px-6 py-4">
          <Clock className="h-5 w-5 text-forest" />
          <h2 className="font-semibold text-forest">
            {isTodayOnly ? "Today's punches" : 'Punch history'}
          </h2>
        </div>
        <div className="border-b border-sand-dark bg-sand/30 px-6 py-4">
          <DateRangeFilter
            label="Period"
            from={range.from}
            to={range.to}
            onChange={(from, to) => setRange({ from, to })}
            className="border-0 bg-transparent p-0 shadow-none"
          />
        </div>
        {(isTodayOnly ? todayPunches : rangePunches).length === 0 ? (
          <p className="px-6 py-10 text-center text-sm text-forest/50">
            No punches for {formatPeriodLabel(range.from, range.to).toLowerCase()}.
          </p>
        ) : (
          <ul className="divide-y divide-sand-dark">
            {(isTodayOnly ? todayPunches : rangePunches).map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-4 px-6 py-4 text-sm">
                <span className="font-medium capitalize text-forest">
                  {p.type}
                  {!isTodayOnly && (
                    <span className="ml-2 font-normal text-forest/50">{p.date}</span>
                  )}
                </span>
                <span className="font-mono text-forest/70">{p.timestamp}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {linked.status === 'absent' && linked.absenceReason && (
        <p className="mt-4 text-sm text-red-800">Marked absent: {linked.absenceReason}</p>
      )}
    </div>
  )
}

export function StaffMyAttendancePage() {
  return (
    <StaffPortalGate>{(linked) => <StaffMyAttendanceContent linked={linked} />}</StaffPortalGate>
  )
}
