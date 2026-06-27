import '../entities/entities.dart';

/// Domain contract for attendance data access (online + offline).
abstract class AttendanceRepository {
  String get propertyId;
  String get deviceId;

  Future<bool> get isOnline;

  Future<void> refreshCache();
  Future<PropertyInfo?> getProperty();
  Future<List<StaffMember>> getStaff();
  Future<List<EnrolledTemplate>> getEnrolledTemplates();
  Future<List<AttendancePunch>> getTodayPunches([DateTime? day]);

  /// Most recent punch for a staff member across all days (null if none).
  /// Used to detect an open IN from a previous day (missed check-out).
  Future<AttendancePunch?> getLastPunchForStaff(String staffId);

  Future<AttendancePunch> recordPunch({
    required String staffId,
    required PunchType punchType,
    double? matchScore,
  });

  Future<int> syncPendingPunches();

  Future<FingerprintTemplate> saveEnrolledTemplate(FingerprintTemplate template);
  Future<void> deleteTemplate(String templateId);
  Future<List<FingerprintTemplate>> getTemplatesForStaff(String staffId);
}
