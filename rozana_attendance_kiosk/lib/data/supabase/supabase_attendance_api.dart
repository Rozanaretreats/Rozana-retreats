import 'dart:convert';

import 'package:supabase_flutter/supabase_flutter.dart';

import '../../domain/entities/entities.dart';

/// Remote Supabase access aligned to existing Rozana schema.
class SupabaseAttendanceApi {
  SupabaseAttendanceApi(this._client);

  final SupabaseClient _client;

  Future<PropertyInfo?> fetchProperty(String propertyId) async {
    final row = await _client
        .from('properties')
        .select('id, name, shift_start, shift_end')
        .eq('id', propertyId)
        .maybeSingle();

    if (row == null) return null;

    return PropertyInfo(
      id: row['id'] as String,
      name: row['name'] as String,
      // ASSUMPTION: shift_start/shift_end are TIME strings from migration 002.
      shiftStart: _normalizeTime(row['shift_start'] as String? ?? '10:00'),
      shiftEnd: _normalizeTime(row['shift_end'] as String? ?? '17:00'),
    );
  }

  Future<List<StaffMember>> fetchStaffForProperty(String propertyId) async {
    final rows = await _client
        .from('staff')
        .select('id, name, role, property_id, active')
        .eq('property_id', propertyId)
        .eq('active', true)
        .order('name');

    return (rows as List<dynamic>).map((row) {
      final map = row as Map<String, dynamic>;
      return StaffMember(
        id: map['id'] as String,
        // ASSUMPTION: existing column is `name`, mapped to fullName.
        fullName: map['name'] as String,
        role: map['role'] as String,
        propertyId: map['property_id'] as String,
        active: map['active'] as bool? ?? true,
      );
    }).toList();
  }

  Future<List<FingerprintTemplate>> fetchTemplatesForStaffIds(
    List<String> staffIds,
  ) async {
    if (staffIds.isEmpty) return [];

    final rows = await _client
        .from('fingerprint_templates')
        .select()
        .inFilter('staff_id', staffIds);

    return (rows as List<dynamic>).map((row) {
      final map = row as Map<String, dynamic>;
      final encoded = map['template_data'] as String;
      return FingerprintTemplate(
        id: map['id'] as String,
        staffId: map['staff_id'] as String,
        templateBytes: base64Decode(encoded),
        fingerIndex: map['finger_index'] as int? ?? 0,
        enrolledAt: DateTime.parse(map['enrolled_at'] as String),
        deviceId: map['device_id'] as String,
      );
    }).toList();
  }

  Future<void> upsertTemplate(FingerprintTemplate template) async {
    // SECURITY: never log template_data.
    // Re-enrol updates the same staff_id + finger_index row (unique constraint).
    await _client.from('fingerprint_templates').upsert(
      {
        'id': template.id,
        'staff_id': template.staffId,
        'template_data': base64Encode(template.templateBytes),
        'finger_index': template.fingerIndex,
        'enrolled_at': template.enrolledAt.toIso8601String(),
        'device_id': template.deviceId,
      },
      onConflict: 'staff_id,finger_index',
    );
  }

  Future<void> deleteTemplate(String templateId) async {
    await _client.from('fingerprint_templates').delete().eq('id', templateId);
  }

  Future<void> insertPunch(AttendancePunch punch) async {
    final local = punch.capturedAt.toLocal();
    await _client.from('attendance_punches').insert({
      'id': punch.id,
      'property_id': punch.propertyId,
      'staff_id': punch.staffId,
      'punch_type': punch.punchType.dbValue,
      // ASSUMPTION: existing schema uses punch_date + punch_time.
      'punch_date':
          '${local.year.toString().padLeft(4, '0')}-${local.month.toString().padLeft(2, '0')}-${local.day.toString().padLeft(2, '0')}',
      'punch_time':
          '${local.hour.toString().padLeft(2, '0')}:${local.minute.toString().padLeft(2, '0')}:${local.second.toString().padLeft(2, '0')}',
      'device_id': punch.deviceId,
      'source': punch.source,
      'match_score': punch.matchScore,
      'synced': punch.synced,
    });
  }

  Future<List<AttendancePunch>> fetchTodayPunches({
    required String propertyId,
    required DateTime day,
  }) async {
    final dateStr =
        '${day.year.toString().padLeft(4, '0')}-${day.month.toString().padLeft(2, '0')}-${day.day.toString().padLeft(2, '0')}';

    final rows = await _client
        .from('attendance_punches')
        .select()
        .eq('property_id', propertyId)
        .eq('punch_date', dateStr)
        .order('punch_time');

    return (rows as List<dynamic>).map((row) {
      final map = row as Map<String, dynamic>;
      final date = map['punch_date'] as String;
      final time = map['punch_time'] as String;
      return AttendancePunch(
        id: map['id'] as String,
        staffId: map['staff_id'] as String,
        propertyId: map['property_id'] as String,
        punchType: PunchTypeX.fromDb(map['punch_type'] as String),
        capturedAt: DateTime.parse('${date}T$time'),
        deviceId: map['device_id'] as String,
        matchScore: (map['match_score'] as num?)?.toDouble(),
        source: map['source'] as String? ?? 'kiosk',
        synced: map['synced'] as bool? ?? true,
      );
    }).toList();
  }

  String _normalizeTime(String value) {
    if (value.length >= 5) return value.substring(0, 5);
    return value;
  }
}
