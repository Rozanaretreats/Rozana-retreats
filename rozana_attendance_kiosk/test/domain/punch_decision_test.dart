import 'package:flutter_test/flutter_test.dart';

import 'package:rozana_attendance_kiosk/domain/entities/entities.dart';
import 'package:rozana_attendance_kiosk/domain/logic/punch_decision.dart';

void main() {
  group('decideNextPunchType', () {
    test('first punch of day is IN', () {
      final decision = decideNextPunchType(todayPunches: [], staffId: 's1');
      expect(decision.punchType, PunchType.inPunch);
    });

    test('after IN punch next is OUT', () {
      final punches = [
        AttendancePunch(
          id: '1',
          staffId: 's1',
          propertyId: 'p1',
          punchType: PunchType.inPunch,
          capturedAt: DateTime(2026, 6, 26, 9),
          deviceId: 'd1',
        ),
      ];
      final decision = decideNextPunchType(todayPunches: punches, staffId: 's1');
      expect(decision.punchType, PunchType.outPunch);
    });

    test('after OUT punch next is IN', () {
      final punches = [
        AttendancePunch(
          id: '1',
          staffId: 's1',
          propertyId: 'p1',
          punchType: PunchType.inPunch,
          capturedAt: DateTime(2026, 6, 26, 9),
          deviceId: 'd1',
        ),
        AttendancePunch(
          id: '2',
          staffId: 's1',
          propertyId: 'p1',
          punchType: PunchType.outPunch,
          capturedAt: DateTime(2026, 6, 26, 17),
          deviceId: 'd1',
        ),
      ];
      final decision = decideNextPunchType(todayPunches: punches, staffId: 's1');
      expect(decision.punchType, PunchType.inPunch);
    });

    test('ignores other staff punches', () {
      final punches = [
        AttendancePunch(
          id: '1',
          staffId: 'other',
          propertyId: 'p1',
          punchType: PunchType.inPunch,
          capturedAt: DateTime(2026, 6, 26, 9),
          deviceId: 'd1',
        ),
      ];
      final decision = decideNextPunchType(todayPunches: punches, staffId: 's1');
      expect(decision.punchType, PunchType.inPunch);
    });
  });

  group('isWithinDebounceWindow', () {
    test('blocks rapid re-punch', () {
      final now = DateTime(2026, 6, 26, 10, 0, 10);
      final punches = [
        AttendancePunch(
          id: '1',
          staffId: 's1',
          propertyId: 'p1',
          punchType: PunchType.inPunch,
          capturedAt: DateTime(2026, 6, 26, 10, 0, 0),
          deviceId: 'd1',
        ),
      ];
      expect(
        isWithinDebounceWindow(
          todayPunches: punches,
          staffId: 's1',
          now: now,
          debounce: const Duration(seconds: 30),
        ),
        isTrue,
      );
    });
  });

  group('evaluateMatchResult', () {
    test('rejects low score', () {
      final raw = MatchResult.success(staffId: 's1', score: 40);
      final result = evaluateMatchResult(raw, minScore: 60);
      expect(result.matched, isFalse);
    });

    test('accepts high score', () {
      final raw = MatchResult.success(staffId: 's1', score: 85);
      final result = evaluateMatchResult(raw, minScore: 60);
      expect(result.matched, isTrue);
      expect(result.staffId, 's1');
    });
  });
}
