import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'core/config/app_config.dart';
import 'core/kiosk/kiosk_service.dart';
import 'core/platform/desktop_init.dart';
import 'presentation/providers/app_providers.dart';
import 'presentation/providers/core_providers.dart';
import 'presentation/screens/kiosk_home_screen.dart';

class RozanaKioskApp extends ConsumerStatefulWidget {
  const RozanaKioskApp({super.key});

  @override
  ConsumerState<RozanaKioskApp> createState() => _RozanaKioskAppState();
}

class _RozanaKioskAppState extends ConsumerState<RozanaKioskApp> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      await KioskService.enableKioskMode();
      await KioskService.keepScreenOn(true);
      final reader = ref.read(fingerprintReaderProvider);
      await reader.init();

      // Flush any punches that were queued offline in a previous session.
      // Connectivity changes already trigger this, but a fresh launch while
      // already online would otherwise leave them sitting in the queue.
      try {
        final repo = await ref.read(attendanceRepositoryProvider.future);
        await repo.syncPendingPunches();
      } catch (_) {
        // Offline or backend not reachable yet; connectivity listener retries.
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Rozana Attendance',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF1A237E),
          brightness: Brightness.light,
        ),
        useMaterial3: true,
        textTheme: const TextTheme(
          displayLarge: TextStyle(fontSize: 72),
          headlineMedium: TextStyle(fontSize: 32),
          headlineSmall: TextStyle(fontSize: 24),
        ),
      ),
      home: const KioskHomeScreen(),
    );
  }
}

Future<void> bootstrap() async {
  WidgetsFlutterBinding.ensureInitialized();
  initDesktopDatabaseIfNeeded();

  final config = await AppConfig.load();

  await Supabase.initialize(
    url: config.supabaseUrl,
    anonKey: config.supabaseAnonKey,
  );

  runApp(
    ProviderScope(
      overrides: [
        appConfigProvider.overrideWithValue(config),
      ],
      child: const RozanaKioskApp(),
    ),
  );
}
