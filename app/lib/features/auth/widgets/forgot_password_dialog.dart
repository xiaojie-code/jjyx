import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

class ForgotPasswordDialog extends StatefulWidget {
  const ForgotPasswordDialog({
    super.key,
    required this.initialAccount,
    required this.onSubmit,
  });

  final String initialAccount;
  final Future<void> Function(String account, String phone) onSubmit;

  @override
  State<ForgotPasswordDialog> createState() => _ForgotPasswordDialogState();
}

class _ForgotPasswordDialogState extends State<ForgotPasswordDialog> {
  late final TextEditingController _accountController;
  final _phoneController = TextEditingController();
  bool _submitting = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _accountController = TextEditingController(text: widget.initialAccount);
  }

  @override
  void dispose() {
    // Keep controllers alive through the dialog route's closing animation.
    _accountController.dispose();
    _phoneController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_submitting) return;
    final account = _accountController.text.trim();
    final phone = _phoneController.text.trim();
    if (account.isEmpty || phone.isEmpty) {
      setState(() => _error = '请填写账号和手机号');
      return;
    }
    if (!RegExp(r'^1[3-9]\d{9}$').hasMatch(phone)) {
      setState(() => _error = '请输入正确的11位手机号');
      return;
    }
    FocusScope.of(context).unfocus();
    setState(() {
      _submitting = true;
      _error = null;
    });
    try {
      await widget.onSubmit(account, phone);
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _submitting = false;
        _error = '$error';
      });
      return;
    }
    if (!mounted) return;
    Navigator.of(context).pop(true);
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: !_submitting,
      child: AlertDialog(
        title: const Text('忘记密码'),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: _accountController,
                enabled: !_submitting,
                decoration: const InputDecoration(
                  labelText: '账号',
                  border: OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _phoneController,
                enabled: !_submitting,
                keyboardType: TextInputType.phone,
                maxLength: 11,
                inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                decoration: const InputDecoration(
                  labelText: '手机号',
                  hintText: '请输入11位手机号',
                  border: OutlineInputBorder(),
                  counterText: '',
                ),
              ),
              if (_error != null) ...[
                const SizedBox(height: 12),
                Text(_error!,
                    style:
                        TextStyle(color: Theme.of(context).colorScheme.error)),
              ],
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed:
                _submitting ? null : () => Navigator.of(context).pop(false),
            child: const Text('取消'),
          ),
          ElevatedButton(
            onPressed: _submitting ? null : _submit,
            child: _submitting
                ? const SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Text('确认发送'),
          ),
        ],
      ),
    );
  }
}
