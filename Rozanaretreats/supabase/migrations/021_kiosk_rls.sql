-- 021 — Kiosk device registry + scoped anon RLS (replaces permissive pre-019 kiosk policies)
-- Kiosk tablets use the publishable key; punches/templates are allowed only for
-- registered device_id + property_id pairs in kiosk_devices.

-- ── Device registry ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS kiosk_devices (
  device_id   TEXT PRIMARY KEY,
  property_id TEXT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  label       TEXT,
  active      BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_kiosk_devices_property
  ON kiosk_devices(property_id)
  WHERE active;

ALTER TABLE kiosk_devices ENABLE ROW LEVEL SECURITY;
-- No client policies — register devices via SQL / service role / future admin UI.

-- ── Helpers ───────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION rozana_kiosk_staff_property(sid text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT property_id FROM staff WHERE id = sid LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION rozana_property_has_active_kiosk(pid text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM kiosk_devices kd
    WHERE kd.property_id = pid AND kd.active
  );
$$;

CREATE OR REPLACE FUNCTION rozana_kiosk_device_active(did text, pid text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM kiosk_devices kd
    WHERE kd.device_id = did
      AND kd.property_id = pid
      AND kd.active
  );
$$;

-- ── properties / staff (read-only for kiosk cache refresh) ──────────────────────

CREATE POLICY "kiosk_anon_properties_select" ON properties
  FOR SELECT TO anon
  USING (rozana_property_has_active_kiosk(id));

CREATE POLICY "kiosk_anon_staff_select" ON staff
  FOR SELECT TO anon
  USING (rozana_property_has_active_kiosk(property_id));

-- ── attendance_punches ────────────────────────────────────────────────────────

CREATE POLICY "kiosk_anon_punches_select" ON attendance_punches
  FOR SELECT TO anon
  USING (rozana_property_has_active_kiosk(property_id));

CREATE POLICY "kiosk_anon_punches_insert" ON attendance_punches
  FOR INSERT TO anon
  WITH CHECK (
    source = 'kiosk'
    AND rozana_kiosk_device_active(device_id, property_id)
  );

-- ── fingerprint_templates ─────────────────────────────────────────────────────

CREATE POLICY "kiosk_anon_templates_select" ON fingerprint_templates
  FOR SELECT TO anon
  USING (
    rozana_property_has_active_kiosk(rozana_kiosk_staff_property(staff_id))
  );

CREATE POLICY "kiosk_anon_templates_insert" ON fingerprint_templates
  FOR INSERT TO anon
  WITH CHECK (
    rozana_property_has_active_kiosk(rozana_kiosk_staff_property(staff_id))
    AND rozana_kiosk_device_active(
      device_id,
      rozana_kiosk_staff_property(staff_id)
    )
  );

CREATE POLICY "kiosk_anon_templates_update" ON fingerprint_templates
  FOR UPDATE TO anon
  USING (
    rozana_property_has_active_kiosk(rozana_kiosk_staff_property(staff_id))
  )
  WITH CHECK (
    rozana_property_has_active_kiosk(rozana_kiosk_staff_property(staff_id))
    AND rozana_kiosk_device_active(
      device_id,
      rozana_kiosk_staff_property(staff_id)
    )
  );

CREATE POLICY "kiosk_anon_templates_delete" ON fingerprint_templates
  FOR DELETE TO anon
  USING (
    rozana_property_has_active_kiosk(rozana_kiosk_staff_property(staff_id))
  );

-- ── Dev laptop kiosk (matches rozana_attendance_kiosk/.env DEVICE_ID) ─────────

INSERT INTO kiosk_devices (device_id, property_id, label, active)
VALUES ('laptop-dev-01', 'ooty-skyview', 'Dev laptop kiosk', true)
ON CONFLICT (device_id) DO UPDATE
  SET property_id = EXCLUDED.property_id,
      label = EXCLUDED.label,
      active = true;
