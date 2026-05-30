import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/api_client.dart';
import '../../../core/network/api_endpoints.dart';
import '../../../core/utils/toast.dart';
import '../../auth/providers/auth_provider.dart';

class EditNicknamePage extends ConsumerStatefulWidget {
  final String currentNickname;
  const EditNicknamePage({super.key, required this.currentNickname});

  @override
  ConsumerState<EditNicknamePage> createState() => _EditNicknamePageState();
}

class _EditNicknamePageState extends ConsumerState<EditNicknamePage> {
  late final TextEditingController _ctrl;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    _ctrl = TextEditingController(text: widget.currentNickname);
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    final nickname = _ctrl.text.trim();
    if (nickname.length < 2 || nickname.length > 10) {
      Toast.error(context, '昵称长度需要2-10个字');
      return;
    }
    setState(() => _saving = true);
    try {
      await ref.read(apiClientProvider).put(
        ApiEndpoints.updateNickname,
        data: {'nickname': nickname},
      );
      await ref.read(authProvider.notifier).loadProfile();
      if (mounted) {
        Toast.success(context, '昵称修改成功');
        Navigator.pop(context);
      }
    } catch (e) {
      if (mounted) {
        Toast.error(context, '$e');
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('编辑昵称')),
      body: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          children: [
            TextField(
              controller: _ctrl,
              maxLength: 10,
              decoration: const InputDecoration(
                labelText: '昵称',
                hintText: '2-10个字',
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 24),
            SizedBox(
              width: double.infinity,
              height: 48,
              child: ElevatedButton(
                onPressed: _saving ? null : _save,
                child: _saving
                    ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2))
                    : const Text('保存'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
