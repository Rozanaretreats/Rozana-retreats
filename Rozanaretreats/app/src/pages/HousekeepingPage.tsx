import { useEffect, useMemo, useState } from 'react'
import { PageHeader } from '../components/PageHeader'
import { StatCard } from '../components/StatCard'
import { PropertyBadge } from '../components/PropertyBadge'
import { TabGroup } from '../components/TabGroup'
import { Notice } from '../components/Notice'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { DateRangeFilter, taskFinishedInRange } from '../components/DateRangeFilter'
import { HkPhotoProof } from '../components/HkPhotoProof'
import { ResolvedHkImage } from '../components/ResolvedHkImage'
import { HkPhotoProofGallery } from '../components/HkPhotoProofGallery'
import { CleaningTimeInfo } from '../components/CleaningTimeInfo'
import { RoomStatusBadge, StaffStatusBadge } from '../components/StatusBadge'
import { useProperty, usePropertyFilter } from '../context/PropertyContext'
import { useAuth } from '../context/AuthContext'
import { useOps } from '../context/OpsContext'
import { allRooms } from '../data/mockData'
import { formatRoomSubtitle } from '../data/roomInventory'
import { getProperty } from '../data/properties'
import { isAvailableForHK } from '../lib/staffStatus'
import { completedChecklistCount, displayVerificationPhotos } from '../lib/cleaningChecklist'
import { allowManualPunches } from '../lib/manualPunch'
import { defaultTodayRange, formatPeriodLabel, todayIso } from '../lib/dates'
import type { PropertyId, RoomStatus } from '../types'
import { FormSelect, formInputClass } from '../components/FormSelect'
import { Plus, Trash2, UserCheck, UserPlus, KeyRound } from 'lucide-react'
import { ResetStaffPasswordModal } from '../components/ResetStaffPasswordModal'

const HK_ROLES = ['HK', 'HK Lead'] as const

const cardStyles: Record<RoomStatus, string> = {
  todo: 'border-red-200 bg-red-50/80',
  cleaning: 'border-amber-200 bg-amber-50/80',
  done: 'border-green-200 bg-green-50/80',
}

type MainTab = 'tasks' | 'assign' | 'team' | 'proof'
type TaskFilter = 'all' | 'open' | 'done'

const inputClass = formInputClass

function suggestStaffEmail(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '.')
    .replace(/[^a-z0-9.]/g, '')
  return slug ? `${slug}@rozana.com` : ''
}

export function HousekeepingPage() {
  const { isOwner } = useAuth()
  const { visiblePropertyIds } = useProperty()
  const { staff, tasks, staffLoginEmails, addStaff, removeStaff, assignRoom, resetStaffPassword } =
    useOps()

  const [tab, setTab] = useState<MainTab>('tasks')
  const [taskFilter, setTaskFilter] = useState<TaskFilter>('open')
  const [notice, setNotice] = useState<string | null>(null)

  const hkStaff = usePropertyFilter(staff).filter((s) => s.role.includes('HK'))
  const visibleTasks = usePropertyFilter(tasks)
  const rooms = usePropertyFilter(allRooms)

  const defaultProperty = visiblePropertyIds[0] ?? 'ooty-skyview'
  const [assignProperty, setAssignProperty] = useState<PropertyId>(defaultProperty)
  const [assignRoomId, setAssignRoomId] = useState('')
  const [assignStaffId, setAssignStaffId] = useState('')

  const [showTeamForm, setShowTeamForm] = useState(false)
  const [teamName, setTeamName] = useState('')
  const [teamRole, setTeamRole] = useState<string>(HK_ROLES[0])
  const [teamPhone, setTeamPhone] = useState('')
  const [teamEmail, setTeamEmail] = useState('')
  const [teamPassword, setTeamPassword] = useState('')
  const [teamError, setTeamError] = useState('')
  const [teamProperty, setTeamProperty] = useState<PropertyId>(defaultProperty)
  const [removeTarget, setRemoveTarget] = useState<{
    id: string
    name: string
    assignedRooms: number
  } | null>(null)
  const [resetTarget, setResetTarget] = useState<{ id: string; name: string; email: string } | null>(
    null,
  )
  const [taskRange, setTaskRange] = useState(defaultTodayRange)
  const [, setTick] = useState(0)

  useEffect(() => {
    const hasInProgress = visibleTasks.some((t) => t.status === 'cleaning' && t.cleaningStartedAt)
    if (!hasInProgress) return
    const id = setInterval(() => setTick((t) => t + 1), 30_000)
    return () => clearInterval(id)
  }, [visibleTasks])

  useEffect(() => {
    setAssignProperty(defaultProperty)
    setTeamProperty(defaultProperty)
  }, [defaultProperty])

  const propertyRooms = useMemo(
    () => rooms.filter((r) => r.propertyId === assignProperty),
    [rooms, assignProperty],
  )

  useEffect(() => {
    if (!propertyRooms.some((r) => r.id === assignRoomId)) {
      setAssignRoomId(propertyRooms[0]?.id ?? '')
    }
  }, [propertyRooms, assignRoomId])

  const availableStaff = hkStaff.filter((s) => s.propertyId === assignProperty && isAvailableForHK(s.status))
  const manualTesting = allowManualPunches()

  useEffect(() => {
    if (!availableStaff.some((s) => s.id === assignStaffId)) {
      setAssignStaffId(availableStaff[0]?.id ?? '')
    }
  }, [availableStaff, assignStaffId])

  const filteredTasks = useMemo(() => {
    let list = visibleTasks
    if (taskFilter === 'open') list = list.filter((t) => t.status !== 'done')
    else if (taskFilter === 'done') {
      list = list.filter((t) => taskFinishedInRange(t, taskRange.from, taskRange.to))
    }
    return list
  }, [visibleTasks, taskFilter, taskRange])

  const doneInRange = visibleTasks.filter((t) => taskFinishedInRange(t, taskRange.from, taskRange.to)).length
  const isTodayRange = taskRange.from === taskRange.to && taskRange.from === todayIso()
  const open = visibleTasks.filter((t) => t.status !== 'done').length
  const inProgress = visibleTasks.filter((t) => t.status === 'cleaning').length
  const withPhotos = visibleTasks.filter(
    (t) => taskFinishedInRange(t, taskRange.from, taskRange.to) && (t.photoBeforeUrl || t.photoAfterUrl),
  ).length

  const flash = (msg: string) => {
    setNotice(msg)
    setTimeout(() => setNotice(null), 4000)
  }

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault()
    const room = propertyRooms.find((r) => r.id === assignRoomId)
    if (!room || !assignStaffId) return
    await assignRoom(room, assignStaffId)
    setTab('tasks')
    setTaskFilter('open')
    flash(`Room ${room.number} assigned to ${hkStaff.find((s) => s.id === assignStaffId)?.name}`)
  }

  const handleAddTeam = async (e: React.FormEvent) => {
    e.preventDefault()
    setTeamError('')
    if (!teamName.trim()) return
    const savedName = teamName.trim()
    try {
      await addStaff({
        propertyId: visiblePropertyIds.length === 1 ? defaultProperty : teamProperty,
        name: savedName,
        role: teamRole,
        phone: teamPhone || undefined,
        loginEmail: teamEmail,
        loginPassword: teamPassword,
      })
      setTeamName('')
      setTeamPhone('')
      setTeamEmail('')
      setTeamPassword('')
      setTeamRole(HK_ROLES[0])
      setShowTeamForm(false)
      flash(`${savedName} added — app login ${teamEmail.trim().toLowerCase()}`)
    } catch (err) {
      setTeamError(err instanceof Error ? err.message : 'Could not add staff')
    }
  }

  const handleRemoveStaff = (id: string, name: string) => {
    const assignedRooms = tasks.filter((t) => t.assignedStaffId === id).length
    setRemoveTarget({ id, name, assignedRooms })
  }

  const confirmRemoveStaff = async () => {
    if (!removeTarget) return
    const { id, name, assignedRooms } = removeTarget
    setRemoveTarget(null)
    await removeStaff(id)
    flash(
      assignedRooms > 0
        ? `${name} removed — ${assignedRooms} room assignment(s) cleared`
        : `${name} removed from roster`,
    )
  }

  return (
    <div>
      <PageHeader
        title="Housekeeping"
        subtitle="Assign rooms, monitor progress, and manage your HK team — staff complete tasks in My tasks"
      />

      {notice && <Notice message={notice} onDismiss={() => setNotice(null)} />}

      <ConfirmDialog
        open={!!removeTarget}
        title={removeTarget ? `Remove ${removeTarget.name}?` : ''}
        message={
          removeTarget
            ? removeTarget.assignedRooms > 0
              ? `This will remove them from the team and clear ${removeTarget.assignedRooms} room assignment(s).`
              : 'This will remove them from the team and revoke their app login.'
            : ''
        }
        confirmLabel="Remove"
        tone="danger"
        onConfirm={confirmRemoveStaff}
        onCancel={() => setRemoveTarget(null)}
      />

      <div className="mb-6 flex flex-wrap gap-2 text-sm text-forest/60">
        {visiblePropertyIds.map((id) => {
          const p = getProperty(id)
          return p ? (
            <span key={id} className="rounded-lg bg-sand-dark px-3 py-1.5">
              {p.shortName} · {p.roomCount} rooms
            </span>
          ) : null
        })}
      </div>

      <div className="mb-6">
        <TabGroup
          active={tab}
          onChange={setTab}
          tabs={[
            { id: 'tasks', label: 'Tasks', count: open },
            { id: 'assign', label: 'Assign' },
            { id: 'proof', label: 'Photo proof', count: withPhotos },
            { id: 'team', label: 'Team', count: hkStaff.length },
          ]}
        />
      </div>

      <DateRangeFilter
        className="mb-6"
        label="Completed rooms"
        from={taskRange.from}
        to={taskRange.to}
        onChange={(from, to) => setTaskRange({ from, to })}
      />

      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
        <StatCard
          label={isTodayRange ? 'Done today' : 'Done in period'}
          value={doneInRange}
          tone="success"
        />
        <StatCard label="Assigned" value={open} tone="warning" />
        <StatCard label="In progress" value={inProgress} tone="default" />
      </div>

      {tab === 'assign' && (
        <section className="mb-8 rounded-2xl border border-sand-dark bg-white p-4 shadow-sm md:p-6">
          <div className="mb-4 flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-forest" />
            <h2 className="font-semibold text-forest">Assign room to staff</h2>
          </div>

          <div className="mb-5 overflow-hidden rounded-xl border border-green-200 bg-green-50/80">
            <div className="flex items-center gap-2 border-b border-green-200 px-4 py-3">
              <UserCheck className="h-4 w-4 text-green-700" />
              <p className="text-sm font-semibold text-green-900">Available for assign — present today</p>
            </div>
            <div className="flex flex-wrap gap-2 p-3">
              {availableStaff.length === 0 ? (
                <p className="text-sm text-green-800/70">
                  {manualTesting
                    ? 'No one checked in yet — go to Attendance and use Test check-in.'
                    : 'No one available — check Leave or Attendance.'}
                </p>
              ) : (
                availableStaff.map((s) => (
                  <span
                    key={s.id}
                    className="rounded-full bg-white px-3 py-1.5 text-sm font-medium text-green-800 shadow-sm"
                  >
                    {s.name}
                  </span>
                ))
              )}
            </div>
          </div>

          {availableStaff.length === 0 ? (
            <p className="text-sm text-amber-800">
              {manualTesting
                ? 'Staff must be checked in before assign. Open Attendance → Testing mode → Test check-in for each HK person.'
                : 'No HK staff available for this property right now. Check the Team tab or record leave if someone is off.'}
            </p>
          ) : (
            <form onSubmit={handleAssign} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {visiblePropertyIds.length > 1 && (
                <FormSelect
                  label="Property"
                  value={assignProperty}
                  onChange={(v) => setAssignProperty(v as PropertyId)}
                  options={visiblePropertyIds.map((id) => ({
                    value: id,
                    label: getProperty(id)?.shortName ?? id,
                  }))}
                />
              )}
              <FormSelect
                label="Room"
                value={assignRoomId}
                onChange={setAssignRoomId}
                options={propertyRooms.map((r) => ({
                  value: r.id,
                  label: `${r.number} — ${r.building}`,
                }))}
              />
              <FormSelect
                label="Assign to"
                value={assignStaffId}
                onChange={setAssignStaffId}
                options={availableStaff.map((s) => ({
                  value: s.id,
                  label: `${s.name} (${s.role})`,
                }))}
              />
              <div className="flex items-end">
                <button
                  type="submit"
                  className="w-full rounded-xl bg-forest py-3 text-sm font-semibold text-white hover:bg-forest-light"
                >
                  Assign
                </button>
              </div>
            </form>
          )}
        </section>
      )}

      {tab === 'team' && (
        <section className="mb-8">
          <div className="mb-4 flex items-center justify-between gap-4">
            <p className="text-sm text-forest/60">
              Add roster + app login — HK staff sign in with the email and password you set here. Forgot
              password? Use Reset password on their row.
            </p>
            <button
              type="button"
              onClick={() => setShowTeamForm((v) => !v)}
              className="flex shrink-0 items-center gap-2 rounded-xl bg-forest px-4 py-2 text-sm font-semibold text-white hover:bg-forest-light"
            >
              <Plus className="h-4 w-4" />
              Add staff
            </button>
          </div>

          {showTeamForm && (
            <form onSubmit={handleAddTeam} className="mb-6 rounded-2xl border border-sand-dark bg-white p-4 shadow-sm md:p-6">
              {teamError && (
                <p className="mb-4 rounded-xl border border-red-100 bg-red-50 px-4 py-2.5 text-sm text-red-800">
                  {teamError}
                </p>
              )}
              <div className="grid gap-4 sm:grid-cols-2">
                {isOwner && visiblePropertyIds.length > 1 && (
                  <FormSelect
                    className="sm:col-span-2"
                    label="Property"
                    value={teamProperty}
                    onChange={(v) => setTeamProperty(v as PropertyId)}
                    options={visiblePropertyIds.map((id) => ({
                      value: id,
                      label: getProperty(id)?.name ?? id,
                    }))}
                  />
                )}
                <label className="block">
                  <span className="mb-1 block text-sm text-forest/70">Name</span>
                  <input
                    required
                    value={teamName}
                    onChange={(e) => {
                      const name = e.target.value
                      setTeamName(name)
                      if (!teamEmail || teamEmail === suggestStaffEmail(teamName)) {
                        setTeamEmail(suggestStaffEmail(name))
                      }
                    }}
                    placeholder="Full name"
                    className={inputClass}
                  />
                </label>
                <FormSelect label="Role" value={teamRole} onChange={setTeamRole} options={HK_ROLES} />
                <label className="block sm:col-span-2">
                  <span className="mb-1 block text-sm text-forest/70">Phone (optional)</span>
                  <input
                    type="tel"
                    value={teamPhone}
                    onChange={(e) => setTeamPhone(e.target.value)}
                    className={inputClass}
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm text-forest/70">App login email</span>
                  <input
                    type="email"
                    required
                    value={teamEmail}
                    onChange={(e) => setTeamEmail(e.target.value)}
                    placeholder="name@rozana.com"
                    className={inputClass}
                    autoComplete="off"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm text-forest/70">Temporary password</span>
                  <input
                    type="password"
                    required
                    minLength={4}
                    value={teamPassword}
                    onChange={(e) => setTeamPassword(e.target.value)}
                    placeholder="Share with staff"
                    className={inputClass}
                    autoComplete="new-password"
                  />
                </label>
              </div>
              <div className="mt-4 flex gap-3">
                <button type="submit" className="rounded-xl bg-forest px-5 py-2.5 text-sm font-semibold text-white">
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setShowTeamForm(false)}
                  className="rounded-xl px-5 py-2.5 text-sm text-forest/60 hover:bg-sand"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          <div className="overflow-hidden rounded-2xl border border-sand-dark bg-white shadow-sm">
            {hkStaff.length === 0 ? (
              <p className="px-6 py-10 text-center text-sm text-forest/50">No HK staff for this property view.</p>
            ) : (
              <ul className="divide-y divide-sand-dark">
                {hkStaff.map((s) => (
                  <li key={s.id} className="flex flex-wrap items-center justify-between gap-4 px-6 py-4">
                    <div>
                      <p className="flex flex-wrap items-center gap-2 font-semibold text-forest">
                        {s.name}
                        <PropertyBadge propertyId={s.propertyId} />
                        <StaffStatusBadge status={s.status} />
                      </p>
                      <p className="mt-0.5 text-sm text-forest/60">
                        {s.role}
                        {s.phone ? ` · ${s.phone}` : ''}
                      </p>
                      {staffLoginEmails[s.id] && (
                        <p className="mt-1 text-xs text-forest/50">
                          App login: <span className="font-mono">{staffLoginEmails[s.id]}</span>
                        </p>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {staffLoginEmails[s.id] && (
                        <button
                          type="button"
                          onClick={() =>
                            setResetTarget({
                              id: s.id,
                              name: s.name,
                              email: staffLoginEmails[s.id],
                            })
                          }
                          className="flex min-h-10 items-center gap-1.5 rounded-lg border border-sand-dark px-3 py-2 text-sm font-medium text-forest hover:bg-sand"
                        >
                          <KeyRound className="h-4 w-4" />
                          Reset password
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleRemoveStaff(s.id, s.name)}
                        className="flex min-h-10 items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                        Remove
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      )}

      <ResetStaffPasswordModal
        open={!!resetTarget}
        staffName={resetTarget?.name ?? ''}
        staffEmail={resetTarget?.email ?? ''}
        onClose={() => setResetTarget(null)}
        onSave={async (password) => {
          if (!resetTarget) return
          await resetStaffPassword(resetTarget.id, password)
          flash(`Password reset for ${resetTarget.name} — share the new password with them`)
        }}
      />

      {tab === 'tasks' && (
        <>
          <div className="mb-4 flex gap-2">
            {(['open', 'all', 'done'] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setTaskFilter(f)}
                className={[
                  'rounded-full px-4 py-1.5 text-sm font-medium capitalize transition-colors',
                  taskFilter === f
                    ? 'bg-forest text-white'
                    : 'bg-white text-forest/60 ring-1 ring-sand-dark hover:text-forest',
                ].join(' ')}
              >
                {f === 'open' ? 'Assigned' : f}
              </button>
            ))}
          </div>

          {filteredTasks.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-sand-dark bg-white px-6 py-16 text-center">
              <p className="text-forest/50">
                {taskFilter === 'done' ? 'No rooms marked done yet.' : 'No assigned rooms — assign a room to get started.'}
              </p>
              {taskFilter !== 'done' && (
                <button
                  type="button"
                  onClick={() => setTab('assign')}
                  className="mt-4 text-sm font-semibold text-forest hover:underline"
                >
                  Go to Assign →
                </button>
              )}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredTasks.map((room) => (
                <article
                  key={room.id}
                  className={`flex flex-col rounded-2xl border-2 p-4 transition-shadow hover:shadow-md md:p-5 ${cardStyles[room.status]}`}
                >
                  <div className="mb-3 flex items-start justify-between gap-2">
                    <div>
                      <p className="text-2xl font-bold text-forest">Room {room.room}</p>
                      <p className="text-sm text-forest/60">
                        {formatRoomSubtitle(room.building, room.roomType)}
                      </p>
                      <PropertyBadge propertyId={room.propertyId} />
                    </div>
                    <RoomStatusBadge status={room.status} />
                  </div>

                  <p className="mb-4 text-sm text-forest/80">
                    {room.assignedTo ? (
                      <span className="font-medium">→ {room.assignedTo}</span>
                    ) : (
                      <span className="italic text-forest/50">Unassigned</span>
                    )}
                  </p>

                  <CleaningTimeInfo task={room} />

                  {room.status === 'cleaning' && room.cleaningChecklist && (
                    <p className="mb-4 text-sm text-forest/75">
                      Checklist:{' '}
                      <span className="font-medium">
                        {completedChecklistCount(room.cleaningChecklist)}/
                        {room.cleaningChecklist.items.length} done
                      </span>
                    </p>
                  )}

                  {room.status === 'cleaning' && room.photoBeforeUrl && (
                    <div className="mb-4">
                      <p className="mb-1 text-xs font-medium text-forest/60">Before photo (legacy)</p>
                      <ResolvedHkImage
                        src={room.photoBeforeUrl}
                        alt={`Room ${room.room} before`}
                        className="h-24 w-full rounded-lg object-cover ring-1 ring-sand-dark"
                      />
                    </div>
                  )}

                  {room.status === 'done' && (room.photoBeforeUrl || room.photoAfterUrl) && (
                    <div className="mb-4">
                      <HkPhotoProof
                        roomNumber={room.room}
                        building={room.building}
                        assignedTo={room.assignedTo}
                        propertyId={room.propertyId}
                        beforeUrl={room.photoBeforeUrl}
                        afterUrl={room.photoAfterUrl}
                        verificationPhotos={displayVerificationPhotos(
                          room.cleaningChecklist,
                          room.photoAfterUrl,
                        )}
                      />
                    </div>
                  )}

                  {room.status !== 'done' && room.assignedTo && (
                    <p className="mt-auto rounded-xl bg-white/60 px-3 py-2.5 text-center text-xs text-forest/60">
                      {room.status === 'todo'
                        ? `${room.assignedTo} starts via checklist in My tasks`
                        : `${room.assignedTo} is working through the checklist in My tasks`}
                    </p>
                  )}
                </article>
              ))}
            </div>
          )}
        </>
      )}

      {tab === 'proof' && (
        <section className="overflow-hidden rounded-2xl border border-sand-dark bg-sand/30 shadow-sm">
          <div className="border-b border-sand-dark bg-white px-6 py-4">
            <h2 className="font-semibold text-forest">HK photo proof</h2>
            <p className="text-sm text-forest/50">
              Before and after photos from staff — tap any image to view full size
            </p>
          </div>
        <HkPhotoProofGallery
          tasks={visibleTasks.filter((t) => taskFinishedInRange(t, taskRange.from, taskRange.to))}
          emptyMessage={`No photo proof for ${formatPeriodLabel(taskRange.from, taskRange.to).toLowerCase()}.`}
        />
        </section>
      )}
    </div>
  )
}
