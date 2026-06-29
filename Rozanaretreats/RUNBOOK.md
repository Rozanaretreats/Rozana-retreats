# Rozana Ops — Recovery runbook

Quick fixes when no developer is on site.

## Cannot sign in (Ops web)

1. Confirm internet works.
2. Credentials are **Supabase Auth** accounts (not old demo passwords unless running local dev without Supabase).
3. Owner: `ruheed@rozana.com` · Manager: `firoz@rozana.com` — passwords set via `scripts/seed-management-auth.mjs`.
4. HK staff: manager resets under **Housekeeping → Team → Reset password** (recreates Auth user).
5. If “permission denied” on all pages: production RLS is active — you must be signed in (check browser devtools for 401/403).

## Manual attendance (no fingerprint reader yet)

1. In **local dev only**: set `VITE_ALLOW_MANUAL_PUNCHES=true` in `app/.env.local` and restart Vite.
2. **Production Netlify**: keep `false` until kiosk is live; use manager-marked absences + leave records until then.

## WhatsApp EOD not received

1. On the Baileys PC: check console for `[baileys] Connected`.
2. If logged out: delete `whatsapp-baileys/auth_info/`, restart, scan QR again.
3. Test: `.\send-now.cmd` from `whatsapp-baileys/`.
4. Check Supabase table `report_send_log` for `status` = `failed`.
5. Set `FAILURE_WEBHOOK_URL` in Baileys `.env` to get alerts (e.g. Slack/Discord webhook).

## Internet down at property

- **Ops app**: may show stale data; refresh when back online. Realtime reconnects automatically.
- **Kiosk** (when live): punches queue in `rozana_kiosk.db` and sync when online.

## Hours dispute

1. **Attendance** page → filter staff → punch log (immutable).
2. Cross-check **Leave** for approved leave on that date.
3. Status **Leave + punch** (purple) = inconsistent — resolve with staff.

## Backups to keep safe

| Asset | Location |
|-------|----------|
| Supabase data | Supabase dashboard → backups / PITR |
| WhatsApp session | `Rozanaretreats/whatsapp-baileys/auth_info/` |
| Env files | `app/.env.local`, `whatsapp-baileys/.env`, kiosk `.env` (not in git) |

## Credential holders (fill in at handover)

| Item | Holder |
|------|--------|
| Supabase project owner login | |
| Owner/manager app passwords | |
| Kiosk ADMIN_PIN | |
| WhatsApp sender SIM | |
| Baileys PC admin | |
