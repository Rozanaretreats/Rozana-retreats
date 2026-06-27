-- 016 — Rozana staff-login RPCs (jsonb args — avoids PostgREST signature/cache issues)
-- Safe to re-run. Run in SQL Editor OR: npm run db:fix-login

CREATE EXTENSION IF NOT EXISTS pgcrypto;

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- Drop old rozana_* if re-running
DROP FUNCTION IF EXISTS rozana_verify_staff_login(jsonb);
DROP FUNCTION IF EXISTS rozana_upsert_staff_login(jsonb);
DROP FUNCTION IF EXISTS rozana_delete_staff_login(jsonb);
DROP FUNCTION IF EXISTS rozana_is_staff_email_taken(jsonb);
DROP FUNCTION IF EXISTS rozana_list_staff_login_emails();

CREATE OR REPLACE FUNCTION rozana_verify_staff_login(body jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text := lower(trim(body->>'login_email'));
  v_password text := body->>'login_password';
  v_row staff_logins%ROWTYPE;
  v_staff staff%ROWTYPE;
  v_ok boolean := false;
BEGIN
  IF v_email IS NULL OR v_password IS NULL THEN RETURN NULL; END IF;

  SELECT * INTO v_row FROM staff_logins WHERE lower(trim(email)) = v_email;
  IF NOT FOUND THEN RETURN NULL; END IF;

  IF v_row.password LIKE '$2%' THEN
    v_ok := (v_row.password = crypt(v_password, v_row.password));
  ELSE
    v_ok := (v_row.password = v_password);
    IF v_ok THEN
      UPDATE staff_logins
      SET password = crypt(v_password, gen_salt('bf'))
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

CREATE OR REPLACE FUNCTION rozana_upsert_staff_login(body jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_staff_id text := body->>'staff_id';
  v_email text := lower(trim(body->>'email'));
  v_password text := body->>'password';
BEGIN
  IF v_staff_id IS NULL OR v_email IS NULL OR v_password IS NULL THEN
    RAISE EXCEPTION 'staff_id, email and password are required';
  END IF;

  INSERT INTO staff_logins (staff_id, email, password)
  VALUES (v_staff_id, v_email, crypt(v_password, gen_salt('bf')))
  ON CONFLICT (staff_id) DO UPDATE SET
    email = v_email,
    password = crypt(v_password, gen_salt('bf'));
END;
$$;

CREATE OR REPLACE FUNCTION rozana_delete_staff_login(body jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM staff_logins WHERE staff_id = body->>'staff_id';
END;
$$;

CREATE OR REPLACE FUNCTION rozana_is_staff_email_taken(body jsonb)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM staff_logins
    WHERE lower(trim(email)) = lower(trim(body->>'check_email'))
      AND (
        body->>'exclude_staff_id' IS NULL
        OR body->>'exclude_staff_id' = ''
        OR staff_id <> body->>'exclude_staff_id'
      )
  );
$$;

CREATE OR REPLACE FUNCTION rozana_list_staff_login_emails()
RETURNS TABLE(staff_id text, email text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT l.staff_id, l.email FROM staff_logins l ORDER BY l.email;
$$;

GRANT EXECUTE ON FUNCTION rozana_verify_staff_login(jsonb) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION rozana_upsert_staff_login(jsonb) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION rozana_delete_staff_login(jsonb) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION rozana_is_staff_email_taken(jsonb) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION rozana_list_staff_login_emails() TO anon, authenticated, service_role;

-- Keep legacy names too (015) — both paths work after cache reload
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
BEGIN
  RETURN rozana_verify_staff_login(jsonb_build_object(
    'login_email', login_email,
    'login_password', login_password
  ));
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
  PERFORM rozana_upsert_staff_login(jsonb_build_object(
    'staff_id', staff_id,
    'email', email,
    'password', password
  ));
END;
$$;

CREATE OR REPLACE FUNCTION delete_staff_login(staff_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM rozana_delete_staff_login(jsonb_build_object('staff_id', staff_id));
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
  SELECT rozana_is_staff_email_taken(jsonb_build_object(
    'check_email', check_email,
    'exclude_staff_id', exclude_staff_id
  ));
$$;

CREATE OR REPLACE FUNCTION list_staff_login_emails()
RETURNS TABLE(staff_id text, email text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT * FROM rozana_list_staff_login_emails();
$$;

GRANT EXECUTE ON FUNCTION verify_staff_login(text, text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION upsert_staff_login(text, text, text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION delete_staff_login(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION is_staff_email_taken(text, text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION list_staff_login_emails() TO anon, authenticated, service_role;

DROP POLICY IF EXISTS "demo_anon_staff_logins_all" ON staff_logins;
CREATE POLICY "demo_anon_staff_logins_all" ON staff_logins
  FOR ALL TO anon USING (true) WITH CHECK (true);

NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';

SELECT proname AS rpc_name, 'ok' AS status
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname LIKE 'rozana_%staff_login%'
ORDER BY proname;
