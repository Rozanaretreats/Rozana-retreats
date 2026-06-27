import 'package:flutter/services.dart';

/// Android kiosk hardening helpers.
///
/// Full device lock requires Android Enterprise / kiosk launcher setup.
/// See README.md for MDM guidance.
class KioskService {
  static const _channel = MethodChannel('com.rozana.kiosk/kiosk');

  static Future<void> enableKioskMode() async {
    try {
      await _channel.invokeMethod<void>('enableKioskMode');
    } on Exception {
      // Android-only plugin; ignore on Windows/macOS/Linux.
    }
  }

  static Future<void> keepScreenOn(bool enabled) async {
    try {
      await _channel.invokeMethod<void>('keepScreenOn', {'enabled': enabled});
    } on Exception {
      // Ignore on unsupported platforms.
    }
  }

  static Future<bool> handleBackPress({required bool adminUnlocked}) async {
    if (adminUnlocked) return true;
    return false;
  }
}
