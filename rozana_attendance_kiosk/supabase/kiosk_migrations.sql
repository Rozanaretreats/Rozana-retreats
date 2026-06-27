-- Kiosk-specific Supabase extensions for Rozana attendance.
--
-- REVIEW BEFORE PRODUCTION:
-- - Biometric template storage is sensitive; tighten RLS and restrict anon access.
-- - Existing staff uses column name (not full_name) — kiosk maps to StaffMember.fullName.
-- - Existing attendance_punches uses punch_date + punch_time; kiosk adds source/match_score/synced.
-- ── Extend attendance_punches for kiosk metadata ───────────────────────────
ALTER TABLE attendance_punches
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'kiosk'
    CHECK (source IN ('kiosk', 'manual', 'edge', 'import')),
  ADD COLUMN IF NOT EXISTS match_score REAL,
  ADD COLUMN IF NOT EXISTS synced BOOLEAN NOT NULL DEFAULT TRUE;

COMMENT ON COLUMN attendance_punches.source IS 'Punch origin; kiosk tablets write source=kiosk';
COMMENT ON COLUMN attendance_punches.match_score IS 'Fingerprint 1:N match score (0–100); null for manual punches';
COMMENT ON COLUMN attendance_punches.synced IS 'False when punch was queued offline on device';

-- Backfill existing rows
UPDATE attendance_punches
SET synced = TRUE
WHERE synced IS DISTINCT FROM TRUE;

-- ── Fingerprint templates (NEW) ────────────────────────────────────────────
-- SECURITY: template_data is raw biometric bytes (base64). Never log client-side.
-- Restrict SELECT/INSERT to kiosk service role or property-scoped policies before go-live.
CREATE TABLE IF NOT EXISTS fingerprint_templates (
  id            TEXT PRIMARY KEY,
  staff_id      TEXT NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  template_data TEXT NOT NULL,
  finger_index  SMALLINT NOT NULL DEFAULT 0 CHECK (finger_index >= 0 AND finger_index <= 9),
  enrolled_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  device_id     TEXT NOT NULL,
  UNIQUE (staff_id, finger_index)
);

CREATE INDEX IF NOT EXISTS idx_fingerprint_templates_staff
  ON fingerprint_templates(staff_id);

ALTER TABLE fingerprint_templates ENABLE ROW LEVEL SECURITY;

-- Demo / dev: permissive anon policies (REPLACE before production)
DROP POLICY IF EXISTS "kiosk_anon_templates_select" ON fingerprint_templates;
DROP POLICY IF EXISTS "kiosk_anon_templates_insert" ON fingerprint_templates;
DROP POLICY IF EXISTS "kiosk_anon_templates_update" ON fingerprint_templates;
DROP POLICY IF EXISTS "kiosk_anon_templates_delete" ON fingerprint_templates;

CREATE POLICY "kiosk_anon_templates_select" ON fingerprint_templates
  FOR SELECT TO anon USING (true);

CREATE POLICY "kiosk_anon_templates_insert" ON fingerprint_templates
  FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "kiosk_anon_templates_update" ON fingerprint_templates
  FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE POLICY "kiosk_anon_templates_delete" ON fingerprint_templates
  FOR DELETE TO anon USING (true);

-- Allow kiosk to insert punches (existing table may only allow SELECT for anon)
DROP POLICY IF EXISTS "kiosk_anon_punches_insert" ON attendance_punches;
CREATE POLICY "kiosk_anon_punches_insert" ON attendance_punches
  FOR INSERT TO anon WITH CHECK (true);

-- ASSUMPTION: properties table already has shift_start, shift_end (migration 002).
-- ASSUMPTION: staff.id is TEXT, staff.active is BOOLEAN, staff.property_id references properties.

-- Enable Supabase Realtime for live kiosk → Ops sync (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'attendance_punches'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE attendance_punches;
  END IF;
END $$;
