# Rozana Ops — Deployment checklist

## 0. Security setup (do this before go-live)

### Apply database migrations

In Supabase SQL Editor (or `npm run db:migrate`), run in order:

1. `supabase/migrations/019_production_rls.sql`
2. `supabase/migrations/020_harden_staff_login_rpc.sql`

### Create owner/manager auth users

```bash
cd Rozanaretreats
SUPABASE_URL=https://oqksrcruypdmsggorrge.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=your_secret_key \
RUHEED_PASSWORD='choose-strong' \
FIROZ_PASSWORD='choose-strong' \
node scripts/seed-management-auth.mjs
```

### Deploy edge functions

```bash
npx supabase functions deploy provision-staff-auth --project-ref oqksrcruypdmsggorrge --no-verify-jwt
npx supabase functions deploy send-owner-eod-report --project-ref oqksrcruypdmsggorrge --no-verify-jwt
```

Set edge secrets: `OPS_APP_ORIGIN` (your Netlify URL), `SUPABASE_SERVICE_ROLE_KEY`.

After migration, **all users sign in with email + password** via Supabase Auth (no demo passwords in production).

See [RUNBOOK.md](./RUNBOOK.md) for recovery procedures.

---

## 1. Ops web app (Netlify)

**Site settings**

| Setting | Value |
|---------|--------|
| Base directory | `Rozanaretreats/app` (or export via `scripts/push-ops-to-netlify-repo.ps1`) |
| Build command | `npm run build` |
| Publish directory | `dist` |

**Environment variables** (Site → Environment variables)

| Variable | Value |
|----------|--------|
| `VITE_SUPABASE_URL` | `https://oqksrcruypdmsggorrge.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Publishable key (`sb_publishable_…`) from Supabase → API |
| `VITE_ALLOW_MANUAL_PUNCHES` | `false` |

Do **not** use the legacy JWT `anon` key — it is disabled on this project.

**After deploy — smoke test**

- Sign in as owner / operations manager / HK staff
- Load attendance, leave, housekeeping, reports
- Upload HK before/after photos; manager verification flow
- Confirm no 401 errors in browser console

---

## 2. Supabase edge function (EOD report)

Deploy the latest `send-owner-eod-report` (manager verification, IST HK scoping, idempotency fix):

```bash
cd Rozanaretreats
npx supabase functions deploy send-owner-eod-report --project-ref oqksrcruypdmsggorrge --no-verify-jwt
```

Dry-run test:

```bash
curl -X POST "https://oqksrcruypdmsggorrge.supabase.co/functions/v1/send-owner-eod-report?dryRun=true&property_id=ooty-skyview" \
  -H "apikey: YOUR_PUBLISHABLE_KEY"
```

---

## 3. WhatsApp Baileys EOD (Windows PC)

1. Copy `whatsapp-baileys/.env.example` → `.env`
2. Set `SUPABASE_ANON_KEY` (publishable), `SUPABASE_SERVICE_ROLE_KEY` (secret), `OWNER_WHATSAPP_NUMBERS`, `EOD_FUNCTION_URL`, `PROPERTY_ID`, `EOD_CRON`, `TRIGGER_SECRET`
3. `npm install` then `.\start-production.cmd` (or `npm start`)
4. Scan QR once; test with `.\send-now.cmd`

---

## 4. Attendance kiosk (when biometrics are ready)

Release builds require `FINGERPRINT_READER=native` and a strong `ADMIN_PIN` (not `1234`). Mantra SDK integration is still required before go-live — mock mode is dev-only.

---

## 5. Known limitations (post-deploy)

- Database RLS is still demo-grade (`demo_anon_*` policies). Plan a follow-up migration for production auth + scoped RLS before exposing sensitive data broadly.
- Owner/manager login uses client-side demo credentials until Supabase Auth is implemented.
