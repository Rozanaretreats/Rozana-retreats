# Rozana Ops ↔ Kiosk integration

Both apps share **one Supabase project**. No separate API — kiosk punches land in `attendance_punches`; Rozana Ops reads them.

```
┌─────────────────────┐     INSERT      ┌──────────────────────┐
│  Flutter Kiosk      │ ──────────────► │  attendance_punches  │
│  (tablet / laptop)  │   source=kiosk  │  (Supabase)          │
└─────────────────────┘                 └──────────┬───────────┘
                                                   │
                     Realtime INSERT               │ SELECT + Realtime
                                                   ▼
                                        ┌──────────────────────┐
                                        │  Rozana Ops (web)    │
                                        │  Attendance page     │
                                        └──────────────────────┘
```

## Already connected (data layer)

| Piece | Status |
|-------|--------|
| Same Supabase URL + anon key | Yes (`.env` / `.env.local`) |
| Kiosk writes `attendance_punches` | Yes (`source=kiosk`, `device_id`) |
| Ops loads punches on page load | Yes (`fetchOpsData`) |
| Staff status (present / not-in) | Yes — kiosk IN punches count |

## Dynamic live sync (added to Rozana Ops)

`OpsContext` subscribes to **Supabase Realtime** on `attendance_punches` INSERT. When someone punches on the kiosk, the **Attendance** page updates without refresh.

**One-time SQL** (Supabase SQL Editor) if live sync does not work:

```sql
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'attendance_punches'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE attendance_punches;
  END IF;
END $$;
```

Also in `supabase/kiosk_migrations.sql` (bottom of file).

## How to test live sync

1. Run **Rozana Ops** web app: `cd Rozanaretreats/app && npm run dev`
2. Open **Attendance** in the browser
3. Keep kiosk app running (`flutter run -d windows`)
4. Punch IN for a staff member on the kiosk
5. Ops Attendance should show the punch within ~1–2 seconds (green **Kiosk** badge)

## Optional: WebView on tablet

In kiosk `.env`:

```env
ENABLE_WEBVIEW_TAB=true
WEB_APP_URL=http://localhost:5173
```

Use your deployed Ops URL in production (e.g. Netlify).

## Enrolment stays on kiosk

Fingerprint templates live in `fingerprint_templates` — enrolled via kiosk **Admin** only. Ops does not need template access for attendance display.

## Production checklist

- [ ] Run `kiosk_migrations.sql` on production Supabase
- [ ] Run Realtime publication SQL above
- [ ] Set `VITE_ALLOW_MANUAL_PUNCHES=false` in Ops when kiosks are live
- [ ] Tighten RLS on `fingerprint_templates` before go-live
