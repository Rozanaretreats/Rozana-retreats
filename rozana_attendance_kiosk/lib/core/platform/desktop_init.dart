import 'dart:io';

import 'package:sqflite_common_ffi/sqflite_ffi.dart';

/// Desktop (Windows/macOS/Linux) needs FFI-backed SQLite — mobile uses sqflite natively.
void initDesktopDatabaseIfNeeded() {
  if (Platform.isWindows || Platform.isLinux || Platform.isMacOS) {
    sqfliteFfiInit();
    databaseFactory = databaseFactoryFfi;
  }
}

/// True when running on a dev laptop/desktop OS (not Android kiosk tablet).
bool get isDesktopDevPlatform {
  if (Platform.isWindows || Platform.isLinux || Platform.isMacOS) return true;
  return false;
}
