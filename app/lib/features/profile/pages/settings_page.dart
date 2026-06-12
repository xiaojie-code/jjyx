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
      final result =
          await ref.read(apiClientProvider).get<Map<String, dynamic>>(
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
      if (_notificationEnabled || _notificationPopup) {
        await _ensureSystemNotificationPermission(openSettingsOnDenied: false);
      }
    } catch (_) {
      setState(() => _loading = false);
    }
  }

  Future<bool> _ensureSystemNotificationPermission({
    bool openSettingsOnDenied = true,
  }) async {
    final granted = await NotificationService.instance.requestPermission();
    if (!mounted) return granted;
    if (!granted) {
      Toast.error(context, '系统通知权限未开启，请允许通知后才能收到新消息提醒');
      if (openSettingsOnDenied) {
        await NotificationService.instance.openNotificationSettings();
      }
    }
    return granted;
  }

  Future<void> _openNewMessageNotificationSettings() async {
    await NotificationService.instance.requestPermission();
    await NotificationService.instance.openNewMessageNotificationSettings();
  }

  Future<void> _openFullScreenNotificationSettings() async {
    await NotificationService.instance.openFullScreenNotificationSettings();
  }

  Future<void> _sendTestNotification() async {
    await NotificationService.instance.requestPermission();
    NotificationService.instance.updateSettings(
      master: true,
      sound: true,
      popup: true,
    );
    await NotificationService.instance.showTestNotification();
    if (mounted) {
      Toast.info(context, '已发送测试通知，请查看是否有弹窗和提示音');
    }
  }

  Future<void> _toggleNotification(bool value) async {
    setState(() => _notificationEnabled = value);
    NotificationService.instance.updateSettings(master: value);
    if (value) {
      await _ensureSystemNotificationPermission();
    }
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
    if (value) {
      await _ensureSystemNotificationPermission();
    }
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
            content: SingleChildScrollView(
              child: Column(
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
                          if (!context.mounted || !dialogContext.mounted) {
                            return;
                          }
                          Navigator.pop(dialogContext);
                          Toast.success(context, '密码修改成功');
                        } catch (e) {
                          if (context.mounted) Toast.error(context, '$e');
                        } finally {
                          if (dialogContext.mounted) {
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
                  child: Text('新消息通知',
                      style: TextStyle(fontSize: 13, color: Colors.grey)),
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
                  subtitle: const Text('应用内显示横幅，后台显示系统通知'),
                  value: _notificationPopup,
                  onChanged: _notificationEnabled ? _togglePopup : null,
                ),
                ListTile(
                  leading: const Icon(Icons.notifications_active_outlined),
                  title: const Text('系统通知设置'),
                  subtitle: const Text('开启悬浮通知、声音、振动、锁屏通知'),
                  trailing: const Icon(Icons.chevron_right),
                  onTap: _openNewMessageNotificationSettings,
                ),
                ListTile(
                  leading: const Icon(Icons.open_in_full),
                  title: const Text('强提醒弹窗设置'),
                  subtitle: const Text('允许后台消息使用强提醒弹窗'),
                  trailing: const Icon(Icons.chevron_right),
                  onTap: _openFullScreenNotificationSettings,
                ),
                ListTile(
                  leading: const Icon(Icons.notifications_paused_outlined),
                  title: const Text('发送测试通知'),
                  subtitle: const Text('测试后台通知弹窗和通知音'),
                  trailing: const Icon(Icons.chevron_right),
                  onTap: _sendTestNotification,
                ),
                const Divider(height: 1),
                const Padding(
                  padding: EdgeInsets.fromLTRB(16, 16, 16, 4),
                  child: Text('账号安全',
                      style: TextStyle(fontSize: 13, color: Colors.grey)),
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
