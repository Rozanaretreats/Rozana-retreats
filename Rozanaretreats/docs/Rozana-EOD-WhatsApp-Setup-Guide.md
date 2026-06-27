# Rozana Resorts — End-of-Day WhatsApp Report Setup Guide

**Document type:** Implementation runbook  
**Module:** Module 4 — EOD Owner Report + Incomplete-Task Alerts  
**Recipient:** Ruheed only (client contact / sponsor)  
**Supabase project:** `oqksrcruypdmsggorrge`  
**Edge Function:** `send-owner-eod-report` (deployed, ACTIVE)  
**Property (go-live):** `ooty-skyview`  
**Prepared for:** Build Owner / Viswajith  
**Last updated:** 26 June 2026  

---

## 1. Purpose

This document is the **complete path** from creating a Meta WhatsApp account to Ruheed receiving the Rozana daily operations report automatically every evening.

The report is **system-generated** from Supabase (attendance, leave, housekeeping, outstanding tasks). It cannot be edited by the on-site operator.

**What the message includes:**

- Attendance — who checked in/out, on leave, absent  
- Housekeeping — rooms completed with proof indicators  
- **Incomplete-task alerts** — assigned rooms still todo or in progress  
- Signed proof-photo links (24h) for completed rooms  

---

## 2. Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  During the day                                                  │
│  Kiosk punches → attendance_punches                              │
│  Ops app → leave_records, housekeeping_tasks, hk-photos storage  │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  End of day (cron, e.g. 6:00 PM IST)                             │
│  pg_cron → POST send-owner-eod-report Edge Function              │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  Edge Function (Supabase)                                        │
│  • Reads staff, punches, leave, HK tasks, rooms                  │
│  • Builds report text + outstanding alerts                       │
│  • Idempotent via report_send_log (one send per day/property)    │
│  • Sends via Meta WhatsApp Cloud API                             │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                ▼
                    Ruheed's WhatsApp (91XXXXXXXXXX)
```

**Backend already done (no app changes needed):**

| Item | Status |
|------|--------|
| Edge Function `send-owner-eod-report` | Deployed, ACTIVE |
| Table `report_send_log` | Created (idempotency + audit) |
| Migration `017_owner_eod_report.sql` | Applied |

**You still need:** Meta WhatsApp API credentials, Supabase secrets, one successful test send, daily cron.

---

## 3. Prerequisites checklist

Before starting, collect:

| # | Item | Notes |
|---|------|--------|
| 1 | Personal Facebook account | To access Meta Developers |
| 2 | Business name | e.g. Rozana Resorts or Emilda & Co |
| 3 | Ruheed's WhatsApp number | International digits only: `91XXXXXXXXXX` |
| 4 | Supabase dashboard access | Project `oqksrcruypdmsggorrge` |
| 5 | Supabase **anon key** | Settings → API (for dry-run tests) |
| 6 | Supabase **service_role key** | Settings → API (for real send + cron; keep secret) |
| 7 | ~1 hour on Day 1 | Meta app + template submission |
| 8 | Template approval wait | Often minutes to 48 hours |

---

## Part A — Meta & WhatsApp setup

### A.1 Create a Meta (Facebook) account

1. Go to https://www.facebook.com  
2. Create or use an existing account.  
3. Verify email/phone if prompted.

### A.2 Create a Meta Business Portfolio

1. Go to https://business.facebook.com  
2. **Create account** → enter business name (e.g. `Rozana Resorts`).  
3. Complete basic business profile.  
4. Full business verification can wait for production; test mode works first.

### A.3 Create a Meta Developer app

1. Go to https://developers.facebook.com  
2. **My Apps** → **Create App**.  
3. Use case: **Other** → **Business** (or WhatsApp-focused option if shown).  
4. App name: e.g. `Rozana Ops Reports`.  
5. Link to Business Portfolio from A.2.  
6. Create the app.

### A.4 Add WhatsApp to the app

1. App dashboard → **Add product** → **WhatsApp** → **Set up**.  
2. Open **WhatsApp** → **API Setup**.

### A.5 Save API credentials

On **API Setup**, record:

| Meta field | Your Supabase secret |
|------------|----------------------|
| Phone number ID | `WHATSAPP_PHONE_NUMBER_ID` |
| Temporary access token | Testing only (~24h) |
| WhatsApp Business Account ID | Reference only |

Meta provides a **test sender number** for development — sufficient until you attach a business number.

### A.6 Register Ruheed as a test recipient

In **Development** mode, WhatsApp only delivers to registered test numbers.

1. On **API Setup**, find **Add phone number** / test recipient list.  
2. Enter Ruheed's number (e.g. `+91 98XXXXXXXX`).  
3. Ruheed receives a **verification code on WhatsApp** — he must confirm.  
4. Optional: add your own number for testing first.

### A.7 Create a permanent access token

The temporary token expires. Create a long-lived token:

1. **Business Settings** → https://business.facebook.com/settings  
2. **Users** → **System users** → **Add**  
   - Name: `rozana-whatsapp-api`  
   - Role: **Admin**  
3. **Generate new token** → select app `Rozana Ops Reports`.  
4. Enable permissions:  
   - `whatsapp_business_messaging`  
   - `whatsapp_business_management`  
5. Generate → **copy token once** → this is `WHATSAPP_TOKEN`.  
6. Store in a password manager. It will not be shown again.

### A.8 Create and approve a message template

**Required for daily automated sends.** Free-form text only works inside Meta's 24-hour customer-reply window — not reliable for scheduled EOD.

1. App → **WhatsApp** → **Message templates** → **Create template**.  
2. Suggested settings:

| Setting | Value |
|---------|--------|
| Category | **Utility** (operational report) |
| Name | `rozana_eod_report` |
| Language | English (`en`) |

3. **Body** (Option A — full report in one variable; preferred if Meta approves):

```
{{1}}
```

4. **Body** (Option B — short message if Option A is rejected):

```
Rozana daily report for {{1}} is ready. Open Rozana Ops → Reports for full details including attendance and housekeeping proof.
```

5. Submit → wait for status **Approved** (minutes to 48 hours).  
6. Save for Supabase:  
   - `WHATSAPP_TEMPLATE_NAME` = `rozana_eod_report`  
   - `WHATSAPP_TEMPLATE_LANG` = `en`

### A.9 Business verification (production)

For long-term production beyond test recipients:

1. **Business Settings** → **Security Center** → **Start verification**.  
2. Submit documents Meta requests (business registration, etc.).  
3. May take several days — start early.  
4. Optionally attach a dedicated business WhatsApp number (SIM) as sender.

**You can test with Ruheed on the test list before verification completes.**

---

## Part B — Supabase configuration

### B.1 Format Ruheed's number

Use **digits only**, country code included, no `+` or spaces:

| Correct | Wrong |
|---------|--------|
| `919876543210` | `+91 98765 43210` |
| | `09876543210` |

### B.2 Set Edge Function secrets

1. https://supabase.com/dashboard → project **oqksrcruypdmsggorrge**  
2. **Project Settings** → **Edge Functions** → **Secrets**  
3. Add:

| Secret name | Value |
|-------------|--------|
| `WHATSAPP_TOKEN` | Permanent system user token (A.7) |
| `WHATSAPP_PHONE_NUMBER_ID` | From A.5 |
| `OWNER_WHATSAPP_NUMBERS` | Ruheed only, e.g. `919876543210` |
| `WHATSAPP_TEMPLATE_NAME` | `rozana_eod_report` (after approved) |
| `WHATSAPP_TEMPLATE_LANG` | `en` |

**Do not set** `SUPABASE_URL` or `SUPABASE_SERVICE_ROLE_KEY` — auto-injected.

### B.3 API keys for testing

**Settings** → **API**:

- **anon** `public` key → dry-run tests  
- **service_role** key → real send + cron (never expose in frontend or git)

---

## Part C — Testing

### C.1 Dry run (no WhatsApp, no log entry)

Composes report from live Supabase data only.

**PowerShell:**

```powershell
$anon = "YOUR_SUPABASE_ANON_KEY"
Invoke-RestMethod -Method POST `
  -Uri "https://oqksrcruypdmsggorrge.supabase.co/functions/v1/send-owner-eod-report?dryRun=true&property_id=ooty-skyview" `
  -Headers @{ Authorization = "Bearer $anon" }
```

**curl:**

```bash
curl -X POST "https://oqksrcruypdmsggorrge.supabase.co/functions/v1/send-owner-eod-report?dryRun=true&property_id=ooty-skyview" \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

**Verify response:**

- `whatsappConfigured: true` (secrets OK)  
- `results[0].message` contains Attendance, Housekeeping, Outstanding sections  
- Fix Ops data if report content is wrong before testing WhatsApp  

### C.2 First real WhatsApp to Ruheed

**Only after:** Ruheed on test list (A.6), template Approved (A.8), secrets set (B.2).

**PowerShell:**

```powershell
$service = "YOUR_SERVICE_ROLE_KEY"
Invoke-RestMethod -Method POST `
  -Uri "https://oqksrcruypdmsggorrge.supabase.co/functions/v1/send-owner-eod-report?property_id=ooty-skyview" `
  -Headers @{ Authorization = "Bearer $service" }
```

**curl:**

```bash
curl -X POST "https://oqksrcruypdmsggorrge.supabase.co/functions/v1/send-owner-eod-report?property_id=ooty-skyview" \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY"
```

**Success:**

```json
{
  "results": [{
    "property": "ooty-skyview",
    "delivered": true,
    "status": "sent",
    "recipients": 1,
    "okCount": 1
  }]
}
```

Ruheed should receive WhatsApp within seconds.

### C.3 Confirm idempotency

1. **Table Editor** → `report_send_log` → row for today + `ooty-skyview`, `status: sent`.  
2. Repeat C.2 without `force` → `"reason": "already_sent"`.  
3. Resend same day: add `&force=true` to URL.

### C.4 Optional — Meta dashboard test

**WhatsApp** → **API Setup** → send test message to Ruheed with approved template. Confirms Meta side independent of Supabase.

---

## Part D — Schedule daily send

### D.1 Choose time

Example: **6:00 PM IST** = **12:30 UTC** → cron: `30 12 * * *`

Adjust to property shift end as needed.

### D.2 Enable Supabase extensions

**SQL Editor:**

```sql
create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;
```

If `pg_cron` is unavailable on your plan, use **Part D.4** (external cron).

### D.3 Schedule with pg_cron

Replace `YOUR_SERVICE_ROLE_KEY`:

```sql
select cron.schedule(
  'rozana-eod-report-ruheed',
  '30 12 * * *',
  $$
  select net.http_post(
    url := 'https://oqksrcruypdmsggorrge.supabase.co/functions/v1/send-owner-eod-report',
    headers := jsonb_build_object(
      'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY',
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object('property_id', 'ooty-skyview')
  ) as request_id;
  $$
);
```

Verify:

```sql
select * from cron.job where jobname = 'rozana-eod-report-ruheed';
```

### D.4 Alternative — external cron (if pg_cron blocked)

Use https://cron-job.org or similar:

| Field | Value |
|-------|--------|
| URL | `https://oqksrcruypdmsggorrge.supabase.co/functions/v1/send-owner-eod-report` |
| Method | POST |
| Header | `Authorization: Bearer YOUR_SERVICE_ROLE_KEY` |
| Body | `{"property_id":"ooty-skyview"}` |
| Schedule | Daily 18:00 Asia/Kolkata |

---

## Part E — First live operations day

### E.1 During the day

| Activity | System effect |
|----------|----------------|
| Staff punch in/out on kiosk | `attendance_punches` |
| Manager records leave | Staff show on-leave in report |
| Manager assigns HK rooms | Tasks appear in housekeeping section |
| HK staff complete rooms + verification photos | Tasks `done` + proof links in report |
| Rooms left incomplete | Listed under **Outstanding** in report |

### E.2 After cron runs (EOD)

1. Ruheed receives WhatsApp.  
2. Check `report_send_log` for today's row.  
3. Confirm outstanding rooms match reality on property.

### E.3 Weekly audit query

```sql
select report_date, property_id, status, sent_at
from report_send_log
order by sent_at desc
limit 14;
```

---

## Part F — Troubleshooting

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| `whatsapp_not_configured` in JSON | Missing secrets | Set B.2; wait 1–2 min |
| `already_sent` | Idempotency working | Use `&force=true` to resend |
| Meta error recipient not allowed | Ruheed not on test list | A.6 |
| Template error | Not approved or wrong name | A.8; check `WHATSAPP_TEMPLATE_NAME` |
| HTTP 401 | Wrong Bearer token | Use anon for dry run, service_role for send |
| Empty attendance | No punches that day | Normal if no kiosk activity |
| No proof links | Room done without photo | HK must upload verification photo |
| Token expired | Old temporary token | Regenerate A.7 |
| Cron silent failure | Wrong key in SQL or pg_net error | Check Supabase logs; try D.4 |

---

## Part G — Manual fallback (no Meta yet)

Until WhatsApp API is ready:

1. Run dry run (C.1) each evening.  
2. Copy `results[0].message` from JSON response.  
3. Paste to Ruheed via personal WhatsApp.

Report logic and incomplete-task alerts work; only automated delivery is manual.

---

## Part H — Production hardening (post go-live)

| Task | When |
|------|------|
| Complete Meta Business verification | Before long-term reliance |
| Attach dedicated business WhatsApp number | Replace test sender |
| Rotate `WHATSAPP_TOKEN` if exposed | Immediately if leaked |
| Store service role key in Supabase Vault for cron | Before sharing SQL |
| Add `kannur-beachview` to cron body | Second property rollout |

---

## Part I — Quick reference card

```
META
  App: Rozana Ops Reports
  WhatsApp → API Setup → Phone Number ID
  System user → permanent token
  Ruheed on test recipient list
  Template: rozana_eod_report (Approved)

SUPABASE SECRETS
  WHATSAPP_TOKEN
  WHATSAPP_PHONE_NUMBER_ID
  OWNER_WHATSAPP_NUMBERS = 91XXXXXXXXXX  (Ruheed only)
  WHATSAPP_TEMPLATE_NAME = rozana_eod_report
  WHATSAPP_TEMPLATE_LANG = en

TEST
  dryRun=true  → see report JSON (anon key)
  real POST    → Ruheed gets WhatsApp (service_role key)

DAILY
  cron: 30 12 * * *  (6 PM IST)
  or external cron POST same URL

FUNCTION URL
  https://oqksrcruypdmsggorrge.supabase.co/functions/v1/send-owner-eod-report
```

---

## Part J — Implementation timeline

| Day | Activity |
|-----|----------|
| Day 1 | Meta app, WhatsApp product, Ruheed test number, template submitted |
| Day 1–2 | Template approval, permanent token, Supabase secrets |
| Day 2 | Dry run + first real WhatsApp to Ruheed |
| Day 2 | Schedule cron (D.3 or D.4) |
| Day 3+ | Ruheed receives automated EOD report daily |

---

## Part K — Sign-off checklist

```
[ ] Meta Developer app created with WhatsApp product
[ ] Ruheed verified as test recipient on WhatsApp
[ ] Permanent system user token generated
[ ] Message template rozana_eod_report APPROVED
[ ] Supabase secrets set (5 variables)
[ ] Dry run returns correct report for ooty-skyview
[ ] Real send: Ruheed received WhatsApp
[ ] report_send_log row created (status: sent)
[ ] Daily cron scheduled (6 PM IST or chosen time)
[ ] One full live day: punches + HK + EOD report verified
```

---

*End of document — Rozana EOD WhatsApp Setup Guide*
