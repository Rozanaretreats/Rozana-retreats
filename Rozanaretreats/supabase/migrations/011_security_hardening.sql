-- 011 — Security hardening (backward compatible)
-- Run in Supabase SQL Editor after setup.sql / migrations 001–010.
-- Passwords: hashed server-side; anon can no longer read staff_logins directly.
-- HK photos: bucket made private; app uses signed URLs (legacy public URLs still work).

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ── Staff login RPCs (SECURITY DEFINER — passwords never exposed to client) ─

CREATE OR REPLACE FUNCTION verify_staff_login(p_email text, p_password text)
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
  SELECT * INTO v_row FROM staff_logins WHERE lower(trim(email)) = lower(trim(p_email));
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  IF v_row.password LIKE '$2%' THEN
    v_ok := (v_row.password = crypt(p_password, v_row.password));
  ELSE
    v_ok := (v_row.password = p_password);
    IF v_ok THEN
      UPDATE staff_logins
      SET password = crypt(p_password, gen_salt('bf'))
      WHERE staff_id = v_row.staff_id;
    END IF;
  END IF;

  IF NOT v_ok THEN
    RETURN NULL;
  END IF;

  SELECT * INTO v_staff FROM staff WHERE id = v_row.staff_id AND active = true;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  RETURN jsonb_build_object(
    'staff_id', v_row.staff_id,
    'email', v_row.email,
    'name', v_staff.name,
    'property_id', v_staff.property_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION upsert_staff_login(
  p_staff_id text,
  p_email text,
  p_password text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO staff_logins (staff_id, email, password)
  VALUES (p_staff_id, lower(trim(p_email)), crypt(p_password, gen_salt('bf')))
  ON CONFLICT (staff_id) DO UPDATE SET
    email = lower(trim(p_email)),
    password = crypt(p_password, gen_salt('bf'));
END;
$$;

CREATE OR REPLACE FUNCTION delete_staff_login(p_staff_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM staff_logins WHERE staff_id = p_staff_id;
END;
$$;

CREATE OR REPLACE FUNCTION is_staff_email_taken(p_email text, p_exclude_staff_id text DEFAULT NULL)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM staff_logins
    WHERE lower(trim(email)) = lower(trim(p_email))
      AND (p_exclude_staff_id IS NULL OR staff_id <> p_exclude_staff_id)
  );
$$;

CREATE OR REPLACE FUNCTION list_staff_login_emails()
RETURNS TABLE(staff_id text, email text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT staff_id, email FROM staff_logins ORDER BY email;
$$;

GRANT EXECUTE ON FUNCTION verify_staff_login(text, text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION upsert_staff_login(text, text, text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION delete_staff_login(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION is_staff_email_taken(text, text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION list_staff_login_emails() TO anon, authenticated, service_role;

-- Hash any remaining plaintext passwords
UPDATE staff_logins
SET password = crypt(password, gen_salt('bf'))
WHERE password NOT LIKE '$2a$%'
  AND password NOT LIKE '$2b$%'
  AND password NOT LIKE '$2y$%';

-- Remove direct anon access to credentials table
DROP POLICY IF EXISTS "demo_anon_staff_logins_all" ON staff_logins;

-- ── HK photos: private bucket (signed URLs via app) ─────────────────────────

UPDATE storage.buckets SET public = false WHERE id = 'hk-photos';

-- ── Leave constraints (upgrade path for DBs created before 010) ─────────────

ALTER TABLE leave_records DROP CONSTRAINT IF EXISTS leave_records_status_check;
ALTER TABLE leave_records ADD CONSTRAINT leave_records_status_check
  CHECK (status IN ('pending', 'approved', 'rejected'));

ALTER TABLE leave_records DROP CONSTRAINT IF EXISTS leave_records_requested_by_check;
ALTER TABLE leave_records ADD CONSTRAINT leave_records_requested_by_check
  CHECK (requested_by IN ('staff', 'manager', 'system'));

NOTIFY pgrst, 'reload schema';
