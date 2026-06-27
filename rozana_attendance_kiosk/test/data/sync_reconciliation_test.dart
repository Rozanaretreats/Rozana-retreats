import 'dart:io';

import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:sqflite_common_ffi/sqflite_ffi.dart';

import 'package:rozana_attendance_kiosk/core/config/app_config.dart';
import 'package:rozana_attendance_kiosk/data/local/local_database.dart';
import 'package:rozana_attendance_kiosk/data/repositories/attendance_repository_impl.dart';
import 'package:rozana_attendance_kiosk/domain/repositories/attendance_repository.dart';
import 'package:rozana_attendance_kiosk/data/supabase/supabase_attendance_api.dart';
import 'package:rozana_attendance_kiosk/domain/entities/entities.dart';

class _MockRemote extends Mock implements SupabaseAttendanceApi {}

class _FakeConnectivity extends Connectivity {
  _FakeConnectivity(this._online);

  final bool _online;

  @override
  Future<List<ConnectivityResult>> checkConnectivity() async {
    return _online
        ? [ConnectivityResult.wifi]
        : [ConnectivityResult.none];
  }
}

AppConfig _testConfig() => AppConfig(
      supabaseUrl: 'https://test.supabase.co',
      supabaseAnonKey: 'key',
      propertyId: 'ooty-skyview',
      deviceId: 'test-device',
      adminPin: '1234',
      fingerprintReaderMode: 'mock',
      mockStaffId: null,
      enableWebViewTab: false,
      webAppUrl: '',
      punchDebounceSeconds: 30,
      minMatchScore: 60,
    );

void main() {
  late Directory tempDir;
  late LocalDatabase local;
  late _MockRemote remote;

  setUpAll(() {
    sqfliteFfiInit();
    databaseFactory = databaseFactoryFfi;
    registerFallbackValue(
      AttendancePunch(
        id: 'fallback',
        staffId: 's',
        propertyId: 'p',
        punchType: PunchType.inPunch,
        capturedAt: DateTime.now(),
        deviceId: 'd',
      ),
    );
  });

  setUp(() async {
    tempDir = await Directory.systemTemp.createTemp('kiosk_test_');
    local = await LocalDatabase.open(tempDir.path);
    remote = _MockRemote();
  });

  tearDown(() async {
    await local.close();
    await tempDir.delete(recursive: true);
  });

  test('offline punch is queued then synced when online', () async {
    final repo = AttendanceRepositoryImpl(
      config: _testConfig(),
      localDb: local,
      remoteApi: remote,
      connectivity: _FakeConnectivity(false),
    );

    when(() => remote.insertPunch(any())).thenAnswer((_) async {});

    final punch = await repo.recordPunch(
      staffId: 'staff-1',
      punchType: PunchType.inPunch,
      matchScore: 90,
    );

    expect(punch.synced, isFalse);
    final pending = await local.getUnsyncedPunches();
    expect(pending, hasLength(1));

    final onlineRepo = AttendanceRepositoryImpl(
      config: _testConfig(),
      localDb: local,
      remoteApi: remote,
      connectivity: _FakeConnectivity(true),
    );

    final syncedCount = await onlineRepo.syncPendingPunches();
    expect(syncedCount, 1);
    verify(() => remote.insertPunch(any())).called(1);

    final stillPending = await local.getUnsyncedPunches();
    expect(stillPending, isEmpty);
  });

  test('duplicate sync is idempotent by punch id', () async {
    when(() => remote.insertPunch(any())).thenAnswer((_) async {});

    final repo = AttendanceRepositoryImpl(
      config: _testConfig(),
      localDb: local,
      remoteApi: remote,
      connectivity: _FakeConnectivity(true),
    );

    await repo.recordPunch(
      staffId: 'staff-1',
      punchType: PunchType.inPunch,
    );

    final secondSync = await repo.syncPendingPunches();
    expect(secondSync, 0);
    verify(() => remote.insertPunch(any())).called(1);
  });
}
