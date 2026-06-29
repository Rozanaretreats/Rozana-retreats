import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "@supabase/supabase-js";

const cors = {
  "Access-Control-Allow-Origin": Deno.env.get("OPS_APP_ORIGIN") ?? "http://localhost:5173",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Body = {
  action?: "provision" | "reset_password" | "delete";
  staff_id?: string;
  email?: string;
  password?: string;
  name?: string;
  property_id?: string;
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...cors, "Content-Type": "application/json" },
    });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Missing Authorization" }, 401);
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) return json({ error: "Invalid session" }, 401);

    const admin = createClient(supabaseUrl, serviceKey);
    const body = (await req.json().catch(() => ({}))) as Body;
    const action = body.action ?? "provision";

    const { data: profile } = await admin
      .from("profiles")
      .select("role, property_scope")
      .eq("id", userData.user.id)
      .maybeSingle();

    const isOwner = profile?.role === "owner" && profile?.property_scope === "all";
    const isManager = profile?.role === "manager";
    if (!isOwner && !isManager) {
      return json({ error: "Manager or owner required" }, 403);
    }

    if (action === "delete") {
      const staffId = body.staff_id;
      if (!staffId) return json({ error: "staff_id required" }, 400);

      const { data: login } = await admin
        .from("staff_logins")
        .select("email")
        .eq("staff_id", staffId)
        .maybeSingle();

      await admin.rpc("rozana_delete_staff_login", { body: { staff_id: staffId } });

      if (login?.email) {
        const { data: users } = await admin.auth.admin.listUsers();
        const match = users.users.find((u) => u.email?.toLowerCase() === login.email.toLowerCase());
        if (match) await admin.auth.admin.deleteUser(match.id);
      }

      return json({ ok: true });
    }

    const staffId = body.staff_id;
    const email = body.email?.trim().toLowerCase();
    const password = body.password;
    const name = body.name ?? email;
    const propertyId = body.property_id;

    if (!staffId || !email || !password || !propertyId) {
      return json({ error: "staff_id, email, password, property_id required" }, 400);
    }

    if (!isOwner && profile?.property_scope !== propertyId) {
      return json({ error: "Property scope denied" }, 403);
    }

    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      app_metadata: {
        rozana_role: "housekeeping-staff",
        rozana_staff_id: staffId,
        rozana_property_id: propertyId,
        rozana_name: name,
      },
    });

    if (createErr) {
      if (/already|exists|duplicate/i.test(createErr.message)) {
        const { data: users } = await admin.auth.admin.listUsers();
        const match = users.users.find((u) => u.email?.toLowerCase() === email);
        if (!match) return json({ error: createErr.message }, 400);
        const { error: updErr } = await admin.auth.admin.updateUserById(match.id, {
          password,
          app_metadata: {
            rozana_role: "housekeeping-staff",
            rozana_staff_id: staffId,
            rozana_property_id: propertyId,
            rozana_name: name,
          },
        });
        if (updErr) return json({ error: updErr.message }, 400);
      } else {
        return json({ error: createErr.message }, 400);
      }
    } else if (!created.user) {
      return json({ error: "User not created" }, 500);
    }

    await admin.rpc("rozana_upsert_staff_login", {
      body: { staff_id: staffId, email, password },
    });

    return json({ ok: true, user_id: created?.user?.id });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
