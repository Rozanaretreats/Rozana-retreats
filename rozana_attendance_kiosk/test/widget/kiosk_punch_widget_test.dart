import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:rozana_attendance_kiosk/core/config/app_config.dart';
import 'package:rozana_attendance_kiosk/data/fingerprint/mock_fingerprint_reader.dart';
import 'package:rozana_attendance_kiosk/domain/usecases/punch_usecases.dart';
import 'package:rozana_attendance_kiosk/presentation/providers/app_providers.dart';
import 'package:rozana_attendance_kiosk/presentation/providers/core_providers.dart';
import 'package:rozana_attendance_kiosk/presentation/providers/kiosk_punch_provider.dart';
import 'package:rozana_attendance_kiosk/presentation/screens/kiosk_home_screen.dart';

import '../fakes/fake_attendance_repository.dart';

AppConfig _testConfig() => AppConfig(
      supabaseUrl: 'https://test.supabase.co',
      supabaseAnonKey: 'key',
      propertyId: 'ooty-skyview',
      deviceId: 'test-device',
      adminPin: '1234',
      fingerprintReaderMode: 'mock',
      mockStaffId: 'alice',
      enableWebViewTab: false,
      webAppUrl: '',
      punchDebounceSeconds: 30,
      minMatchScore: 60,
    );

void main() {
  testWidgets('punch happy path shows success then returns to idle', (tester) async {
    final config = _testConfig();
    final reader = MockFingerprintReader(config: config);
    reader.selectStaffForNextScan('alice');
    final repo = FakeAttendanceRepository(config);

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          appConfigProvider.overrideWithValue(config),
          fingerprintReaderProvider.overrideWithValue(reader),
          processPunchUseCaseProvider.overrideWith(
            (ref) async => ProcessPunchUseCase(
              config: config,
              reader: reader,
              repository: repo,
            ),
          ),
          propertyInfoProvider.overrideWith((ref) async => repo.getProperty()),
          staffListProvider.overrideWith((ref) async => repo.getStaff()),
          connectivitySyncProvider.overrideWith((ref) {}),
        ],
        child: const MaterialApp(home: KioskHomeScreen()),
      ),
    );

    await tester.pumpAndSettle();

    expect(find.text('Place finger to punch'), findsOneWidget);

    await tester.tap(find.text('Place finger to punch'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 100));

    await tester.pumpAndSettle(const Duration(seconds: 4));

    expect(find.text('CHECKED IN'), findsOneWidget);
    expect(find.text('Alice'), findsOneWidget);

    await tester.pump(const Duration(seconds: 3));
    await tester.pumpAndSettle();

    expect(find.text('Place finger to punch'), findsOneWidget);
  });
}
