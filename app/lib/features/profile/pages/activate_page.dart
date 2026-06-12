import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/api_client.dart';
import '../../../core/network/api_endpoints.dart';
import '../../../core/utils/toast.dart';
import '../../auth/providers/auth_provider.dart';

class ActivatePage extends ConsumerStatefulWidget {
  const ActivatePage({super.key});

  @override
  ConsumerState<ActivatePage> createState() => _ActivatePageState();
}

class _ActivatePageState extends ConsumerState<ActivatePage> {
  final _codeCtrl = TextEditingController();
  bool _loading = false;

  @override
  void dispose() {
    _codeCtrl.dispose();
    super.dispose();
  }

  Future<void> _activate() async {
    final code = _codeCtrl.text.trim();
    if (code.isEmpty) {
      Toast.error(context, '请输入CDK激活码');
      return;
    }
    setState(() => _loading = true);
    try {
      await ref.read(apiClientProvider).post(
        ApiEndpoints.activate,
        data: {'code': code},
      );
      await ref.read(authProvider.notifier).loadProfile();
      if (mounted) {
        Toast.success(context, '激活成功！');
        Navigator.pop(context);
      }
    } catch (e) {
      if (mounted) {
        // 提取友好错误信息
        String msg = '$e';
        if (msg.contains('message:')) {
          msg = msg.split('message:').last.replaceAll(')', '').trim();
        }
        Toast.error(context, msg);
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('激活游戏')),
      resizeToAvoidBottomInset: true,
      body: LayoutBuilder(
        builder: (context, constraints) {
          final minHeight =
              constraints.maxHeight > 48 ? constraints.maxHeight - 48 : 0.0;

          return SingleChildScrollView(
            keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
            padding: const EdgeInsets.all(24),
            child: ConstrainedBox(
              constraints: BoxConstraints(minHeight: minHeight),
              child: IntrinsicHeight(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(Icons.vpn_key, size: 64, color: Colors.orange),
                    const SizedBox(height: 16),
                    const Text('输入CDK激活码开启游戏', style: TextStyle(fontSize: 16)),
                    const SizedBox(height: 24),
                    TextField(
                      controller: _codeCtrl,
                      decoration: const InputDecoration(
                        labelText: 'CDK激活码',
                        border: OutlineInputBorder(),
                        prefixIcon: Icon(Icons.key),
                      ),
                    ),
                    const SizedBox(height: 24),
                    SizedBox(
                      width: double.infinity,
                      height: 48,
                      child: ElevatedButton(
                        onPressed: _loading ? null : _activate,
                        child: _loading
                            ? const SizedBox(
                                width: 20,
                                height: 20,
                                child:
                                    CircularProgressIndicator(strokeWidth: 2))
                            : const Text('激活', style: TextStyle(fontSize: 16)),
                      ),
                    ),
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
