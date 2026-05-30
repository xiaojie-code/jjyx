import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/api_client.dart';
import '../../../core/utils/toast.dart';

class InvitePage extends ConsumerStatefulWidget {
  final String inviteCode;
  const InvitePage({super.key, required this.inviteCode});

  @override
  ConsumerState<InvitePage> createState() => _InvitePageState();
}

class _InvitePageState extends ConsumerState<InvitePage> {
  Map<String, dynamic>? _data;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadRecords();
  }

  Future<void> _loadRecords() async {
    try {
      final result = await ref.read(apiClientProvider).get<Map<String, dynamic>>('/api/auth/invite/records');
      setState(() { _data = result; _loading = false; });
    } catch (e) {
      setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final directList = (_data?['directInvitees'] as List?) ?? [];
    final indirectList = (_data?['indirectInvitees'] as List?) ?? [];
    final totalReward = (_data?['totalReward'] as num?)?.toDouble() ?? 0;

    return Scaffold(
      appBar: AppBar(title: const Text('邀请奖励')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // 邀请码
                  Center(
                    child: Column(
                      children: [
                        const Text('邀请好友一起玩', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                        const SizedBox(height: 4),
                        const Text('直推奖励100积分 · 间推奖励30积分', style: TextStyle(color: Colors.grey, fontSize: 13)),
                        const SizedBox(height: 16),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                          decoration: BoxDecoration(color: Colors.orange.shade50, borderRadius: BorderRadius.circular(8)),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Text(widget.inviteCode.isNotEmpty ? widget.inviteCode : '---',
                                  style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold, letterSpacing: 3)),
                              const SizedBox(width: 8),
                              IconButton(icon: const Icon(Icons.copy, size: 20), onPressed: () {
                                if (widget.inviteCode.isNotEmpty) {
                                  Clipboard.setData(ClipboardData(text: widget.inviteCode));
                                  Toast.success(context, '邀请码已复制');
                                }
                              }),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 24),
                  // 统计
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(10)),
                    child: Row(
                      children: [
                        Expanded(child: _statItem('直推', '${directList.length}人')),
                        Expanded(child: _statItem('间推', '${indirectList.length}人')),
                        Expanded(child: _statItem('总奖励', '${totalReward.toInt()}')),
                      ],
                    ),
                  ),
                  const SizedBox(height: 24),

                  // 直推记录
                  if (directList.isNotEmpty) ...[
                    const Text('直推邀请（+100邀请积分/人）', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600)),
                    const SizedBox(height: 8),
                    ...directList.map((item) => _recordTile(item, '+100邀请积分')),
                    const SizedBox(height: 16),
                  ],

                  // 间推记录
                  if (indirectList.isNotEmpty) ...[
                    const Text('间接邀请（+30邀请积分/人）', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600)),
                    const SizedBox(height: 8),
                    ...indirectList.map((item) => _recordTile(item, '+30邀请积分')),
                  ],

                  if (directList.isEmpty && indirectList.isEmpty)
                    const Center(child: Padding(
                      padding: EdgeInsets.only(top: 40),
                      child: Text('暂无邀请记录', style: TextStyle(color: Colors.grey)),
                    )),
                ],
              ),
            ),
    );
  }

  Widget _statItem(String label, String value) {
    return Column(
      children: [
        Text(value, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
        const SizedBox(height: 2),
        Text(label, style: const TextStyle(fontSize: 12, color: Colors.grey)),
      ],
    );
  }

  Widget _recordTile(dynamic item, String reward) {
    final map = Map<String, dynamic>.from(item);
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(8)),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(map['nickname'] ?? map['account'] ?? '用户${map['id']}', style: const TextStyle(fontSize: 14)),
                Text('${map['registerTime'] ?? ''}', style: const TextStyle(fontSize: 12, color: Colors.grey)),
              ],
            ),
          ),
          Text(reward, style: const TextStyle(color: Colors.green, fontWeight: FontWeight.w600)),
        ],
      ),
    );
  }
}
