# Supabase — one file setup

## Run this only

**`setup.sql`** — paste the **entire file** in [Supabase SQL Editor](https://supabase.com/dashboard/project/oqksrcruypdmsggorrge/sql/new) and click **Run**.

Safe to run again anytime. It will:

| Action | What happens |
|--------|----------------|
| **Keeps** | `staff`, `staff_logins`, `leave_records`, `attendance_punches`, `attendance_absences`, `profiles` |
| **Creates** | Any of the 9 tables that are missing |
| **Fixes rooms** | Only if old inventory detected (`ooty-r*`, `suite`, wrong counts) |
| **Updates** | Property names, RLS policies, photo columns, storage bucket, test-punch rules |

### Your 9 tables

1. `properties`
2. `staff`
3. `rooms`
4. `attendance_punches`
5. `attendance_absences`
6. `leave_records`
7. `housekeeping_tasks`
8. `profiles`
9. `staff_logins`

### After run — expect at bottom

```
ooty-skyview      → 24 rooms
kannur-beachview  →  8 rooms
```

### App env (`app/.env.local`)

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_...   # not the legacy JWT anon key
VITE_ALLOW_MANUAL_PUNCHES=false             # true only for local pre-biometric testing
```

Restart `npm run dev` after env changes.

### Security (run once)

Run **`migrations/012_fix_staff_login_rpc.sql`** if HK staff cannot log in or you see `404` on `/rpc/upsert_staff_login` (means login RPCs are missing).

Run **`migrations/011_security_hardening.sql`** for full hardening, or re-run **`setup.sql`** (includes the same hardening). This:

- Hashes HK staff passwords (bcrypt) — no longer readable via API
- Removes direct anon access to `staff_logins` (login via server RPC)
- Makes `hk-photos` bucket private (app uses signed URLs)
- Adds leave status constraints on upgraded databases

### Individual migration files

The `migrations/` folder is for history only. **You do not need to run them separately** if you use `setup.sql`.

`fix_rooms_only.sql` is optional — same room fix logic is already inside `setup.sql`.
