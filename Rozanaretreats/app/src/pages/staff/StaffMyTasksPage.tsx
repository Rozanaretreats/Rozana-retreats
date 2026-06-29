import { useEffect, useMemo, useState } from 'react'
import { PageHeader } from '../../components/PageHeader'
import { StatCard } from '../../components/StatCard'
import { PropertyBadge } from '../../components/PropertyBadge'
import { Notice } from '../../components/Notice'
import { RoomStatusBadge } from '../../components/StatusBadge'
import { HkPhotoProof } from '../../components/HkPhotoProof'
import { CleaningChecklistModal } from '../../components/CleaningChecklistModal'
import { VerificationPhotoModal } from '../../components/VerificationPhotoModal'
import { CleaningTimeInfo } from '../../components/CleaningTimeInfo'
import { ManagerVerificationStatus } from '../../components/ManagerVerificationStatus'
import { StaffPortalGate } from '../../components/StaffPortalGate'
import { useOps } from '../../context/OpsContext'
import { formatRoomSubtitle } from '../../data/roomInventory'
import {
  completedChecklistCount,
  displayVerificationPhotos,
  pickRandomVerificationItems,
} from '../../lib/cleaningChecklist'
import type { CleaningChecklist, RoomStatus, Staff } from '../../types'
import { CheckCircle2, ClipboardList } from 'lucide-react'

const cardStyles: Record<RoomStatus, string> = {
  todo: 'border-red-200 bg-red-50/80',
  cleaning: 'border-amber-200 bg-amber-50/80',
  done: 'border-green-200 bg-green-50/80',
}

type TaskFilter = 'open' | 'all' | 'done'

type VerificationState = {
  taskId: string
  roomLabel: string
  items: { itemId: string; label: string }[]
  checklist: CleaningChecklist
}

function StaffMyTasksContent({ linked }: { linked: Staff }) {
  const {
    tasks,
    startCleaningWithChecklist,
    updateCleaningChecklist,
    finishCleaningWithVerification,
  } = useOps()
  const [taskFilter, setTaskFilter] = useState<TaskFilter>('open')
  const [notice, setNotice] = useState<string | null>(null)
  const [checklistTaskId, setChecklistTaskId] = useState<string | null>(null)
  const [startingTaskId, setStartingTaskId] = useState<string | null>(null)
  const [verification, setVerification] = useState<VerificationState | null>(null)
  const [, setTick] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30_000)
    return () => clearInterval(id)
  }, [])

  const myTasks = useMemo(
    () => tasks.filter((t) => t.assignedStaffId === linked.id),
    [tasks, linked.id],
  )

  const filteredTasks = useMemo(() => {
    if (taskFilter === 'open') return myTasks.filter((t) => t.status !== 'done')
    if (taskFilter === 'done') return myTasks.filter((t) => t.status === 'done')
    return myTasks
  }, [myTasks, taskFilter])

  const done = myTasks.filter((t) => t.status === 'done').length
  const open = myTasks.filter((t) => t.status !== 'done').length
  const inProgress = myTasks.filter((t) => t.status === 'cleaning').length
  const checklistTask = checklistTaskId ? myTasks.find((t) => t.id === checklistTaskId) : null

  const flash = (msg: string) => {
    setNotice(msg)
    setTimeout(() => setNotice(null), 4000)
  }

  const openChecklist = async (taskId: string) => {
    const task = myTasks.find((t) => t.id === taskId)
    if (task?.status === 'todo') {
      setStartingTaskId(taskId)
      try {
        await startCleaningWithChecklist(taskId)
      } finally {
        setStartingTaskId(null)
      }
    }
    setChecklistTaskId(taskId)
  }

  const handleFinishChecklist = () => {
    if (!checklistTask?.cleaningChecklist) return
    const picked = pickRandomVerificationItems(checklistTask.cleaningChecklist)
    setVerification({
      taskId: checklistTask.id,
      roomLabel: checklistTask.room,
      items: picked.map((item) => ({ itemId: item.id, label: item.label })),
      checklist: checklistTask.cleaningChecklist,
    })
    setChecklistTaskId(null)
  }

  const verificationItems = useMemo(
    () => verification?.items.map((item) => ({ itemId: item.itemId, label: item.label })) ?? [],
    [verification],
  )

  return (
    <div>
      <PageHeader
        title="My tasks"
        subtitle="Tap a room → checklist → 2 verification photos when done"
      />

      {notice && <Notice message={notice} onDismiss={() => setNotice(null)} />}

      <div className="mb-5 grid grid-cols-3 gap-2 md:mb-8 md:gap-4">
        <StatCard label="Done today" value={done} tone="success" />
        <StatCard label="Assigned" value={open} tone="warning" />
        <StatCard label="In progress" value={inProgress} tone="default" />
      </div>

      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {(['open', 'all', 'done'] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setTaskFilter(f)}
            className={[
              'shrink-0 rounded-full px-4 py-2 text-sm font-medium capitalize transition-colors',
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
            {taskFilter === 'done'
              ? 'No rooms completed yet today.'
              : 'No rooms assigned to you right now.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 md:gap-4 lg:grid-cols-3">
          {filteredTasks.map((room) => {
            const checklistDone = completedChecklistCount(room.cleaningChecklist)
            const checklistTotal = room.cleaningChecklist?.items.length ?? 0

            return (
              <article
                key={room.id}
                className={`flex flex-col rounded-2xl border-2 p-4 transition-shadow md:p-5 hover:shadow-md ${cardStyles[room.status]}`}
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

                <CleaningTimeInfo task={room} />

                {room.status === 'todo' && room.cleaningChecklist && room.cleaningChecklist.items.length > 0 && (
                  <div className="mb-3 rounded-xl bg-white/70 px-3 py-2.5">
                    <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-forest/50">
                      Your tasks ({room.cleaningChecklist.items.length})
                    </p>
                    <ul className="space-y-0.5 text-sm text-forest/75">
                      {room.cleaningChecklist.items.map((item) => (
                        <li key={item.id}>· {item.label}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {room.status === 'cleaning' && checklistTotal > 0 && (
                  <p className="mb-3 text-sm text-forest/70">
                    Checklist: {checklistDone}/{checklistTotal} done
                  </p>
                )}

                {room.status === 'done' &&
                  displayVerificationPhotos(room.cleaningChecklist, room.photoAfterUrl).length > 0 && (
                  <div className="mb-4">
                    <HkPhotoProof
                      roomNumber={room.room}
                      building={room.building}
                      propertyId={room.propertyId}
                      verificationPhotos={displayVerificationPhotos(
                        room.cleaningChecklist,
                        room.photoAfterUrl,
                      )}
                    />
                  </div>
                )}

                {room.status === 'done' && <ManagerVerificationStatus task={room} />}

                {room.status !== 'done' && (
                  <button
                    type="button"
                    disabled={startingTaskId === room.id}
                    onClick={() => openChecklist(room.id)}
                    className="mt-auto flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-forest py-3.5 text-base font-semibold text-white active:bg-forest-light disabled:opacity-60 md:py-2.5 md:text-sm"
                  >
                    {startingTaskId === room.id ? (
                      'Starting…'
                    ) : room.status === 'todo' ? (
                      <>
                        <ClipboardList className="h-4 w-4" />
                        Start cleaning
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4" />
                        Continue checklist
                      </>
                    )}
                  </button>
                )}
              </article>
            )
          })}
        </div>
      )}

      <CleaningChecklistModal
        open={!!checklistTaskId}
        task={checklistTask ?? null}
        onClose={() => setChecklistTaskId(null)}
        onSaveChecklist={async (checklist) => {
          if (!checklistTaskId) return
          await updateCleaningChecklist(checklistTaskId, checklist)
        }}
        onFinish={handleFinishChecklist}
      />

      <VerificationPhotoModal
        open={!!verification}
        roomLabel={verification?.roomLabel ?? ''}
        items={verificationItems}
        onClose={() => setVerification(null)}
        onComplete={async (photos) => {
          if (!verification) return
          await finishCleaningWithVerification(
            verification.taskId,
            photos,
            verification.checklist,
          )
          flash('Room marked done — awaiting manager check')
        }}
      />
    </div>
  )
}

export function StaffMyTasksPage() {
  return <StaffPortalGate>{(linked) => <StaffMyTasksContent linked={linked} />}</StaffPortalGate>
}
