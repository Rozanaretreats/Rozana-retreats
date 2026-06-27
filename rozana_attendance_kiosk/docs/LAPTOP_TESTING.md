# Testing on your laptop (Windows)

## Can I use my laptop’s built-in fingerprint reader?

**No — not with this app as built today.**

| | Laptop sensor (Windows Hello) | Kiosk USB/BT reader (e.g. MANTRA) |
|---|------------------------------|-----------------------------------|
| Used for | Windows sign-in | Custom attendance 1:N match |
| Exposes fingerprint templates? | **No** (by design, for privacy) | **Yes** (vendor SDK) |
| Supported in this app? | No | Yes (Android native stub + SDK) |

Windows Hello only unlocks your Windows account. It does **not** let third-party apps capture templates or match against your Rozana staff roster. That requires the **external reader + vendor SDK** on the Android tablet.

## What you CAN test on the laptop

The full app flow — Supabase sync, IN/OUT logic, enrolment, offline queue — using **MockReader**:

- **Click** the big blue banner = simulated fingerprint scan  
- Pick a staff member from the dropdown (mock mode)  
- Punches go to your real Supabase (once `.env` is configured)

This is the intended way to develop before hardware arrives.

---

## Step-by-step (Windows laptop)

### 1. Install Flutter

1. Download: https://docs.flutter.dev/get-started/install/windows  
2. Extract (e.g. `C:\flutter`) and add `C:\flutter\bin` to your **PATH**  
3. In a **new** PowerShell window:

```powershell
flutter doctor
```

Install anything `doctor` flags (Android Studio optional for laptop-only testing; **Visual Studio 2022** with “Desktop development with C++” is required for Windows desktop builds).

### 2. Apply Supabase migration (once)

In Supabase SQL Editor, run the contents of:

`rozana_attendance_kiosk/supabase/kiosk_migrations.sql`

Review RLS comments before production.

### 3. Configure `.env`

```powershell
cd C:\Users\viswa\OneDrive\Desktop\Emilda\rozana_attendance_kiosk
copy .env.example .env
notepad .env
```

Set at minimum:

```env
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_ANON_KEY=your-anon-key
PROPERTY_ID=ooty-skyview
DEVICE_ID=laptop-dev-01
ADMIN_PIN=1234
FINGERPRINT_READER=mock
```

Use the **same** Supabase URL and anon key as your Rozana web app (`VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` in `Rozanaretreats/app/.env.local`).

### 4. Generate Windows platform files

```powershell
cd C:\Users\viswa\OneDrive\Desktop\Emilda\rozana_attendance_kiosk
flutter create . --platforms=windows
flutter pub get
```

### 5. Run on Windows

```powershell
flutter run -d windows
```

### 6. Manual test flow

1. **Enrol a fingerprint (mock)**  
   - Tap footer `Rozana Kiosk · laptop-dev-01` **5 times**  
   - PIN: `1234` (or your `ADMIN_PIN`)  
   - Choose a staff member → **Capture fingerprint**  
   - Wait ~1 second (mock delay) → “Enrolled …”

2. **Punch IN**  
   - On home screen, pick that staff in **“Mock: select staff for next scan”**  
   - **Click** the blue **“Click here to mock punch”** banner  
   - Green **CHECKED IN** + staff name

3. **Punch OUT**  
   - Same staff selected → click banner again → **CHECKED OUT**

4. **Verify in Supabase**  
   - Table `attendance_punches` → rows with `source=kiosk`, your `device_id`, correct `punch_type`

5. **Optional: offline**  
   - Disable Wi‑Fi → punch → re-enable → row should sync (`synced=true`)

### 7. Run automated tests

```powershell
flutter test
```

---

## Alternative: Android emulator on the same laptop

If you prefer the tablet UI without a physical tablet:

```powershell
flutter emulators
flutter emulators --launch <emulator_id>
flutter run
```

Still uses **MockReader** unless you attach a USB fingerprint device to the emulator (usually not supported).

---

## When you get the real reader

1. Deploy app on the **Android tablet**  
2. Set `FINGERPRINT_READER=native` in `.env`  
3. Integrate vendor SDK in `FingerprintReaderPlugin.kt` (see main README)

Your laptop fingerprint sensor is **not** part of that path.
