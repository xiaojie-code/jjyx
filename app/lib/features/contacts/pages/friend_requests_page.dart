import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/api_client.dart';
import '../../../core/network/api_endpoints.dart';
import '../../../core/utils/toast.dart';
import '../../main/providers/badge_provider.dart';

class FriendRequestsPage extends ConsumerStatefulWidget {
  const FriendRequestsPage({super.key});

  @override
  ConsumerState<FriendRequestsPage> createState() => _FriendRequestsPageState();
}

class _FriendRequestsPageState extends ConsumerState<FriendRequestsPage>
    with SingleTickerProviderStateMixin {
  late TabController _tabCtrl;
  List<Map<String, dynamic>> _received = [];
  List<Map<String, dynamic>> _sent = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _tabCtrl = TabController(length: 2, vsync: this);
    _loadAll();
  }

  @override
  void dispose() {
    _tabCtrl.dispose();
    super.dispose();
  }

  Future<void> _loadAll() async {
    setState(() => _loading = true);
    try {
      final receivedResult = await ref.read(apiClientProvider).get<List<dynamic>>('/api/social/contacts/requests');
      final sentResult = await ref.read(apiClientProvider).get<List<dynamic>>('/api/social/contacts/requests/sent');
      if (!mounted) return;
      setState(() {
        _received = (receivedResult ?? []).map((e) => Map<String, dynamic>.from(e)).toList();
        _sent = (sentResult ?? []).map((e) => Map<String, dynamic>.from(e)).toList();
        _loading = false;
      });
      // 加载完成后清除红点
      ref.read(badgeProvider.notifier).clearFriendRequests();
    } catch (e) {
      if (!mounted) return;
      setState(() => _loading = false);
    }
  }

  Future<void> _handle(int requestId, bool accept) async {
    try {
      await ref.read(apiClientProvider).put(
        ApiEndpoints.contactRequestHandle(requestId),
        data: {'accept': accept},
      );
      Toast.success(context, accept ? '已同意好友申请' : '已拒绝好友申请');
      _loadAll();
    } catch (e) {
      if (mounted) Toast.error(context, '$e');
    }
  }

  String _statusText(int status) {
    switch (status) {
      case 0: return '等待处理';
      case 1: return '已同意';
      case 2: return '已拒绝';
      default: return '未知';
    }
  }

  Color _statusColor(int status) {
    switch (status) {
      case 0: return Colors.orange;
      case 1: return Colors.green;
      case 2: return Colors.red;
      default: return Colors.grey;
    }
  }

  IconData _statusIcon(int status) {
    switch (status) {
      case 0: return Icons.schedule;
      case 1: return Icons.check_circle;
      case 2: return Icons.cancel;
      default: return Icons.help;
    }
  }

  @override
  Widget build(BuildContext context) {
    final pendingCount = _received.where((r) => r['status'] == 0).length;

    return Scaffold(
      appBar: AppBar(
        title: const Text('好友申请'),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(46),
          child: Container(
            color: Colors.white,
            child: TabBar(
              controller: _tabCtrl,
              labelColor: Theme.of(context).primaryColor,
              unselectedLabelColor: Colors.grey,
              indicatorColor: Theme.of(context).primaryColor,
              indicatorWeight: 3,
              tabs: [
                Tab(
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Text('收到的'),
                      if (pendingCount > 0) ...[
                        const SizedBox(width: 4),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
                          decoration: BoxDecoration(color: Colors.red, borderRadius: BorderRadius.circular(10)),
                          child: Text('$pendingCount', style: const TextStyle(color: Colors.white, fontSize: 11)),
                        ),
                      ],
                    ],
                  ),
                ),
                Tab(
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Text('发出的'),
                      if (_sent.isNotEmpty) ...[
                        const SizedBox(width: 4),
                        Text('(${_sent.length})', style: const TextStyle(fontSize: 12, color: Colors.grey)),
                      ],
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : TabBarView(
              controller: _tabCtrl,
              children: [
                _buildReceivedList(),
                _buildSentList(),
              ],
            ),
    );
  }

  Widget _buildReceivedList() {
    if (_received.isEmpty) {
      return _buildEmptyState('暂无收到的好友申请', Icons.inbox_outlined);
    }
    return RefreshIndicator(
      onRefresh: _loadAll,
      child: ListView.separated(
        padding: const EdgeInsets.symmetric(vertical: 8),
        itemCount: _received.length,
        separatorBuilder: (_, __) => const Divider(height: 1, indent: 72),
        itemBuilder: (context, index) {
          final r = _received[index];
          final status = r['status'] as int? ?? 0;
          final name = r['fromNickname'] ?? r['fromAccount'] ?? '用户${r['fromUserId']}';
          final account = r['fromAccount'] ?? '';
          return _buildRequestCard(
            name: name,
            account: account,
            status: status,
            isReceived: true,
            requestId: r['id'],
          );
        },
      ),
    );
  }

  Widget _buildSentList() {
    if (_sent.isEmpty) {
      return _buildEmptyState('暂无发出的好友申请', Icons.outbox_outlined);
    }
    return RefreshIndicator(
      onRefresh: _loadAll,
      child: ListView.separated(
        padding: const EdgeInsets.symmetric(vertical: 8),
        itemCount: _sent.length,
        separatorBuilder: (_, __) => const Divider(height: 1, indent: 72),
        itemBuilder: (context, index) {
          final r = _sent[index];
          final status = r['status'] as int? ?? 0;
          final name = r['toNickname'] ?? r['toAccount'] ?? '用户${r['toUserId']}';
          final account = r['toAccount'] ?? '';
          return _buildRequestCard(
            name: name,
            account: account,
            status: status,
            isReceived: false,
          );
        },
      ),
    );
  }

  Widget _buildRequestCard({
    required String name,
    required String account,
    required int status,
    required bool isReceived,
    int? requestId,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      child: Row(
        children: [
          // 头像
          CircleAvatar(
            radius: 22,
            backgroundColor: isReceived ? Colors.blue.shade50 : Colors.green.shade50,
            child: Icon(
              isReceived ? Icons.person : Icons.person_add,
              color: isReceived ? Colors.blue : Colors.green,
              size: 22,
            ),
          ),
          const SizedBox(width: 12),
          // 用户信息
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(name, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w500)),
                const SizedBox(height: 3),
                Text(
                  '账号：$account',
                  style: const TextStyle(fontSize: 12, color: Colors.grey),
                ),
              ],
            ),
          ),
          // 操作/状态
          if (isReceived && status == 0)
            Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                _actionButton('同意', Colors.green, () => _handle(requestId!, true)),
                const SizedBox(width: 8),
                _actionButton('拒绝', Colors.red, () => _handle(requestId!, false)),
              ],
            )
          else
            _buildStatusChip(status),
        ],
      ),
    );
  }

  Widget _actionButton(String text, Color color, VoidCallback onTap) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
        decoration: BoxDecoration(
          color: color.withOpacity(0.1),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: color.withOpacity(0.3)),
        ),
        child: Text(text, style: TextStyle(fontSize: 13, color: color, fontWeight: FontWeight.w500)),
      ),
    );
  }

  Widget _buildStatusChip(int status) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: _statusColor(status).withOpacity(0.08),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(_statusIcon(status), size: 14, color: _statusColor(status)),
          const SizedBox(width: 4),
          Text(
            _statusText(status),
            style: TextStyle(fontSize: 12, color: _statusColor(status), fontWeight: FontWeight.w500),
          ),
        ],
      ),
    );
  }

  Widget _buildEmptyState(String text, IconData icon) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 56, color: Colors.grey.shade300),
          const SizedBox(height: 12),
          Text(text, style: TextStyle(fontSize: 14, color: Colors.grey.shade500)),
        ],
      ),
    );
  }
}
