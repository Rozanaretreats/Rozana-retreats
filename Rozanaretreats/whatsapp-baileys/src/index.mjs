/**
 * Rozana EOD report — Baileys delivery
 *
 * Reuses the Supabase Edge Function to *compose* the report (dryRun),
 * then sends it via WhatsApp Web (Baileys) on a daily cron schedule.
 *
 * Run on a PC or small VPS that stays online (e.g. office PC or cloud VM).
 */
import 'dotenv/config'
import http from 'node:http'
import cron from 'node-cron'
import pino from 'pino'
import qrcode from 'qrcode-terminal'
import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  Browsers,
} from '@whiskeysockets/baileys'
import { createClient } from '@supabase/supabase-js'

const sendNow = process.argv.includes('--send-now')

function checkConfig() {
  const owners = process.env.OWNER_WHATSAPP_NUMBERS?.trim() ?? ''
  if (!owners || owners === '919876543210') {
    console.error('')
    console.error('Set Ruheed WhatsApp in .env first:')
    console.error('  OWNER_WHATSAPP_NUMBERS=91XXXXXXXXXX')
    console.error('  (digits only, no + or spaces)')
    console.error('')
    process.exit(1)
  }
  if (!supabaseAuthKey()) {
    console.error('Set SUPABASE_ANON_KEY in .env (copy from Rozanaretreats/app/.env.local)')
    process.exit(1)
  }
  if (!serviceRoleClient()) {
    console.error('Set SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SECRET_KEY) — required for idempotency')
    process.exit(1)
  }
  if (!process.env.TRIGGER_SECRET?.trim()) {
    console.warn('[config] TRIGGER_SECRET not set — /send-now is unauthenticated on localhost')
  }
}

function requireEnv(name) {
  const v = process.env[name]
  if (!v?.trim()) throw new Error(`Missing env: ${name}`)
  return v.trim()
}

function ownerJids() {
  return requireEnv('OWNER_WHATSAPP_NUMBERS')
    .split(',')
    .map((n) => n.trim().replace(/[^\d]/g, ''))
    .filter(Boolean)
    .map((n) => `${n}@s.whatsapp.net`)
}

function istToday() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

function supabaseAuthKey() {
  return (
    process.env.SUPABASE_SECRET_KEY?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    process.env.SUPABASE_ANON_KEY?.trim() ||
    ''
  )
}

function supabaseFetchHeaders(key) {
  const headers = { apikey: key, 'Content-Type': 'application/json' }
  // Legacy JWT keys use Bearer; new sb_publishable_/sb_secret_ keys use apikey only
  if (!key.startsWith('sb_')) {
    headers.Authorization = `Bearer ${key}`
  }
  return headers
}

async function fetchReportText(date, propertyId) {
  const base = requireEnv('EOD_FUNCTION_URL')
  const authKey = supabaseAuthKey()
  if (!authKey) throw new Error('Set SUPABASE_ANON_KEY or SUPABASE_SERVICE_ROLE_KEY in .env')
  const url = `${base}?dryRun=true&property_id=${encodeURIComponent(propertyId)}&date=${encodeURIComponent(date)}`

  const res = await fetch(url, {
    method: 'POST',
    headers: supabaseFetchHeaders(authKey),
  })
  if (!res.ok) throw new Error(`Edge Function ${res.status}: ${(await res.text()).slice(0, 300)}`)

  const body = await res.json()
  const message = body.results?.[0]?.message
  if (!message) throw new Error(`No report message in response: ${JSON.stringify(body).slice(0, 200)}`)
  return message
}

function serviceRoleClient() {
  const key =
    process.env.SUPABASE_SECRET_KEY?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  if (!key) return null
  return createClient(requireEnv('SUPABASE_URL'), key)
}

async function alreadySent(date, propertyId) {
  const supabase = serviceRoleClient()
  if (!supabase) return false
  const { data } = await supabase
    .from('report_send_log')
    .select('id, status')
    .eq('report_date', date)
    .eq('property_id', propertyId)
    .maybeSingle()
  return data?.status === 'sent'
}

async function logSend(date, propertyId, recipients, status, detail) {
  const supabase = serviceRoleClient()
  if (!supabase) {
    console.warn('[eod] Skipping report_send_log (set SUPABASE_SERVICE_ROLE_KEY to enable)')
    return
  }
  await supabase.from('report_send_log').upsert(
    {
      report_date: date,
      property_id: propertyId,
      recipients,
      status,
      detail: detail.slice(0, 1000),
    },
    { onConflict: 'report_date,property_id' },
  )
}

let sock = null
let sending = false
let reconnectAttempts = 0
const MAX_RECONNECT = 8
const MAX_SENDS_PER_DAY = Number(process.env.MAX_SENDS_PER_DAY ?? 3)
let sendsToday = 0
let sendsTodayDate = istToday()

async function notifyFailure(message) {
  const hook = process.env.FAILURE_WEBHOOK_URL?.trim()
  console.error('[alert]', message)
  if (!hook) return
  try {
    await fetch(hook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source: 'rozana-baileys', message, at: new Date().toISOString() }),
    })
  } catch (e) {
    console.error('[alert] Webhook failed:', e)
  }
}

async function resolveWaVersion() {
  try {
    const res = await fetch(
      'https://raw.githubusercontent.com/WhiskeySockets/Baileys/master/src/Defaults/baileys-version.json',
    )
    if (res.ok) {
      const data = await res.json()
      if (Array.isArray(data.version)) {
        console.log('[baileys] Protocol version from GitHub:', data.version.join('.'))
        return data.version
      }
    }
  } catch (e) {
    console.warn('[baileys] Could not fetch baileys-version.json:', e.message)
  }

  try {
    const { version } = await fetchLatestBaileysVersion()
    console.log('[baileys] Protocol version from fetchLatestBaileysVersion:', version.join('.'))
    return version
  } catch (e) {
    console.warn('[baileys] fetchLatestBaileysVersion failed:', e.message)
  }

  const fallback = [2, 3000, 1033893291]
  console.log('[baileys] Using fallback protocol version:', fallback.join('.'))
  return fallback
}

function disconnectDetail(lastDisconnect) {
  const err = lastDisconnect?.error
  const code = err?.output?.statusCode ?? err?.code
  const msg =
    err?.message ??
    err?.output?.payload?.message ??
    err?.output?.payload?.error ??
    (err ? String(err) : 'unknown')
  return { code, msg }
}

async function sendEodReport(force = false) {
  if (sending) {
    console.log('[eod] Send already in progress, skipping')
    return
  }
  if (!sock) {
    console.error('[eod] WhatsApp not connected yet')
    return
  }

  sending = true
  const propertyId = requireEnv('PROPERTY_ID')
  const date = istToday()
  if (date !== sendsTodayDate) {
    sendsTodayDate = date
    sendsToday = 0
  }
  if (sendsToday >= MAX_SENDS_PER_DAY && !force) {
    console.warn(`[eod] Daily cap (${MAX_SENDS_PER_DAY}) reached for ${date}`)
    return
  }
  const numbers = requireEnv('OWNER_WHATSAPP_NUMBERS')
    .split(',')
    .map((n) => n.trim().replace(/[^\d]/g, ''))
    .filter(Boolean)

  try {
    if (!force && (await alreadySent(date, propertyId))) {
      console.log(`[eod] Already sent for ${date} / ${propertyId}`)
      return
    }

    console.log(`[eod] Fetching report for ${date}…`)
    const text = await fetchReportText(date, propertyId)

    const results = []
    for (const jid of ownerJids()) {
      try {
        await sock.sendMessage(jid, { text })
        results.push({ to: jid, ok: true })
        console.log(`[eod] Sent to ${jid}`)
      } catch (e) {
        results.push({ to: jid, ok: false, error: String(e) })
        console.error(`[eod] Failed ${jid}:`, e)
      }
    }

    const okCount = results.filter((r) => r.ok).length
    const status = okCount === numbers.length ? 'sent' : okCount === 0 ? 'failed' : 'partial'
    await logSend(date, propertyId, numbers, status, `baileys:${JSON.stringify(results)}`)
    sendsToday += 1
    console.log(`[eod] Done — ${status} (${okCount}/${numbers.length})`)
    if (status === 'failed') await notifyFailure(`EOD WhatsApp failed for ${date} / ${propertyId}`)
  } catch (e) {
    console.error('[eod] Error:', e)
    await logSend(date, propertyId, numbers, 'failed', `baileys:${String(e)}`).catch(() => {})
    await notifyFailure(`EOD error: ${String(e)}`)
  } finally {
    sending = false
  }
}

async function startWhatsApp() {
  const authDir = process.env.BAILEYS_AUTH_DIR ?? 'auth_info'
  const { state, saveCreds } = await useMultiFileAuthState(authDir)
  const version = await resolveWaVersion()

  if (sock) {
    try {
      sock.end(undefined)
    } catch {
      /* ignore */
    }
    sock = null
  }

  sock = makeWASocket({
    auth: state,
    version,
    logger: pino({ level: 'silent' }),
    browser: Browsers.windows('Chrome'),
    printQRInTerminal: false,
    connectTimeoutMs: 60_000,
    qrTimeout: 120_000,
    markOnlineOnConnect: false,
    syncFullHistory: false,
  })

  sock.ev.on('creds.update', saveCreds)

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update

    if (connection === 'connecting') {
      console.log('[baileys] Connecting…')
    }

    if (qr) {
      reconnectAttempts = 0
      console.log('\n=== Scan QR with sender phone (WhatsApp → Linked devices → Link) ===\n')
      qrcode.generate(qr, { small: true })
      console.log('\n(QR expires in ~2 min — wait if a new one appears)\n')
    }

    if (connection === 'open') {
      reconnectAttempts = 0
      console.log('[baileys] Connected — ready to send')
      if (sendNow) void sendEodReport(true)
    }

    if (connection === 'close') {
      const { code, msg } = disconnectDetail(lastDisconnect)
      const loggedOut = code === DisconnectReason.loggedOut

      console.log(`[baileys] Disconnected (code=${code ?? 'n/a'}): ${msg}`)

      if (loggedOut) {
        console.log('[baileys] Logged out — delete auth_info folder and run start.cmd again')
        void notifyFailure('WhatsApp logged out — re-scan QR in auth_info')
        return
      }

      if (reconnectAttempts >= MAX_RECONNECT) {
        console.error(
          `[baileys] Stopped after ${MAX_RECONNECT} retries. Exiting so Task Scheduler can restart.`,
        )
        process.exit(1)
      }

      reconnectAttempts += 1
      const delay = Math.min(3000 * reconnectAttempts, 30_000)
      console.log(`[baileys] Retry ${reconnectAttempts}/${MAX_RECONNECT} in ${delay / 1000}s…`)
      setTimeout(() => void startWhatsApp(), delay)
    }
  })
}

function scheduleCron() {
  const expr = process.env.EOD_CRON ?? '0 18 * * *'
  if (!cron.validate(expr)) {
    throw new Error(`Invalid EOD_CRON: ${expr}`)
  }

  cron.schedule(
    expr,
    () => {
      console.log(`[cron] ${expr} (Asia/Kolkata) — sending EOD report`)
      void sendEodReport(false)
    },
    { timezone: 'Asia/Kolkata' },
  )

  console.log(`[cron] Scheduled daily EOD at "${expr}" Asia/Kolkata`)
}

const TRIGGER_PORT = Number(process.env.TRIGGER_PORT ?? 3939)
const TRIGGER_SECRET = process.env.TRIGGER_SECRET?.trim() ?? ''

function startTriggerServer() {
  const server = http.createServer(async (req, res) => {
    if (req.url?.split('?')[0] !== '/send-now' || req.method !== 'GET') {
      res.statusCode = 404
      res.end('Use GET /send-now')
      return
    }
    if (TRIGGER_SECRET) {
      const url = new URL(req.url, 'http://127.0.0.1')
      const key = url.searchParams.get('key') ?? req.headers['x-trigger-secret']
      if (key !== TRIGGER_SECRET) {
        res.statusCode = 401
        res.end('Unauthorized — set TRIGGER_SECRET in .env')
        return
      }
    }
    res.setHeader('Content-Type', 'text/plain; charset=utf-8')
    if (!sock) {
      res.statusCode = 503
      res.end('WhatsApp not connected yet — wait for [baileys] Connected')
      return
    }
    try {
      await sendEodReport(true)
      res.end('OK — report sent. Check WhatsApp on the recipient number.')
    } catch (e) {
      res.statusCode = 500
      res.end(String(e))
    }
  })
  server.listen(TRIGGER_PORT, '127.0.0.1', () => {
    console.log(`[trigger] Test send from 2nd terminal: .\\send-now.cmd`)
  })
}

console.log('Rozana EOD — Baileys sender')
checkConfig()
await startWhatsApp()
if (!sendNow) {
  scheduleCron()
  startTriggerServer()
}
