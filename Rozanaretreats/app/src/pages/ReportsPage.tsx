import { useMemo, useState } from 'react'
import { PageHeader } from '../components/PageHeader'
import { StatCard } from '../components/StatCard'
import { PropertyBadge } from '../components/PropertyBadge'
import { RoomStatusBadge } from '../components/StatusBadge'
import { HkPhotoProofGallery } from '../components/HkPhotoProofGallery'
import { DateRangeFilter, taskFinishedInRange } from '../components/DateRangeFilter'
import { useProperty, usePropertyFilter } from '../context/PropertyContext'
import { useOps } from '../context/OpsContext'
import { getProperty } from '../data/properties'
import {
  defaultMonthToDateRange,
  formatPeriodLabel,
  rangesOverlap,
  todayIso,
} from '../lib/dates'
import { punchesInRange } from '../lib/attendance'
import { MessageCircle, AlertTriangle, Send, Camera } from 'lucide-react'

export function ReportsPage() {
  const { filter, visiblePropertyIds } = useProperty()
  const { staff, tasks, leaves, punches, absences } = useOps()
  const roster = usePropertyFilter(staff)
  const hkTasks = usePropertyFilter(tasks)
  const leaveList = usePropertyFilter(leaves)
  const allPunches = usePropertyFilter(punches)
  const allAbsences = usePropertyFilter(absences)

  const [range, setRange] = useState(defaultMonthToDateRange)
  const isTodayOnly = range.from === range.to && range.from === todayIso()

  const doneInRange = useMemo(
    () => hkTasks.filter((t) => taskFinishedInRange(t, range.from, range.to)),
    [hkTasks, range],
  )
  const roomsWithPhotos = doneInRange.filter((r) => r.photoBeforeUrl || r.photoAfterUrl).length
  const incompleteNow = hkTasks.filter((r) => r.status !== 'done')
  const punchesInPeriod = useMemo(
    () => punchesInRange(allPunches, range.from, range.to),
    [allPunches, range],
  )
  const leaveInPeriod = useMemo(
    () => leaveList.filter((l) => rangesOverlap(l.fromDate, l.toDate, range.from, range.to)),
    [leaveList, range],
  )
  const absencesInPeriod = useMemo(
    () =>
      allAbsences.filter((a) => a.absenceDate >= range.from && a.absenceDate <= range.to),
    [allAbsences, range],
  )

  const presentToday = roster.filter((s) => s.status === 'present').length
  const staffWithPunches = new Set(punchesInPeriod.map((p) => p.staffId)).size

  const filterLabel =
    filter === 'all' ? 'Both properties' : (getProperty(filter)?.name ?? filter)

  return (
    <div>
      <PageHeader
        title="Reports"
        subtitle={`${filterLabel} · ${formatPeriodLabel(range.from, range.to)}`}
      />

      <DateRangeFilter
        className="mb-8"
        label="Report period"
        from={range.from}
        to={range.to}
        onChange={(from, to) => setRange({ from, to })}
      />

      <div className="mb-8 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
        <StatCard
          label={isTodayOnly ? 'Staff present' : 'Staff with punches'}
          value={isTodayOnly ? presentToday : staffWithPunches}
          tone="success"
        />
        <StatCard label="Rooms completed" value={doneInRange.length} tone="success" />
        <StatCard label="With photo proof" value={roomsWithPhotos} tone="default" />
        <StatCard
          label={isTodayOnly ? 'Rooms outstanding' : 'Outstanding now'}
          value={incompleteNow.length}
          tone="warning"
        />
        <StatCard label="Leave in period" value={leaveInPeriod.length} tone="default" />
      </div>

      <section className="mb-8 overflow-hidden rounded-2xl border border-sand-dark bg-white shadow-sm">
        <div className="flex items-center gap-3 border-b border-sand-dark px-6 py-4">
          <Camera className="h-5 w-5 text-forest" />
          <div>
            <h2 className="font-semibold text-forest">HK photo proof</h2>
            <p className="text-sm text-forest/50">
              Rooms completed in this period — tap to enlarge
            </p>
          </div>
        </div>
        <HkPhotoProofGallery
          tasks={doneInRange}
          emptyMessage="No completed rooms with photos in this period."
        />
      </section>

      {isTodayOnly && incompleteNow.length > 0 && (
        <section className="mb-8 overflow-hidden rounded-2xl border-2 border-red-200 bg-red-50/80">
          <div className="flex items-center gap-3 border-b border-red-200 px-6 py-4">
            <AlertTriangle className="h-5 w-5 text-red-700" />
            <div>
              <h2 className="font-semibold text-red-900">Outstanding rooms — today</h2>
              <p className="text-sm text-red-800">Rooms not marked done yet</p>
            </div>
          </div>
          <ul className="divide-y divide-red-200/80">
            {incompleteNow.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 px-6 py-3.5 text-sm">
                <span className="flex flex-wrap items-center gap-2 font-medium text-red-900">
                  Room {r.room} · {r.building}
                  <PropertyBadge propertyId={r.propertyId} />
                  <RoomStatusBadge status={r.status} />
                </span>
                <span className="text-red-800">{r.assignedTo ?? 'Unassigned'}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {visiblePropertyIds.map((propId) => {
        const p = getProperty(propId)
        const propStaff = roster.filter((s) => s.propertyId === propId)
        const propTasks = hkTasks.filter((t) => t.propertyId === propId)
        const propDone = propTasks.filter((t) => taskFinishedInRange(t, range.from, range.to)).length
        const propLeave = leaveInPeriod.filter((l) => l.propertyId === propId)
        const propAbsences = absencesInPeriod.filter((a) => a.propertyId === propId)
        const propPunches = punchesInPeriod.filter((p) => p.propertyId === propId)

        return (
          <section key={propId} className="mb-8 overflow-hidden rounded-2xl border border-sand-dark bg-white shadow-sm">
            <div className="border-b border-sand-dark bg-forest px-6 py-4 text-white">
              <div className="flex items-center gap-3">
                <MessageCircle className="h-5 w-5" />
                <div>
                  <h2 className="font-semibold">{p?.name}</h2>
                  <p className="text-xs text-white/70">
                    Summary · {formatPeriodLabel(range.from, range.to)}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4 p-6 font-mono text-sm leading-relaxed text-forest/90">
              <p>
                <strong>ATTENDANCE</strong>
                <br />
                {isTodayOnly ? (
                  <>
                    Present: {propStaff.filter((s) => s.status === 'present').map((s) => s.name).join(', ') || '—'}
                    <br />
                    On leave: {propStaff.filter((s) => s.status === 'on-leave').map((s) => s.name).join(', ') || '—'}
                    <br />
                    Absent: {propStaff.filter((s) => s.status === 'absent').map((s) => s.name).join(', ') || '—'}
                    <br />
                    Action needed:{' '}
                    {propStaff.filter((s) => s.status === 'awaiting-checkin').map((s) => s.name).join(', ') || '—'}
                  </>
                ) : (
                  <>
                    Punch events: {propPunches.length}
                    <br />
                    Marked absent:{' '}
                    {propAbsences.map((a) => `${a.absenceDate} (${a.reason})`).join(', ') || '—'}
                  </>
                )}
              </p>
              <p>
                <strong>LEAVE</strong>
                <br />
                {propLeave.map((l) => `${l.staffName}: ${l.fromDate}–${l.toDate} (${l.status})`).join(', ') ||
                  '—'}
              </p>
              <p>
                <strong>HOUSEKEEPING</strong>
                <br />
                Completed in period: {propDone}
                <br />
                {isTodayOnly && (
                  <>
                    Assigned:{' '}
                    {propTasks
                      .filter((t) => t.status !== 'done')
                      .map((t) => `Room ${t.room} (${t.assignedTo ?? 'unassigned'})`)
                      .join(', ') || 'None'}
                  </>
                )}
              </p>
            </div>
          </section>
        )
      })}

      <div className="rounded-2xl border border-sand-dark bg-sand px-6 py-4">
        <p className="mb-3 text-sm text-forest/60">
          System-generated report — operators cannot edit. Managers do not have access to this page.
        </p>
        <button
          type="button"
          disabled
          className="flex cursor-not-allowed items-center gap-2 rounded-xl bg-forest/40 px-5 py-2.5 text-sm font-semibold text-white"
        >
          <Send className="h-4 w-4" />
          WhatsApp EOD auto-send at go-live (RP03)
        </button>
      </div>
    </div>
  )
}
