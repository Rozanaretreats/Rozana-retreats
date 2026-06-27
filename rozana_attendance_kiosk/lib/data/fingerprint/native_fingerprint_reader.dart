import 'dart:async';
import 'dart:convert';

import 'package:flutter/services.dart';

import '../../domain/entities/entities.dart';
import 'fingerprint_reader.dart';

/// Stub wiring to vendor SDK via MethodChannel.
///
/// Reader model placeholder: <<<E.G. MANTRA MFS100 — REPLACE WITH ACTUAL MODEL>>>
/// Vendor SDK: <<<SDK NAME / PACKAGE — REPLACE>>>
///
/// Android implementation: [FingerprintReaderPlugin.kt]
const _channel = MethodChannel('com.rozana.kiosk/fingerprint');

class NativeFingerprintReader implements FingerprintReader {
  final _statusController = StreamController<ReaderStatus>.broadcast();

  @override
  Stream<ReaderStatus> status() => _statusController.stream;

  @override
  Future<bool> init() async {
    try {
      final result = await _channel.invokeMethod<bool>('init');
      _statusController.add(
        result == true ? ReaderStatus.ready : ReaderStatus.error,
      );
      return result ?? false;
    } on PlatformException catch (e) {
      _statusController.add(ReaderStatus.error);
      throw FingerprintReaderException('Init failed: ${e.message}');
    }
  }

  @override
  Future<FingerprintTemplate> capture() async {
    _statusController.add(ReaderStatus.capturing);
    try {
      final result = await _channel.invokeMapMethod<String, dynamic>('capture');
      _statusController.add(ReaderStatus.ready);

      if (result == null) {
        throw const FingerprintReaderException('Capture returned null');
      }

      // TODO(VENDOR_SDK): Map native capture payload to [FingerprintTemplate].
      // Expected keys from Kotlin: staffId (optional), templateBase64, fingerIndex
      final templateBase64 = result['templateBase64'] as String? ?? '';
      final bytes = base64Decode(templateBase64);

      return FingerprintTemplate(
        id: result['id'] as String? ?? DateTime.now().millisecondsSinceEpoch.toString(),
        staffId: result['staffId'] as String? ?? '',
        templateBytes: bytes,
        fingerIndex: result['fingerIndex'] as int? ?? 0,
        enrolledAt: DateTime.now().toUtc(),
        deviceId: result['deviceId'] as String? ?? 'native-device',
      );
    } on PlatformException catch (e) {
      _statusController.add(ReaderStatus.error);
      throw FingerprintReaderException('Capture failed: ${e.message}');
    }
  }

  @override
  Future<MatchResult> identify(List<EnrolledTemplate> roster) async {
    _statusController.add(ReaderStatus.capturing);
    try {
      // TODO(VENDOR_SDK): Pass roster templates to native 1:N identify.
      // Do NOT log template bytes.
      final payload = roster
          .map(
            (e) => {
              'staffId': e.staffId,
              'fingerIndex': e.fingerIndex,
              'templateBase64': base64Encode(e.template.templateBytes),
            },
          )
          .toList();

      final result = await _channel.invokeMapMethod<String, dynamic>(
        'identify',
        {'templates': payload},
      );
      _statusController.add(ReaderStatus.ready);

      if (result == null) {
        return MatchResult.noMatch();
      }

      final matched = result['matched'] as bool? ?? false;
      if (!matched) {
        return MatchResult.noMatch(
          message: result['message'] as String? ?? 'No match',
        );
      }

      return MatchResult.success(
        staffId: result['staffId'] as String,
        score: (result['score'] as num?)?.toDouble() ?? 0,
      );
    } on PlatformException catch (e) {
      _statusController.add(ReaderStatus.error);
      throw FingerprintReaderException('Identify failed: ${e.message}');
    }
  }

  @override
  Future<void> dispose() async {
    try {
      await _channel.invokeMethod<void>('dispose');
    } on PlatformException {
      // Best-effort cleanup.
    }
    await _statusController.close();
  }
}

class FingerprintReaderException implements Exception {
  const FingerprintReaderException(this.message);
  final String message;

  @override
  String toString() => 'FingerprintReaderException: $message';
}
