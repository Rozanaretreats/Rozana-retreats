-- Rozana Ops v1 — fresh start schema
-- Seeds only: two properties + room list (fixed structure).
-- Staff, leave, attendance, and HK tasks start EMPTY — entered in the app.

-- ── Properties ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS properties (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  short_name    TEXT NOT NULL,
  room_count    INTEGER NOT NULL,
  manager_name  TEXT NOT NULL
);

INSERT INTO properties (id, name, short_name, room_count, manager_name) VALUES
  ('ooty-skyview', 'Rozana Retreats Skyview', 'Ooty · Skyview', 24, 'Firoz'),
  ('kannur-beachview', 'Rozana Retreats Beachvibe', 'Kannur · Beachvibe', 8, 'TBD')
ON CONFLICT (id) DO NOTHING;

-- ── Staff (operational roster — not app login users) ────────────────────────
CREATE TABLE IF NOT EXISTS staff (
  id          TEXT PRIMARY KEY,
  property_id TEXT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  role        TEXT NOT NULL,
  phone       TEXT,
  active      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- No seed staff — add via Housekeeping → Team tab

-- ── Rooms ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS rooms (
  id          TEXT PRIMARY KEY,
  property_id TEXT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  number      TEXT NOT NULL,
  building    TEXT NOT NULL,
  room_type   TEXT NOT NULL CHECK (room_type IN ('standard', 'premium', 'classic', 'club', 'panorama', 'dorm'))
);

-- Ooty Skyview — 24 operational (17 classic · 4 club · 2 panorama · 1 dorm)
INSERT INTO rooms (id, property_id, number, building, room_type) VALUES
  ('ooty-cl-01', 'ooty-skyview', 'C01', 'Classic', 'classic'),
  ('ooty-cl-02', 'ooty-skyview', 'C02', 'Classic', 'classic'),
  ('ooty-cl-03', 'ooty-skyview', 'C03', 'Classic', 'classic'),
  ('ooty-cl-04', 'ooty-skyview', 'C04', 'Classic', 'classic'),
  ('ooty-cl-05', 'ooty-skyview', 'C05', 'Classic', 'classic'),
  ('ooty-cl-06', 'ooty-skyview', 'C06', 'Classic', 'classic'),
  ('ooty-cl-07', 'ooty-skyview', 'C07', 'Classic', 'classic'),
  ('ooty-cl-08', 'ooty-skyview', 'C08', 'Classic', 'classic'),
  ('ooty-cl-09', 'ooty-skyview', 'C09', 'Classic', 'classic'),
  ('ooty-cl-10', 'ooty-skyview', 'C10', 'Classic', 'classic'),
  ('ooty-cl-11', 'ooty-skyview', 'C11', 'Classic', 'classic'),
  ('ooty-cl-12', 'ooty-skyview', 'C12', 'Classic', 'classic'),
  ('ooty-cl-13', 'ooty-skyview', 'C13', 'Classic', 'classic'),
  ('ooty-cl-14', 'ooty-skyview', 'C14', 'Classic', 'classic'),
  ('ooty-cl-15', 'ooty-skyview', 'C15', 'Classic', 'classic'),
  ('ooty-cl-16', 'ooty-skyview', 'C16', 'Classic', 'classic'),
  ('ooty-cl-17', 'ooty-skyview', 'C17', 'Classic', 'classic'),
  ('ooty-cb-01', 'ooty-skyview', 'CL01', 'Club', 'club'),
  ('ooty-cb-02', 'ooty-skyview', 'CL02', 'Club', 'club'),
  ('ooty-cb-03', 'ooty-skyview', 'CL03', 'Club', 'club'),
  ('ooty-cb-04', 'ooty-skyview', 'CL04', 'Club', 'club'),
  ('ooty-pn-01', 'ooty-skyview', 'P01', 'Panorama', 'panorama'),
  ('ooty-pn-02', 'ooty-skyview', 'P02', 'Panorama', 'panorama'),
  ('ooty-dm-01', 'ooty-skyview', 'Dorm', 'Travellers', 'dorm')
ON CONFLICT (id) DO NOTHING;

-- Kannur Beachvibe — 5 standard · 3 premium
INSERT INTO rooms (id, property_id, number, building, room_type) VALUES
  ('knr-s1', 'kannur-beachview', 'S1', 'Standard', 'standard'),
  ('knr-s2', 'kannur-beachview', 'S2', 'Standard', 'standard'),
  ('knr-s3', 'kannur-beachview', 'S3', 'Standard', 'standard'),
  ('knr-s4', 'kannur-beachview', 'S4', 'Standard', 'standard'),
  ('knr-s5', 'kannur-beachview', 'S5', 'Standard', 'standard'),
  ('knr-p1', 'kannur-beachview', 'P1', 'Premium', 'premium'),
  ('knr-p2', 'kannur-beachview', 'P2', 'Premium', 'premium'),
  ('knr-p3', 'kannur-beachview', 'P3', 'Premium', 'premium')
ON CONFLICT (id) DO NOTHING;

-- ── Attendance (immutable — insert only from device/edge in production) ─────
CREATE TABLE IF NOT EXISTS attendance_punches (
  id          TEXT PRIMARY KEY,
  property_id TEXT NOT NULL REFERENCES properties(id),
  staff_id    TEXT NOT NULL REFERENCES staff(id),
  punch_type  TEXT NOT NULL CHECK (punch_type IN ('in', 'out')),
  punch_date  DATE NOT NULL,
  punch_time  TEXT NOT NULL,
  device_id   TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- No seed punches — populated from biometric device / edge function

-- ── Leave ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS leave_records (
  id          TEXT PRIMARY KEY,
  property_id TEXT NOT NULL REFERENCES properties(id),
  staff_id    TEXT NOT NULL REFERENCES staff(id),
  from_date   DATE NOT NULL,
  to_date     DATE NOT NULL,
  leave_type  TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (to_date >= from_date)
);

-- No seed leave — record via Leave module

-- ── Housekeeping tasks ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS housekeeping_tasks (
  id                 TEXT PRIMARY KEY,
  property_id        TEXT NOT NULL REFERENCES properties(id),
  room_id            TEXT NOT NULL REFERENCES rooms(id),
  assigned_staff_id  TEXT REFERENCES staff(id) ON DELETE SET NULL,
  status             TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'cleaning', 'done')),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (room_id)
);

-- No seed tasks — created when rooms are assigned in Housekeeping

-- ── App user profiles (for Supabase Auth — populate at go-live) ───────────────
CREATE TABLE IF NOT EXISTS profiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  role            TEXT NOT NULL CHECK (role IN ('owner', 'manager')),
  property_scope  TEXT NOT NULL CHECK (property_scope IN ('all', 'ooty-skyview', 'kannur-beachview')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── RLS (demo phase: anon access while login stays in-app demo) ───────────────
-- GO-LIVE: replace anon policies with auth.uid() + profiles-based rules.

ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_punches ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE housekeeping_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "demo_anon_properties" ON properties;
DROP POLICY IF EXISTS "demo_anon_staff_all" ON staff;
DROP POLICY IF EXISTS "demo_anon_rooms" ON rooms;
DROP POLICY IF EXISTS "demo_anon_punches_select" ON attendance_punches;
DROP POLICY IF EXISTS "demo_anon_leave_all" ON leave_records;
DROP POLICY IF EXISTS "demo_anon_tasks_all" ON housekeeping_tasks;
DROP POLICY IF EXISTS "demo_anon_profiles_select" ON profiles;

CREATE POLICY "demo_anon_properties" ON properties FOR SELECT TO anon USING (true);
CREATE POLICY "demo_anon_staff_all" ON staff FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "demo_anon_rooms" ON rooms FOR SELECT TO anon USING (true);
CREATE POLICY "demo_anon_punches_select" ON attendance_punches FOR SELECT TO anon USING (true);
DROP POLICY IF EXISTS "demo_anon_punches_insert_manual" ON attendance_punches;
DROP POLICY IF EXISTS "demo_anon_punches_delete_manual" ON attendance_punches;
CREATE POLICY "demo_anon_punches_insert_manual" ON attendance_punches
  FOR INSERT TO anon WITH CHECK (device_id = 'manual-test');
CREATE POLICY "demo_anon_punches_delete_manual" ON attendance_punches
  FOR DELETE TO anon USING (device_id = 'manual-test');
CREATE POLICY "demo_anon_leave_all" ON leave_records FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "demo_anon_tasks_all" ON housekeeping_tasks FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "demo_anon_profiles_select" ON profiles FOR SELECT TO anon USING (true);
