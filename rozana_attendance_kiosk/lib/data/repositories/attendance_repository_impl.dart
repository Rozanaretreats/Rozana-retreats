import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:supabase_flutter/supabase_flutter.dart' show PostgrestException;
import 'package:uuid/uuid.dart';

import '../../core/config/app_config.dart';
import '../../domain/entities/entities.dart';
import '../../domain/repositories/attendance_repository.dart' as domain;
import '../local/local_database.dart';
import '../supabase/supabase_attendance_api.dart';

class AttendanceRepositoryImpl implements domain.AttendanceRepository {
  AttendanceRepositoryImpl({
    required AppConfig config,
    required LocalDatabase localDb,
    required SupabaseAttendanceApi remoteApi,
    required Connectivity connectivity,
    Uuid? uuid,
  })  : _config = config,
        _local = localDb,
        _remote = remoteApi,
        _connectivity = connectivity,
        _uuid = uuid ?? const Uuid();

  final AppConfig _config;
  final LocalDatabase _local;
  final SupabaseAttendanceApi _remote;
  final Connectivity _connectivity;
  final Uuid _uuid;

  @override
  String get propertyId => _config.propertyId;

  @override
  String get deviceId => _config.deviceId;

  @override
  Future<bool> get isOnline async {
    final result = await _connectivity.checkConnectivity();
    return !result.contains(ConnectivityResult.none);
  }

  @override
  Future<void> refreshCache() async {
    if (!await isOnline) return;

    final property = await _remote.fetchProperty(_config.propertyId);
    if (property != null) {
      await _local.cacheProperty(property);
    }

    final staff = await _remote.fetchStaffForProperty(_config.propertyId);
    await _local.cacheStaff(staff);

    final staffIds = staff.map((s) => s.id).toList();
    try {
      // Push any locally-enrolled templates first. cacheTemplates() below
      // replaces the local cache with the remote set, so a fingerprint
      // enrolled while offline would be lost if we pulled before pushing.
      // upsertTemplate is idempotent (onConflict staff_id,finger_index).
      final localTemplates = await _local.getEnrolledTemplates(_config.propertyId);
      for (final enrolled in localTemplates) {
        try {
          await _remote.upsertTemplate(enrolled.template);
        } catch (_) {
          // Best-effort; a failed push just leaves the local copy in place.
        }
      }

      final templates = await _remote.fetchTemplatesForStaffIds(staffIds);
      await _local.cacheTemplates(templates);
    } catch (_) {
      // Table may not exist until kiosk_migrations.sql is applied.
    }

    final today = DateTime.now();
    try {
      final remotePunches = await _remote.fetchTodayPunches(
        propertyId: _config.propertyId,
        day: today,
      );
      await _local.mergeRemotePunches(remotePunches);
    } catch (_) {
      // Punch columns may be missing until migration is applied.
    }
  }

  @override
  Future<PropertyInfo?> getProperty() =>
      _local.getProperty(_config.propertyId);

  @override
  Future<List<StaffMember>> getStaff() =>
      _local.getStaffForProperty(_config.propertyId);

  @override
  Future<List<EnrolledTemplate>> getEnrolledTemplates() =>
      _local.getEnrolledTemplates(_config.propertyId);

  @override
  Future<List<AttendancePunch>> getTodayPunches([DateTime? day]) =>
      _local.getTodayPunches(
        propertyId: _config.propertyId,
        day: day ?? DateTime.now(),
      );

  @override
  Future<AttendancePunch?> getLastPunchForStaff(String staffId) =>
      _local.getLastPunchForStaff(staffId);

  @override
  Future<AttendancePunch> recordPunch({
    required String staffId,
    required PunchType punchType,
    double? matchScore,
  }) async {
    final punch = AttendancePunch(
      id: _uuid.v4(),
      staffId: staffId,
      propertyId: _config.propertyId,
      punchType: punchType,
      capturedAt: DateTime.now(),
      deviceId: _config.deviceId,
      matchScore: matchScore,
      source: 'kiosk',
      synced: false,
    );

    await _local.enqueuePunch(punch);

    if (await isOnline) {
      await _syncPunch(punch);
    }

    return punch;
  }

  @override
  Future<int> syncPendingPunches() async {
    if (!await isOnline) return 0;

    final pending = await _local.getUnsyncedPunches();
    var synced = 0;

    for (final punch in pending) {
      try {
        await _syncPunch(punch);
        synced++;
      } catch (_) {
        break;
      }
    }

    return synced;
  }

  Future<void> _syncPunch(AttendancePunch punch) async {
    final toUpload = AttendancePunch(
      id: punch.id,
      staffId: punch.staffId,
      propertyId: punch.propertyId,
      punchType: punch.punchType,
      capturedAt: punch.capturedAt,
      deviceId: punch.deviceId,
      matchScore: punch.matchScore,
      source: punch.source,
      synced: true,
    );

    try {
      await _remote.insertPunch(toUpload);
    } on PostgrestException catch (e) {
      // 23505 = duplicate primary key: this punch already reached Supabase
      // (e.g. the app crashed after the insert but before marking it synced).
      // Treat it as already-synced so the queue can clear instead of looping.
      if (e.code != '23505') rethrow;
    }
    await _local.markPunchSynced(punch.id);
  }

  @override
  Future<FingerprintTemplate> saveEnrolledTemplate(
    FingerprintTemplate template,
  ) async {
    await _local.upsertTemplate(template);

    if (await isOnline) {
      await _remote.upsertTemplate(template);
    }

    return template;
  }

  @override
  Future<void> deleteTemplate(String templateId) async {
    await _local.deleteTemplate(templateId);
    if (await isOnline) {
      await _remote.deleteTemplate(templateId);
    }
  }

  @override
  Future<List<FingerprintTemplate>> getTemplatesForStaff(String staffId) async {
    final enrolled = await _local.getEnrolledTemplates(_config.propertyId);
    return enrolled
        .where((e) => e.staffId == staffId)
        .map((e) => e.template)
        .toList();
  }
}
