import 'dart:async';
import 'dart:convert';
import 'dart:math';

import 'package:crypto/crypto.dart';

import '../../core/config/app_config.dart';
import '../../domain/entities/entities.dart';
import 'fingerprint_reader.dart';

/// Fully working fake reader for development and widget tests.
///
/// Simulates capture delay, emits status updates, and performs deterministic
/// 1:N matching against enrolled template hashes.
class MockFingerprintReader implements FingerprintReader {
  MockFingerprintReader({required AppConfig config}) : _config = config;

  final AppConfig _config;
  final _statusController = StreamController<ReaderStatus>.broadcast();
  String? _selectedStaffId;

  @override
  Stream<ReaderStatus> status() => _statusController.stream;

  @override
  Future<bool> init() async {
    await Future<void>.delayed(const Duration(milliseconds: 300));
    _statusController.add(ReaderStatus.ready);
    return true;
  }

  /// Select which staff id the next simulated scan will match.
  void selectStaffForNextScan(String staffId) {
    _selectedStaffId = staffId;
  }

  @override
  Future<FingerprintTemplate> capture() async {
    _statusController.add(ReaderStatus.capturing);
    await Future<void>.delayed(const Duration(milliseconds: 800));

    final staffId = _selectedStaffId ?? _config.mockStaffId ?? 'mock-staff-1';
    final bytes = _syntheticTemplate(staffId, fingerIndex: 0);

    _statusController.add(ReaderStatus.ready);
    return FingerprintTemplate(
      id: 'mock-${staffId}-${DateTime.now().millisecondsSinceEpoch}',
      staffId: staffId,
      templateBytes: bytes,
      fingerIndex: 0,
      enrolledAt: DateTime.now().toUtc(),
      deviceId: _config.deviceId,
    );
  }

  @override
  Future<MatchResult> identify(List<EnrolledTemplate> roster) async {
    _statusController.add(ReaderStatus.capturing);
    await Future<void>.delayed(const Duration(milliseconds: 600));

    if (roster.isEmpty) {
      _statusController.add(ReaderStatus.ready);
      return MatchResult.noMatch(message: 'No enrolled templates');
    }

    final probeStaffId =
        _selectedStaffId ?? _config.mockStaffId ?? roster.first.staffId;
    final probe = _syntheticTemplate(probeStaffId, fingerIndex: 0);

    EnrolledTemplate? best;
    var bestScore = 0.0;

    for (final enrolled in roster) {
      final score = _compareTemplates(probe, enrolled.template.templateBytes);
      if (score > bestScore) {
        bestScore = score;
        best = enrolled;
      }
    }

    _statusController.add(ReaderStatus.ready);

    if (best == null || bestScore < 40) {
      return MatchResult.noMatch(message: 'Finger not recognized');
    }

    return MatchResult.success(staffId: best.staffId, score: bestScore);
  }

  @override
  Future<void> dispose() async {
    await _statusController.close();
  }

  List<int> _syntheticTemplate(String staffId, {required int fingerIndex}) {
    final seed = '$staffId:$fingerIndex:rozana-mock';
    final digest = sha256.convert(utf8.encode(seed));
    return digest.bytes;
  }

  double _compareTemplates(List<int> a, List<int> b) {
    if (a.length != b.length) return 0;
    var matches = 0;
    for (var i = 0; i < a.length; i++) {
      if (a[i] == b[i]) matches++;
    }
    final ratio = matches / a.length;
    return (ratio * 100).clamp(0, 100);
  }
}

/// Exposed for tests — generates the same synthetic bytes as capture.
List<int> mockTemplateBytesForStaff(String staffId, {int fingerIndex = 0}) {
  final seed = '$staffId:$fingerIndex:rozana-mock';
  return sha256.convert(utf8.encode(seed)).bytes;
}

/// Random jitter helper if needed for stress tests.
double mockRandomScore(Random random) => 50 + random.nextDouble() * 50;
