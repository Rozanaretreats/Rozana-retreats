import { useEffect, useState } from 'react'
import { resolveHkPhotoUrl } from '../lib/hkPhotos'

/** Resolve hk:// refs and legacy public URLs to signed display URLs */
export function useResolvedHkPhoto(ref?: string): string | undefined {
  const [url, setUrl] = useState<string | undefined>(
    ref?.startsWith('data:') || ref?.startsWith('http') ? ref : undefined,
  )

  useEffect(() => {
    let cancelled = false
    if (!ref) {
      setUrl(undefined)
      return
    }
    if (ref.startsWith('data:')) {
      setUrl(ref)
      return
    }

    resolveHkPhotoUrl(ref).then((resolved) => {
      if (!cancelled) setUrl(resolved)
    })

    return () => {
      cancelled = true
    }
  }, [ref])

  return url
}
