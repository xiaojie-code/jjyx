import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/api_client.dart';
import '../../../core/network/api_endpoints.dart';
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
    } catch (e) {
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
      // 回滚
      setState(() => _notificationEnabled = !value);
      if (mounted) Toast.error(context, '$e');
    }
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
              ],
            ),
    );
  }
}
