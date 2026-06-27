import { readFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import pg from 'pg'

const __dirname = dirname(fileURLToPath(import.meta.url))
const envPath = join(__dirname, '..', '.env.local')

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
      'Set SUPABASE_DB_PASSWORD or SUPABASE_DB_URL in app/.env.local (save the file after editing)',
    )
  }
  if (!url) throw new Error('VITE_SUPABASE_URL not set in .env.local')

  const ref = new URL(url).hostname.split('.')[0]
  return `postgresql://postgres:${encodeURIComponent(password)}@db.${ref}.supabase.co:5432/postgres`
}

const env = loadEnv(envPath)
const connectionString = buildConnectionString(env)

const sqlPath = join(__dirname, '..', '..', 'supabase', 'migrations', '001_initial_schema.sql')
const sql = readFileSync(sqlPath, 'utf8')

const client = new pg.Client({ connectionString, ssl: { rejectUnauthorized: false } })

try {
  await client.connect()
  console.log('Connected to Supabase Postgres')
  await client.query(sql)
  console.log('Migration 001 applied successfully')
} catch (err) {
  console.error('Migration failed:', err.message)
  console.error('')
  console.error('Try one of these:')
  console.error('  1. Supabase → Project Settings → Database → Reset database password')
  console.error('     Paste the new password into SUPABASE_DB_PASSWORD and save .env.local')
  console.error('  2. Or paste the full URI from Database → Connection string into SUPABASE_DB_URL')
  console.error('  3. Or run supabase/migrations/001_initial_schema.sql in the SQL Editor')
  process.exit(1)
} finally {
  await client.end()
}
