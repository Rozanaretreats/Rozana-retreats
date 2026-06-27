import 'package:rozana_attendance_kiosk/core/config/app_config.dart';
import 'package:rozana_attendance_kiosk/data/fingerprint/mock_fingerprint_reader.dart';
import 'package:rozana_attendance_kiosk/domain/entities/entities.dart';
import 'package:rozana_attendance_kiosk/domain/repositories/attendance_repository.dart';

/// In-memory fake for widget / use-case tests.
class FakeAttendanceRepository implements AttendanceRepository {
  FakeAttendanceRepository(this._config);

  final AppConfig _config;
  final List<AttendancePunch> _punches = [];

  @override
  String get propertyId => _config.propertyId;

  @override
  String get deviceId => _config.deviceId;

  @override
  Future<bool> get isOnline async => false;

  @override
  Future<void> refreshCache() async {}

  @override
  Future<PropertyInfo?> getProperty() async => PropertyInfo(
        id: _config.propertyId,
        name: 'Test Property',
        shiftStart: '10:00',
        shiftEnd: '17:00',
      );

  @override
  Future<List<StaffMember>> getStaff() async => [
        StaffMember(
          id: 'alice',
          fullName: 'Alice',
          role: 'housekeeping',
          propertyId: _config.propertyId,
          active: true,
        ),
      ];

  @override
  Future<List<EnrolledTemplate>> getEnrolledTemplates() async {
    final bytes = mockTemplateBytesForStaff('alice');
    return [
      EnrolledTemplate(
        staffId: 'alice',
        template: FingerprintTemplate(
          id: 't1',
          staffId: 'alice',
          templateBytes: bytes,
          fingerIndex: 0,
          enrolledAt: DateTime.now(),
          deviceId: 'test',
        ),
      ),
    ];
  }

  @override
  Future<List<AttendancePunch>> getTodayPunches([DateTime? day]) async =>
      List.unmodifiable(_punches);

  @override
  Future<AttendancePunch?> getLastPunchForStaff(String staffId) async {
    final forStaff = _punches.where((p) => p.staffId == staffId).toList()
      ..sort((a, b) => b.capturedAt.compareTo(a.capturedAt));
    return forStaff.isEmpty ? null : forStaff.first;
  }

  @override
  Future<AttendancePunch> recordPunch({
    required String staffId,
    required PunchType punchType,
    double? matchScore,
  }) async {
    final punch = AttendancePunch(
      id: 'p-${_punches.length + 1}',
      staffId: staffId,
      propertyId: propertyId,
      punchType: punchType,
      capturedAt: DateTime.now(),
      deviceId: deviceId,
      matchScore: matchScore,
      synced: false,
    );
    _punches.add(punch);
    return punch;
  }

  @override
  Future<int> syncPendingPunches() async => 0;

  @override
  Future<FingerprintTemplate> saveEnrolledTemplate(
    FingerprintTemplate template,
  ) async =>
      template;

  @override
  Future<void> deleteTemplate(String templateId) async {}

  @override
  Future<List<FingerprintTemplate>> getTemplatesForStaff(String staffId) async =>
      [];
}
