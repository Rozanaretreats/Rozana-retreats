-- Shift times per property + manual absence marks (Firoz / Ruheed)

ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS shift_start TIME NOT NULL DEFAULT '10:00',
  ADD COLUMN IF NOT EXISTS shift_end TIME NOT NULL DEFAULT '17:00';

UPDATE properties
SET shift_start = '10:00', shift_end = '17:00'
WHERE shift_start IS NULL OR shift_end IS NULL;

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

ALTER TABLE attendance_absences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "demo_anon_absences_all" ON attendance_absences;
CREATE POLICY "demo_anon_absences_all" ON attendance_absences
  FOR ALL TO anon USING (true) WITH CHECK (true);
