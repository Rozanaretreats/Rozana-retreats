import 'dotenv/config'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const port = process.env.TRIGGER_PORT ?? '3939'
const secret = process.env.TRIGGER_SECRET?.trim() ?? ''
const url = new URL(`http://127.0.0.1:${port}/send-now`)
if (secret) url.searchParams.set('key', secret)

try {
  const res = await fetch(url)
  const text = await res.text()
  console.log(res.status, text)
  process.exit(res.ok ? 0 : 1)
} catch (e) {
  console.error('Failed. Is start-production.cmd running and WhatsApp connected?')
  console.error(e instanceof Error ? e.message : e)
  process.exit(1)
}
