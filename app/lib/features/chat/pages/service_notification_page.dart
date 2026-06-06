import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/api_client.dart';
import '../../../core/network/api_endpoints.dart';
import '../../main/providers/badge_provider.dart';

/// 服务通知页面（单向系统提醒，仿微信"服务通知"）
/// 仅展示，不可回复。管理员用于查看提现/建群/充值等申请。
class ServiceNotificationPage extends ConsumerStatefulWidget {
  const ServiceNotificationPage({super.key});

  @override
  ConsumerState<ServiceNotificationPage> createState() =>
      _ServiceNotificationPageState();
}

class _ServiceNotificationPageState
    extends ConsumerState<ServiceNotificationPage> {
  List<Map<String, dynamic>> _items = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
    // 进入即全部标记已读
    _markAllRead();
  }

  Future<void> _load() async {
    try {
      final result =
          await ref.read(apiClientProvider).get<Map<String, dynamic>>(
        ApiEndpoints.serviceNotifications,
        queryParameters: {'page': '1', 'pageSize': '50'},
      );
      if (!mounted) return;
      final list = (result?['list'] as List?) ?? [];
      setState(() {
        _items = list.map((e) => Map<String, dynamic>.from(e)).toList();
        _loading = false;
      });
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _markAllRead() async {
    try {
      await ref
          .read(apiClientProvider)
          .put(ApiEndpoints.serviceNotificationsReadAll);
      ref.read(badgeProvider.notifier).clearServiceNotifications();
    } catch (_) {}
  }

  IconData _iconForType(String type) {
    switch (type) {
      case 'withdrawal':
        return Icons.account_balance_wallet;
      case 'group':
        return Icons.group_add;
      case 'recharge':
        return Icons.qr_code;
      case 'recharge_result':
        return Icons.verified;
      default:
        return Icons.notifications;
    }
  }

  Color _colorForType(String type) {
    switch (type) {
      case 'withdrawal':
        return Colors.orange;
      case 'group':
        return Colors.blue;
      case 'recharge':
        return Colors.green;
      case 'recharge_result':
        return Colors.teal;
      default:
        return Colors.grey;
    }
  }

  String _formatTime(String? raw) {
    if (raw == null || raw.isEmpty) return '';
    try {
      final t = DateTime.parse(raw).toLocal();
      return '${t.year}-${t.month.toString().padLeft(2, '0')}-${t.day.toString().padLeft(2, '0')} '
          '${t.hour.toString().padLeft(2, '0')}:${t.minute.toString().padLeft(2, '0')}';
    } catch (_) {
      return raw;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('服务通知')),
      backgroundColor: const Color(0xFFF5F5F5),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _items.isEmpty
              ? const Center(
                  child: Text('暂无通知', style: TextStyle(color: Colors.grey)))
              : RefreshIndicator(
                  onRefresh: _load,
                  child: ListView.separated(
                    padding: const EdgeInsets.all(12),
                    itemCount: _items.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 10),
                    itemBuilder: (context, index) {
                      final item = _items[index];
                      final type = item['type']?.toString() ?? '';
                      return Container(
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(10),
                        ),
                        padding: const EdgeInsets.all(14),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Icon(_iconForType(type),
                                    size: 20, color: _colorForType(type)),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: Text(
                                    item['title']?.toString() ?? '系统通知',
                                    style: const TextStyle(
                                        fontSize: 15,
                                        fontWeight: FontWeight.w600),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 8),
                            Text(
                              item['content']?.toString() ?? '',
                              style: const TextStyle(
                                  fontSize: 14,
                                  color: Colors.black87,
                                  height: 1.4),
                            ),
                            const SizedBox(height: 10),
                            Text(
                              _formatTime(item['createdAt']?.toString()),
                              style: TextStyle(
                                  fontSize: 11, color: Colors.grey.shade500),
                            ),
                          ],
                        ),
                      );
                    },
                  ),
                ),
    );
  }
}
