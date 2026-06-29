# Rozana EOD — Baileys WhatsApp sender

Sends the **daily operations report** to Ruheed (or other owners) using [Baileys](https://github.com/WhiskeySockets/Baileys) — WhatsApp Web automation from a normal WhatsApp number.

## Why Baileys (vs Meta Cloud API)

| | **Baileys** | **Meta Cloud API** (Edge Function default) |
|---|-------------|---------------------------------------------|
| Setup | Scan QR once on a phone-linked account | Meta Business app + approved templates |
| Message format | Full WhatsApp text (`*bold*`, lists, links) — no template limits | Templates required for outbound business messages |
| Schedule | `node-cron` on a PC/VPS at exact IST time | `pg_cron` → Edge Function |
| Risk | Unofficial API — account can be restricted if abused | Official, production-safe |
| Hosting | Always-on machine with this process running | Supabase only |

**Report content is the same** — this service calls `send-owner-eod-report?dryRun=true` to build the message from Supabase, then Baileys delivers it.

## Prerequisites

- Node.js 18+
- A WhatsApp number to send from (dedicated business SIM recommended)
- Supabase **service_role** key (Settings → API)
- Edge Function `send-owner-eod-report` already deployed

## Setup

```powershell
cd Rozanaretreats\whatsapp-baileys
copy .env.example .env
# Edit .env — service role key, Ruheed's number, cron time
npm install
npm start
```

1. Terminal shows a **QR code** — open WhatsApp on the sender phone → Linked devices → Link a device → scan.
2. Session is saved in `auth_info/` (do not commit).
3. Default schedule: **6:00 PM IST** daily (`EOD_CRON=0 18 * * *`).

## Test send immediately

```powershell
npm run send-now
```

Forces one send (ignores “already sent today” check).

## Cron examples (Asia/Kolkata)

| Time | `EOD_CRON` |
|------|------------|
| 6:00 PM | `0 18 * * *` |
| 6:30 PM | `30 18 * * *` |
| 8:00 PM | `0 20 * * *` |

## Production tips

- Run on a small always-on PC at the property or a cheap VPS (Windows Task Scheduler / `pm2` / systemd).
- Use a **dedicated** WhatsApp number — not personal daily chat.
- If disconnected: restart `npm start`. If logged out: delete `auth_info/` and scan QR again.
- `report_send_log` still records sends (idempotent — one per day per property).

## Meta vs Baileys — what to tell your senior

- **Baileys** = faster to get formatted daily WhatsApp without Meta Business approval; needs one machine online.
- **Meta API** = better long-term if you want zero maintenance and official support.
- You can keep **both**: Edge Function for Meta, this folder for Baileys — same report body.
