# Architecture

## Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Presentation                          │
│  KioskHomeScreen, EnrollmentScreen, Riverpod providers   │
└─────────────────────────┬───────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────┐
│                      Domain                              │
│  Entities · punch_decision (pure) · Use cases            │
│  AttendanceRepository (abstract contract)                │
└─────────────────────────┬───────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────┐
│                       Data                               │
│  AttendanceRepositoryImpl · SupabaseAttendanceApi        │
│  LocalDatabase (sqflite) · FingerprintReader impls       │
└─────────────────────────────────────────────────────────┘
```

## Layers

### Presentation (`lib/presentation/`)

- **Screens:** idle punch UI, PIN-gated enrolment, optional WebView
- **Providers:** Riverpod wiring; no business rules in widgets
- **Widgets:** clock, feedback banner — display only

### Domain (`lib/domain/`)

- **Entities:** `StaffMember`, `AttendancePunch`, `FingerprintTemplate`, `MatchResult`
- **Logic:** `decideNextPunchType`, debounce, match score threshold — **unit tested, no I/O**
- **Use cases:** `ProcessPunchUseCase`, `EnrollFingerprintUseCase`
- **Repositories:** abstract `AttendanceRepository` interface

### Data (`lib/data/`)

- **Supabase:** `SupabaseAttendanceApi` — maps to existing Rozana tables
- **Local:** `LocalDatabase` — staff/template cache + offline punch queue
- **Repository impl:** merges remote + local, sync reconciliation
- **Fingerprint:** pluggable reader (see below)

### Core (`lib/core/`)

- `AppConfig` — `.env` + compile flags
- `KioskService` — MethodChannel for screen-on / future lock-task

## Fingerprint reader abstraction

```dart
abstract class FingerprintReader {
  Future<bool> init();
  Future<FingerprintTemplate> capture();
  Future<MatchResult> identify(List<EnrolledTemplate> roster);
  Stream<ReaderStatus> status();
  Future<void> dispose();
}
```

| Implementation | When | Purpose |
|----------------|------|---------|
| `MockFingerprintReader` | `FINGERPRINT_READER=mock` (default dev) | Full app testable without hardware; deterministic 1:N match |
| `NativeFingerprintReader` | `FINGERPRINT_READER=native` | MethodChannel → `FingerprintReaderPlugin.kt` → vendor SDK |

Selection is via `appConfigProvider` → `fingerprintReaderProvider`. UI and use cases depend only on the interface.

**Channel:** `com.rozana.kiosk/fingerprint`  
**Android:** `FingerprintReaderPlugin.kt` — stub with `TODO(VENDOR_SDK)` blocks

## Offline-first flow

1. On connectivity: `refreshCache()` pulls staff, templates, today's punches
2. Identify uses **local** enrolled templates (works offline)
3. `recordPunch()` writes to `punch_queue` + `punch_cache` immediately
4. If online → `insertPunch` to Supabase → `markPunchSynced`
5. On reconnect → `syncPendingPunches()` drains queue

## Punch flow (happy path)

1. User touches banner / reader triggers scan
2. `ProcessPunchUseCase.execute()`
3. `reader.identify(roster)` → `evaluateMatchResult(minScore)`
4. `decideNextPunchType(todayPunches)` → IN or OUT
5. `repository.recordPunch()` → local queue + optional remote
6. UI shows green confirmation → idle after 3s

## Security notes

- Biometric templates: base64 in Supabase `fingerprint_templates` — **review RLS before production**
- Never log raw template bytes in Dart or Kotlin
- Kiosk uses anon key only; restrict policies to property-scoped access at go-live
- Admin enrolment hidden behind PIN + 5-tap gesture on footer

## State management

**Riverpod** — `Provider`, `FutureProvider`, `StateNotifierProvider`, `StreamProvider` for reader status and connectivity-driven sync.

## Testing strategy

| Test | Covers |
|------|--------|
| `punch_decision_test.dart` | IN/OUT logic, debounce, match threshold |
| `sync_reconciliation_test.dart` | Offline queue + sync + idempotent retry |
| `kiosk_punch_widget_test.dart` | End-to-end UI with `MockFingerprintReader` |
