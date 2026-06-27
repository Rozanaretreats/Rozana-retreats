import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/config/app_config.dart';
import '../../data/fingerprint/fingerprint_reader.dart';
import '../../data/fingerprint/mock_fingerprint_reader.dart';
import '../../data/fingerprint/native_fingerprint_reader.dart';

final fingerprintReaderProvider = Provider<FingerprintReader>((ref) {
  final config = ref.watch(appConfigProvider);
  if (config.useNativeReader) {
    return NativeFingerprintReader();
  }
  return MockFingerprintReader(config: config);
});

final appConfigProvider = Provider<AppConfig>((ref) {
  throw UnimplementedError('AppConfig must be overridden in main()');
});
