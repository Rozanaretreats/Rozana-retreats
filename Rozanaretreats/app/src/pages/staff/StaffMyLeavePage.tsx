import { useMemo, useState } from 'react'
import { PageHeader } from '../../components/PageHeader'
import { PropertyBadge } from '../../components/PropertyBadge'
import { Notice } from '../../components/Notice'
import { LeaveStatusBadge } from '../../components/StatusBadge'
import { StaffPortalGate } from '../../components/StaffPortalGate'
import { DateRangeFilter } from '../../components/DateRangeFilter'
import { useOps } from '../../context/OpsContext'
import { formatRange, todayIso, defaultLeaveListRange, rangesOverlap } from '../../lib/dates'
import { LEAVE_TYPES } from '../../lib/leave'
import type { Staff } from '../../types'
import { FormSelect, formInputClass } from '../../components/FormSelect'
import { CalendarOff, Plus } from 'lucide-react'

const inputClass = formInputClass

function StaffMyLeaveContent({ linked }: { linked: Staff }) {
  const { leaves, requestLeave } = useOps()
  const [showForm, setShowForm] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [type, setType] = useState<string>(LEAVE_TYPES[0])
  const [fromDate, setFromDate] = useState(todayIso())
  const [toDate, setToDate] = useState(todayIso())
  const [staffNote, setStaffNote] = useState('')
  const [listRange, setListRange] = useState(defaultLeaveListRange)

  const myLeaves = useMemo(
    () =>
      leaves
        .filter((l) => l.staffId === linked.id)
        .filter((l) => rangesOverlap(l.fromDate, l.toDate, listRange.from, listRange.to))
        .sort((a, b) => b.fromDate.localeCompare(a.fromDate)),
    [leaves, linked.id, listRange],
  )

  const hasPending = myLeaves.some((l) => l.status === 'pending')

  const flash = (msg: string) => {
    setNotice(msg)
    setTimeout(() => setNotice(null), 4000)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (toDate < fromDate) {
      setError('End date must be on or after start date.')
      return
    }
    try {
      const result = await requestLeave({
        staffId: linked.id,
        fromDate,
        toDate,
        type,
        staffNote: staffNote.trim() || undefined,
      })
      if (!result) {
        setError('Could not submit leave request.')
        return
      }
      setShowForm(false)
      setStaffNote('')
      flash('Leave request sent — waiting for manager approval')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not submit request')
    }
  }

  return (
    <div>
      <PageHeader
        title="My leave"
        subtitle="Apply for leave — your operations manager or owner must approve"
        action={
          <button
            type="button"
            onClick={() => {
              setError('')
              setShowForm((v) => !v)
            }}
            className="flex items-center gap-2 rounded-xl bg-forest px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-forest-light"
          >
            <Plus className="h-4 w-4" />
            Apply for leave
          </button>
        }
      />

      {notice && <Notice message={notice} onDismiss={() => setNotice(null)} />}

      {hasPending && !showForm && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm text-amber-950">
          You have a leave request waiting for approval.
        </div>
      )}

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="mb-8 rounded-2xl border border-sand-dark bg-white p-6 shadow-sm"
        >
          <h3 className="mb-4 font-semibold text-forest">New leave request</h3>
          {error && <p className="mb-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-800">{error}</p>}
          <div className="grid gap-4 sm:grid-cols-2">
            <FormSelect label="Type" value={type} onChange={setType} options={LEAVE_TYPES} />
            <label className="block sm:col-span-2">
              <span className="mb-1.5 block text-sm font-medium text-forest/70">Note (optional)</span>
              <input
                value={staffNote}
                onChange={(e) => setStaffNote(e.target.value)}
                placeholder="Short reason for your manager…"
                className={inputClass}
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-forest/70">From</span>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className={inputClass}
                required
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-forest/70">To</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className={inputClass}
                required
              />
            </label>
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="submit"
              className="rounded-xl bg-forest px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-forest-light"
            >
              Submit request
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-xl border border-sand-dark bg-white px-5 py-2.5 text-sm text-forest/70 hover:bg-sand"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <section className="overflow-hidden rounded-2xl border border-sand-dark bg-white shadow-sm">
        <div className="flex items-center gap-2 border-b border-sand-dark px-6 py-4">
          <CalendarOff className="h-5 w-5 text-forest" />
          <h2 className="font-semibold text-forest">My requests</h2>
        </div>
        <div className="border-b border-sand-dark bg-sand/30 px-6 py-4">
          <DateRangeFilter
            label="Show leave"
            from={listRange.from}
            to={listRange.to}
            onChange={(from, to) => setListRange({ from, to })}
            className="border-0 bg-transparent p-0 shadow-none"
          />
        </div>
        {myLeaves.length === 0 ? (
          <p className="px-6 py-10 text-center text-sm text-forest/50">No leave in this date range.</p>
        ) : (
          <ul className="divide-y divide-sand-dark">
            {myLeaves.map((l) => (
              <li key={l.id} className="px-6 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="flex flex-wrap items-center gap-2 font-medium text-forest">
                      {l.type}
                      <LeaveStatusBadge status={l.status} />
                    </p>
                    <p className="mt-0.5 font-mono text-sm text-forest/60">
                      {formatRange(l.fromDate, l.toDate)}
                    </p>
                    {l.staffNote && (
                      <p className="mt-1 text-sm text-forest/55">Note: {l.staffNote}</p>
                    )}
                    {l.status === 'rejected' && l.reviewedBy && (
                      <p className="mt-1 text-sm text-red-700/80">Declined by {l.reviewedBy}</p>
                    )}
                  </div>
                  <PropertyBadge propertyId={l.propertyId} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

export function StaffMyLeavePage() {
  return <StaffPortalGate>{(linked) => <StaffMyLeaveContent linked={linked} />}</StaffPortalGate>
}
