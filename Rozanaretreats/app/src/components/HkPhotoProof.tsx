import { useState } from 'react'
import { Expand } from 'lucide-react'
import { PhotoLightbox } from './PhotoLightbox'
import { ResolvedHkImage } from './ResolvedHkImage'
import type { PropertyId, VerificationPhotoRecord } from '../types'

type HkPhotoProofProps = {
  roomNumber: string
  building?: string
  assignedTo?: string
  propertyId?: PropertyId
  beforeUrl?: string
  afterUrl?: string
  verificationLabel?: string
  verificationPhotos?: VerificationPhotoRecord[]
  /** sm = task card thumbnails · md = gallery cards */
  size?: 'sm' | 'md'
}

export function HkPhotoProof({
  roomNumber,
  building,
  assignedTo,
  propertyId,
  beforeUrl,
  afterUrl,
  verificationLabel,
  verificationPhotos,
  size = 'sm',
}: HkPhotoProofProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false)

  const photos =
    verificationPhotos ??
    (verificationLabel && afterUrl
      ? [{ itemId: 'legacy', itemLabel: verificationLabel, photoUrl: afterUrl }]
      : [])

  if (!beforeUrl && !afterUrl && photos.length === 0) return null

  const thumbClass =
    size === 'md'
      ? 'h-36 w-full rounded-xl object-cover ring-1 ring-sand-dark'
      : 'h-24 w-full rounded-lg object-cover ring-1 ring-sand-dark'

  const verifiedLabels = photos.map((p) => p.itemLabel).join(', ')
  const subtitle = [
    building,
    assignedTo ? `by ${assignedTo}` : null,
    verifiedLabels ? `Verified: ${verifiedLabels}` : null,
    propertyId,
  ]
    .filter(Boolean)
    .join(' · ')

  const verificationOnly = photos.length > 0 && !beforeUrl

  return (
    <>
      <button
        type="button"
        onClick={() => setLightboxOpen(true)}
        className="group w-full text-left"
      >
        {verificationOnly ? (
          <>
            <div className="mb-1 flex items-center justify-between gap-2">
              <p className="text-xs font-medium text-forest/60">
                Verification photos ({photos.length}) — tap to enlarge
              </p>
              <Expand className="h-3.5 w-3.5 shrink-0 text-forest/40 group-hover:text-forest" />
            </div>
            <div className={`grid gap-2 ${photos.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
              {photos.map((photo) => (
                <div key={photo.itemId}>
                  <p className="mb-1 line-clamp-2 rounded-lg bg-amber-50 px-2 py-1 text-[10px] font-medium text-amber-950 ring-1 ring-amber-200">
                    {photo.itemLabel}
                  </p>
                  <ResolvedHkImage
                    src={photo.photoUrl}
                    alt={`Room ${roomNumber} — ${photo.itemLabel}`}
                    className={thumbClass}
                  />
                </div>
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="mb-1 flex items-center justify-between gap-2">
              <p className="text-xs font-medium text-forest/60">Before & after — tap to enlarge</p>
              <Expand className="h-3.5 w-3.5 shrink-0 text-forest/40 group-hover:text-forest" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              {beforeUrl ? (
                <div>
                  <p className="mb-1 text-[10px] font-semibold uppercase text-forest/45">Before</p>
                  <ResolvedHkImage src={beforeUrl} alt={`Room ${roomNumber} before`} className={thumbClass} />
                </div>
              ) : (
                <div className="flex h-24 items-center justify-center rounded-lg bg-sand text-[10px] text-forest/40">
                  —
                </div>
              )}
              {afterUrl ? (
                <div>
                  <p className="mb-1 text-[10px] font-semibold uppercase text-forest/45">After</p>
                  <ResolvedHkImage src={afterUrl} alt={`Room ${roomNumber} after`} className={thumbClass} />
                </div>
              ) : (
                <div className="flex h-24 items-center justify-center rounded-lg bg-sand text-[10px] text-forest/40">
                  —
                </div>
              )}
            </div>
          </>
        )}
      </button>

      <PhotoLightbox
        open={lightboxOpen}
        title={`Room ${roomNumber}`}
        subtitle={subtitle || undefined}
        beforeUrl={verificationOnly ? undefined : beforeUrl}
        afterUrl={verificationOnly ? undefined : afterUrl}
        verificationPhotos={verificationOnly ? photos : undefined}
        onClose={() => setLightboxOpen(false)}
      />
    </>
  )
}
