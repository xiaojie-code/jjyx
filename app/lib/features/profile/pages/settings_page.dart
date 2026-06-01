import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/api_client.dart';
import '../../../core/network/api_endpoints.dart';
import '../../../core/update/app_update_service.dart';
import '../../../core/utils/toast.dart';

class SettingsPage extends ConsumerStatefulWidget {
  const SettingsPage({super.key});

  @override
  ConsumerState<SettingsPage> createState() => _SettingsPageState();
}

class _SettingsPageState extends ConsumerState<SettingsPage> {
  bool _notificationEnabled = true;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadSettings();
  }

  Future<void> _loadSettings() async {
    try {
      final result = await ref.read(apiClientProvider).get<Map<String, dynamic>>(
            ApiEndpoints.userSettings,
          );
      setState(() {
        _notificationEnabled = result?['notificationEnabled'] as bool? ?? true;
        _loading = false;
      });
    } catch (_) {
      setState(() => _loading = false);
    }
  }

  Future<void> _toggleNotification(bool value) async {
    setState(() => _notificationEnabled = value);
    try {
      await ref.read(apiClientProvider).put(
        ApiEndpoints.userSettings,
        data: {'notificationEnabled': value},
      );
    } catch (e) {
      setState(() => _notificationEnabled = !value);
      if (mounted) Toast.error(context, '$e');
    }
  }

  Future<void> _showChangePasswordDialog() async {
    final oldCtrl = TextEditingController();
    final newCtrl = TextEditingController();
    final confirmCtrl = TextEditingController();
    var submitting = false;

    await showDialog<void>(
      context: context,
      builder: (dialogContext) {
        return StatefulBuilder(
          builder: (context, setDialogState) => AlertDialog(
            title: const Text('修改密码'),
            content: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextField(
                  controller: oldCtrl,
                  obscureText: true,
                  decoration: const InputDecoration(
                    labelText: '原密码',
                    border: OutlineInputBorder(),
                  ),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: newCtrl,
                  obscureText: true,
                  decoration: const InputDecoration(
                    labelText: '新密码',
                    border: OutlineInputBorder(),
                  ),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: confirmCtrl,
                  obscureText: true,
                  decoration: const InputDecoration(
                    labelText: '确认新密码',
                    border: OutlineInputBorder(),
                  ),
                ),
              ],
            ),
            actions: [
              TextButton(
                onPressed:
                    submitting ? null : () => Navigator.pop(dialogContext),
                child: const Text('取消'),
              ),
              ElevatedButton(
                onPressed: submitting
                    ? null
                    : () async {
                        final oldPassword = oldCtrl.text.trim();
                        final newPassword = newCtrl.text.trim();
                        final confirm = confirmCtrl.text.trim();
                        if (oldPassword.isEmpty || newPassword.isEmpty) {
                          Toast.error(context, '请填写原密码和新密码');
                          return;
                        }
                        if (newPassword.length < 6) {
                          Toast.error(context, '新密码至少6位');
                          return;
                        }
                        if (newPassword != confirm) {
                          Toast.error(context, '两次新密码不一致');
                          return;
                        }
                        setDialogState(() => submitting = true);
                        try {
                          await ref.read(apiClientProvider).put(
                            ApiEndpoints.changePassword,
                            data: {
                              'currentPassword': oldPassword,
                              'newPassword': newPassword,
                            },
                          );
                          if (!mounted) return;
                          Navigator.pop(dialogContext);
                          Toast.success(context, '密码修改成功');
                        } catch (e) {
                          if (mounted) Toast.error(context, '$e');
                        } finally {
                          if (context.mounted) {
                            setDialogState(() => submitting = false);
                          }
                        }
                      },
                child: submitting
                    ? const SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Text('确认修改'),
              ),
            ],
          ),
        );
      },
    );
    oldCtrl.dispose();
    newCtrl.dispose();
    confirmCtrl.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('设置')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              children: [
                SwitchListTile(
                  title: const Text('消息提醒'),
                  subtitle: const Text('开启后接收消息时弹窗提示'),
                  value: _notificationEnabled,
                  onChanged: _toggleNotification,
                ),
                const Divider(height: 1),
                ListTile(
                  leading: const Icon(Icons.lock_reset),
                  title: const Text('修改密码'),
                  subtitle: const Text('修改当前账号登录密码'),
                  trailing: const Icon(Icons.chevron_right),
                  onTap: _showChangePasswordDialog,
                ),
                const Divider(height: 1),
                ListTile(
                  leading: const Icon(Icons.system_update_alt),
                  title: const Text('检查更新'),
                  subtitle: const Text('检测是否有新的安装包版本'),
                  trailing: const Icon(Icons.chevron_right),
                  onTap: () => AppUpdateService.checkForUpdate(context, ref, manual: true),
                ),
              ],
            ),
    );
  }
}
