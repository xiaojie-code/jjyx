import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/api_client.dart';
import '../../../core/network/api_endpoints.dart';
import '../../main/providers/badge_provider.dart';

/// 服务通知页面（单向系统提醒，仿微信"服务通知"）
/// 仅展示，不可回复。用于查看业务处理结果、提现/建群/充值等系统提醒。
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
  final Set<int> _reviewingRequests = {};

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
    ref.read(badgeProvider.notifier).clearServiceNotifications();
    try {
      await ref
          .read(apiClientProvider)
          .put(ApiEndpoints.serviceNotificationsReadAll);
    } catch (_) {}
  }

  IconData _iconForType(String type) {
    switch (type) {
      case 'withdrawal':
      case 'withdrawal_progress':
      case 'withdrawal_result':
      case 'asset_withdrawal':
      case 'asset_withdrawal_progress':
      case 'asset_withdrawal_result':
        return Icons.account_balance_wallet;
      case 'group':
      case 'group_progress':
      case 'group_result':
        return Icons.group_add;
      case 'recharge':
      case 'recharge_progress':
      case 'asset_recharge':
      case 'asset_recharge_progress':
      case 'asset_recharge_result':
        return Icons.qr_code;
      case 'recharge_result':
        return Icons.verified;
      case 'shop_order':
      case 'shop_order_progress':
      case 'shop_order_result':
        return Icons.shopping_bag;
      default:
        return Icons.notifications;
    }
  }

  Color _colorForType(String type) {
    switch (type) {
      case 'withdrawal':
      case 'withdrawal_progress':
      case 'withdrawal_result':
      case 'asset_withdrawal':
      case 'asset_withdrawal_progress':
      case 'asset_withdrawal_result':
        return Colors.orange;
      case 'group':
      case 'group_progress':
      case 'group_result':
        return Colors.blue;
      case 'recharge':
      case 'recharge_progress':
      case 'asset_recharge':
      case 'asset_recharge_progress':
      case 'asset_recharge_result':
        return Colors.green;
      case 'recharge_result':
        return Colors.teal;
      case 'shop_order':
      case 'shop_order_progress':
      case 'shop_order_result':
        return Colors.deepOrange;
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

  Map<String, dynamic> _payload(Map<String, dynamic> item) {
    final raw = item['payloadJson'];
    if (raw is Map) return Map<String, dynamic>.from(raw);
    if (raw is! String || raw.trim().isEmpty) return {};
    try {
      final decoded = jsonDecode(raw);
      return decoded is Map ? Map<String, dynamic>.from(decoded) : {};
    } catch (_) {
      return {};
    }
  }

  String _meetingRequestStatusText(int status) {
    switch (status) {
      case 1:
        return '已同意';
      case 2:
        return '已拒绝';
      case 3:
        return '已超时拒绝';
      default:
        return '等待处理';
    }
  }

  String? _businessStatusText(String type, dynamic rawStatus) {
    if (type == 'meeting_request' || rawStatus == null) return null;
    final status = rawStatus.toString().toLowerCase();
    if (status == 'pending' || status == '0') return '处理中';
    if (status == 'approved' || status == '1') {
      if (type.contains('shop_order')) return '已发货';
      if (type.contains('recharge')) return '已处理';
      return '已通过';
    }
    if (status == 'rejected' || status == '2') return '已驳回';
    return null;
  }

  Color _businessStatusColor(String statusText) {
    switch (statusText) {
      case '处理中':
        return const Color(0xFFF59E0B);
      case '已通过':
      case '已处理':
      case '已发货':
        return const Color(0xFF16A34A);
      default:
        return const Color(0xFF98A2B3);
    }
  }

  Future<void> _reviewMeetingRequest(
    Map<String, dynamic> item,
    int requestId,
    String action,
  ) async {
    if (_reviewingRequests.contains(requestId)) return;
    setState(() => _reviewingRequests.add(requestId));
    try {
      await ref.read(apiClientProvider).post<Map<String, dynamic>>(
        ApiEndpoints.meetingRequestReview(requestId),
        data: {'action': action},
      );
      if (!mounted) return;
      final payload = _payload(item);
      payload['status'] = action == 'approve' ? 1 : 2;
      setState(() => item['payloadJson'] = jsonEncode(payload));
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(action == 'approve' ? '已同意会议申请' : '已拒绝会议申请')),
      );
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('处理失败：$e')),
        );
        await _load();
      }
    } finally {
      if (mounted) setState(() => _reviewingRequests.remove(requestId));
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
                      final payload = _payload(item);
                      final requestId = int.tryParse(
                              payload['requestId']?.toString() ?? '') ??
                          0;
                      final requestStatus =
                          int.tryParse(payload['status']?.toString() ?? '') ??
                              0;
                      final businessStatusText =
                          _businessStatusText(type, payload['status']);
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
                                if (businessStatusText != null) ...[
                                  const SizedBox(width: 8),
                                  Container(
                                    padding: const EdgeInsets.symmetric(
                                      horizontal: 8,
                                      vertical: 3,
                                    ),
                                    decoration: BoxDecoration(
                                      color: _businessStatusColor(
                                        businessStatusText,
                                      ).withOpacity(0.12),
                                      borderRadius: BorderRadius.circular(6),
                                    ),
                                    child: Text(
                                      businessStatusText,
                                      style: TextStyle(
                                        color: _businessStatusColor(
                                          businessStatusText,
                                        ),
                                        fontSize: 12,
                                        fontWeight: FontWeight.w600,
                                      ),
                                    ),
                                  ),
                                ],
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
                            if (type == 'meeting_request' && requestId > 0) ...[
                              const SizedBox(height: 12),
                              if (requestStatus == 0)
                                Row(
                                  children: [
                                    Expanded(
                                      child: OutlinedButton(
                                        onPressed: _reviewingRequests
                                                .contains(requestId)
                                            ? null
                                            : () => _reviewMeetingRequest(
                                                item, requestId, 'reject'),
                                        child: const Text('拒绝'),
                                      ),
                                    ),
                                    const SizedBox(width: 10),
                                    Expanded(
                                      child: FilledButton(
                                        onPressed: _reviewingRequests
                                                .contains(requestId)
                                            ? null
                                            : () => _reviewMeetingRequest(
                                                item, requestId, 'approve'),
                                        child: Text(_reviewingRequests
                                                .contains(requestId)
                                            ? '处理中...'
                                            : '同意'),
                                      ),
                                    ),
                                  ],
                                )
                              else
                                Align(
                                  alignment: Alignment.centerRight,
                                  child: Text(
                                    _meetingRequestStatusText(requestStatus),
                                    style: TextStyle(
                                      color: requestStatus == 1
                                          ? Colors.green
                                          : Colors.grey,
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                                ),
                            ],
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
