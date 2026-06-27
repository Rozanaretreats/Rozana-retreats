import { useEffect, useRef, useState } from 'react'
import { Camera, CheckCircle2, ChevronRight, X } from 'lucide-react'

export type VerificationPhotoRequest = {
  itemId: string
  label: string
}

type VerificationPhotoModalProps = {
  open: boolean
  roomLabel: string
  items: VerificationPhotoRequest[]
  onClose: () => void
  onComplete: (photos: { itemId: string; itemLabel: string; file: File }[]) => Promise<void>
}

function revokePreviewUrls(urls: (string | null)[]) {
  for (const url of urls) {
    if (url) URL.revokeObjectURL(url)
  }
}

export function VerificationPhotoModal({
  open,
  roomLabel,
  items,
  onClose,
  onComplete,
}: VerificationPhotoModalProps) {
  const [step, setStep] = useState(0)
  const [files, setFiles] = useState<(File | null)[]>([])
  const [previewUrls, setPreviewUrls] = useState<(string | null)[]>([])
  const [submitting, setSubmitting] = useState(false)
  const wasOpenRef = useRef(false)

  // Reset only when the modal opens — not when the parent re-renders.
  useEffect(() => {
    if (open && !wasOpenRef.current) {
      setStep(0)
      setFiles(items.map(() => null))
      setPreviewUrls((prev) => {
        revokePreviewUrls(prev)
        return items.map(() => null)
      })
      setSubmitting(false)
    }
    if (!open && wasOpenRef.current) {
      setPreviewUrls((prev) => {
        revokePreviewUrls(prev)
        return []
      })
    }
    wasOpenRef.current = open
  }, [open])

  if (!open || items.length === 0) return null

  const current = items[step]!
  const isLast = step === items.length - 1
  const currentFile = files[step]
  const currentPreview = previewUrls[step]

  const reset = () => {
    setStep(0)
    setFiles(items.map(() => null))
    setPreviewUrls((prev) => {
      revokePreviewUrls(prev)
      return items.map(() => null)
    })
    setSubmitting(false)
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const handlePick = (picked: File) => {
    setFiles((prev) => {
      const next = [...prev]
      next[step] = picked
      return next
    })
    setPreviewUrls((prev) => {
      const next = [...prev]
      if (next[step]) URL.revokeObjectURL(next[step])
      next[step] = URL.createObjectURL(picked)
      return next
    })
  }

  const handleNext = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentFile) return

    if (!isLast) {
      setStep((s) => s + 1)
      return
    }

    setSubmitting(true)
    try {
      const uploads = items.map((item, i) => ({
        itemId: item.itemId,
        itemLabel: item.label,
        file: files[i]!,
      }))
      await onComplete(uploads)
      reset()
      onClose()
    } catch {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex bg-forest/50 p-0 backdrop-blur-[2px] sm:items-center sm:justify-center sm:p-4">
      <form
        onSubmit={handleNext}
        className="flex h-full max-h-[100dvh] w-full flex-col overflow-y-auto border-sand-dark bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:h-auto sm:max-w-md sm:rounded-2xl sm:border sm:p-6 sm:shadow-xl"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-lg font-semibold text-forest">Verification photos</p>
            <p className="mt-1 text-sm text-forest/60">
              Room {roomLabel} — photo {step + 1} of {items.length}
            </p>
            <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-sm font-medium text-amber-950 ring-1 ring-amber-200">
              {current.label}
            </p>
          </div>
          <button type="button" onClick={handleClose} className="rounded-lg p-1 text-forest/50 hover:bg-sand">
            <X className="h-5 w-5" />
          </button>
        </div>

        <label className="mb-5 block cursor-pointer rounded-xl border-2 border-dashed border-sand-dark p-8 text-center active:border-forest/30 sm:p-6 sm:hover:border-forest/30">
          <Camera className="mx-auto mb-2 h-10 w-10 text-forest/50 sm:h-8 sm:w-8" />
          <span className="block text-base font-medium text-forest sm:text-sm">
            {currentPreview ? 'Tap to replace photo' : 'Tap to take photo'}
          </span>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="sr-only"
            onChange={(e) => {
              const picked = e.target.files?.[0]
              if (!picked) return
              handlePick(picked)
              e.target.value = ''
            }}
          />
          {currentPreview && (
            <img
              src={currentPreview}
              alt="Verification preview"
              className="mt-4 max-h-48 w-full rounded-lg object-cover"
            />
          )}
        </label>

        {step > 0 && (
          <p className="mb-3 text-center text-xs text-forest/50">
            {files.filter(Boolean).length} of {items.length} photos captured
          </p>
        )}

        <button
          type="submit"
          disabled={!currentFile || submitting}
          className="mt-auto flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-forest py-3.5 text-base font-semibold text-white active:bg-forest-light disabled:cursor-not-allowed disabled:opacity-50 sm:py-3 sm:text-sm"
        >
          {isLast ? (
            <>
              <CheckCircle2 className="h-4 w-4" />
              {submitting ? 'Saving…' : 'Submit & mark room done'}
            </>
          ) : (
            <>
              Next photo
              <ChevronRight className="h-4 w-4" />
            </>
          )}
        </button>
      </form>
    </div>
  )
}
