import 'package:uuid/uuid.dart';

import '../../core/config/app_config.dart';
import '../../domain/entities/entities.dart';
import '../../domain/logic/punch_decision.dart';
import '../../domain/repositories/attendance_repository.dart';
import '../../data/fingerprint/fingerprint_reader.dart';
import '../../data/fingerprint/mock_fingerprint_reader.dart';
import '../../data/fingerprint/native_fingerprint_reader.dart';

sealed class PunchFlowResult {
  const PunchFlowResult();
}

class PunchSuccess extends PunchFlowResult {
  const PunchSuccess({
    required this.staff,
    required this.punch,
    required this.decision,
  });

  final StaffMember staff;
  final AttendancePunch punch;
  final PunchDecision decision;
}

class PunchNoMatch extends PunchFlowResult {
  const PunchNoMatch(this.message);
  final String message;
}

class PunchDebounced extends PunchFlowResult {
  const PunchDebounced(this.message);
  final String message;
}

class PunchError extends PunchFlowResult {
  const PunchError(this.message);
  final String message;
}

/// Orchestrates identify → decide IN/OUT → record punch.
class ProcessPunchUseCase {
  ProcessPunchUseCase({
    required AppConfig config,
    required FingerprintReader reader,
    required AttendanceRepository repository,
  })  : _config = config,
        _reader = reader,
        _repository = repository;

  final AppConfig _config;
  final FingerprintReader _reader;
  final AttendanceRepository _repository;

  Future<PunchFlowResult> execute() async {
    try {
      final roster = await _repository.getEnrolledTemplates();
      if (roster.isEmpty) {
        return const PunchNoMatch('No fingerprints enrolled for this property');
      }

      final rawMatch = await _reader.identify(roster);
      final match = evaluateMatchResult(
        rawMatch,
        minScore: _config.minMatchScore,
      );

      if (!match.matched || match.staffId == null) {
        return PunchNoMatch(match.message ?? 'Finger not recognized');
      }

      final staffList = await _repository.getStaff();
      StaffMember? staff;
      for (final member in staffList) {
        if (member.id == match.staffId) {
          staff = member;
          break;
        }
      }
      if (staff == null) {
        return const PunchNoMatch('Staff not found on roster');
      }

      if (await _repository.isOnline) {
        await _repository.refreshCache();
      }

      final now = DateTime.now();
      final todayPunches = await _repository.getTodayPunches(now);

      if (isWithinDebounceWindow(
        todayPunches: todayPunches,
        staffId: staff.id,
        now: now,
        debounce: _config.punchDebounce,
      )) {
        return const PunchDebounced('Please wait before punching again');
      }

      final lastPunch = await _repository.getLastPunchForStaff(staff.id);
      final decision = decideNextPunchType(
        todayPunches: todayPunches,
        staffId: staff.id,
        lastPunchBeforeToday: lastPunch,
      );

      final punch = await _repository.recordPunch(
        staffId: staff.id,
        punchType: decision.punchType,
        matchScore: match.score,
      );

      return PunchSuccess(staff: staff, punch: punch, decision: decision);
    } on FingerprintReaderException catch (e) {
      return PunchError(e.message);
    } catch (e) {
      return PunchError('Punch failed: $e');
    }
  }
}

class EnrollFingerprintUseCase {
  EnrollFingerprintUseCase({
    required FingerprintReader reader,
    required AttendanceRepository repository,
    Uuid? uuid,
  })  : _reader = reader,
        _repository = repository,
        _uuid = uuid ?? const Uuid();

  final FingerprintReader _reader;
  final AttendanceRepository _repository;
  final Uuid _uuid;

  Future<FingerprintTemplate> enroll({
    required String staffId,
    int fingerIndex = 0,
  }) async {
    // Mock reader must capture bytes for THIS staff id (not a generic default).
    if (_reader is MockFingerprintReader) {
      _reader.selectStaffForNextScan(staffId);
    }

    final captured = await _reader.capture();

    final existing = await _repository.getTemplatesForStaff(staffId);
    FingerprintTemplate? prior;
    for (final t in existing) {
      if (t.fingerIndex == fingerIndex) {
        prior = t;
        break;
      }
    }

    final template = FingerprintTemplate(
      id: prior?.id ?? _uuid.v4(),
      staffId: staffId,
      templateBytes: captured.templateBytes,
      fingerIndex: fingerIndex,
      enrolledAt: DateTime.now().toUtc(),
      deviceId: captured.deviceId,
    );
    return _repository.saveEnrolledTemplate(template);
  }
}
