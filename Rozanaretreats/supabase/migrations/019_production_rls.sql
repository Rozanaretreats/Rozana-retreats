-- 019 — Production RLS (replaces demo_anon_* / permissive kiosk policies)
-- Requires Supabase Auth JWT on all Ops app requests.
-- Run after creating owner/manager auth users (scripts/seed-management-auth.mjs).

-- ── Helpers (read JWT app_metadata or profiles) ─────────────────────────────

CREATE OR REPLACE FUNCTION rozana_user_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    NULLIF(auth.jwt() -> 'app_metadata' ->> 'rozana_role', ''),
    CASE (SELECT p.role FROM profiles p WHERE p.id = auth.uid())
      WHEN 'manager' THEN 'operations-manager'
      WHEN 'owner' THEN 'owner'
      ELSE NULL
    END
  );
$$;

CREATE OR REPLACE FUNCTION rozana_property_scope()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    NULLIF(auth.jwt() -> 'app_metadata' ->> 'rozana_property_id', ''),
    (SELECT p.property_scope::text FROM profiles p WHERE p.id = auth.uid())
  );
$$;

CREATE OR REPLACE FUNCTION rozana_staff_id()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NULLIF(auth.jwt() -> 'app_metadata' ->> 'rozana_staff_id', '');
$$;

CREATE OR REPLACE FUNCTION rozana_is_owner()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT rozana_user_role() = 'owner';
$$;

CREATE OR REPLACE FUNCTION rozana_is_manager()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT rozana_user_role() = 'operations-manager';
$$;

CREATE OR REPLACE FUNCTION rozana_is_hk_staff()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT rozana_user_role() = 'housekeeping-staff';
$$;

CREATE OR REPLACE FUNCTION rozana_can_access_property(pid text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid() IS NOT NULL
    AND (
      (rozana_is_owner() AND rozana_property_scope() = 'all')
      OR rozana_property_scope() = pid
    );
$$;

CREATE OR REPLACE FUNCTION rozana_can_manage()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT rozana_is_owner() OR rozana_is_manager();
$$;

-- ── Drop demo / permissive policies ─────────────────────────────────────────

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

DROP POLICY IF EXISTS "kiosk_anon_templates_select" ON fingerprint_templates;
DROP POLICY IF EXISTS "kiosk_anon_templates_insert" ON fingerprint_templates;
DROP POLICY IF EXISTS "kiosk_anon_templates_update" ON fingerprint_templates;
DROP POLICY IF EXISTS "kiosk_anon_templates_delete" ON fingerprint_templates;
DROP POLICY IF EXISTS "kiosk_anon_punches_insert" ON attendance_punches;

DROP POLICY IF EXISTS "anon_hk_photos_insert" ON storage.objects;
DROP POLICY IF EXISTS "anon_hk_photos_select" ON storage.objects;

-- ── properties ──────────────────────────────────────────────────────────────

CREATE POLICY "auth_properties_select" ON properties
  FOR SELECT TO authenticated
  USING (rozana_can_access_property(id));

-- ── staff ───────────────────────────────────────────────────────────────────

CREATE POLICY "auth_staff_select" ON staff
  FOR SELECT TO authenticated
  USING (rozana_can_access_property(property_id));

CREATE POLICY "auth_staff_insert" ON staff
  FOR INSERT TO authenticated
  WITH CHECK (rozana_can_manage() AND rozana_can_access_property(property_id));

CREATE POLICY "auth_staff_update" ON staff
  FOR UPDATE TO authenticated
  USING (rozana_can_manage() AND rozana_can_access_property(property_id))
  WITH CHECK (rozana_can_manage() AND rozana_can_access_property(property_id));

-- ── rooms ───────────────────────────────────────────────────────────────────

CREATE POLICY "auth_rooms_select" ON rooms
  FOR SELECT TO authenticated
  USING (rozana_can_access_property(property_id));

-- ── attendance_punches (immutable — no UPDATE/DELETE for clients) ───────────

CREATE POLICY "auth_punches_select" ON attendance_punches
  FOR SELECT TO authenticated
  USING (rozana_can_access_property(property_id));

CREATE POLICY "auth_punches_insert_manual" ON attendance_punches
  FOR INSERT TO authenticated
  WITH CHECK (
    rozana_can_manage()
    AND rozana_can_access_property(property_id)
    AND device_id = 'manual-test'
    AND source IN ('manual', 'kiosk', 'edge', 'import')
  );

-- ── attendance_absences ─────────────────────────────────────────────────────

CREATE POLICY "auth_absences_all" ON attendance_absences
  FOR ALL TO authenticated
  USING (rozana_can_manage() AND rozana_can_access_property(property_id))
  WITH CHECK (rozana_can_manage() AND rozana_can_access_property(property_id));

-- ── leave_records ───────────────────────────────────────────────────────────

CREATE POLICY "auth_leave_select_manager" ON leave_records
  FOR SELECT TO authenticated
  USING (rozana_can_manage() AND rozana_can_access_property(property_id));

CREATE POLICY "auth_leave_select_own" ON leave_records
  FOR SELECT TO authenticated
  USING (rozana_is_hk_staff() AND staff_id = rozana_staff_id());

CREATE POLICY "auth_leave_write_manager" ON leave_records
  FOR INSERT TO authenticated
  WITH CHECK (rozana_can_manage() AND rozana_can_access_property(property_id));

CREATE POLICY "auth_leave_update_manager" ON leave_records
  FOR UPDATE TO authenticated
  USING (rozana_can_manage() AND rozana_can_access_property(property_id))
  WITH CHECK (rozana_can_manage() AND rozana_can_access_property(property_id));

CREATE POLICY "auth_leave_delete_manager" ON leave_records
  FOR DELETE TO authenticated
  USING (rozana_can_manage() AND rozana_can_access_property(property_id));

-- ── housekeeping_tasks ──────────────────────────────────────────────────────

CREATE POLICY "auth_hk_select_manager" ON housekeeping_tasks
  FOR SELECT TO authenticated
  USING (rozana_can_manage() AND rozana_can_access_property(property_id));

CREATE POLICY "auth_hk_select_own" ON housekeeping_tasks
  FOR SELECT TO authenticated
  USING (
    rozana_is_hk_staff()
    AND assigned_staff_id = rozana_staff_id()
    AND rozana_can_access_property(property_id)
  );

CREATE POLICY "auth_hk_insert_manager" ON housekeeping_tasks
  FOR INSERT TO authenticated
  WITH CHECK (rozana_can_manage() AND rozana_can_access_property(property_id));

CREATE POLICY "auth_hk_update_manager" ON housekeeping_tasks
  FOR UPDATE TO authenticated
  USING (rozana_can_manage() AND rozana_can_access_property(property_id))
  WITH CHECK (rozana_can_manage() AND rozana_can_access_property(property_id));

CREATE POLICY "auth_hk_update_own" ON housekeeping_tasks
  FOR UPDATE TO authenticated
  USING (
    rozana_is_hk_staff()
    AND assigned_staff_id = rozana_staff_id()
    AND rozana_can_access_property(property_id)
  )
  WITH CHECK (
    rozana_is_hk_staff()
    AND assigned_staff_id = rozana_staff_id()
    AND rozana_can_access_property(property_id)
  );

-- ── profiles ────────────────────────────────────────────────────────────────

CREATE POLICY "auth_profiles_select_own" ON profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid());

-- ── staff_logins (no direct client access) ──────────────────────────────────

-- RLS enabled, no policies = deny all for authenticated/anon (service role bypasses).

-- ── fingerprint_templates (service role / kiosk edge only) ──────────────────

-- No client policies. Kiosk will use service-role edge function when biometrics go live.

-- ── HK photo storage ────────────────────────────────────────────────────────

CREATE POLICY "auth_hk_photos_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'hk-photos'
    AND rozana_can_access_property((storage.foldername(name))[1])
  );

CREATE POLICY "auth_hk_photos_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'hk-photos'
    AND rozana_can_access_property((storage.foldername(name))[1])
  );

CREATE POLICY "auth_hk_photos_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'hk-photos'
    AND rozana_can_access_property((storage.foldername(name))[1])
  );
