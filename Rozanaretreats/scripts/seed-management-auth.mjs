#!/usr/bin/env node
/**
 * Create Supabase Auth users for Ruheed (owner) and Firoz (manager) + profiles rows.
 *
 * Usage (from Rozanaretreats/):
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/seed-management-auth.mjs
 *
 * Optional env:
 *   RUHEED_PASSWORD, FIROZ_PASSWORD (defaults: prompts not supported — set in env)
 */
import { createClient } from '@supabase/supabase-js'

const url = process.env.SUPABASE_URL?.trim()
const serviceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || process.env.SUPABASE_SECRET_KEY?.trim()

if (!url || !serviceKey) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const ruheedPassword = process.env.RUHEED_PASSWORD ?? 'ChangeMe-Ruheed-2026!'
const firozPassword = process.env.FIROZ_PASSWORD ?? 'ChangeMe-Firoz-2026!'

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function ensureUser({ email, password, name, role, property_scope }) {
  const { data: listed } = await admin.auth.admin.listUsers()
  const existing = listed.users.find((u) => u.email?.toLowerCase() === email.toLowerCase())

  let userId = existing?.id
  if (existing) {
    const { error } = await admin.auth.admin.updateUserById(existing.id, {
      password,
      email_confirm: true,
    })
    if (error) throw error
    console.log(`Updated auth user: ${email}`)
  } else {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })
    if (error) throw error
    userId = data.user?.id
    console.log(`Created auth user: ${email}`)
  }

  if (!userId) throw new Error(`No user id for ${email}`)

  const { error: profileErr } = await admin.from('profiles').upsert(
    { id: userId, name, role, property_scope },
    { onConflict: 'id' },
  )
  if (profileErr) throw profileErr
  console.log(`Profile: ${name} (${role}, ${property_scope})`)
}

await ensureUser({
  email: 'ruheed@rozana.com',
  password: ruheedPassword,
  name: 'Ruheed',
  role: 'owner',
  property_scope: 'all',
})

await ensureUser({
  email: 'firoz@rozana.com',
  password: firozPassword,
  name: 'Firoz',
  role: 'manager',
  property_scope: 'ooty-skyview',
})

console.log('\nDone. Share passwords securely with owner/manager.')
console.log('Set RUHEED_PASSWORD / FIROZ_PASSWORD env vars to use custom passwords.')
