# Rozana Retreats — Rozana Ops

**Owner:** Ruheed Mahamood · **Operations manager:** Firoz · **Properties:** Ooty Skyview (24 rooms) · Kannur Beachvibe (8 rooms)

Operations app scoped strictly to the **flow inventory** (`14-FLOW-INVENTORY-FROM-BRIEF.md`): attendance, leave, housekeeping (with before/after photo proof), and owner reports.

**Roles (v1 login):** Owner · Operations manager · Housekeeping staff portal (login at go-live).

---

## Quick start

```bash
npm install
npm run dev
```

| App | URL | Users |
|-----|-----|-------|
| Rozana Ops | http://localhost:5173 | Ruheed (owner) · Firoz (operations manager) |

**Demo logins:** `ruheed@rozana.com` / `ruheed` · `firoz@rozana.com` / `firoz`

---

## Supabase setup (required)

1. Open your project → **SQL Editor**
2. Paste and run the full contents of **`supabase/setup.sql`**
3. Set `app/.env.local`:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

This creates tables, properties, rooms, shift columns, absence tracking, and the `hk-photos` storage bucket. **No staff or tasks are seeded** — add HK team under **Housekeeping → Team** in the app.

If you already ran older migrations, run only what you are missing — or run **`007_room_inventory_v2.sql`** to refresh room lists on an existing database.

| Module | Flows | Location |
|--------|-------|----------|
| Attendance | AT01–AT05 | `app/src/pages/AttendancePage.tsx` |
| Leave | LV01–LV03 | `app/src/pages/LeavePage.tsx` |
| Housekeeping | HK01–HK03 | `app/src/pages/HousekeepingPage.tsx` |
| Reports (owner) | RP01–RP04 | `app/src/pages/ReportsPage.tsx` |

**Out of scope (not in flow inventory):** front desk cash, owner web dashboard, bookings/OTA, integrations.

---

## Modules (in scope)

## Docs

| Doc | Purpose |
|-----|---------|
| [BUILD-BRIEF.md](./BUILD-BRIEF.md) | Module scope |
| [14-FLOW-INVENTORY-FROM-BRIEF.md](./14-FLOW-INVENTORY-FROM-BRIEF.md) | Flow IDs (source of truth) |
| [09-ROLES-AND-PERMISSIONS.md](./09-ROLES-AND-PERMISSIONS.md) | Roles & access |
| [docs/FLOW-COVERAGE.md](./docs/FLOW-COVERAGE.md) | App ↔ flow mapping |
