import { useState } from 'react'
import { Camera, CheckCircle2, X } from 'lucide-react'

type TaskPhotoModalProps = {
  open: boolean
  mode: 'before' | 'after'
  roomLabel: string
  onClose: () => void
  onSubmit: (file: File) => Promise<void>
}

export function TaskPhotoModal({ open, mode, roomLabel, onClose, onSubmit }: TaskPhotoModalProps) {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (!open) return null

  const isBefore = mode === 'before'

  const reset = () => {
    setFile(null)
    setPreview(null)
    setSubmitting(false)
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const handlePhotoPick = (picked: File | undefined) => {
    if (!picked) return
    setFile(picked)
    setPreview(URL.createObjectURL(picked))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) return
    setSubmitting(true)
    try {
      await onSubmit(file)
      reset()
      onClose()
    } catch {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-forest/40 p-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-2xl border border-sand-dark bg-white p-6 shadow-xl"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-lg font-semibold text-forest">
              {isBefore ? 'Before photo' : 'After photo'}
            </p>
            <p className="text-sm text-forest/60">
              Room {roomLabel} —{' '}
              {isBefore
                ? 'upload the room before you start cleaning'
                : 'upload the finished room to mark done'}
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-lg p-1 text-forest/50 hover:bg-sand"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <label className="mb-5 block cursor-pointer rounded-xl border-2 border-dashed border-sand-dark p-6 text-center hover:border-forest/30">
          <Camera className="mx-auto mb-2 h-8 w-8 text-forest/50" />
          <span className="block text-sm font-medium text-forest">
            {isBefore ? 'Take / upload before photo' : 'Take / upload after photo'}
          </span>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="sr-only"
            onChange={(e) => handlePhotoPick(e.target.files?.[0])}
          />
          {preview && (
            <img
              src={preview}
              alt={isBefore ? 'Before preview' : 'After preview'}
              className="mt-4 max-h-48 w-full rounded-lg object-cover"
            />
          )}
        </label>

        <button
          type="submit"
          disabled={!file || submitting}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-forest py-3 text-sm font-semibold text-white hover:bg-forest-light disabled:cursor-not-allowed disabled:opacity-50"
        >
          <CheckCircle2 className="h-4 w-4" />
          {submitting
            ? 'Saving…'
            : isBefore
              ? 'Start cleaning'
              : 'Mark done'}
        </button>
      </form>
    </div>
  )
}
