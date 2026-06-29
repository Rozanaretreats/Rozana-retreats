import 'package:flutter/foundation.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';

/// Runtime configuration loaded from `.env` and compile-time flags.
class AppConfig {
  AppConfig({
    required this.supabaseUrl,
    required this.supabaseAnonKey,
    required this.propertyId,
    required this.deviceId,
    required this.adminPin,
    required this.fingerprintReaderMode,
    required this.mockStaffId,
    required this.enableWebViewTab,
    required this.webAppUrl,
    required this.punchDebounceSeconds,
    required this.minMatchScore,
  });

  final String supabaseUrl;
  final String supabaseAnonKey;
  final String propertyId;
  final String deviceId;
  final String adminPin;
  final String fingerprintReaderMode;
  final String? mockStaffId;
  final bool enableWebViewTab;
  final String webAppUrl;
  final int punchDebounceSeconds;
  final double minMatchScore;

  bool get useNativeReader =>
      fingerprintReaderMode.toLowerCase() == 'native';

  bool get useMockReader => !useNativeReader;

  Duration get punchDebounce => Duration(seconds: punchDebounceSeconds);

  static Future<AppConfig> load() async {
    await dotenv.load(fileName: '.env');

    final readerEnv = dotenv.maybeGet('FINGERPRINT_READER') ?? 'mock';
    final effectiveReader = kDebugMode && readerEnv.isEmpty ? 'mock' : readerEnv;

    if (kReleaseMode && effectiveReader.toLowerCase() != 'native') {
      throw StateError(
        'Release builds require FINGERPRINT_READER=native. Mock mode is not allowed in production.',
      );
    }

    final adminPin = dotenv.maybeGet('ADMIN_PIN') ?? (kDebugMode ? '1234' : '');
    if (kReleaseMode && (adminPin.isEmpty || adminPin == '1234')) {
      throw StateError(
        'Set a strong ADMIN_PIN in .env before release builds (not 1234).',
      );
    }

    return AppConfig(
      supabaseUrl: _require('SUPABASE_URL'),
      supabaseAnonKey: _require('SUPABASE_ANON_KEY'),
      propertyId: _require('PROPERTY_ID'),
      deviceId: _require('DEVICE_ID'),
      adminPin: adminPin.isEmpty ? '1234' : adminPin,
      fingerprintReaderMode: effectiveReader,
      mockStaffId: dotenv.maybeGet('MOCK_STAFF_ID'),
      enableWebViewTab:
          (dotenv.maybeGet('ENABLE_WEBVIEW_TAB') ?? 'false').toLowerCase() ==
              'true',
      webAppUrl: dotenv.maybeGet('WEB_APP_URL') ?? '',
      punchDebounceSeconds:
          int.tryParse(dotenv.maybeGet('PUNCH_DEBOUNCE_SECONDS') ?? '') ?? 30,
      minMatchScore:
          double.tryParse(dotenv.maybeGet('MIN_MATCH_SCORE') ?? '') ?? 60,
    );
  }

  static String _require(String key) {
    final value = dotenv.maybeGet(key);
    if (value == null || value.isEmpty) {
      throw StateError('Missing required env: $key');
    }
    return value;
  }
}
