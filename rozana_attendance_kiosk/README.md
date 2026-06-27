# Rozana Attendance Kiosk

Production-grade Flutter kiosk app for Rozana Resorts staff attendance via USB/Bluetooth fingerprint readers on Android tablets. Shares the **Supabase backend only** with the existing Rozana web app (Vite + React) — no shared code.

## Prerequisites

- Flutter SDK (stable, Dart 3.5+)
- Android tablet or emulator (API 24+)
- Existing Rozana Supabase project URL + anon key
- Review and run `supabase/kiosk_migrations.sql` before first sync

## Quick start (MockReader — no hardware)

> **Testing on a Windows laptop?** Your built-in fingerprint reader (Windows Hello) cannot be used with this app. Use **mock mode** instead — see [docs/LAPTOP_TESTING.md](docs/LAPTOP_TESTING.md).

1. **Create project** (if cloned without platform folders, run `flutter create .` inside this directory).

2. **Configure environment:**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` with your Supabase URL, anon key, `PROPERTY_ID`, and `DEVICE_ID`.

3. **Install dependencies:**
   ```bash
   flutter pub get
   ```

4. **Run on device/emulator:**
   ```bash
   flutter run
   ```
   Default `FINGERPRINT_READER=mock` simulates scans. Use the on-screen dropdown to pick a staff member, then tap the big fingerprint banner to punch.

5. **Admin enrolment:** Tap the footer label **5 times** → enter `ADMIN_PIN` → enrol fingerprints.

6. **Tests:**
   ```bash
   flutter test
   ```

## Environment variables

| Variable | Description |
|----------|-------------|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_ANON_KEY` | Publishable anon key (never service role) |
| `PROPERTY_ID` | Property this tablet is bound to (e.g. `ooty-skyview`) |
| `DEVICE_ID` | Unique kiosk device id written on every punch |
| `ADMIN_PIN` | PIN for enrolment / back-exit |
| `FINGERPRINT_READER` | `mock` (default) or `native` |
| `MOCK_STAFF_ID` | Optional default staff for mock scans |
| `ENABLE_WEBVIEW_TAB` | `true` to show optional dashboard WebView tab |
| `WEB_APP_URL` | Rozana web app URL for WebView |
| `PUNCH_DEBOUNCE_SECONDS` | Block duplicate punches (default 30) |
| `MIN_MATCH_SCORE` | Minimum 1:N match score 0–100 (default 60) |

## Supabase schema assumptions

The kiosk aligns with your existing Rozana schema:

| Table | Assumption |
|-------|------------|
| `staff` | Columns: `id`, `name` (mapped to fullName), `role`, `property_id`, `active` |
| `properties` | Columns: `id`, `name`, `shift_start`, `shift_end` |
| `attendance_punches` | Existing: `punch_date`, `punch_time`, `device_id`; migration adds `source`, `match_score`, `synced` |
| `fingerprint_templates` | **New** — see `supabase/kiosk_migrations.sql` |

**Before production:** tighten RLS on `fingerprint_templates` and kiosk punch INSERT policies. Biometric templates must not be world-readable.

## Architecture

See [ARCHITECTURE.md](ARCHITECTURE.md).

## Android kiosk hardening

- App uses `singleTask`, landscape, `FLAG_KEEP_SCREEN_ON` via `KioskPlugin`
- Back button blocked unless admin PIN is entered
- **Full device lock** requires Android Enterprise / MDM kiosk mode or a dedicated launcher — configure on the tablet separately

## Optional WebView tab

Set `ENABLE_WEBVIEW_TAB=true` and `WEB_APP_URL` to your Rozana web app. Opens as a separate screen; does not affect punch flow.

---

## How to integrate the real fingerprint reader SDK

**Reader model:** `<<<E.G. MANTRA MFS100 — REPLACE WITH ACTUAL MODEL>>>`  
**Vendor SDK:** `<<<SDK NAME / PACKAGE — REPLACE>>>`

### Step 1 — Add SDK to Android

1. Place vendor `.aar` / `.jar` in `android/app/libs/`
2. Edit `android/app/build.gradle`:
   ```gradle
   dependencies {
       implementation files('libs/YOUR_SDK.aar')
   }
   ```
3. Add USB/BT permissions to `android/app/src/main/AndroidManifest.xml` per vendor docs

### Step 2 — Kotlin stub (`FingerprintReaderPlugin.kt`)

File: `android/app/src/main/kotlin/com/rozana/kiosk/FingerprintReaderPlugin.kt`

| Method | TODO |
|--------|------|
| `initReader()` | Open device, register callbacks |
| `capture()` | Enrollment capture → return `templateBase64`, `fingerIndex`, `deviceId` |
| `identify()` | 1:N match against `templates` list → return `matched`, `staffId`, `score` |
| `dispose()` | Release handles |

### Step 3 — Dart bridge (`native_fingerprint_reader.dart`)

File: `lib/data/fingerprint/native_fingerprint_reader.dart`

- `init()` — already calls channel `init`
- `capture()` — TODO(VENDOR_SDK): map native payload to `FingerprintTemplate`
- `identify()` — TODO(VENDOR_SDK): pass roster, parse match result
- Never log `templateBytes` or base64 templates

### Step 4 — Enable native reader

In `.env`:
```
FINGERPRINT_READER=native
```

Build release APK and deploy to tablet with reader attached.

### Step 5 — Verify

1. Enrol one staff fingerprint via admin screen
2. Punch IN → confirm row in `attendance_punches` with `source=kiosk`
3. Punch OUT → confirm alternating `punch_type`
4. Airplane mode punch → confirm local queue → sync when online (`synced=true`)

### All TODO markers in repo

```bash
rg "TODO\\(VENDOR_SDK\\)" rozana_attendance_kiosk/
rg "TODO\\(KIOSK\\)" rozana_attendance_kiosk/
```

## Project structure

```
lib/
  core/           config, kiosk Android helpers
  domain/         entities, pure punch logic, use cases, repository contracts
  data/           Supabase API, sqflite cache, fingerprint readers
  presentation/   Riverpod providers, screens, widgets
supabase/
  kiosk_migrations.sql   review-before-run
test/
  domain/         punch IN/OUT logic
  data/           offline sync reconciliation
  widget/         punch happy path (MockReader)
```

## License

Proprietary — Rozana Resorts internal use.
