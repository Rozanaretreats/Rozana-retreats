import { PropertyBadge } from './PropertyBadge'
import { HkPhotoProof } from './HkPhotoProof'
import { CleaningTimeInfo } from './CleaningTimeInfo'
import { formatRoomSubtitle } from '../data/roomInventory'
import { displayVerificationPhotos } from '../lib/cleaningChecklist'
import type { RoomTask } from '../types'
import { Camera } from 'lucide-react'

type HkPhotoProofGalleryProps = {
  tasks: RoomTask[]
  emptyMessage?: string
}

export function HkPhotoProofGallery({ tasks, emptyMessage }: HkPhotoProofGalleryProps) {
  const withPhotos = tasks.filter(
    (t) => t.status === 'done' && (t.photoBeforeUrl || t.photoAfterUrl),
  )

  if (withPhotos.length === 0) {
    return (
      <p className="px-6 py-10 text-center text-sm text-forest/50">
        {emptyMessage ?? 'No completed rooms with photos yet.'}
      </p>
    )
  }

  return (
    <div className="grid gap-4 p-6 sm:grid-cols-2 lg:grid-cols-3">
      {withPhotos.map((task) => (
        <article
          key={task.id}
          className="flex flex-col rounded-2xl border border-sand-dark bg-white p-4 shadow-sm"
        >
          <div className="mb-3 flex items-start justify-between gap-2">
            <div>
              <p className="text-lg font-bold text-forest">Room {task.room}</p>
              <p className="text-sm text-forest/60">
                {formatRoomSubtitle(task.building, task.roomType)}
              </p>
              <PropertyBadge propertyId={task.propertyId} />
            </div>
            <Camera className="h-4 w-4 shrink-0 text-forest/30" />
          </div>
          {task.assignedTo && (
            <p className="mb-2 text-sm text-forest/70">
              Completed by <span className="font-medium">{task.assignedTo}</span>
            </p>
          )}
          <CleaningTimeInfo task={task} />
          <HkPhotoProof
            size="md"
            roomNumber={task.room}
            building={task.building}
            assignedTo={task.assignedTo}
            propertyId={task.propertyId}
            beforeUrl={task.photoBeforeUrl}
            afterUrl={task.photoAfterUrl}
            verificationPhotos={displayVerificationPhotos(
              task.cleaningChecklist,
              task.photoAfterUrl,
            )}
          />
        </article>
      ))}
    </div>
  )
}
