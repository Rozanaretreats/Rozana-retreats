import { useEffect, useMemo, useState } from 'react'
import { PageHeader } from '../components/PageHeader'
import { StatCard } from '../components/StatCard'
import { PropertyBadge } from '../components/PropertyBadge'
import { Notice } from '../components/Notice'
import { FormSelect, formInputClass } from '../components/FormSelect'
import { DateRangeFilter } from '../components/DateRangeFilter'
import { StaffStatusBadge } from '../components/StatusBadge'
import { usePropertyFilter } from '../context/PropertyContext'
import { useAuth } from '../context/AuthContext'
import { useOps } from '../context/OpsContext'
import { computeHoursToday, firstCheckInToday, punchSummaryToday, punchesForToday, punchesInRange } from '../lib/attendance'
import { defaultMonthToDateRange, formatPeriodLabel } from '../lib/dates'
import { ABSENCE_REASONS } from '../lib/staffStatus'
import { allowManualPunches, isManualPunch } from '../lib/manualPunch'
import { isKioskPunch, kioskDeviceLabel } from '../lib/kioskPunch'
import type { Staff } from '../types'
import { LogIn, LogOut, RotateCcw, UserX, Wrench } from 'lucide-react'

const inputClass = formInputClass

export function AttendancePage() {
  const { user } = useAuth()
  const { staff, punches, markAbsence, clearAbsence, recordManualPunch, clearManualPunchesForStaff } =
    useOps()
  const roster = usePropertyFilter(staff)
  const filteredPunches = usePropertyFilter(punches)

  const [, setTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60_000)
    return () => clearInterval(id)
  }, [])

  const [notice, setNotice] = useState<string | null>(null)
  const [markingId, setMarkingId] = useState<string | null>(null)
  const [reasonPreset, setReasonPreset] = useState<string>(ABSENCE_REASONS[0])
  const [reasonOther, setReasonOther] = useState('')
  const [historyRange, setHistoryRange] = useState(defaultMonthToDateRange)
  const [historyStaffId, setHistoryStaffId] = useState('')

  const punchHistory = useMemo(
    () => punchesInRange(filteredPunches, historyRange.from, historyRange.to),
    [filteredPunches, historyRange],
  )

  const historyStaffOptions = useMemo(
    () => [...roster].sort((a, b) => a.name.localeCompare(b.name)),
    [roster],
  )

  const filteredPunchHistory = useMemo(() => {
    if (!historyStaffId) return punchHistory
    return punchHistory.filter((p) => p.staffId === historyStaffId)
  }, [punchHistory, historyStaffId])

  const present = roster.filter((s) => s.status === 'present').length
  const onLeave = roster.filter((s) => s.status === 'on-leave').length
  const absent = roster.filter((s) => s.status === 'absent').length
  const notIn = roster.filter((s) => s.status === 'not-in').length
  const needsMarking = roster.filter((s) => s.status === 'awaiting-checkin')
  const manualTesting = allowManualPunches()
  const testableStaff = roster.filter((s) => s.status !== 'on-leave')

  const flash = (msg: string) => {
    setNotice(msg)
    setTimeout(() => setNotice(null), 4000)
  }

  const submitMark = async (member: Staff) => {
    const reason = reasonPreset === 'Other' ? reasonOther.trim() : reasonPreset
    if (!reason) return
    await markAbsence(member.id, reason, user?.name ?? 'Manager')
    setMarkingId(null)
    setReasonOther('')
    setReasonPreset(ABSENCE_REASONS[0])
    flash(`${member.name} marked absent — ${reason}`)
  }

  const submitManualPunch = async (member: Staff, type: 'in' | 'out') => {
    await recordManualPunch(member.id, type)
    flash(`${member.name} — test ${type === 'in' ? 'check-in' : 'check-out'} recorded`)
  }

  const resetManualPunches = async (member: Staff) => {
    await clearManualPunchesForStaff(member.id)
    flash(`${member.name} — today's test punches cleared`)
  }

  const hasManualPunchesToday = (staffId: string) =>
    punchesForToday(filteredPunches).some((p) => p.staffId === staffId && isManualPunch(p))

  return (
    <div>
      <PageHeader
        title="Attendance"
        subtitle="Biometric check-in + manager absence marking"
      />

      {notice && <Notice message={notice} onDismiss={() => setNotice(null)} />}

      {manualTesting && (
        <section className="mb-6 overflow-hidden rounded-2xl border-2 border-amber-300 bg-amber-50/90">
          <div className="flex items-start gap-3 border-b border-amber-200 px-5 py-4">
            <Wrench className="mt-0.5 h-5 w-5 shrink-0 text-amber-800" />
            <div>
              <h2 className="font-semibold text-amber-950">Testing mode — manual check-in</h2>
              <p className="mt-1 text-sm text-amber-900/80">
                Biometrics are not connected yet. Use these buttons to simulate punch-in so you can test
                Housekeeping → Assign. When devices go live, remove{' '}
                <code className="rounded bg-white/80 px-1 py-0.5 text-xs">VITE_ALLOW_MANUAL_PUNCHES</code>{' '}
                from <code className="rounded bg-white/80 px-1 py-0.5 text-xs">.env.local</code> — only real
                device punches will count.
              </p>
            </div>
          </div>
          {testableStaff.length === 0 ? (
            <p className="px-5 py-6 text-sm text-amber-900/70">
              Add HK staff under Housekeeping → Team first.
            </p>
          ) : (
            <ul className="divide-y divide-amber-200/80">
              {testableStaff.map((s) => {
                const punchedIn = s.status === 'present'
                const canCheckOut =
                  punchedIn &&
                  punchesForToday(filteredPunches.filter((p) => p.staffId === s.id)).some(
                    (p) => p.type === 'in',
                  )
                return (
                  <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
                    <div>
                      <p className="font-medium text-forest">
                        {s.name}{' '}
                        <span className="text-sm font-normal text-forest/50">{s.role}</span>
                        <PropertyBadge propertyId={s.propertyId} />
                      </p>
                      <StaffStatusBadge status={s.status} />
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {!punchedIn && (
                      <button
                        type="button"
                        onClick={() => submitManualPunch(s, 'in')}
                        className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-green-700 px-3 py-2.5 text-sm font-semibold text-white hover:bg-green-800"
                      >
                          <LogIn className="h-4 w-4" />
                          Test check-in
                        </button>
                      )}
                      {canCheckOut && (
                      <button
                        type="button"
                        onClick={() => submitManualPunch(s, 'out')}
                        className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-forest/20 bg-white px-3 py-2.5 text-sm font-semibold text-forest hover:bg-sand"
                      >
                          <LogOut className="h-4 w-4" />
                          Test check-out
                        </button>
                      )}
                      {hasManualPunchesToday(s.id) && (
                        <button
                          type="button"
                          onClick={() => resetManualPunches(s)}
                          className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-amber-900/70 hover:bg-amber-100"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          Clear test punches
                        </button>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      )}

      <div className="mb-8 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
        <StatCard label="Present" value={present} tone="success" />
        <StatCard label="On leave" value={onLeave} tone="warning" />
        <StatCard label="Absent" value={absent} tone="danger" />
        <StatCard label="Action needed" value={needsMarking.length} tone="warning" />
        <StatCard label="Not in yet" value={notIn} tone="muted" />
      </div>

      {needsMarking.length > 0 && (
        <section className="mb-8 overflow-hidden rounded-2xl border border-green-200 bg-white shadow-sm">
          <div className="flex items-center gap-3 border-b border-green-200 bg-green-50/90 px-6 py-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-forest/10">
              <UserX className="h-5 w-5 text-forest" />
            </div>
            <div>
              <h2 className="font-semibold text-forest">Action needed — no check-in</h2>
              <p className="text-sm text-forest/65">
                Mark absent with a reason for anyone who did not punch in.
              </p>
            </div>
          </div>
          <ul className="divide-y divide-sand-dark">
            {needsMarking.map((s) => (
              <li key={s.id} className="px-6 py-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold text-forest">
                      {s.name}{' '}
                      <span className="text-sm font-normal text-forest/50">{s.role}</span>
                      <PropertyBadge propertyId={s.propertyId} />
                    </p>
                    <p className="mt-1 text-sm text-forest/55">No punch recorded today</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {manualTesting && (
                      <button
                        type="button"
                        onClick={() => submitManualPunch(s, 'in')}
                        className="rounded-xl border border-forest/15 bg-white px-4 py-2.5 text-sm font-semibold text-forest shadow-sm hover:bg-green-50"
                      >
                        <span className="inline-flex items-center gap-1.5">
                          <LogIn className="h-4 w-4" />
                          Test check-in
                        </span>
                      </button>
                    )}
                    {markingId !== s.id && (
                      <button
                        type="button"
                        onClick={() => {
                          setMarkingId(s.id)
                          setReasonPreset(ABSENCE_REASONS[0])
                          setReasonOther('')
                        }}
                        className="min-h-11 rounded-xl bg-forest px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-forest-light"
                      >
                        Mark absent
                      </button>
                    )}
                  </div>
                </div>
                {markingId === s.id && (
                  <div className="mt-4 rounded-2xl border border-sand-dark bg-sand/60 p-5">
                    <p className="mb-3 text-sm font-medium text-forest">Absence reason</p>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <FormSelect
                        className="sm:col-span-2 sm:max-w-md"
                        label="Reason"
                        value={reasonPreset}
                        onChange={setReasonPreset}
                        options={ABSENCE_REASONS}
                      />
                      {reasonPreset === 'Other' && (
                        <label className="block sm:col-span-2">
                          <span className="mb-1.5 block text-xs font-medium text-forest/60">Details</span>
                          <input
                            value={reasonOther}
                            onChange={(e) => setReasonOther(e.target.value)}
                            placeholder="Short note…"
                            className={inputClass}
                          />
                        </label>
                      )}
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => submitMark(s)}
                        className="rounded-xl bg-forest px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-forest-light"
                      >
                        Save absence
                      </button>
                      <button
                        type="button"
                        onClick={() => setMarkingId(null)}
                        className="rounded-xl border border-sand-dark bg-white px-5 py-2.5 text-sm font-medium text-forest/70 hover:bg-sand"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mb-8 overflow-hidden rounded-2xl border border-sand-dark bg-white shadow-sm">
        <div className="border-b border-sand-dark px-6 py-4">
          <h2 className="font-semibold text-forest">Team · today</h2>
          <p className="text-sm text-forest/50">Status, check-in, and hours in one place</p>
        </div>
        {roster.length === 0 ? (
          <p className="px-6 py-8 text-sm text-forest/50">
            No staff yet — add HK team under Housekeeping → Team.
          </p>
        ) : (
          <ul className="divide-y divide-sand-dark">
            {roster.map((s) => {
              const checkIn = firstCheckInToday(filteredPunches, s.id)
              const hours =
                s.status === 'present' ? computeHoursToday(filteredPunches, s.id) : null
              const punchLine = punchSummaryToday(filteredPunches, s.id)
              const hasTestPunch = punchesForToday(filteredPunches).some(
                (p) => p.staffId === s.id && isManualPunch(p),
              )
              const hasKioskPunch = punchesForToday(filteredPunches).some(
                (p) => p.staffId === s.id && isKioskPunch(p),
              )

              return (
                <li key={s.id} className="px-6 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2 font-medium text-forest">
                        {s.name}
                        <span className="text-sm font-normal text-forest/50">{s.role}</span>
                        <PropertyBadge propertyId={s.propertyId} />
                        {hasTestPunch && manualTesting && (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-900">
                            Test punch
                          </span>
                        )}
                        {hasKioskPunch && (
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-900">
                            Kiosk
                          </span>
                        )}
                      </span>
                      {s.absenceReason && (
                        <p className="mt-0.5 text-sm text-red-700">Reason: {s.absenceReason}</p>
                      )}
                      {punchLine && (
                        <p className="mt-1 font-mono text-xs text-forest/50">{punchLine}</p>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-sm">
                      <div className="text-right">
                        <p className="text-[10px] font-medium uppercase tracking-wide text-forest/40">
                          Check-in
                        </p>
                        <p className="font-mono font-semibold tabular-nums text-forest">
                          {checkIn ?? '—'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-medium uppercase tracking-wide text-forest/40">
                          Hours
                        </p>
                        <p className="font-mono font-semibold tabular-nums text-forest">
                          {hours ?? '—'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <StaffStatusBadge status={s.status} />
                        {s.status === 'absent' && (
                          <button
                            type="button"
                            onClick={() => clearAbsence(s.id)}
                            className="text-xs text-forest/50 hover:text-forest hover:underline"
                          >
                            Undo
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <section className="overflow-hidden rounded-2xl border border-sand-dark bg-white shadow-sm">
        <div className="border-b border-sand-dark px-6 py-4">
          <h2 className="font-semibold text-forest">Punch history</h2>
          <p className="text-sm text-forest/50">Biometric and test punches in the selected period</p>
        </div>
        <div className="border-b border-sand-dark bg-sand/30 px-6 py-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <DateRangeFilter
              label="Period"
              from={historyRange.from}
              to={historyRange.to}
              onChange={(from, to) => setHistoryRange({ from, to })}
              className="min-w-0 flex-1 border-0 bg-transparent p-0 shadow-none"
            />
            <FormSelect
              className="w-full shrink-0 sm:w-52"
              label="Staff"
              value={historyStaffId}
              onChange={setHistoryStaffId}
              placeholder="All staff"
              options={[
                { value: '', label: 'All staff' },
                ...historyStaffOptions.map((s) => ({ value: s.id, label: s.name })),
              ]}
            />
          </div>
        </div>
        {filteredPunchHistory.length === 0 ? (
          <p className="px-6 py-10 text-center text-sm text-forest/50">
            {historyStaffId
              ? `No punches for ${historyStaffOptions.find((s) => s.id === historyStaffId)?.name ?? 'this staff'} in ${formatPeriodLabel(historyRange.from, historyRange.to).toLowerCase()}.`
              : `No punches for ${formatPeriodLabel(historyRange.from, historyRange.to).toLowerCase()}.`}
          </p>
        ) : (
          <ul className="divide-y divide-sand-dark">
            {filteredPunchHistory.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 px-6 py-3.5 text-sm">
                <span className="font-medium text-forest">
                  {p.staffName}
                  <span className="ml-2 font-normal text-forest/50">{p.date}</span>
                  <PropertyBadge propertyId={p.propertyId} />
                </span>
                <span className="font-mono text-forest/70 capitalize">
                  {p.type} · {p.timestamp}
                  {isKioskPunch(p) && (
                    <span className="ml-2 rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-emerald-900">
                      Kiosk · {kioskDeviceLabel(p.deviceId)}
                    </span>
                  )}
                  {isManualPunch(p) && manualTesting && (
                    <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-amber-900">
                      Test
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
