import { useState } from 'react'
import { PageHeader } from '../components/PageHeader'
import { StatCard } from '../components/StatCard'
import { PropertyBadge } from '../components/PropertyBadge'
import { Notice } from '../components/Notice'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { DateRangeFilter } from '../components/DateRangeFilter'
import { FormSelect, formInputClass } from '../components/FormSelect'
import { LeaveStatusBadge } from '../components/StatusBadge'
import { usePropertyFilter } from '../context/PropertyContext'
import { useAuth } from '../context/AuthContext'
import { useOps } from '../context/OpsContext'
import { formatRange, todayIso, defaultLeaveListRange, rangesOverlap } from '../lib/dates'
import { approvedLeaves, LEAVE_TYPES } from '../lib/leave'
import { isAvailableForHK } from '../lib/staffStatus'
import { labels } from '../i18n/labels'
import { Check, Clock, Plus, Trash2, UserCheck, X } from 'lucide-react'

const inputClass = formInputClass

export function LeavePage() {
  const { user } = useAuth()
  const { staff, leaves, addLeave, approveLeave, rejectLeave, removeLeave } = useOps()
  const roster = usePropertyFilter(staff)
  const leaveList = usePropertyFilter(leaves)

  const [showForm, setShowForm] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [staffId, setStaffId] = useState(roster[0]?.id ?? '')
  const [type, setType] = useState<string>(LEAVE_TYPES[0])
  const [fromDate, setFromDate] = useState(todayIso())
  const [toDate, setToDate] = useState(todayIso())
  const [error, setError] = useState('')
  const [removeTarget, setRemoveTarget] = useState<{ id: string; name: string } | null>(null)
  const [listRange, setListRange] = useState(defaultLeaveListRange)

  const filteredLeaveList = leaveList.filter((l) =>
    rangesOverlap(l.fromDate, l.toDate, listRange.from, listRange.to),
  )

  const pending = leaveList.filter((l) => l.status === 'pending')
  const approved = approvedLeaves(leaveList)

  const available = roster.filter((s) => isAvailableForHK(s.status))
  const onLeave = roster.filter((s) => s.status === 'on-leave')

  const flash = (msg: string) => {
    setNotice(msg)
    setTimeout(() => setNotice(null), 4000)
  }

  const reviewer = user?.name ?? 'Manager'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (toDate < fromDate) {
      setError('End date must be on or after start date.')
      return
    }
    const result = await addLeave({ staffId, fromDate, toDate, type })
    if (!result) {
      setError('Could not save leave. Check staff selection.')
      return
    }
    setShowForm(false)
    flash(`Leave recorded for ${result.staffName}`)
  }

  const handleRemove = (id: string, name: string) => {
    setRemoveTarget({ id, name })
  }

  const confirmRemoveLeave = async () => {
    if (!removeTarget) return
    const { id, name } = removeTarget
    setRemoveTarget(null)
    await removeLeave(id)
    flash(`Leave record removed for ${name}`)
  }

  const handleApprove = async (id: string, name: string) => {
    try {
      await approveLeave(id, reviewer)
      flash(`Leave approved for ${name}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not approve leave')
    }
  }

  const handleReject = async (id: string, name: string) => {
    try {
      await rejectLeave(id, reviewer)
      flash(`Leave request declined for ${name}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not decline leave')
    }
  }

  return (
    <div>
      <PageHeader
        title="Leave"
        subtitle="Approve staff requests or record leave directly — approved leave blocks housekeeping assign"
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
            {labels.recordLeave}
          </button>
        }
      />

      {notice && <Notice message={notice} onDismiss={() => setNotice(null)} />}
      {error && !showForm && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      <ConfirmDialog
        open={!!removeTarget}
        title={removeTarget ? `Remove leave for ${removeTarget.name}?` : ''}
        message="This will delete the leave record. The staff member's attendance status may change for those dates."
        confirmLabel="Remove"
        tone="danger"
        onConfirm={confirmRemoveLeave}
        onCancel={() => setRemoveTarget(null)}
      />

      {pending.length > 0 && (
        <section className="mb-8 overflow-hidden rounded-2xl border border-green-200 bg-white shadow-sm">
          <div className="flex items-center gap-3 border-b border-green-200 bg-green-50/90 px-6 py-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-forest/10">
              <Clock className="h-5 w-5 text-forest" />
            </div>
            <div>
              <h2 className="font-semibold text-forest">Pending approval</h2>
              <p className="text-sm text-forest/65">Leave requests from HK staff</p>
            </div>
          </div>
          <ul className="divide-y divide-sand-dark">
            {pending.map((l) => (
              <li key={l.id} className="px-6 py-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="flex flex-wrap items-center gap-2 font-semibold text-forest">
                      {l.staffName}
                      <PropertyBadge propertyId={l.propertyId} />
                      <LeaveStatusBadge status={l.status} />
                    </p>
                    <p className="mt-1 text-sm text-forest/60">
                      {l.type} · {formatRange(l.fromDate, l.toDate)}
                    </p>
                    {l.staffNote && (
                      <p className="mt-1 text-sm text-forest/55">Note: {l.staffNote}</p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleApprove(l.id, l.staffName)}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-forest px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-forest-light"
                    >
                      <Check className="h-4 w-4" />
                      Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => handleReject(l.id, l.staffName)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-sand-dark bg-white px-4 py-2.5 text-sm font-semibold text-forest/70 hover:bg-red-50 hover:text-red-800"
                    >
                      <X className="h-4 w-4" />
                      Decline
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-8 rounded-2xl border border-sand-dark bg-white p-6 shadow-sm">
          <h3 className="mb-4 font-semibold text-forest">Record leave (approved immediately)</h3>
          {error && <p className="mb-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-800">{error}</p>}
          <div className="grid gap-4 sm:grid-cols-2">
            <FormSelect
              label="Staff member"
              value={staffId}
              onChange={setStaffId}
              options={roster.map((s) => ({ value: s.id, label: `${s.name} (${s.role})` }))}
            />
            <FormSelect label="Type" value={type} onChange={setType} options={LEAVE_TYPES} />
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-forest/70">From</span>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className={inputClass}
                required
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-forest/70">To</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className={inputClass}
                required
              />
            </label>
          </div>
          <div className="mt-4 flex gap-3">
            <button type="submit" className="rounded-xl bg-forest px-5 py-2.5 text-sm font-semibold text-white">
              Save leave
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-xl px-5 py-2.5 text-sm text-forest/60 hover:bg-sand"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="mb-8 grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-4">
        <StatCard label="Pending" value={pending.length} tone="warning" />
        <StatCard label="Available today" value={available.length} tone="success" />
        <StatCard label="On leave" value={onLeave.length} tone="warning" />
        <StatCard label="Approved records" value={approved.length} tone="default" />
      </div>

      <section className="mb-8 overflow-hidden rounded-2xl border border-green-200 bg-green-50/80">
        <div className="flex items-center gap-3 border-b border-green-200 px-6 py-4">
          <UserCheck className="h-5 w-5 text-green-700" />
          <div>
            <h2 className="font-semibold text-green-900">Available for housekeeping</h2>
            <p className="text-sm text-green-700">Present today and not on approved leave</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 p-4">
          {available.length === 0 ? (
            <p className="text-sm text-green-800/70">No one available — check leave or attendance.</p>
          ) : (
            available.map((s) => (
              <span key={s.id} className="rounded-full bg-white px-4 py-2 text-sm font-medium text-green-800 shadow-sm">
                {s.name}
              </span>
            ))
          )}
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-sand-dark bg-white shadow-sm">
        <div className="border-b border-sand-dark px-6 py-4">
          <h2 className="font-semibold text-forest">All leave records</h2>
          <p className="mt-1 text-sm text-forest/50">Filter by leave dates overlapping the range below</p>
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
        {filteredLeaveList.length === 0 ? (
          <p className="px-6 py-10 text-center text-sm text-forest/50">
            No leave in this date range.
          </p>
        ) : (
          <ul className="divide-y divide-sand-dark">
            {filteredLeaveList.map((l) => (
              <li key={l.id} className="flex flex-wrap items-center justify-between gap-4 px-6 py-4">
                <div>
                  <p className="flex flex-wrap items-center gap-2 font-medium text-forest">
                    {l.staffName}
                    <PropertyBadge propertyId={l.propertyId} />
                    <LeaveStatusBadge status={l.status} />
                  </p>
                  <p className="text-sm text-forest/50">
                    {l.type}
                    {l.requestedBy === 'staff' ? ' · Staff request' : ' · Recorded by manager'}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <p className="font-mono text-sm text-forest/70">{formatRange(l.fromDate, l.toDate)}</p>
                  {l.status !== 'pending' && (
                    <button
                      type="button"
                      onClick={() => handleRemove(l.id, l.staffName)}
                      className="rounded-lg p-2 text-forest/40 hover:bg-red-50 hover:text-red-700"
                      title="Remove record"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
