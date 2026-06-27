import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/config/app_config.dart';
import '../../core/platform/desktop_init.dart';
import '../../data/fingerprint/mock_fingerprint_reader.dart';
import '../../domain/entities/entities.dart';
import '../providers/app_providers.dart';
import '../providers/core_providers.dart';
import '../providers/kiosk_punch_provider.dart';
import '../widgets/live_clock.dart';
import '../widgets/punch_feedback_banner.dart';
import 'admin_pin_dialog.dart';
import 'enrollment_screen.dart';
import 'webview_tab_screen.dart';

class KioskHomeScreen extends ConsumerStatefulWidget {
  const KioskHomeScreen({super.key});

  @override
  ConsumerState<KioskHomeScreen> createState() => _KioskHomeScreenState();
}

class _KioskHomeScreenState extends ConsumerState<KioskHomeScreen> {
  int _secretTapCount = 0;
  DateTime? _lastTap;
  String? _selectedMockStaffId;

  @override
  Widget build(BuildContext context) {
    ref.watch(connectivitySyncProvider);
    final config = ref.watch(appConfigProvider);
    final propertyAsync = ref.watch(propertyInfoProvider);
    final staffAsync = ref.watch(staffListProvider);
    final punchState = ref.watch(kioskPunchProvider);
    final readerStatus = ref.watch(readerStatusProvider);
    final isMockDesktop = config.useMockReader && isDesktopDevPlatform;

    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, _) async {
        if (didPop) return;
        final pin = await showAdminPinDialog(context, config.adminPin);
        if (pin == true && context.mounted) {
          Navigator.of(context).pop();
        }
      },
      child: Scaffold(
        backgroundColor: const Color(0xFFECEFF1),
        body: SafeArea(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(20, 16, 20, 12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                _header(context, config, propertyAsync, readerStatus, isMockDesktop),
                const SizedBox(height: 12),
                const LiveClock(),
                const SizedBox(height: 16),
                Expanded(
                  child: Material(
                    color: Colors.transparent,
                    child: InkWell(
                      borderRadius: BorderRadius.circular(28),
                      onTap: _onScanTap,
                      child: PunchFeedbackBanner(
                        uiState: punchState.uiState,
                        message: punchState.message,
                        staff: punchState.staff,
                        punchType: punchState.punchType,
                        idleTitle: isMockDesktop
                            ? 'Click to punch'
                            : 'Place finger to punch',
                        idleSubtitle: isMockDesktop
                            ? 'Mock scan — pick staff below first'
                            : 'വിരൽ വയ്ക്കുക',
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                if (config.useMockReader)
                  _mockPanel(staffAsync, config),
                if (isMockDesktop) ...[
                  const SizedBox(height: 8),
                  _setupHelpCard(staffAsync),
                ],
                const SizedBox(height: 8),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    GestureDetector(
                      onTap: _onSecretAdminTap,
                      child: Text(
                        'Rozana Kiosk · ${config.deviceId}',
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                              color: Colors.grey.shade600,
                            ),
                      ),
                    ),
                    if (isMockDesktop)
                      TextButton.icon(
                        onPressed: _openAdmin,
                        icon: const Icon(Icons.admin_panel_settings_outlined, size: 18),
                        label: const Text('Admin'),
                      ),
                  ],
                ),
              ],
            ),
          ),
        ),
        bottomNavigationBar: config.enableWebViewTab && config.webAppUrl.isNotEmpty
            ? BottomNavigationBar(
                items: const [
                  BottomNavigationBarItem(
                    icon: Icon(Icons.fingerprint),
                    label: 'Punch',
                  ),
                  BottomNavigationBarItem(
                    icon: Icon(Icons.web),
                    label: 'Dashboard',
                  ),
                ],
                currentIndex: 0,
                onTap: (index) {
                  if (index == 1) {
                    Navigator.of(context).push(
                      MaterialPageRoute<void>(
                        builder: (_) => WebViewTabScreen(url: config.webAppUrl),
                      ),
                    );
                  }
                },
              )
            : null,
      ),
    );
  }

  Widget _header(
    BuildContext context,
    AppConfig config,
    AsyncValue propertyAsync,
    AsyncValue<ReaderStatus> readerStatus,
    bool isMockDesktop,
  ) {
    return Row(
      children: [
        Expanded(
          child: propertyAsync.when(
            data: (property) => Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  property?.name ?? config.propertyId,
                  style: Theme.of(context).textTheme.titleLarge?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                ),
                Text(
                  config.propertyId,
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: Colors.grey.shade600,
                      ),
                ),
              ],
            ),
            loading: () => const Text('Loading property…'),
            error: (_, __) => Text(config.propertyId),
          ),
        ),
        _statusChip(config, readerStatus, isMockDesktop),
      ],
    );
  }

  Widget _statusChip(
    AppConfig config,
    AsyncValue<ReaderStatus> status,
    bool isMockDesktop,
  ) {
    if (isMockDesktop) {
      return Chip(
        avatar: Icon(Icons.computer, size: 18, color: Colors.blue.shade800),
        label: const Text('Mock mode'),
        backgroundColor: Colors.blue.shade50,
        side: BorderSide(color: Colors.blue.shade300),
      );
    }

    final value = status.value ?? ReaderStatus.disconnected;
    final (label, color) = switch (value) {
      ReaderStatus.ready => ('Reader ready', Colors.green),
      ReaderStatus.capturing => ('Scanning', Colors.orange),
      ReaderStatus.error => ('Reader error', Colors.red),
      ReaderStatus.disconnected => ('No reader', Colors.grey),
    };
    return Chip(
      label: Text(label),
      backgroundColor: color.withValues(alpha: 0.15),
      side: BorderSide(color: color),
    );
  }

  Widget _mockPanel(AsyncValue<List<StaffMember>> staffAsync, AppConfig config) {
    return Card(
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: BorderSide(color: Colors.grey.shade300),
      ),
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
        child: staffAsync.when(
          data: (staff) {
            if (staff.isEmpty) {
              return Text(
                'No staff found for ${config.propertyId}. Add staff in the Rozana web app first.',
                style: TextStyle(color: Colors.orange.shade900),
              );
            }
            return DropdownButtonFormField<String>(
              decoration: const InputDecoration(
                labelText: 'Who is punching? (mock)',
                border: OutlineInputBorder(),
                isDense: true,
              ),
              value: _selectedMockStaffId,
              items: staff
                  .map(
                    (s) => DropdownMenuItem(value: s.id, child: Text(s.fullName)),
                  )
                  .toList(),
              onChanged: (id) {
                if (id == null) return;
                setState(() => _selectedMockStaffId = id);
                final reader = ref.read(fingerprintReaderProvider);
                if (reader is MockFingerprintReader) {
                  reader.selectStaffForNextScan(id);
                }
              },
            );
          },
          loading: () => const LinearProgressIndicator(),
          error: (e, _) => Text('Could not load staff: $e'),
        ),
      ),
    );
  }

  Widget _setupHelpCard(AsyncValue<List<StaffMember>> staffAsync) {
    return Card(
      color: Colors.amber.shade50,
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(color: Colors.amber.shade200),
      ),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'First-time test steps',
              style: TextStyle(
                fontWeight: FontWeight.bold,
                color: Colors.amber.shade900,
              ),
            ),
            const SizedBox(height: 6),
            const Text('1. Run supabase/kiosk_migrations.sql in Supabase'),
            const Text('2. Tap Admin → pick staff → Capture fingerprint'),
            const Text('3. Select staff above → click blue card to punch IN'),
            const Text('4. Click again for OUT'),
            staffAsync.whenOrNull(
              data: (staff) => staff.isEmpty
                  ? Padding(
                      padding: const EdgeInsets.only(top: 6),
                      child: Text(
                        '⚠ No staff in database yet — add via Rozana web app.',
                        style: TextStyle(color: Colors.red.shade700),
                      ),
                    )
                  : null,
            ) ??
                const SizedBox.shrink(),
          ],
        ),
      ),
    );
  }

  void _onScanTap() {
    final config = ref.read(appConfigProvider);
    if (config.useMockReader && _selectedMockStaffId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Select who is punching in the dropdown first'),
          behavior: SnackBarBehavior.floating,
        ),
      );
      return;
    }
    if (_selectedMockStaffId != null) {
      final reader = ref.read(fingerprintReaderProvider);
      if (reader is MockFingerprintReader) {
        reader.selectStaffForNextScan(_selectedMockStaffId!);
      }
    }
    ref.read(kioskPunchProvider.notifier).onFingerScan();
  }

  Future<void> _openAdmin() async {
    final config = ref.read(appConfigProvider);
    final ok = await showAdminPinDialog(context, config.adminPin);
    if (ok == true && mounted) {
      await Navigator.of(context).push(
        MaterialPageRoute<void>(builder: (_) => const EnrollmentScreen()),
      );
      ref.invalidate(staffListProvider);
    }
  }

  Future<void> _onSecretAdminTap() async {
    final now = DateTime.now();
    if (_lastTap != null && now.difference(_lastTap!) > const Duration(seconds: 2)) {
      _secretTapCount = 0;
    }
    _lastTap = now;
    _secretTapCount++;

    if (_secretTapCount < 5) return;
    _secretTapCount = 0;
    await _openAdmin();
  }
}
