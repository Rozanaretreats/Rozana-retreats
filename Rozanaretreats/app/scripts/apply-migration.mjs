import { readFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import pg from 'pg'

const __dirname = dirname(fileURLToPath(import.meta.url))

function loadEnv(path) {
  if (!existsSync(path)) throw new Error(`Missing ${path}`)
  const vars = {}
  const content = readFileSync(path, 'utf8').replace(/^\uFEFF/, '')
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    vars[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim()
  }
  return vars
}

function buildConnectionString(env) {
  if (env.SUPABASE_DB_URL) return env.SUPABASE_DB_URL

  const password = env.SUPABASE_DB_PASSWORD
  const url = env.VITE_SUPABASE_URL
  if (!password) {
    throw new Error(
      'Set SUPABASE_DB_PASSWORD or SUPABASE_DB_URL in app/.env.local',
    )
  }
  if (!url) throw new Error('VITE_SUPABASE_URL not set in .env.local')

  const ref = new URL(url).hostname.split('.')[0]
  return `postgresql://postgres:${encodeURIComponent(password)}@db.${ref}.supabase.co:5432/postgres`
}

const migration = process.argv[2] ?? '012_fix_staff_login_rpc.sql'
const envPath = join(__dirname, '..', '.env.local')
const env = loadEnv(envPath)
const connectionString = buildConnectionString(env)

const sqlPath = join(__dirname, '..', '..', 'supabase', 'migrations', migration)
const sql = readFileSync(sqlPath, 'utf8')

const client = new pg.Client({ connectionString, ssl: { rejectUnauthorized: false } })

try {
  await client.connect()
  console.log(`Connected — applying ${migration}`)
  await client.query(sql)
  const check = await client.query(`
    SELECT proname FROM pg_proc
    WHERE proname IN ('verify_staff_login', 'upsert_staff_login')
    ORDER BY proname
  `)
  console.log('Functions present:', check.rows.map((r) => r.proname).join(', ') || '(none)')
  console.log('Done — hard refresh the app (Ctrl+Shift+R)')
} catch (err) {
  console.error('Failed:', err.message)
  console.error('')
  console.error('Paste supabase/migrations/016_rozana_staff_login_rpc.sql in Supabase SQL Editor instead.')
  process.exit(1)
} finally {
  await client.end()
}
