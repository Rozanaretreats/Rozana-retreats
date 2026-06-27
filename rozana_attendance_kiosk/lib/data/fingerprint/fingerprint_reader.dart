import '../../domain/entities/entities.dart';

/// Vendor-agnostic fingerprint reader contract.
///
/// Real hardware integrates via [NativeFingerprintReader] + Android MethodChannel.
/// Development uses [MockFingerprintReader].
abstract class FingerprintReader {
  Future<bool> init();
  Future<FingerprintTemplate> capture();
  Future<MatchResult> identify(List<EnrolledTemplate> roster);
  Stream<ReaderStatus> status();
  Future<void> dispose();
}
