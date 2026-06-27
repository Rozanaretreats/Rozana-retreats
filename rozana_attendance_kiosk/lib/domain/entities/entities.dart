import 'package:equatable/equatable.dart';

enum PunchType { inPunch, outPunch }

extension PunchTypeX on PunchType {
  String get dbValue => this == PunchType.inPunch ? 'in' : 'out';

  static PunchType fromDb(String value) =>
      value == 'in' ? PunchType.inPunch : PunchType.outPunch;
}

class StaffMember extends Equatable {
  const StaffMember({
    required this.id,
    required this.fullName,
    required this.role,
    required this.propertyId,
    required this.active,
    this.photoUrl,
  });

  final String id;
  final String fullName;
  final String role;
  final String propertyId;
  final bool active;
  final String? photoUrl;

  @override
  List<Object?> get props => [id, fullName, role, propertyId, active, photoUrl];
}

class PropertyInfo extends Equatable {
  const PropertyInfo({
    required this.id,
    required this.name,
    required this.shiftStart,
    required this.shiftEnd,
  });

  final String id;
  final String name;
  final String shiftStart;
  final String shiftEnd;

  @override
  List<Object?> get props => [id, name, shiftStart, shiftEnd];
}

class AttendancePunch extends Equatable {
  const AttendancePunch({
    required this.id,
    required this.staffId,
    required this.propertyId,
    required this.punchType,
    required this.capturedAt,
    required this.deviceId,
    this.matchScore,
    this.synced = true,
    this.source = 'kiosk',
  });

  final String id;
  final String staffId;
  final String propertyId;
  final PunchType punchType;
  final DateTime capturedAt;
  final String deviceId;
  final double? matchScore;
  final bool synced;
  final String source;

  @override
  List<Object?> get props =>
      [id, staffId, propertyId, punchType, capturedAt, deviceId, matchScore, synced, source];
}

class FingerprintTemplate extends Equatable {
  const FingerprintTemplate({
    required this.id,
    required this.staffId,
    required this.templateBytes,
    required this.fingerIndex,
    required this.enrolledAt,
    required this.deviceId,
  });

  final String id;
  final String staffId;

  /// Raw template bytes — never log or persist outside secure storage.
  final List<int> templateBytes;
  final int fingerIndex;
  final DateTime enrolledAt;
  final String deviceId;

  @override
  List<Object?> get props => [id, staffId, fingerIndex, enrolledAt, deviceId];
}

class EnrolledTemplate extends Equatable {
  const EnrolledTemplate({
    required this.staffId,
    required this.template,
    this.fingerIndex = 0,
  });

  final String staffId;
  final FingerprintTemplate template;
  final int fingerIndex;

  @override
  List<Object?> get props => [staffId, template, fingerIndex];
}

class MatchResult extends Equatable {
  const MatchResult({
    required this.matched,
    this.staffId,
    this.score = 0,
    this.message,
  });

  final bool matched;
  final String? staffId;
  final double score;
  final String? message;

  factory MatchResult.noMatch({String? message}) => MatchResult(
        matched: false,
        message: message ?? 'No match',
      );

  factory MatchResult.success({
    required String staffId,
    required double score,
  }) =>
      MatchResult(matched: true, staffId: staffId, score: score);

  @override
  List<Object?> get props => [matched, staffId, score, message];
}

enum ReaderStatus {
  disconnected,
  ready,
  capturing,
  error,
}

class PunchDecision extends Equatable {
  const PunchDecision({
    required this.punchType,
    required this.reason,
  });

  final PunchType punchType;
  final String reason;

  @override
  List<Object?> get props => [punchType, reason];
}
