import { useEffect } from 'react'
import { X } from 'lucide-react'
import { ResolvedHkImage } from './ResolvedHkImage'
import { useResolvedHkPhoto } from '../hooks/useResolvedHkPhoto'
import type { VerificationPhotoRecord } from '../types'

type PhotoLightboxProps = {
  open: boolean
  title: string
  subtitle?: string
  beforeUrl?: string
  afterUrl?: string
  /** Checklist verification photos — when set, shows labeled proof instead of before/after */
  verificationPhotos?: VerificationPhotoRecord[]
  onClose: () => void
}

export function PhotoLightbox({
  open,
  title,
  subtitle,
  beforeUrl,
  afterUrl,
  verificationPhotos,
  onClose,
}: PhotoLightboxProps) {
  const resolvedBefore = useResolvedHkPhoto(beforeUrl)
  const resolvedAfter = useResolvedHkPhoto(afterUrl)
  const verificationMode = (verificationPhotos?.length ?? 0) > 0

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-forest/80 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onClose}
    >
      <div
        className="relative max-h-[92vh] w-full max-w-4xl overflow-auto rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-sand-dark px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-forest">{title}</h2>
            {subtitle && <p className="text-sm text-forest/60">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-forest/50 hover:bg-sand"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {verificationMode ? (
          <div
            className={`grid gap-4 p-5 ${(verificationPhotos?.length ?? 0) > 1 ? 'sm:grid-cols-2' : ''}`}
          >
            {(verificationPhotos ?? []).map((photo) => (
              <div key={photo.itemId}>
                <p className="mb-2 rounded-lg bg-amber-50 px-3 py-1.5 text-sm font-medium text-amber-950 ring-1 ring-amber-200">
                  {photo.itemLabel}
                </p>
                <ResolvedHkImage
                  src={photo.photoUrl}
                  alt={`${title} — ${photo.itemLabel}`}
                  className="max-h-[70vh] w-full rounded-xl object-contain bg-sand ring-1 ring-sand-dark"
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid gap-4 p-5 sm:grid-cols-2">
            {resolvedBefore ? (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-forest/50">
                  Before
                </p>
                <img
                  src={resolvedBefore}
                  alt={`${title} before`}
                  className="max-h-[70vh] w-full rounded-xl object-contain bg-sand ring-1 ring-sand-dark"
                />
              </div>
            ) : (
              <div className="flex min-h-40 items-center justify-center rounded-xl bg-sand text-sm text-forest/40">
                No before photo
              </div>
            )}
            {resolvedAfter ? (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-forest/50">
                  After
                </p>
                <img
                  src={resolvedAfter}
                  alt={`${title} after`}
                  className="max-h-[70vh] w-full rounded-xl object-contain bg-sand ring-1 ring-sand-dark"
                />
              </div>
            ) : (
              <div className="flex min-h-40 items-center justify-center rounded-xl bg-sand text-sm text-forest/40">
                No after photo
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
