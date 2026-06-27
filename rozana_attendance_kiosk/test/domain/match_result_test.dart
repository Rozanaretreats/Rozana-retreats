import 'package:flutter_test/flutter_test.dart';
import 'package:rozana_attendance_kiosk/domain/entities/entities.dart';

void main() {
  test('MatchResult factories', () {
    final ok = MatchResult.success(staffId: 's1', score: 90);
    expect(ok.matched, isTrue);
    expect(ok.staffId, 's1');

    final fail = MatchResult.noMatch(message: 'nope');
    expect(fail.matched, isFalse);
    expect(fail.message, 'nope');
  });
}
