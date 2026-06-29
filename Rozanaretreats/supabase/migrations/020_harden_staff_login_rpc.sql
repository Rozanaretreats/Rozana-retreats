-- 020 — Harden staff-login RPCs (manager-only writes; revoke anon)

REVOKE EXECUTE ON FUNCTION rozana_upsert_staff_login(jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION rozana_delete_staff_login(jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION rozana_list_staff_login_emails() FROM anon;
REVOKE EXECUTE ON FUNCTION rozana_is_staff_email_taken(jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION rozana_verify_staff_login(jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION upsert_staff_login(text, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION delete_staff_login(text) FROM anon;
REVOKE EXECUTE ON FUNCTION list_staff_login_emails() FROM anon;
REVOKE EXECUTE ON FUNCTION is_staff_email_taken(text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION verify_staff_login(text, text) FROM anon;

CREATE OR REPLACE FUNCTION rozana_assert_manager()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF COALESCE(auth.jwt() ->> 'role', '') = 'service_role' THEN
    RETURN;
  END IF;
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = '42501';
  END IF;
  IF NOT rozana_can_manage() THEN
    RAISE EXCEPTION 'manager or owner role required' USING ERRCODE = '42501';
  END IF;
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
  v_property text;
BEGIN
  PERFORM rozana_assert_manager();

  SELECT property_id INTO v_property FROM staff WHERE id = v_staff_id AND active = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'staff not found or inactive';
  END IF;
  IF NOT rozana_can_access_property(v_property) THEN
    RAISE EXCEPTION 'property access denied' USING ERRCODE = '42501';
  END IF;

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
DECLARE
  v_staff_id text := body->>'staff_id';
  v_property text;
BEGIN
  PERFORM rozana_assert_manager();

  SELECT property_id INTO v_property FROM staff WHERE id = v_staff_id;
  IF FOUND AND NOT rozana_can_access_property(v_property) THEN
    RAISE EXCEPTION 'property access denied' USING ERRCODE = '42501';
  END IF;

  DELETE FROM staff_logins WHERE staff_id = v_staff_id;
END;
$$;

CREATE OR REPLACE FUNCTION rozana_is_staff_email_taken(body jsonb)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
  PERFORM rozana_assert_manager();
  RETURN EXISTS (
    SELECT 1 FROM staff_logins
    WHERE lower(trim(email)) = lower(trim(body->>'check_email'))
      AND (
        body->>'exclude_staff_id' IS NULL
        OR body->>'exclude_staff_id' = ''
        OR staff_id <> body->>'exclude_staff_id'
      )
  );
END;
$$;

CREATE OR REPLACE FUNCTION rozana_list_staff_login_emails()
RETURNS TABLE(staff_id text, email text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
  PERFORM rozana_assert_manager();
  RETURN QUERY
    SELECT l.staff_id, l.email
    FROM staff_logins l
    INNER JOIN staff s ON s.id = l.staff_id
    WHERE rozana_can_access_property(s.property_id)
    ORDER BY l.email;
END;
$$;

GRANT EXECUTE ON FUNCTION rozana_upsert_staff_login(jsonb) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION rozana_delete_staff_login(jsonb) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION rozana_is_staff_email_taken(jsonb) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION rozana_list_staff_login_emails() TO authenticated, service_role;
