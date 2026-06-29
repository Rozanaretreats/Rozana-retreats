import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  console.warn('Supabase env vars missing — using demo/local mode')
} else if (import.meta.env.DEV) {
  if (anonKey.startsWith('eyJ')) {
    console.warn(
      'VITE_SUPABASE_ANON_KEY looks like a legacy JWT anon key. If REST calls return 401, use the publishable key (sb_publishable_…) from Supabase → Project Settings → API.',
    )
  }
}

export const supabase = url && anonKey
  ? createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null

export const isSupabaseConfigured = Boolean(supabase)
