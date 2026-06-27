import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../domain/entities/entities.dart';
import '../../domain/usecases/punch_usecases.dart';
import 'app_providers.dart';

enum KioskUiState { idle, scanning, success, error }

class KioskPunchState {
  const KioskPunchState({
    this.uiState = KioskUiState.idle,
    this.message,
    this.staff,
    this.punchType,
  });

  final KioskUiState uiState;
  final String? message;
  final StaffMember? staff;
  final PunchType? punchType;

  KioskPunchState copyWith({
    KioskUiState? uiState,
    String? message,
    StaffMember? staff,
    PunchType? punchType,
    bool clearStaff = false,
  }) =>
      KioskPunchState(
        uiState: uiState ?? this.uiState,
        message: message,
        staff: clearStaff ? null : staff ?? this.staff,
        punchType: punchType,
      );
}

class KioskPunchNotifier extends StateNotifier<KioskPunchState> {
  KioskPunchNotifier(this._ref) : super(const KioskPunchState());

  final Ref _ref;

  Future<void> onFingerScan() async {
    if (state.uiState == KioskUiState.scanning) return;

    state = state.copyWith(uiState: KioskUiState.scanning, message: null);

    try {
      final useCase = await _ref.read(processPunchUseCaseProvider.future);
      final result = await useCase.execute();

      switch (result) {
        case PunchSuccess(:final staff, :final punch, :final decision):
          state = KioskPunchState(
            uiState: KioskUiState.success,
            staff: staff,
            punchType: decision.punchType,
            message: decision.punchType == PunchType.inPunch ? 'CHECKED IN' : 'CHECKED OUT',
          );
          await Future<void>.delayed(const Duration(seconds: 3));
          state = const KioskPunchState(uiState: KioskUiState.idle);
        case PunchNoMatch(:final message):
          state = KioskPunchState(uiState: KioskUiState.error, message: message);
          await Future<void>.delayed(const Duration(seconds: 2));
          state = const KioskPunchState(uiState: KioskUiState.idle);
        case PunchDebounced(:final message):
          state = KioskPunchState(uiState: KioskUiState.error, message: message);
          await Future<void>.delayed(const Duration(seconds: 2));
          state = const KioskPunchState(uiState: KioskUiState.idle);
        case PunchError(:final message):
          state = KioskPunchState(uiState: KioskUiState.error, message: message);
          await Future<void>.delayed(const Duration(seconds: 2));
          state = const KioskPunchState(uiState: KioskUiState.idle);
      }
    } catch (e) {
      state = KioskPunchState(uiState: KioskUiState.error, message: '$e');
      await Future<void>.delayed(const Duration(seconds: 2));
      state = const KioskPunchState(uiState: KioskUiState.idle);
    }
  }
}

final kioskPunchProvider =
    StateNotifierProvider<KioskPunchNotifier, KioskPunchState>(
  KioskPunchNotifier.new,
);
