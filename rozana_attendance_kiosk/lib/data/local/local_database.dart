import 'package:path/path.dart';
import 'package:sqflite/sqflite.dart';

import '../../domain/entities/entities.dart';

/// Offline-first local cache and punch sync queue.
class LocalDatabase {
  LocalDatabase(this._db);

  final Database _db;

  static const _dbVersion = 1;

  static Future<LocalDatabase> open(String basePath) async {
    final path = join(basePath, 'rozana_kiosk.db');
    final db = await openDatabase(
      path,
      version: _dbVersion,
      onCreate: (database, version) async {
        await database.execute('''
          CREATE TABLE staff_cache (
            id TEXT PRIMARY KEY,
            full_name TEXT NOT NULL,
            role TEXT NOT NULL,
            property_id TEXT NOT NULL,
            active INTEGER NOT NULL,
            photo_url TEXT,
            updated_at TEXT NOT NULL
          )
        ''');
        await database.execute('''
          CREATE TABLE property_cache (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            shift_start TEXT NOT NULL,
            shift_end TEXT NOT NULL,
            updated_at TEXT NOT NULL
          )
        ''');
        await database.execute('''
          CREATE TABLE template_cache (
            id TEXT PRIMARY KEY,
            staff_id TEXT NOT NULL,
            template_data BLOB NOT NULL,
            finger_index INTEGER NOT NULL,
            enrolled_at TEXT NOT NULL,
            device_id TEXT NOT NULL
          )
        ''');
        await database.execute('''
          CREATE TABLE punch_queue (
            id TEXT PRIMARY KEY,
            staff_id TEXT NOT NULL,
            property_id TEXT NOT NULL,
            punch_type TEXT NOT NULL,
            captured_at TEXT NOT NULL,
            device_id TEXT NOT NULL,
            match_score REAL,
            source TEXT NOT NULL,
            synced INTEGER NOT NULL DEFAULT 0
          )
        ''');
        await database.execute('''
          CREATE TABLE punch_cache (
            id TEXT PRIMARY KEY,
            staff_id TEXT NOT NULL,
            property_id TEXT NOT NULL,
            punch_type TEXT NOT NULL,
            captured_at TEXT NOT NULL,
            device_id TEXT NOT NULL,
            match_score REAL,
            source TEXT NOT NULL,
            synced INTEGER NOT NULL
          )
        ''');
      },
    );
    return LocalDatabase(db);
  }

  Future<void> close() => _db.close();

  Future<void> cacheStaff(List<StaffMember> staff) async {
    final batch = _db.batch();
    for (final member in staff) {
      batch.insert(
        'staff_cache',
        {
          'id': member.id,
          'full_name': member.fullName,
          'role': member.role,
          'property_id': member.propertyId,
          'active': member.active ? 1 : 0,
          'photo_url': member.photoUrl,
          'updated_at': DateTime.now().toUtc().toIso8601String(),
        },
        conflictAlgorithm: ConflictAlgorithm.replace,
      );
    }
    await batch.commit(noResult: true);
  }

  Future<List<StaffMember>> getStaffForProperty(String propertyId) async {
    final rows = await _db.query(
      'staff_cache',
      where: 'property_id = ? AND active = 1',
      whereArgs: [propertyId],
      orderBy: 'full_name ASC',
    );
    return rows.map(_mapStaff).toList();
  }

  Future<void> cacheProperty(PropertyInfo property) async {
    await _db.insert(
      'property_cache',
      {
        'id': property.id,
        'name': property.name,
        'shift_start': property.shiftStart,
        'shift_end': property.shiftEnd,
        'updated_at': DateTime.now().toUtc().toIso8601String(),
      },
      conflictAlgorithm: ConflictAlgorithm.replace,
    );
  }

  Future<PropertyInfo?> getProperty(String propertyId) async {
    final rows = await _db.query(
      'property_cache',
      where: 'id = ?',
      whereArgs: [propertyId],
      limit: 1,
    );
    if (rows.isEmpty) return null;
    return _mapProperty(rows.first);
  }

  Future<void> cacheTemplates(List<FingerprintTemplate> templates) async {
    final batch = _db.batch();
    await _db.delete('template_cache');
    for (final t in templates) {
      batch.insert('template_cache', {
        'id': t.id,
        'staff_id': t.staffId,
        'template_data': t.templateBytes,
        'finger_index': t.fingerIndex,
        'enrolled_at': t.enrolledAt.toIso8601String(),
        'device_id': t.deviceId,
      });
    }
    await batch.commit(noResult: true);
  }

  Future<List<EnrolledTemplate>> getEnrolledTemplates(
    String propertyId,
  ) async {
    final staffIds = (await getStaffForProperty(propertyId))
        .map((s) => s.id)
        .toSet();
    if (staffIds.isEmpty) return [];

    final rows = await _db.query('template_cache');
    return rows
        .where((r) => staffIds.contains(r['staff_id'] as String))
        .map((r) {
      final template = FingerprintTemplate(
        id: r['id'] as String,
        staffId: r['staff_id'] as String,
        templateBytes: r['template_data'] as List<int>,
        fingerIndex: r['finger_index'] as int,
        enrolledAt: DateTime.parse(r['enrolled_at'] as String),
        deviceId: r['device_id'] as String,
      );
      return EnrolledTemplate(
        staffId: template.staffId,
        template: template,
        fingerIndex: template.fingerIndex,
      );
    }).toList();
  }

  Future<void> upsertTemplate(FingerprintTemplate template) async {
    await _db.delete(
      'template_cache',
      where: 'staff_id = ? AND finger_index = ?',
      whereArgs: [template.staffId, template.fingerIndex],
    );
    await _db.insert(
      'template_cache',
      {
        'id': template.id,
        'staff_id': template.staffId,
        'template_data': template.templateBytes,
        'finger_index': template.fingerIndex,
        'enrolled_at': template.enrolledAt.toIso8601String(),
        'device_id': template.deviceId,
      },
      conflictAlgorithm: ConflictAlgorithm.replace,
    );
  }

  Future<void> deleteTemplate(String templateId) async {
    await _db.delete(
      'template_cache',
      where: 'id = ?',
      whereArgs: [templateId],
    );
  }

  Future<void> enqueuePunch(AttendancePunch punch) async {
    await _db.insert('punch_queue', _punchToRow(punch, synced: false));
    await _db.insert(
      'punch_cache',
      _punchToRow(punch, synced: punch.synced),
      conflictAlgorithm: ConflictAlgorithm.replace,
    );
  }

  Future<List<AttendancePunch>> getUnsyncedPunches() async {
    final rows = await _db.query(
      'punch_queue',
      where: 'synced = 0',
      orderBy: 'captured_at ASC',
    );
    return rows.map(_mapPunch).toList();
  }

  Future<void> markPunchSynced(String punchId) async {
    await _db.update(
      'punch_queue',
      {'synced': 1},
      where: 'id = ?',
      whereArgs: [punchId],
    );
    await _db.update(
      'punch_cache',
      {'synced': 1},
      where: 'id = ?',
      whereArgs: [punchId],
    );
  }

  Future<List<AttendancePunch>> getTodayPunches({
    required String propertyId,
    required DateTime day,
  }) async {
    final start = DateTime(day.year, day.month, day.day);
    final end = start.add(const Duration(days: 1));
    final rows = await _db.query(
      'punch_cache',
      where: 'property_id = ? AND captured_at >= ? AND captured_at < ?',
      whereArgs: [
        propertyId,
        start.toIso8601String(),
        end.toIso8601String(),
      ],
      orderBy: 'captured_at ASC',
    );
    return rows.map(_mapPunch).toList();
  }

  Future<AttendancePunch?> getLastPunchForStaff(String staffId) async {
    final rows = await _db.query(
      'punch_cache',
      where: 'staff_id = ?',
      whereArgs: [staffId],
      orderBy: 'captured_at DESC',
      limit: 1,
    );
    if (rows.isEmpty) return null;
    return _mapPunch(rows.first);
  }

  Future<void> mergeRemotePunches(List<AttendancePunch> punches) async {
    final batch = _db.batch();
    for (final punch in punches) {
      batch.insert(
        'punch_cache',
        _punchToRow(punch, synced: true),
        conflictAlgorithm: ConflictAlgorithm.ignore,
      );
    }
    await batch.commit(noResult: true);
  }

  Map<String, Object?> _punchToRow(AttendancePunch punch, {required bool synced}) =>
      {
        'id': punch.id,
        'staff_id': punch.staffId,
        'property_id': punch.propertyId,
        'punch_type': punch.punchType.dbValue,
        'captured_at': punch.capturedAt.toIso8601String(),
        'device_id': punch.deviceId,
        'match_score': punch.matchScore,
        'source': punch.source,
        'synced': synced ? 1 : 0,
      };

  AttendancePunch _mapPunch(Map<String, Object?> row) => AttendancePunch(
        id: row['id']! as String,
        staffId: row['staff_id']! as String,
        propertyId: row['property_id']! as String,
        punchType: PunchTypeX.fromDb(row['punch_type']! as String),
        capturedAt: DateTime.parse(row['captured_at']! as String),
        deviceId: row['device_id']! as String,
        matchScore: row['match_score'] as double?,
        source: row['source']! as String,
        synced: (row['synced']! as int) == 1,
      );

  StaffMember _mapStaff(Map<String, Object?> row) => StaffMember(
        id: row['id']! as String,
        fullName: row['full_name']! as String,
        role: row['role']! as String,
        propertyId: row['property_id']! as String,
        active: (row['active']! as int) == 1,
        photoUrl: row['photo_url'] as String?,
      );

  PropertyInfo _mapProperty(Map<String, Object?> row) => PropertyInfo(
        id: row['id']! as String,
        name: row['name']! as String,
        shiftStart: row['shift_start']! as String,
        shiftEnd: row['shift_end']! as String,
      );
}
