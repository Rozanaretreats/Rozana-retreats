-- =============================================================================
-- Rozana Ops — COMPLETE SCHEMA (single file, all migrations through 014)
-- =============================================================================
-- Safe to run anytime on an existing project. Will:
--   • Create any missing tables (all 9)
--   • Update properties + room-type rules to current version
--   • Fix room list ONLY if old/wrong inventory detected (ooty-r*, suite, etc.)
--   • Staff login RPCs (PostgREST-friendly param names)
--   • Hashed passwords, HK photo bucket (private), cleaning checklist column
--   • Leave approval constraints (staff requests can be approved)
--
-- Run in Supabase → SQL Editor → paste entire file → Run
-- =============================================================================

-- ── 1. Properties ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS properties (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  short_name    TEXT NOT NULL,
  room_count    INTEGER NOT NULL,
  manager_name  TEXT NOT NULL
);

ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS shift_start TIME NOT NULL DEFAULT '10:00',
  ADD COLUMN IF NOT EXISTS shift_end TIME NOT NULL DEFAULT '17:00';

INSERT INTO properties (id, name, short_name, room_count, manager_name) VALUES
  ('ooty-skyview', 'Rozana Retreats Skyview', 'Ooty · Skyview', 24, 'Firoz'),
  ('kannur-beachview', 'Rozana Retreats Beachvibe', 'Kannur · Beachvibe', 8, 'TBD')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  short_name = EXCLUDED.short_name,
  room_count = EXCLUDED.room_count,
  manager_name = EXCLUDED.manager_name;

UPDATE properties
SET shift_start = COALESCE(shift_start, '10:00'::time),
    shift_end = COALESCE(shift_end, '17:00'::time);

-- ── 2. Staff ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS staff (
  id          TEXT PRIMARY KEY,
  property_id TEXT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  role        TEXT NOT NULL,
  phone       TEXT,
  active      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 3. Rooms (constraint applied in step 4) ─────────────────────────────────

CREATE TABLE IF NOT EXISTS rooms (
  id          TEXT PRIMARY KEY,
  property_id TEXT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  number      TEXT NOT NULL,
  building    TEXT NOT NULL,
  room_type   TEXT NOT NULL
);

-- ── 4. Room inventory sync (only when wrong / legacy) ───────────────────────
-- Ooty: 24 operational (17 classic · 4 club · 2 panorama · 1 dorm)
-- Kannur: 8 (5 standard · 3 premium)

DO $$
DECLARE
  ooty_count INTEGER;
  knr_count INTEGER;
  need_sync BOOLEAN;
BEGIN
  SELECT count(*) INTO ooty_count FROM rooms WHERE property_id = 'ooty-skyview';
  SELECT count(*) INTO knr_count FROM rooms WHERE property_id = 'kannur-beachview';

  need_sync := (
    ooty_count <> 24
    OR knr_count <> 8
    OR EXISTS (
      SELECT 1 FROM rooms
      WHERE property_id IN ('ooty-skyview', 'kannur-beachview')
        AND (
          id LIKE 'ooty-r%'
          OR id = 'knr-p4'
          OR room_type = 'suite'
          OR room_type NOT IN ('standard', 'premium', 'classic', 'club', 'panorama', 'dorm')
        )
    )
  );

  IF need_sync THEN
    DELETE FROM housekeeping_tasks
    WHERE property_id IN ('ooty-skyview', 'kannur-beachview');

    DELETE FROM rooms
    WHERE property_id IN ('ooty-skyview', 'kannur-beachview');
  END IF;
END $$;

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.rooms'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%room_type%'
  LOOP
    EXECUTE format('ALTER TABLE rooms DROP CONSTRAINT %I', r.conname);
  END LOOP;
END $$;

ALTER TABLE rooms DROP CONSTRAINT IF EXISTS rooms_room_type_check;
ALTER TABLE rooms ADD CONSTRAINT rooms_room_type_check
  CHECK (room_type IN ('standard', 'premium', 'classic', 'club', 'panorama', 'dorm'));

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
  ('ooty-dm-01', 'ooty-skyview', 'Dorm', 'Travellers', 'dorm'),
  ('knr-s1', 'kannur-beachview', 'S1', 'Standard', 'standard'),
  ('knr-s2', 'kannur-beachview', 'S2', 'Standard', 'standard'),
  ('knr-s3', 'kannur-beachview', 'S3', 'Standard', 'standard'),
  ('knr-s4', 'kannur-beachview', 'S4', 'Standard', 'standard'),
  ('knr-s5', 'kannur-beachview', 'S5', 'Standard', 'standard'),
  ('knr-p1', 'kannur-beachview', 'P1', 'Premium', 'premium'),
  ('knr-p2', 'kannur-beachview', 'P2', 'Premium', 'premium'),
  ('knr-p3', 'kannur-beachview', 'P3', 'Premium', 'premium')
ON CONFLICT (id) DO UPDATE SET
  property_id = EXCLUDED.property_id,
  number = EXCLUDED.number,
  building = EXCLUDED.building,
  room_type = EXCLUDED.room_type;

-- ── 5. Attendance punches ───────────────────────────────────────────────────

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

-- ── 6. Attendance absences (manager marks no-show) ───────────────────────────

CREATE TABLE IF NOT EXISTS attendance_absences (
  id            TEXT PRIMARY KEY,
  property_id   TEXT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  staff_id      TEXT NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  absence_date  DATE NOT NULL,
  reason        TEXT NOT NULL,
  marked_by     TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (staff_id, absence_date)
);

-- ── 7. Leave ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS leave_records (
  id           TEXT PRIMARY KEY,
  property_id  TEXT NOT NULL REFERENCES properties(id),
  staff_id     TEXT NOT NULL REFERENCES staff(id),
  from_date    DATE NOT NULL,
  to_date      DATE NOT NULL,
  leave_type   TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'rejected')),
  requested_by TEXT NOT NULL DEFAULT 'manager' CHECK (requested_by IN ('staff', 'manager', 'system')),
  staff_note   TEXT,
  reviewed_by  TEXT,
  reviewed_at  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (to_date >= from_date)
);

ALTER TABLE leave_records
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'approved',
  ADD COLUMN IF NOT EXISTS requested_by TEXT NOT NULL DEFAULT 'manager',
  ADD COLUMN IF NOT EXISTS staff_note TEXT,
  ADD COLUMN IF NOT EXISTS reviewed_by TEXT,
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;

UPDATE leave_records SET status = 'approved' WHERE status IS NULL;
UPDATE leave_records SET requested_by = 'manager' WHERE requested_by IS NULL;

ALTER TABLE leave_records DROP CONSTRAINT IF EXISTS leave_records_status_check;
ALTER TABLE leave_records ADD CONSTRAINT leave_records_status_check
  CHECK (status IN ('pending', 'approved', 'rejected'));

ALTER TABLE leave_records DROP CONSTRAINT IF EXISTS leave_records_requested_by_check;
ALTER TABLE leave_records ADD CONSTRAINT leave_records_requested_by_check
  CHECK (requested_by IN ('staff', 'manager', 'system'));

-- ── 8. Housekeeping tasks ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS housekeeping_tasks (
  id                 TEXT PRIMARY KEY,
  property_id        TEXT NOT NULL REFERENCES properties(id),
  room_id            TEXT NOT NULL REFERENCES rooms(id),
  assigned_staff_id  TEXT REFERENCES staff(id) ON DELETE SET NULL,
  status             TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'cleaning', 'done')),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (room_id)
);

ALTER TABLE housekeeping_tasks
  ADD COLUMN IF NOT EXISTS photo_before_url TEXT,
  ADD COLUMN IF NOT EXISTS photo_after_url TEXT,
  ADD COLUMN IF NOT EXISTS cleaning_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cleaning_finished_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cleaning_checklist JSONB,
  ADD COLUMN IF NOT EXISTS manager_verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS manager_verified_by TEXT;

-- ── 9. Manager profiles (Supabase Auth at go-live) ──────────────────────────

CREATE TABLE IF NOT EXISTS profiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  role            TEXT NOT NULL CHECK (role IN ('owner', 'manager')),
  property_scope  TEXT NOT NULL CHECK (property_scope IN ('all', 'ooty-skyview', 'kannur-beachview')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 10. HK staff app logins ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS staff_logins (
  staff_id     TEXT PRIMARY KEY REFERENCES staff(id) ON DELETE CASCADE,
  email        TEXT NOT NULL UNIQUE,
  password     TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 11. Storage bucket for HK photos (private — app uses signed URLs) ───────

INSERT INTO storage.buckets (id, name, public)
VALUES ('hk-photos', 'hk-photos', false)
ON CONFLICT (id) DO UPDATE SET public = false;

-- ── 12. Row level security (demo phase — anon access) ───────────────────────

ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_punches ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_absences ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE housekeeping_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_logins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "demo_anon_properties" ON properties;
DROP POLICY IF EXISTS "demo_anon_staff_all" ON staff;
DROP POLICY IF EXISTS "demo_anon_rooms" ON rooms;
DROP POLICY IF EXISTS "demo_anon_punches_select" ON attendance_punches;
DROP POLICY IF EXISTS "demo_anon_punches_insert_manual" ON attendance_punches;
DROP POLICY IF EXISTS "demo_anon_punches_delete_manual" ON attendance_punches;
DROP POLICY IF EXISTS "demo_anon_absences_all" ON attendance_absences;
DROP POLICY IF EXISTS "demo_anon_leave_all" ON leave_records;
DROP POLICY IF EXISTS "demo_anon_tasks_all" ON housekeeping_tasks;
DROP POLICY IF EXISTS "demo_anon_profiles_select" ON profiles;
DROP POLICY IF EXISTS "demo_anon_staff_logins_all" ON staff_logins;
DROP POLICY IF EXISTS "anon_hk_photos_insert" ON storage.objects;
DROP POLICY IF EXISTS "anon_hk_photos_select" ON storage.objects;

CREATE POLICY "demo_anon_properties" ON properties
  FOR SELECT TO anon USING (true);

CREATE POLICY "demo_anon_staff_all" ON staff
  FOR ALL TO anon USING (true) WITH CHECK (true);

CREATE POLICY "demo_anon_rooms" ON rooms
  FOR SELECT TO anon USING (true);

CREATE POLICY "demo_anon_punches_select" ON attendance_punches
  FOR SELECT TO anon USING (true);

CREATE POLICY "demo_anon_punches_insert_manual" ON attendance_punches
  FOR INSERT TO anon
  WITH CHECK (device_id = 'manual-test');

CREATE POLICY "demo_anon_punches_delete_manual" ON attendance_punches
  FOR DELETE TO anon
  USING (device_id = 'manual-test');

CREATE POLICY "demo_anon_absences_all" ON attendance_absences
  FOR ALL TO anon USING (true) WITH CHECK (true);

CREATE POLICY "demo_anon_leave_all" ON leave_records
  FOR ALL TO anon USING (true) WITH CHECK (true);

CREATE POLICY "demo_anon_tasks_all" ON housekeeping_tasks
  FOR ALL TO anon USING (true) WITH CHECK (true);

CREATE POLICY "demo_anon_profiles_select" ON profiles
  FOR SELECT TO anon USING (true);

-- Fallback if RPC cache is stale; primary path is SECURITY DEFINER RPCs below
CREATE POLICY "demo_anon_staff_logins_all" ON staff_logins
  FOR ALL TO anon USING (true) WITH CHECK (true);

CREATE POLICY "anon_hk_photos_insert" ON storage.objects
  FOR INSERT TO anon
  WITH CHECK (bucket_id = 'hk-photos');

CREATE POLICY "anon_hk_photos_select" ON storage.objects
  FOR SELECT TO anon
  USING (bucket_id = 'hk-photos');

-- ── 13. Staff login RPCs (bcrypt, PostgREST-friendly param names) ───────────

CREATE EXTENSION IF NOT EXISTS pgcrypto;

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'verify_staff_login',
        'upsert_staff_login',
        'delete_staff_login',
        'is_staff_email_taken',
        'list_staff_login_emails'
      )
  LOOP
    EXECUTE 'DROP FUNCTION IF EXISTS ' || r.sig || ' CASCADE';
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION verify_staff_login(login_email text, login_password text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row staff_logins%ROWTYPE;
  v_staff staff%ROWTYPE;
  v_ok boolean := false;
BEGIN
  SELECT * INTO v_row FROM staff_logins WHERE lower(trim(email)) = lower(trim(login_email));
  IF NOT FOUND THEN RETURN NULL; END IF;

  IF v_row.password LIKE '$2%' THEN
    v_ok := (v_row.password = crypt(login_password, v_row.password));
  ELSE
    v_ok := (v_row.password = login_password);
    IF v_ok THEN
      UPDATE staff_logins
      SET password = crypt(login_password, gen_salt('bf'))
      WHERE staff_id = v_row.staff_id;
    END IF;
  END IF;

  IF NOT v_ok THEN RETURN NULL; END IF;

  SELECT * INTO v_staff FROM staff WHERE id = v_row.staff_id AND active = true;
  IF NOT FOUND THEN RETURN NULL; END IF;

  RETURN jsonb_build_object(
    'staff_id', v_row.staff_id,
    'email', v_row.email,
    'name', v_staff.name,
    'property_id', v_staff.property_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION upsert_staff_login(
  staff_id text,
  email text,
  password text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO staff_logins (staff_id, email, password)
  VALUES (
    upsert_staff_login.staff_id,
    lower(trim(upsert_staff_login.email)),
    crypt(upsert_staff_login.password, gen_salt('bf'))
  )
  ON CONFLICT (staff_id) DO UPDATE SET
    email = lower(trim(upsert_staff_login.email)),
    password = crypt(upsert_staff_login.password, gen_salt('bf'));
END;
$$;

CREATE OR REPLACE FUNCTION delete_staff_login(staff_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM staff_logins WHERE staff_id = delete_staff_login.staff_id;
END;
$$;

CREATE OR REPLACE FUNCTION is_staff_email_taken(
  check_email text,
  exclude_staff_id text DEFAULT NULL
)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM staff_logins
    WHERE lower(trim(email)) = lower(trim(check_email))
      AND (exclude_staff_id IS NULL OR staff_logins.staff_id <> exclude_staff_id)
  );
$$;

CREATE OR REPLACE FUNCTION list_staff_login_emails()
RETURNS TABLE(staff_id text, email text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT l.staff_id, l.email FROM staff_logins l ORDER BY l.email;
$$;

GRANT EXECUTE ON FUNCTION verify_staff_login(text, text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION upsert_staff_login(text, text, text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION delete_staff_login(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION is_staff_email_taken(text, text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION list_staff_login_emails() TO anon, authenticated, service_role;

UPDATE staff_logins
SET password = crypt(password, gen_salt('bf'))
WHERE password NOT LIKE '$2a$%'
  AND password NOT LIKE '$2b$%'
  AND password NOT LIKE '$2y$%';

NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';

-- ── 14. Health check (results shown at bottom of SQL Editor) ────────────────

SELECT 'tables' AS check_type, tablename AS name, 'ok' AS status
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'properties', 'staff', 'rooms', 'attendance_punches', 'attendance_absences',
    'leave_records', 'housekeeping_tasks', 'profiles', 'staff_logins'
  )
ORDER BY tablename;

SELECT 'staff_login_rpc' AS check_type, proname AS name, 'ok' AS status
FROM pg_proc
WHERE proname IN (
  'verify_staff_login',
  'upsert_staff_login',
  'delete_staff_login',
  'is_staff_email_taken',
  'list_staff_login_emails'
)
ORDER BY proname;

SELECT property_id, count(*) AS room_count
FROM rooms
WHERE property_id IN ('ooty-skyview', 'kannur-beachview')
GROUP BY property_id
ORDER BY property_id;
