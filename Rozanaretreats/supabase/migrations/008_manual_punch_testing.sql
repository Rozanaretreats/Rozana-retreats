-- Pre-biometric testing: managers can insert/delete manual punches from the app.
-- Rows use device_id = 'manual-test'. Real devices should use their own device_id.
-- GO-LIVE: remove VITE_ALLOW_MANUAL_PUNCHES from the app; biometrics write via service role / edge.

DROP POLICY IF EXISTS "demo_anon_punches_insert_manual" ON attendance_punches;
DROP POLICY IF EXISTS "demo_anon_punches_delete_manual" ON attendance_punches;

CREATE POLICY "demo_anon_punches_insert_manual" ON attendance_punches
  FOR INSERT TO anon
  WITH CHECK (device_id = 'manual-test');

CREATE POLICY "demo_anon_punches_delete_manual" ON attendance_punches
  FOR DELETE TO anon
  USING (device_id = 'manual-test');
