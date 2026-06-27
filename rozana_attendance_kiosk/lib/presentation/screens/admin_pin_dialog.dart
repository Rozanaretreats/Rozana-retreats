import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

Future<bool?> showAdminPinDialog(BuildContext context, String expectedPin) {
  return showDialog<bool>(
    context: context,
    barrierDismissible: false,
    builder: (context) => _AdminPinDialog(expectedPin: expectedPin),
  );
}

class _AdminPinDialog extends StatefulWidget {
  const _AdminPinDialog({required this.expectedPin});

  final String expectedPin;

  @override
  State<_AdminPinDialog> createState() => _AdminPinDialogState();
}

class _AdminPinDialogState extends State<_AdminPinDialog> {
  final _controller = TextEditingController();
  String? _error;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _submit() {
    if (_controller.text == widget.expectedPin) {
      Navigator.of(context).pop(true);
      return;
    }
    setState(() => _error = 'Incorrect PIN');
    HapticFeedback.heavyImpact();
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('Manager PIN'),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          TextField(
            controller: _controller,
            obscureText: true,
            keyboardType: TextInputType.number,
            autofocus: true,
            decoration: InputDecoration(
              labelText: 'Enter PIN',
              errorText: _error,
            ),
            onSubmitted: (_) => _submit(),
          ),
        ],
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(false),
          child: const Text('Cancel'),
        ),
        FilledButton(onPressed: _submit, child: const Text('Unlock')),
      ],
    );
  }
}
