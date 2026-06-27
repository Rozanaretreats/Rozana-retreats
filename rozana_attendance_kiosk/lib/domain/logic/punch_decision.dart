import '../entities/entities.dart';

/// Pure logic: decide IN vs OUT from today's punch history for one staff member.
///
/// Rules:
/// - No punches today → IN
/// - Last punch was IN → OUT
/// - Last punch was OUT → IN
/// - Odd number of punches with last IN and within debounce window → reject (caller handles)
PunchDecision decideNextPunchType({
  required List<AttendancePunch> todayPunches,
  required String staffId,
  AttendancePunch? lastPunchBeforeToday,
}) {
  final staffToday = todayPunches
      .where((p) => p.staffId == staffId)
      .toList()
    ..sort((a, b) => a.capturedAt.compareTo(b.capturedAt));

  if (staffToday.isEmpty) {
    // Night shift / missed check-out: if this staff member's most recent
    // punch (from a previous day) was an IN that was never closed, the next
    // punch should close that open shift as OUT rather than open a new IN.
    if (lastPunchBeforeToday != null &&
        lastPunchBeforeToday.staffId == staffId &&
        lastPunchBeforeToday.punchType == PunchType.inPunch) {
      return const PunchDecision(
        punchType: PunchType.outPunch,
        reason: 'Closing open shift from a previous day',
      );
    }
    return const PunchDecision(
      punchType: PunchType.inPunch,
      reason: 'First punch of the day',
    );
  }

  final last = staffToday.last;
  if (last.punchType == PunchType.inPunch) {
    return const PunchDecision(
      punchType: PunchType.outPunch,
      reason: 'Last punch was IN',
    );
  }

  return const PunchDecision(
    punchType: PunchType.inPunch,
    reason: 'Last punch was OUT',
  );
}

/// Returns true when a new punch should be blocked (duplicate scan).
bool isWithinDebounceWindow({
  required List<AttendancePunch> todayPunches,
  required String staffId,
  required DateTime now,
  required Duration debounce,
}) {
  final staffToday = todayPunches
      .where((p) => p.staffId == staffId)
      .toList()
    ..sort((a, b) => b.capturedAt.compareTo(a.capturedAt));

  if (staffToday.isEmpty) return false;

  final last = staffToday.first;
  return now.difference(last.capturedAt) < debounce;
}

/// Evaluate fingerprint match result against minimum score threshold.
MatchResult evaluateMatchResult(MatchResult raw, {required double minScore}) {
  if (!raw.matched) return raw;
  if (raw.score < minScore) {
    return MatchResult.noMatch(
      message: 'Low match score (${raw.score.toStringAsFixed(0)})',
    );
  }
  return raw;
}
