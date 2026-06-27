-- App logins for housekeeping staff (linked to roster staff.id)
-- Replace with Supabase Auth at go-live; passwords are plain text for demo phase only.

CREATE TABLE IF NOT EXISTS staff_logins (
  staff_id     TEXT PRIMARY KEY REFERENCES staff(id) ON DELETE CASCADE,
  email        TEXT NOT NULL UNIQUE,
  password     TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE staff_logins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "demo_anon_staff_logins_all" ON staff_logins;
CREATE POLICY "demo_anon_staff_logins_all" ON staff_logins
  FOR ALL TO anon USING (true) WITH CHECK (true);
