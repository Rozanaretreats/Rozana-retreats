# PC kiosk deployment (24/7 + USB fingerprint reader)

This is the intended **production setup** for Rozana properties: a small Windows PC always on, USB fingerprint scanner on the desk, staff place finger → punch IN/OUT → Rozana Ops updates live.

## Architecture

```
Staff finger → USB reader → Windows PC (kiosk app 24/7)
                              ↓
                    Supabase attendance_punches
                              ↓
                    Rozana Ops (web) — live sync
```

Same app you test today (`rozana_attendance_kiosk`), same Supabase backend. **Mock mode** is only for development without hardware.

## What to buy

Before ordering, confirm with the vendor:

| Requirement | Why |
|-------------|-----|
| **Windows SDK** (DLL/.NET) | PC integration — Android-only readers will not work |
| **USB** (preferred over Bluetooth for fixed desk) | Stable 24/7 connection |
| **1:N identify** (match against roster) | Attendance kiosk — not only “verify one Windows user” |
| **Enrollment API** (capture template) | Manager enrols staff once via Admin screen |

Common brands in India: **Mantra**, **SecuGen**, **Morpho**, **Startek** — ask for **MFS100-class USB + Windows SDK** or equivalent.

**Do not rely on** the laptop’s built-in Windows Hello sensor — it cannot run your custom staff roster matching.

## Staff experience (target)

1. PC shows idle screen: clock, property name, **“Place finger to punch”**
2. Staff places finger — no login, no buttons
3. App identifies 1:N → auto **IN** or **OUT** → green confirmation → back to idle
4. Manager enrols new staff via **Admin PIN** (hidden from daily screen)

## What is already built

| Feature | Status |
|---------|--------|
| Punch IN/OUT logic | Done |
| Supabase sync + offline queue | Done |
| Rozana Ops live sync | Done |
| Fingerprint enrolment (Admin) | Done |
| Windows desktop app | Done (you run it today) |
| Mock reader (no hardware) | Done |
| **Windows USB reader SDK** | **TODO** — after you buy hardware |

## What we integrate after purchase

1. Install vendor **Windows drivers + SDK** on the PC
2. Implement **Windows native plugin** (C++ MethodChannel — same contract as Android stub)
3. Set `.env`:
   ```env
   FINGERPRINT_READER=native
   PROPERTY_ID=ooty-skyview
   DEVICE_ID=kiosk-ooty-pc-01
   ```
4. Build release: `flutter build windows`
5. Enrol each staff member once (Admin → Capture fingerprint)

Files to edit (same channel name `com.rozana.kiosk/fingerprint`):

| Layer | File |
|-------|------|
| Dart | `lib/data/fingerprint/native_fingerprint_reader.dart` |
| Windows | `windows/runner/` — new plugin handler (TODO blocks) |
| Android (if tablet later) | `android/.../FingerprintReaderPlugin.kt` |

## 24/7 PC checklist

| Task | Notes |
|------|--------|
| Dedicated Windows user | Auto-login, no sleep |
| Power | UPS recommended; disable sleep/hibernate |
| Auto-start app | Task Scheduler at logon → `rozana_attendance_kiosk.exe` |
| Full screen | Maximize; optional assigned access / kiosk shell |
| Ethernet/Wi‑Fi | Stable — offline queue syncs when back |
| One property per PC | `PROPERTY_ID` in `.env` |
| Physical security | PC + reader in ops area, not public internet kiosk |

### Auto-start (Task Scheduler sketch)

1. Build: `flutter build windows`
2. Exe: `build\windows\x64\runner\Release\rozana_attendance_kiosk.exe`
3. Task Scheduler → At log on → run exe from install folder
4. Copy `.env` next to exe or use fixed path in bootstrap

## Manager vs daily use

| Who | Action |
|-----|--------|
| **Operations manager** | Admin PIN → enrol / re-enrol / delete fingerprints |
| **HK staff** | Finger only on idle screen |
| **You (office)** | Rozana Ops → Attendance (live punches) |

## Testing path (now → go-live)

1. **Now** — Mock on laptop (click = finger) → proves Ops sync  
2. **After reader arrives** — Integrate Windows SDK → `FINGERPRINT_READER=native`  
3. **Go-live** — Deploy PC at property, enrol staff, turn off `VITE_ALLOW_MANUAL_PUNCHES` in Ops  

## When you have the reader model

Share: **brand, model, SDK download link**. We wire the Windows plugin to your exact SDK (init, capture, 1:N identify) — the rest of the app stays unchanged.
