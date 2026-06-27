import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../domain/entities/entities.dart';
import '../providers/app_providers.dart';
import '../providers/core_providers.dart';

class EnrollmentScreen extends ConsumerStatefulWidget {
  const EnrollmentScreen({super.key});

  @override
  ConsumerState<EnrollmentScreen> createState() => _EnrollmentScreenState();
}

class _EnrollmentScreenState extends ConsumerState<EnrollmentScreen> {
  StaffMember? _selected;
  String? _status;
  bool _isError = false;
  bool _busy = false;
  bool _alreadyEnrolled = false;

  @override
  Widget build(BuildContext context) {
    final staffAsync = ref.watch(staffListProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Fingerprint enrolment')),
      body: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            staffAsync.when(
              data: (staff) => DropdownButtonFormField<StaffMember>(
                decoration: const InputDecoration(
                  labelText: 'Staff member',
                  border: OutlineInputBorder(),
                ),
                value: _selected,
                items: staff
                    .map(
                      (s) => DropdownMenuItem(value: s, child: Text(s.fullName)),
                    )
                    .toList(),
                onChanged: _busy
                    ? null
                    : (v) async {
                        setState(() {
                          _selected = v;
                          _status = null;
                          _isError = false;
                        });
                        if (v != null) await _checkEnrollment(v.id);
                      },
              ),
              loading: () => const LinearProgressIndicator(),
              error: (e, _) => Text('Failed to load staff: $e'),
            ),
            const SizedBox(height: 16),
            if (_alreadyEnrolled)
              Card(
                color: Colors.blue.shade50,
                child: Padding(
                  padding: const EdgeInsets.all(12),
                  child: Text(
                    '${_selected?.fullName ?? 'Staff'} already has a fingerprint. '
                    'Capture again to replace it.',
                    style: TextStyle(color: Colors.blue.shade900),
                  ),
                ),
              ),
            if (_status != null) ...[
              const SizedBox(height: 12),
              Text(
                _status!,
                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      color: _isError ? Colors.red.shade800 : Colors.green.shade800,
                    ),
              ),
            ],
            const Spacer(),
            FilledButton.icon(
              onPressed: _busy || _selected == null ? null : _enroll,
              icon: const Icon(Icons.fingerprint, size: 32),
              label: Padding(
                padding: const EdgeInsets.symmetric(vertical: 16),
                child: Text(
                  _alreadyEnrolled ? 'Re-enrol fingerprint' : 'Capture fingerprint',
                  style: const TextStyle(fontSize: 20),
                ),
              ),
            ),
            const SizedBox(height: 12),
            OutlinedButton.icon(
              onPressed: _busy || _selected == null ? null : _deleteTemplates,
              icon: const Icon(Icons.delete_outline),
              label: const Text('Delete enrolled fingerprint'),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _checkEnrollment(String staffId) async {
    try {
      final repo = await ref.read(attendanceRepositoryProvider.future);
      final templates = await repo.getTemplatesForStaff(staffId);
      if (mounted) {
        setState(() => _alreadyEnrolled = templates.isNotEmpty);
      }
    } catch (_) {
      if (mounted) setState(() => _alreadyEnrolled = false);
    }
  }

  Future<void> _enroll() async {
    final staff = _selected;
    if (staff == null) return;

    setState(() {
      _busy = true;
      _status = 'Scanning… (mock: wait ~1 second)';
      _isError = false;
    });

    try {
      final useCase = await ref.read(enrollFingerprintUseCaseProvider.future);
      await useCase.enroll(staffId: staff.id);
      if (mounted) {
        setState(() {
          _status = _alreadyEnrolled
              ? 'Updated fingerprint for ${staff.fullName}'
              : 'Enrolled ${staff.fullName}';
          _alreadyEnrolled = true;
          _isError = false;
        });
        ref.invalidate(staffListProvider);
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _status = _friendlyError(e);
          _isError = true;
        });
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _deleteTemplates() async {
    final staff = _selected;
    if (staff == null) return;

    setState(() {
      _busy = true;
      _status = 'Deleting…';
      _isError = false;
    });

    try {
      final repo = await ref.read(attendanceRepositoryProvider.future);
      final templates = await repo.getTemplatesForStaff(staff.id);
      for (final t in templates) {
        await repo.deleteTemplate(t.id);
      }
      if (mounted) {
        setState(() {
          _status = 'Deleted fingerprint for ${staff.fullName}';
          _alreadyEnrolled = false;
          _isError = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _status = _friendlyError(e);
          _isError = true;
        });
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  String _friendlyError(Object e) {
    final text = e.toString();
    if (text.contains('duplicate key') || text.contains('23505')) {
      return 'Fingerprint already enrolled. Tap Re-enrol to replace, or Delete first.';
    }
    if (text.contains('fingerprint_templates')) {
      return 'Database not ready. Run kiosk_migrations.sql in Supabase.';
    }
    return 'Something went wrong. Try again.';
  }
}
