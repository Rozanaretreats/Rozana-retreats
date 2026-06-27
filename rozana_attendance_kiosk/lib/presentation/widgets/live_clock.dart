import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

class LiveClock extends StatefulWidget {
  const LiveClock({super.key});

  @override
  State<LiveClock> createState() => _LiveClockState();
}

class _LiveClockState extends State<LiveClock> {
  late DateTime _now;
  static final _timeFormat = DateFormat('hh:mm a');
  static final _dateFormat = DateFormat('EEE, d MMM yyyy');

  @override
  void initState() {
    super.initState();
    _now = DateTime.now();
    _tick();
  }

  Future<void> _tick() async {
    while (mounted) {
      await Future<void>.delayed(const Duration(seconds: 1));
      if (mounted) setState(() => _now = DateTime.now());
    }
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Text(
          _timeFormat.format(_now),
          style: Theme.of(context).textTheme.displayLarge?.copyWith(
                fontWeight: FontWeight.bold,
                letterSpacing: 2,
              ),
        ),
        const SizedBox(height: 8),
        Text(
          _dateFormat.format(_now),
          style: Theme.of(context).textTheme.titleLarge,
        ),
      ],
    );
  }
}
