import { supabase } from './supabase'

import type { PropertyId } from '../types'



const BUCKET = 'hk-photos'



/** Internal storage reference prefix — not a public URL */

export const HK_STORAGE_PREFIX = 'hk://'



/** Upload HK proof image — stores a private storage ref when Supabase is configured */

export async function uploadHkPhoto(

  file: File,

  propertyId: PropertyId,

  roomId: string,

  kind: 'before' | 'after' | string,

): Promise<string> {

  if (!supabase) {

    return readFileAsDataUrl(file)

  }



  const ext = file.name.split('.').pop() ?? 'jpg'

  const path = `${propertyId}/${roomId}/${Date.now()}-${kind}.${ext}`



  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {

    cacheControl: '3600',

    upsert: false,

  })



  if (error) {

    console.warn('Storage upload failed, using local preview', error.message)

    return readFileAsDataUrl(file)

  }



  return `${HK_STORAGE_PREFIX}${path}`

}



/** Resolve stored photo ref (hk:// path, legacy public URL, or data URL) to a displayable URL */

export async function resolveHkPhotoUrl(ref: string | undefined): Promise<string | undefined> {

  if (!ref) return undefined

  if (ref.startsWith('data:')) return ref

  if (!supabase) return ref



  const path = storagePathFromRef(ref)

  if (!path) return ref



  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 3600)

  if (error || !data?.signedUrl) {

    console.warn('Signed URL failed — photo may be unavailable', error?.message)

    return ref.startsWith('http') ? ref : undefined

  }

  return data.signedUrl

}



export function storagePathFromRef(ref: string): string | null {

  if (ref.startsWith(HK_STORAGE_PREFIX)) {

    return ref.slice(HK_STORAGE_PREFIX.length)

  }



  const publicMarker = '/storage/v1/object/public/hk-photos/'

  const signMarker = '/storage/v1/object/sign/hk-photos/'

  if (ref.includes(publicMarker)) {

    return ref.split(publicMarker)[1]?.split('?')[0] ?? null

  }

  if (ref.includes(signMarker)) {

    return ref.split(signMarker)[1]?.split('?')[0] ?? null

  }

  if (!ref.startsWith('http') && !ref.startsWith('data:')) {

    return ref

  }

  return null

}



function readFileAsDataUrl(file: File): Promise<string> {

  return new Promise((resolve, reject) => {

    const reader = new FileReader()

    reader.onload = () => resolve(reader.result as string)

    reader.onerror = () => reject(reader.error)

    reader.readAsDataURL(file)

  })

}

