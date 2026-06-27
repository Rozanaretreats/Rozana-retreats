import 'package:flutter/material.dart';

import '../../domain/entities/entities.dart';
import '../providers/kiosk_punch_provider.dart';

class PunchFeedbackBanner extends StatelessWidget {
  const PunchFeedbackBanner({
    required this.uiState,
    this.message,
    this.staff,
    this.punchType,
    this.idleTitle,
    this.idleSubtitle,
    super.key,
  });

  final KioskUiState uiState;
  final String? message;
  final StaffMember? staff;
  final PunchType? punchType;
  final String? idleTitle;
  final String? idleSubtitle;

  @override
  Widget build(BuildContext context) {
    switch (uiState) {
      case KioskUiState.idle:
        return _banner(
          context,
          color: const Color(0xFF1A237E),
          icon: Icons.fingerprint,
          title: idleTitle ?? 'Place finger to punch',
          subtitle: idleSubtitle ?? 'വിരൽ വയ്ക്കുക',
        );
      case KioskUiState.scanning:
        return _banner(
          context,
          color: Colors.orange.shade800,
          icon: Icons.hourglass_top,
          title: 'Reading fingerprint…',
          subtitle: null,
        );
      case KioskUiState.success:
        final inPunch = punchType == PunchType.inPunch;
        return _banner(
          context,
          color: Colors.green.shade700,
          icon: inPunch ? Icons.login : Icons.logout,
          title: message ?? (inPunch ? 'CHECKED IN' : 'CHECKED OUT'),
          subtitle: staff?.fullName,
        );
      case KioskUiState.error:
        return _banner(
          context,
          color: Colors.red.shade800,
          icon: Icons.error_outline,
          title: message ?? 'Try again',
          subtitle: 'Tap Admin → enrol fingerprint first',
        );
    }
  }

  Widget _banner(
    BuildContext context, {
    required Color color,
    required IconData icon,
    required String title,
    String? subtitle,
  }) {
    return AnimatedContainer(
      duration: const Duration(milliseconds: 250),
      width: double.infinity,
      height: double.infinity,
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: color,
        borderRadius: BorderRadius.circular(28),
        boxShadow: [
          BoxShadow(
            color: color.withValues(alpha: 0.35),
            blurRadius: 24,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: LayoutBuilder(
        builder: (context, constraints) {
          return Center(
            child: FittedBox(
              fit: BoxFit.scaleDown,
              child: ConstrainedBox(
                constraints: BoxConstraints(maxWidth: constraints.maxWidth - 16),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(icon, size: 88, color: Colors.white),
                    const SizedBox(height: 20),
                    Text(
                      title,
                      textAlign: TextAlign.center,
                      style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                            color: Colors.white,
                            fontWeight: FontWeight.bold,
                          ),
                    ),
                    if (subtitle != null) ...[
                      const SizedBox(height: 10),
                      Text(
                        subtitle,
                        textAlign: TextAlign.center,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: Theme.of(context).textTheme.titleLarge?.copyWith(
                              color: Colors.white70,
                            ),
                      ),
                    ],
                  ],
                ),
              ),
            ),
          );
        },
      ),
    );
  }
}
