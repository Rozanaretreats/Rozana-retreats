import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:path_provider/path_provider.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../core/config/app_config.dart';
import '../../data/local/local_database.dart';
import '../../domain/repositories/attendance_repository.dart';
import '../../data/repositories/attendance_repository_impl.dart';
import '../../data/supabase/supabase_attendance_api.dart';
import '../../domain/entities/entities.dart';
import '../../domain/usecases/punch_usecases.dart';
import 'core_providers.dart';

final localDatabaseProvider = FutureProvider<LocalDatabase>((ref) async {
  final dir = await getApplicationDocumentsDirectory();
  return LocalDatabase.open(dir.path);
});

final attendanceRepositoryProvider = FutureProvider<AttendanceRepository>((ref) async {
  final config = ref.watch(appConfigProvider);
  final local = await ref.watch(localDatabaseProvider.future);
  return AttendanceRepositoryImpl(
    config: config,
    localDb: local,
    remoteApi: SupabaseAttendanceApi(Supabase.instance.client),
    connectivity: Connectivity(),
  );
});

final processPunchUseCaseProvider = FutureProvider<ProcessPunchUseCase>((ref) async {
  final config = ref.watch(appConfigProvider);
  final reader = ref.watch(fingerprintReaderProvider);
  final repo = await ref.watch(attendanceRepositoryProvider.future);
  return ProcessPunchUseCase(
    config: config,
    reader: reader,
    repository: repo,
  );
});

final enrollFingerprintUseCaseProvider =
    FutureProvider<EnrollFingerprintUseCase>((ref) async {
  final reader = ref.watch(fingerprintReaderProvider);
  final repo = await ref.watch(attendanceRepositoryProvider.future);
  return EnrollFingerprintUseCase(reader: reader, repository: repo);
});

final readerStatusProvider = StreamProvider<ReaderStatus>((ref) {
  final reader = ref.watch(fingerprintReaderProvider);
  return reader.status();
});

final propertyInfoProvider = FutureProvider((ref) async {
  final repo = await ref.watch(attendanceRepositoryProvider.future);
  await repo.refreshCache();
  return repo.getProperty();
});

final staffListProvider = FutureProvider((ref) async {
  final repo = await ref.watch(attendanceRepositoryProvider.future);
  return repo.getStaff();
});

final connectivitySyncProvider = Provider<void>((ref) {
  final sub = Connectivity().onConnectivityChanged.listen((_) async {
    final repo = await ref.read(attendanceRepositoryProvider.future);
    await repo.syncPendingPunches();
    await repo.refreshCache();
    ref.invalidate(propertyInfoProvider);
    ref.invalidate(staffListProvider);
  });
  ref.onDispose(sub.cancel);
});
