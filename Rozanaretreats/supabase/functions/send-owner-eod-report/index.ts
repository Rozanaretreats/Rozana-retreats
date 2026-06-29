import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "@supabase/supabase-js";

/**
 * Module 4 — End-of-Day Owner Report + Incomplete-Task Alerts.
 *
 * Compiles the day's attendance, leave, and housekeeping completions for each
 * property and sends owners a WhatsApp summary. Rooms left undone are flagged.
 * Proof photos are viewed in Rozana Ops (not linked in WhatsApp).
 *
 * The report is generated entirely server-side from Supabase data and cannot be
 * edited by the operator. Idempotent per (report_date, property_id) via the
 * report_send_log table.
 *
 * Query / JSON params (all optional):
 *   date        YYYY-MM-DD   report day (default: today, Asia/Kolkata)
 *   property_id string       restrict to one property (default: all active)
 *   dryRun      true|false   compose only, do not send or log (default: false)
 *   force       true|false   resend even if already logged for that day
 *
 * Required env (set via `supabase secrets set`):
 *   WHATSAPP_TOKEN            Meta WhatsApp Cloud API permanent token
 *   WHATSAPP_PHONE_NUMBER_ID  Cloud API phone number id (sender)
 *   OWNER_WHATSAPP_NUMBERS    comma-separated recipient numbers, e.g. 9198...,9197...
 * Optional env:
 *   WHATSAPP_TEMPLATE_NAME    approved template name (needed for out-of-session sends)
 *   WHATSAPP_TEMPLATE_LANG    template language code (default: en)
 * Auto-injected by Supabase: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

const GRAPH_VERSION = "v21.0";

type Property = { id: string; name: string; short_name: string };
type Staff = { id: string; name: string };
type Punch = { staff_id: string; punch_type: "in" | "out"; punch_time: string };
type Leave = { staff_id: string; from_date: string; to_date: string; status: string };
type Room = { id: string; number: string; building: string };
type Task = {
  id: string;
  room_id: string;
  assigned_staff_id: string | null;
  status: "todo" | "cleaning" | "done";
  photo_after_url: string | null;
};

function istToday(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function hhmm(time: string | undefined): string {
  if (!time) return "--:--";
  return time.slice(0, 5);
}

/** Latest OUT punch strictly after the day's first IN (ignores stale/early OUT rows). */
function latestOutAfterIn(staffId: string, firstInTime: string, punchList: Punch[]): string | undefined {
  let latest: string | undefined;
  for (const p of punchList) {
    if (p.staff_id !== staffId || p.punch_type !== "out") continue;
    if (p.punch_time <= firstInTime) continue;
    if (!latest || p.punch_time > latest) latest = p.punch_time;
  }
  return latest;
}

Deno.serve(async (req: Request) => {
  const cors = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body, null, 2), {
      status,
      headers: { ...cors, "Content-Type": "application/json" },
    });

  try {
    const url = new URL(req.url);
    let params: Record<string, unknown> = {};
    if (req.method === "POST") {
      params = await req.json().catch(() => ({}));
    }
    const pick = (k: string) =>
      (params[k] as string | undefined) ?? url.searchParams.get(k) ?? undefined;

    const date = (pick("date") as string) || istToday();
    const onlyProperty = pick("property_id") as string | undefined;
    const dryRun = String(pick("dryRun") ?? "false") === "true";
    const force = String(pick("force") ?? "false") === "true";

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const waToken = Deno.env.get("WHATSAPP_TOKEN");
    const waPhoneId = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");
    const owners = (Deno.env.get("OWNER_WHATSAPP_NUMBERS") ?? "")
      .split(",")
      .map((n) => n.trim().replace(/[^\d]/g, ""))
      .filter(Boolean);
    const templateName = Deno.env.get("WHATSAPP_TEMPLATE_NAME");
    const templateLang = Deno.env.get("WHATSAPP_TEMPLATE_LANG") ?? "en";
    const waConfigured = Boolean(waToken && waPhoneId && owners.length > 0);

    let propertyQuery = supabase.from("properties").select("id, name, short_name");
    if (onlyProperty) propertyQuery = propertyQuery.eq("id", onlyProperty);
    const { data: properties, error: propErr } = await propertyQuery;
    if (propErr) return json({ error: `properties: ${propErr.message}` }, 500);

    const results: unknown[] = [];

    for (const property of (properties ?? []) as Property[]) {
      const report = await buildReport(supabase, property, date);

      if (dryRun) {
        results.push({ property: property.id, delivered: false, dryRun: true, message: report });
        continue;
      }

      if (!force) {
        const { data: existing } = await supabase
          .from("report_send_log")
          .select("id")
          .eq("report_date", date)
          .eq("property_id", property.id)
          .maybeSingle();
        if (existing) {
          results.push({ property: property.id, delivered: false, reason: "already_sent" });
          continue;
        }
      }

      if (!waConfigured) {
        results.push({
          property: property.id,
          delivered: false,
          reason: "whatsapp_not_configured",
          message: report,
        });
        continue;
      }

      const sendResults = await Promise.all(
        owners.map((to) =>
          sendWhatsApp({ to, body: report, waToken: waToken!, waPhoneId: waPhoneId!, templateName, templateLang }),
        ),
      );
      const okCount = sendResults.filter((r) => r.ok).length;
      const status = okCount === owners.length ? "sent" : okCount === 0 ? "failed" : "partial";

      await supabase.from("report_send_log").upsert(
        {
          report_date: date,
          property_id: property.id,
          recipients: owners,
          status,
          detail: JSON.stringify(sendResults).slice(0, 1000),
        },
        { onConflict: "report_date,property_id" },
      );

      results.push({ property: property.id, delivered: okCount > 0, status, recipients: owners.length, okCount });
    }

    return json({ date, dryRun, force, whatsappConfigured: waConfigured, results });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});

async function buildReport(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  property: Property,
  date: string,
): Promise<string> {
  const [{ data: staff }, { data: punches }, { data: leaves }, { data: rooms }, { data: tasks }] =
    await Promise.all([
      supabase.from("staff").select("id, name").eq("property_id", property.id).eq("active", true),
      supabase
        .from("attendance_punches")
        .select("staff_id, punch_type, punch_time")
        .eq("property_id", property.id)
        .eq("punch_date", date),
      supabase
        .from("leave_records")
        .select("staff_id, from_date, to_date, status")
        .eq("property_id", property.id)
        .lte("from_date", date)
        .gte("to_date", date),
      supabase.from("rooms").select("id, number, building").eq("property_id", property.id),
      supabase
        .from("housekeeping_tasks")
        .select("id, room_id, assigned_staff_id, status, photo_after_url")
        .eq("property_id", property.id),
    ]);

  const staffList = (staff ?? []) as Staff[];
  const staffName = new Map(staffList.map((s) => [s.id, s.name]));
  const roomList = (rooms ?? []) as Room[];
  const roomLabel = new Map(
    roomList.map((r) => [r.id, `${r.building} ${r.number}`.trim()]),
  );

  const onLeave = new Set(
    ((leaves ?? []) as Leave[])
      .filter((l) => (l.status ?? "approved") === "approved")
      .map((l) => l.staff_id),
  );

  // Attendance per staff — first IN; OUT only if after that IN
  const punchList = (punches ?? []) as Punch[];
  const firstIn = new Map<string, string>();
  for (const p of punchList) {
    if (p.punch_type !== "in") continue;
    const cur = firstIn.get(p.staff_id);
    if (!cur || p.punch_time < cur) firstIn.set(p.staff_id, p.punch_time);
  }

  const present: string[] = [];
  const leaveNames: string[] = [];
  const missing: string[] = [];
  for (const s of staffList) {
    if (firstIn.has(s.id)) {
      const inTime = firstIn.get(s.id)!;
      const outTime = latestOutAfterIn(s.id, inTime, punchList);
      const out = outTime ? hhmm(outTime) : "still in";
      present.push(`  ✅ ${s.name} · ${hhmm(inTime)}–${out}`);
    } else if (onLeave.has(s.id)) {
      leaveNames.push(`  🏖️ ${s.name}`);
    } else {
      missing.push(`  ❌ ${s.name}`);
    }
  }

  // Housekeeping
  const taskList = (tasks ?? []) as Task[];
  const assigned = taskList.filter((t) => t.assigned_staff_id);
  const doneTasks = taskList.filter((t) => t.status === "done");
  const outstanding = taskList.filter((t) => t.assigned_staff_id && t.status !== "done");
  const unproven = doneTasks.filter((t) => !t.photo_after_url);

  const doneLines = doneTasks.map((t) => {
    const who = t.assigned_staff_id ? staffName.get(t.assigned_staff_id) ?? "?" : "unassigned";
    const proof = t.photo_after_url ? " 📸" : " ⚠️ no photo";
    return `  ✅ ${roomLabel.get(t.room_id) ?? t.room_id} · ${who}${proof}`;
  });

  const outstandingLines = outstanding.map((t) => {
    const who = t.assigned_staff_id ? staffName.get(t.assigned_staff_id) ?? "?" : "unassigned";
    const icon = t.status === "cleaning" ? "🔄" : "⏳";
    const state = t.status === "cleaning" ? "in progress" : "not started";
    return `  ${icon} ${roomLabel.get(t.room_id) ?? t.room_id} · ${who} (${state})`;
  });

  const lines: string[] = [];
  lines.push(`🏨 *${property.name}*`);
  lines.push(`📅 *End-of-day report* · ${date}`);
  lines.push("");
  lines.push(`👥 *ATTENDANCE*`);
  lines.push(`✅ *Present* (${present.length})`);
  lines.push(present.length ? present.join("\n") : "  — none");
  if (leaveNames.length) {
    lines.push(`🏖️ *On leave* (${leaveNames.length})`);
    lines.push(leaveNames.join("\n"));
  }
  lines.push(`❌ *Absent / not in* (${missing.length})`);
  lines.push(missing.length ? missing.join("\n") : "  — none");
  lines.push("");
  lines.push(`🧹 *HOUSEKEEPING* · ${doneTasks.length}/${assigned.length} rooms done`);
  if (doneLines.length) lines.push(doneLines.join("\n"));
  else lines.push("  — none completed");
  if (outstanding.length) {
    lines.push("");
    lines.push(`⚠️ *OUTSTANDING* (${outstanding.length})`);
    lines.push(outstandingLines.join("\n"));
  }
  if (unproven.length) {
    lines.push("");
    lines.push(`📷 ${unproven.length} room(s) done without photo proof`);
  }
  lines.push("");
  lines.push(`📱 *View proof photos:* Rozana Ops → Reports → Housekeeping`);
  lines.push("");
  lines.push(`_🤖 System-generated · cannot be edited_`);

  return lines.join("\n");
}

async function sendWhatsApp(opts: {
  to: string;
  body: string;
  waToken: string;
  waPhoneId: string;
  templateName?: string;
  templateLang: string;
}): Promise<{ to: string; ok: boolean; status: number; error?: string }> {
  const endpoint = `https://graph.facebook.com/${GRAPH_VERSION}/${opts.waPhoneId}/messages`;

  const payload = opts.templateName
    ? {
        messaging_product: "whatsapp",
        to: opts.to,
        type: "template",
        template: {
          name: opts.templateName,
          language: { code: opts.templateLang },
          components: [
            { type: "body", parameters: [{ type: "text", text: opts.body }] },
          ],
        },
      }
    : {
        messaging_product: "whatsapp",
        to: opts.to,
        type: "text",
        text: { body: opts.body },
      };

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${opts.waToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    const ok = res.ok;
    let error: string | undefined;
    if (!ok) error = (await res.text()).slice(0, 300);
    return { to: opts.to, ok, status: res.status, error };
  } catch (e) {
    return { to: opts.to, ok: false, status: 0, error: String(e) };
  }
}
