-- 012 — Fix HK staff login + team add (run entire file in Supabase SQL Editor)
-- Safe to re-run. Restores table access AND creates login RPCs.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- Drop old signatures (p_ prefix) if present
DROP FUNCTION IF EXISTS verify_staff_login(text, text);
DROP FUNCTION IF EXISTS upsert_staff_login(text, text, text);
DROP FUNCTION IF EXISTS delete_staff_login(text);
DROP FUNCTION IF EXISTS is_staff_email_taken(text, text);
DROP FUNCTION IF EXISTS is_staff_email_taken(text);
DROP FUNCTION IF EXISTS list_staff_login_emails();

-- PostgREST-friendly parameter names (no p_ prefix)
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

-- Restore direct access so the app works even if /rpc cache is stale
DROP POLICY IF EXISTS "demo_anon_staff_logins_all" ON staff_logins;
CREATE POLICY "demo_anon_staff_logins_all" ON staff_logins
  FOR ALL TO anon USING (true) WITH CHECK (true);

NOTIFY pgrst, 'reload schema';

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
