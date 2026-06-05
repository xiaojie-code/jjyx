import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/api_client.dart';
import '../../../core/network/api_endpoints.dart';
import '../../../core/update/app_update_service.dart';
import '../../../core/update/update_state.dart';
import '../../../core/utils/notification_service.dart';
import '../../../core/utils/toast.dart';

class SettingsPage extends ConsumerStatefulWidget {
  const SettingsPage({super.key});

  @override
  ConsumerState<SettingsPage> createState() => _SettingsPageState();
}

class _SettingsPageState extends ConsumerState<SettingsPage> {
  bool _notificationEnabled = true;
  bool _notificationSound = true;
  bool _notificationPopup = true;
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
        _notificationSound = result?['notificationSound'] as bool? ?? true;
        _notificationPopup = result?['notificationPopup'] as bool? ?? true;
        _loading = false;
      });
      // 同步到通知服务内存状态
      NotificationService.instance.updateSettings(
        master: _notificationEnabled,
        sound: _notificationSound,
        popup: _notificationPopup,
      );
    } catch (_) {
      setState(() => _loading = false);
    }
  }

  Future<void> _toggleNotification(bool value) async {
    setState(() => _notificationEnabled = value);
    NotificationService.instance.updateSettings(master: value);
    try {
      await ref.read(apiClientProvider).put(
        ApiEndpoints.userSettings,
        data: {'notificationEnabled': value},
      );
    } catch (e) {
      setState(() => _notificationEnabled = !value);
      NotificationService.instance.updateSettings(master: !value);
      if (mounted) Toast.error(context, '$e');
    }
  }

  Future<void> _toggleSound(bool value) async {
    setState(() => _notificationSound = value);
    NotificationService.instance.updateSettings(sound: value);
    try {
      await ref.read(apiClientProvider).put(
        ApiEndpoints.userSettings,
        data: {'notificationSound': value},
      );
    } catch (e) {
      setState(() => _notificationSound = !value);
      NotificationService.instance.updateSettings(sound: !value);
      if (mounted) Toast.error(context, '$e');
    }
  }

  Future<void> _togglePopup(bool value) async {
    setState(() => _notificationPopup = value);
    NotificationService.instance.updateSettings(popup: value);
    try {
      await ref.read(apiClientProvider).put(
        ApiEndpoints.userSettings,
        data: {'notificationPopup': value},
      );
    } catch (e) {
      setState(() => _notificationPopup = !value);
      NotificationService.instance.updateSettings(popup: !value);
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
                const Padding(
                  padding: EdgeInsets.fromLTRB(16, 16, 16, 4),
                  child: Text('新消息通知', style: TextStyle(fontSize: 13, color: Colors.grey)),
                ),
                SwitchListTile(
                  title: const Text('消息提醒'),
                  subtitle: const Text('消息提醒总开关'),
                  value: _notificationEnabled,
                  onChanged: _toggleNotification,
                ),
                SwitchListTile(
                  title: const Text('声音提醒'),
                  subtitle: const Text('收到新消息时播放提示音'),
                  value: _notificationSound,
                  onChanged: _notificationEnabled ? _toggleSound : null,
                ),
                SwitchListTile(
                  title: const Text('弹窗提醒'),
                  subtitle: const Text('应用在后台时显示通知弹窗'),
                  value: _notificationPopup,
                  onChanged: _notificationEnabled ? _togglePopup : null,
                ),
                const Divider(height: 1),
                const Padding(
                  padding: EdgeInsets.fromLTRB(16, 16, 16, 4),
                  child: Text('账号安全', style: TextStyle(fontSize: 13, color: Colors.grey)),
                ),
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
                  subtitle: Text(
                    ref.watch(updateStateProvider).hasUpdate
                        ? '发现新版本 v${ref.watch(updateStateProvider).availableVersionName}'
                        : '检测是否有新的安装包版本',
                  ),
                  trailing: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      if (ref.watch(updateStateProvider).hasUpdate)
                        Container(
                          width: 9,
                          height: 9,
                          margin: const EdgeInsets.only(right: 8),
                          decoration: const BoxDecoration(
                            color: Colors.red,
                            shape: BoxShape.circle,
                          ),
                        ),
                      const Icon(Icons.chevron_right),
                    ],
                  ),
                  onTap: () {
                    // 用户查看更新，标记红点为已读
                    ref.read(updateStateProvider.notifier).markSeen();
                    AppUpdateService.checkForUpdate(context, ref, manual: true);
                  },
                ),
              ],
            ),
    );
  }
}
