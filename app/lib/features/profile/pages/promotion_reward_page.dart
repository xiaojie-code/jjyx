import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/api_client.dart';
import '../../../core/utils/toast.dart';
import '../../auth/providers/auth_provider.dart';

class PromotionRewardPage extends ConsumerStatefulWidget {
  const PromotionRewardPage({super.key});

  @override
  ConsumerState<PromotionRewardPage> createState() => _PromotionRewardPageState();
}

class _PromotionRewardPageState extends ConsumerState<PromotionRewardPage> {
  static const double _startupAmount = 2000;
  static const double _rewardRate = 0.35;
  static const double _oldUserReentryBase = 1300;

  bool _loading = true;
  String? _error;
  PromotionMatrixViewModel? _matrix;
  List<Map<String, dynamic>>? _matrixRawSlots;
  Map<String, dynamic>? _inviteInfo;

  @override
  void initState() {
    super.initState();
    _checkActivation();
  }

  void _checkActivation() {
    final authState = ref.read(authProvider);
    final isActivated = authState.user?.isActivated ?? false;
    if (!isActivated) {
      // 延迟显示激活提示，避免在 build 期间弹窗
      WidgetsBinding.instance.addPostFrameCallback((_) {
        _showActivationDialog();
      });
    } else {
      _loadPromotionRewards();
      _loadInviteInfo();
    }
  }

  void _showActivationDialog() {
    final codeCtrl = TextEditingController();
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => AlertDialog(
        title: const Text('请先激活游戏'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text('需要使用激活码激活后才能使用推广奖励功能', style: TextStyle(fontSize: 13, color: Colors.grey)),
            const SizedBox(height: 16),
            TextField(
              controller: codeCtrl,
              decoration: const InputDecoration(
                hintText: '请输入激活码',
                border: OutlineInputBorder(),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () { Navigator.pop(ctx); Navigator.pop(context); },
            child: const Text('返回'),
          ),
          ElevatedButton(
            onPressed: () async {
              final code = codeCtrl.text.trim();
              if (code.isEmpty) return;
              try {
                await ref.read(apiClientProvider).post('/api/auth/activate', data: {'code': code});
                await ref.read(authProvider.notifier).loadProfile();
                if (mounted) {
                  Navigator.pop(ctx);
                  Toast.success(context, '激活成功！');
                  _loadPromotionRewards();
                  _loadInviteInfo();
                }
              } catch (e) {
                if (mounted) {
                  Toast.error(context, '$e');
                }
              }
            },
            child: const Text('激活'),
          ),
        ],
      ),
    );
  }

  Future<void> _loadInviteInfo() async {
    try {
      final result = await ref.read(apiClientProvider).get<Map<String, dynamic>>('/api/matrix/invite-info');
      if (!mounted) return;
      setState(() { _inviteInfo = result; });
    } catch (_) {}
  }

  Future<void> _showDirectUsers() async {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('直推用户'),
        content: SizedBox(
          width: double.maxFinite,
          child: FutureBuilder<List<dynamic>?>(
            future: ref.read(apiClientProvider).get<List<dynamic>>('/api/matrix/direct-users'),
            builder: (context, snapshot) {
              if (snapshot.connectionState == ConnectionState.waiting) {
                return const SizedBox(height: 100, child: Center(child: CircularProgressIndicator()));
              }
              final users = snapshot.data ?? [];
              if (users.isEmpty) {
                return const Text('暂无直推用户');
              }
              final directUsers = users
                  .map((item) => Map<String, dynamic>.from(item))
                  .toList();
              final activeCount = directUsers
                  .where((user) => user['isActivated'] == true)
                  .length;

              return Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                    decoration: BoxDecoration(
                      color: Colors.blue.shade50,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceAround,
                      children: [
                        _miniStat('总直推', '${directUsers.length}人'),
                        _miniStat('有效直推', '$activeCount人'),
                      ],
                    ),
                  ),
                  const SizedBox(height: 10),
                  Flexible(
                    child: ListView.builder(
                      shrinkWrap: true,
                      itemCount: directUsers.length,
                      itemBuilder: (context, index) {
                        final user = directUsers[index];
                        final name = user['nickname'] ?? user['account'] ?? '用户${user['id']}';
                        final account = user['account'] ?? '';
                        final completedRounds = user['completedRounds'] ?? 0;
                        final currentFilled = user['currentFilled'] ?? 0;
                        final isActivated = user['isActivated'] == true;
                        return ListTile(
                          dense: true,
                          leading: CircleAvatar(
                            radius: 18,
                            backgroundColor: isActivated ? Colors.green.shade100 : Colors.grey.shade200,
                            child: Text('${index + 1}', style: TextStyle(fontSize: 12, color: isActivated ? Colors.green : Colors.grey)),
                          ),
                          title: Row(
                            children: [
                              Expanded(child: Text(name, style: const TextStyle(fontSize: 14))),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                decoration: BoxDecoration(
                                  color: isActivated ? Colors.green.shade50 : Colors.grey.shade100,
                                  borderRadius: BorderRadius.circular(4),
                                ),
                                child: Text(
                                  isActivated ? '已激活' : '未激活',
                                  style: TextStyle(fontSize: 10, color: isActivated ? Colors.green : Colors.grey),
                                ),
                              ),
                            ],
                          ),
                          subtitle: Text('账号：$account · 完成${completedRounds}轮 · 当前${currentFilled}/6',
                              style: const TextStyle(fontSize: 11, color: Colors.grey)),
                        );
                      },
                    ),
                  ),
                ],
              );
            },
          ),
        ),
        actions: [TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('关闭'))],
      ),
    );
  }

  Widget _miniStat(String label, String value) {
    return Column(
      children: [
        Text(value, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
        const SizedBox(height: 2),
        Text(label, style: const TextStyle(fontSize: 11, color: Colors.grey)),
      ],
    );
  }

  Future<void> _showCompletedRounds() async {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('已完成矩阵'),
        content: SizedBox(
          width: double.maxFinite,
          child: FutureBuilder<List<dynamic>?>(
            future: ref.read(apiClientProvider).get<List<dynamic>>('/api/matrix/completed-rounds'),
            builder: (context, snapshot) {
              if (snapshot.connectionState == ConnectionState.waiting) {
                return const SizedBox(height: 100, child: Center(child: CircularProgressIndicator()));
              }
              final rounds = snapshot.data ?? [];
              if (rounds.isEmpty) {
                return const Text('暂无已完成的矩阵');
              }
              return ListView.builder(
                shrinkWrap: true,
                itemCount: rounds.length,
                itemBuilder: (context, index) {
                  final round = Map<String, dynamic>.from(rounds[index]);
                  final roundNum = round['round'] ?? (index + 1);
                  final slots = (round['slots'] as List?) ?? [];
                  final claimable = double.tryParse(round['claimableIncome']?.toString() ?? '0') ?? 0;
                  return ExpansionTile(
                    title: Text('第${roundNum}轮', style: const TextStyle(fontWeight: FontWeight.w600)),
                    subtitle: Text('可领取收益：${_formatAmount(claimable)}', style: const TextStyle(fontSize: 12, color: Colors.grey)),
                    children: slots.map<Widget>((s) {
                      final slot = Map<String, dynamic>.from(s);
                      final user = slot['user'] as Map<String, dynamic>?;
                      final slotNum = slot['slotNumber'] ?? 0;
                      final isNew = slot['isNewUser'] == true;
                      final isDirect = user?['isDirect'] == true;
                      final name = user?['nickname'] ?? user?['account'] ?? '未知';
                      final income = double.tryParse(slot['incomeAmount']?.toString() ?? '0') ?? 0;
                      final incomeType = slot['incomeType']?.toString() ?? '';
                      final incomeLabel = income <= 0
                          ? '无收益'
                          : (incomeType == 'next_fund' || slotNum >= 5)
                              ? '下轮资金${_formatAmount(income)}'
                              : '可领取${_formatAmount(income)}';

                      return ListTile(
                        dense: true,
                        leading: CircleAvatar(
                          radius: 16,
                          backgroundColor: isDirect ? Colors.blue.shade100 : Colors.grey.shade200,
                          child: Text('$slotNum', style: TextStyle(fontSize: 12, color: isDirect ? Colors.blue : Colors.grey)),
                        ),
                        title: Row(
                          children: [
                            Text(name, style: const TextStyle(fontSize: 13)),
                            const SizedBox(width: 6),
                            if (isDirect)
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
                                decoration: BoxDecoration(color: Colors.blue.shade50, borderRadius: BorderRadius.circular(3)),
                                child: const Text('直推', style: TextStyle(fontSize: 10, color: Colors.blue)),
                              )
                            else
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
                                decoration: BoxDecoration(color: Colors.grey.shade100, borderRadius: BorderRadius.circular(3)),
                                child: const Text('非直推', style: TextStyle(fontSize: 10, color: Colors.grey)),
                              ),
                          ],
                        ),
                        subtitle: Text(
                          '${isNew ? "新用户" : "老用户"} · $incomeLabel',
                          style: const TextStyle(fontSize: 11, color: Colors.grey),
                        ),
                      );
                    }).toList(),
                  );
                },
              );
            },
          ),
        ),
        actions: [TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('关闭'))],
      ),
    );
  }

  Future<void> _showIncomeDetail() async {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('收益明细'),
        content: SizedBox(
          width: double.maxFinite,
          child: FutureBuilder<Map<String, dynamic>?>(
            future: ref.read(apiClientProvider).get<Map<String, dynamic>>('/api/matrix/income-detail'),
            builder: (context, snapshot) {
              if (snapshot.connectionState == ConnectionState.waiting) {
                return const SizedBox(height: 100, child: Center(child: CircularProgressIndicator()));
              }
              final data = snapshot.data;
              if (data == null) {
                return const Text('暂无收益数据');
              }
              final totalClaimable = double.tryParse(data['totalClaimable']?.toString() ?? '0') ?? 0;
              final totalNextFund = double.tryParse(data['totalNextFund']?.toString() ?? '0') ?? 0;
              final rounds = (data['rounds'] as List?) ?? [];

              return Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // 汇总
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Colors.green.shade50,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Row(
                      children: [
                        Expanded(child: Column(
                          children: [
                            Text(_formatAmount(totalClaimable), style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.green)),
                            const Text('可领取总收益', style: TextStyle(fontSize: 11, color: Colors.grey)),
                          ],
                        )),
                        Expanded(child: Column(
                          children: [
                            Text(_formatAmount(totalNextFund), style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.orange)),
                            const Text('下轮启动资金', style: TextStyle(fontSize: 11, color: Colors.grey)),
                          ],
                        )),
                      ],
                    ),
                  ),
                  const SizedBox(height: 12),
                  // 每轮明细
                  Flexible(
                    child: ListView.builder(
                      shrinkWrap: true,
                      itemCount: rounds.length,
                      itemBuilder: (context, index) {
                        final round = Map<String, dynamic>.from(rounds[index]);
                        final roundNum = round['round'] ?? (index + 1);
                        final status = round['status'] ?? '';
                        final slots = (round['slots'] as List?) ?? [];
                        final specialRewards = (round['specialRewards'] as List?) ?? [];
                        final roundClaimable = double.tryParse(round['claimableIncome']?.toString() ?? '0') ?? 0;
                        final roundNextFund = double.tryParse(round['nextRoundFund']?.toString() ?? '0') ?? 0;

                        return ExpansionTile(
                          title: Row(
                            children: [
                              Text('第${roundNum}轮', style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
                              const SizedBox(width: 6),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
                                decoration: BoxDecoration(
                                  color: status == '进行中' ? Colors.blue.shade50 : Colors.grey.shade100,
                                  borderRadius: BorderRadius.circular(3),
                                ),
                                child: Text(status, style: TextStyle(fontSize: 10, color: status == '进行中' ? Colors.blue : Colors.grey)),
                              ),
                            ],
                          ),
                          subtitle: Text(
                            '可领取 ${_formatAmount(roundClaimable)} · 下轮资金 ${_formatAmount(roundNextFund)}',
                            style: const TextStyle(fontSize: 11, color: Colors.grey),
                          ),
                          children: [
                            ...specialRewards.map<Widget>((s) {
                              final reward = Map<String, dynamic>.from(s);
                              final user = reward['user'] as Map<String, dynamic>?;
                              final amount = double.tryParse(reward['amount']?.toString() ?? '0') ?? 0;
                              final name = user?['nickname'] ?? user?['account'] ?? '未知';
                              return ListTile(
                                dense: true,
                                leading: CircleAvatar(
                                  radius: 14,
                                  backgroundColor: Colors.purple.shade50,
                                  child: const Text('特', style: TextStyle(fontSize: 11, color: Colors.purple)),
                                ),
                                title: Text('特殊奖励 - $name', style: const TextStyle(fontSize: 13)),
                                subtitle: const Text('指定账号推广树激活奖励，不计入矩阵可领取金额',
                                    style: TextStyle(fontSize: 11, color: Colors.grey)),
                                trailing: Text(
                                  '+${_formatAmount(amount)}',
                                  style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Colors.green),
                                ),
                              );
                            }),
                            if (slots.isEmpty && specialRewards.isEmpty)
                              const Padding(padding: EdgeInsets.all(12), child: Text('暂无入位用户', style: TextStyle(color: Colors.grey))),
                            ...slots.map<Widget>((s) {
                                  final slot = Map<String, dynamic>.from(s);
                                  final user = slot['user'] as Map<String, dynamic>?;
                                  final slotNum = slot['slotNumber'] ?? 0;
                                  final isNew = slot['isNewUser'] == true;
                                  final income = double.tryParse(slot['incomeAmount']?.toString() ?? '0') ?? 0;
                                  final incomeType = slot['incomeType'] ?? '';
                                  final name = user?['nickname'] ?? user?['account'] ?? '未知';

                                  return ListTile(
                                    dense: true,
                                    leading: CircleAvatar(
                                      radius: 14,
                                      backgroundColor: income > 0 ? Colors.green.shade100 : Colors.grey.shade200,
                                      child: Text('$slotNum', style: TextStyle(fontSize: 11, color: income > 0 ? Colors.green : Colors.grey)),
                                    ),
                                    title: Text(name, style: const TextStyle(fontSize: 13)),
                                    subtitle: Text(
                                      '${isNew ? "新用户" : "老用户"} · ${slotNum <= 4 ? "1-4号位" : "5-6号位"}',
                                      style: const TextStyle(fontSize: 11, color: Colors.grey),
                                    ),
                                    trailing: Column(
                                      mainAxisAlignment: MainAxisAlignment.center,
                                      crossAxisAlignment: CrossAxisAlignment.end,
                                      children: [
                                        Text(
                                          income >= 0.1 ? '+${_formatAmount(income)}' : '0',
                                          style: TextStyle(
                                            fontSize: 13,
                                            fontWeight: FontWeight.w600,
                                            color: income >= 0.1 ? Colors.green : Colors.grey,
                                          ),
                                        ),
                                        Text(
                                          incomeType == 'claimable' ? '可领取' : incomeType == 'next_fund' ? '下轮资金' : '无收益',
                                          style: const TextStyle(fontSize: 10, color: Colors.grey),
                                        ),
                                      ],
                                    ),
                                  );
                                }),
                          ],
                        );
                      },
                    ),
                  ),
                ],
              );
            },
          ),
        ),
        actions: [TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('关闭'))],
      ),
    );
  }

  Future<void> _enterNextRound() async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('确认进入下一轮'),
        content: const Text('当前矩阵已满员，确认出局并开启下一轮矩阵？'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('取消')),
          TextButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('确认', style: TextStyle(color: Colors.blue))),
        ],
      ),
    );
    if (confirm != true) return;

    try {
      await ref.read(apiClientProvider).post<Map<String, dynamic>>('/api/matrix/next-round');
      if (!mounted) return;
      Toast.success(context, '已成功进入下一轮！');
      // 重新加载数据
      _loadPromotionRewards();
      _loadInviteInfo();
    } catch (e) {
      if (!mounted) return;
      Toast.error(context, '$e');
    }
  }

  Future<void> _loadPromotionRewards() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final result = await ref.read(apiClientProvider).get<Map<String, dynamic>>('/api/matrix/current');
      final matrix = PromotionMatrixViewModel.fromMatrixData(
        result ?? {},
        startupAmount: _startupAmount,
        rewardRate: _rewardRate,
        oldUserReentryBase: _oldUserReentryBase,
      );
      if (!mounted) return;
      setState(() {
        _matrix = matrix;
        _matrixRawSlots = (result?['slots'] as List?)?.map((e) => Map<String, dynamic>.from(e)).toList();
        _loading = false;
      });
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = error.toString();
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('推广奖励')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _loadPromotionRewards,
              child: _error != null
                  ? ListView(
                      padding: const EdgeInsets.all(16),
                      children: [
                        _buildErrorCard(_error!),
                      ],
                    )
                  : _buildContent(_matrix ?? PromotionMatrixViewModel.empty()),
            ),
    );
  }

  Widget _buildContent(PromotionMatrixViewModel matrix) {
    final authState = ref.watch(authProvider);
    final user = authState.user;
    final account = user?.account ?? '';

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        if (account.isNotEmpty)
          Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
              decoration: BoxDecoration(color: Colors.blue.shade50, borderRadius: BorderRadius.circular(8)),
              child: Row(
                children: [
                  const Icon(Icons.person, size: 20, color: Colors.blue),
                  const SizedBox(width: 8),
                  Text('当前账号：$account', style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
                ],
              ),
            ),
          ),
        _buildInviteCodeCard(),
        const SizedBox(height: 12),
        _buildSummaryCard(matrix),
        const SizedBox(height: 12),
        _buildMatrixCard(matrix),
      ],
    );
  }

  Widget _buildInviteCodeCard() {
    final code = _inviteInfo?['inviteCode'] ?? '---';
    final directCount = _inviteInfo?['directCount'] ?? 0;
    final completedMatrices = _inviteInfo?['completedMatrices'] ?? 0;
    final totalEarned = (_inviteInfo?['totalEarned'] as num?)?.toDouble() ?? 0;
    final inviter = _inviteInfo?['inviter'] as Map<String, dynamic>?;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(10)),
      child: Column(
        children: [
          const Text('推广邀请码', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
          const SizedBox(height: 4),
          const Text('分享邀请码给好友，好友注册后自动进入你的矩阵', style: TextStyle(color: Colors.grey, fontSize: 12)),
          const SizedBox(height: 14),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
            decoration: BoxDecoration(
              color: const Color(0xFFFFF8E1),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(code, style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold, letterSpacing: 2)),
                const SizedBox(width: 10),
                GestureDetector(
                  onTap: () {
                    if (code != '---' && code.isNotEmpty) {
                      Clipboard.setData(ClipboardData(text: code));
                      Toast.success(context, '邀请码已复制');
                    }
                  },
                  child: const Icon(Icons.copy, size: 20, color: Colors.grey),
                ),
              ],
            ),
          ),
          const SizedBox(height: 14),
          // 直接上级信息
          if (inviter != null)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              decoration: BoxDecoration(
                color: Colors.orange.shade50,
                borderRadius: BorderRadius.circular(6),
                border: Border.all(color: Colors.orange.shade100),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.supervisor_account, size: 16, color: Colors.orange.shade700),
                  const SizedBox(width: 6),
                  Text('我的上级：', style: TextStyle(fontSize: 12, color: Colors.orange.shade700)),
                  Text(
                    inviter['nickname'] ?? inviter['account'] ?? '未知',
                    style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Colors.orange.shade900),
                  ),
                  Text(
                    '（${inviter['account']}）',
                    style: TextStyle(fontSize: 11, color: Colors.orange.shade600),
                  ),
                ],
              ),
            )
          else
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              decoration: BoxDecoration(
                color: Colors.grey.shade50,
                borderRadius: BorderRadius.circular(6),
              ),
              child: const Text('无上级（顶级用户）', style: TextStyle(fontSize: 12, color: Colors.grey)),
            ),
          const SizedBox(height: 14),
          Row(
            children: [
              Expanded(child: GestureDetector(
                onTap: () => _showDirectUsers(),
                child: _statItem('直推人数', '${directCount}人'),
              )),
              Expanded(child: GestureDetector(
                onTap: () => _showCompletedRounds(),
                child: _statItem('完成矩阵', '${completedMatrices}轮'),
              )),
              Expanded(child: GestureDetector(
                onTap: () => _showIncomeDetail(),
                child: _statItem('总收益', _formatAmount(totalEarned)),
              )),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildSummaryCard(PromotionMatrixViewModel matrix) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(10)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('当前推广矩阵', style: TextStyle(fontSize: 17, fontWeight: FontWeight.bold)),
          const SizedBox(height: 4),
          Text('启动金额 ${_formatAmount(_startupAmount)} · 收益比例 35%', style: const TextStyle(color: Colors.grey, fontSize: 12)),
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(child: _statItem('已占坑位', '${matrix.filledCount}/6')),
              Expanded(child: _statItem('可领取', _formatAmount(matrix.withdrawableAmount))),
              Expanded(child: _statItem('下轮资金', _formatAmount(matrix.nextRoundAmount))),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildMatrixCard(PromotionMatrixViewModel matrix) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(10)),
      child: Column(
        children: [
          GestureDetector(
            onTap: () => _showTopNodeInfo(),
            child: _matrixNode('我', '顶点', true),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(child: _positionNode(matrix.positions[0])),
              const SizedBox(width: 12),
              Expanded(child: _positionNode(matrix.positions[1])),
            ],
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              Expanded(child: _positionNode(matrix.positions[2], compact: true)),
              const SizedBox(width: 8),
              Expanded(child: _positionNode(matrix.positions[3], compact: true)),
              const SizedBox(width: 8),
              Expanded(child: _positionNode(matrix.positions[4], compact: true)),
              const SizedBox(width: 8),
              Expanded(child: _positionNode(matrix.positions[5], compact: true)),
            ],
          ),
          const SizedBox(height: 16),
        ],
      ),
    );
  }

  Widget _buildRuleCard(PromotionMatrixViewModel matrix) {
    final oldUserPreview = matrix.oldUserReentryPreview;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(10)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('收益口径', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600)),
          const SizedBox(height: 10),
          _ruleLine('新用户 1-4 号坑位', '${_formatAmount(matrix.newUserReward)} 可领取'),
          _ruleLine('新用户 5-6 号坑位', '${_formatAmount(matrix.newUserReward)} 锁定下轮'),
          _ruleLine('老用户入位', '启动资金 × 35%'),
          const SizedBox(height: 4),
          const Text(
            '老用户的启动资金 = 自己矩阵上一轮5、6号位收益之和。\n例如：5、6号位是新用户 → 启动资金1400 → 收益490',
            style: TextStyle(fontSize: 12, color: Colors.grey),
          ),
        ],
      ),
    );
  }

  Widget _buildErrorCard(String message) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(10)),
      child: Column(
        children: [
          const Icon(Icons.error_outline, color: Colors.redAccent, size: 36),
          const SizedBox(height: 8),
          const Text('推广奖励加载失败', style: TextStyle(fontWeight: FontWeight.bold)),
          const SizedBox(height: 4),
          Text(message, style: const TextStyle(color: Colors.grey, fontSize: 12), textAlign: TextAlign.center),
          const SizedBox(height: 12),
          OutlinedButton(onPressed: _loadPromotionRewards, child: const Text('重试')),
        ],
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

  Widget _matrixNode(String title, String subtitle, bool active) {
    return Container(
      width: 88,
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 10),
      decoration: BoxDecoration(
        color: active ? Colors.blue.shade50 : Colors.grey.shade100,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: active ? Colors.blue.shade200 : Colors.grey.shade300),
      ),
      child: Column(
        children: [
          Text(title, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.w600)),
          const SizedBox(height: 2),
          Text(subtitle, style: TextStyle(fontSize: 11, color: active ? Colors.blue : Colors.grey)),
        ],
      ),
    );
  }

  Widget _positionNode(PromotionPosition position, {bool compact = false}) {
    final active = position.user != null;
    final title = active ? position.user!.displayName : '待补位';
    final subtitle = '${position.position}号位';
    return GestureDetector(
      onTap: active ? () => _showUserInfo(position) : null,
      child: Container(
        height: compact ? 68 : 74,
        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 8),
        decoration: BoxDecoration(
          color: active ? Colors.green.shade50 : Colors.grey.shade100,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: active ? Colors.green.shade200 : Colors.grey.shade300),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(title, maxLines: 1, overflow: TextOverflow.ellipsis, style: TextStyle(fontSize: compact ? 12 : 13, fontWeight: FontWeight.w600)),
            const SizedBox(height: 3),
            Text(subtitle, style: const TextStyle(fontSize: 11, color: Colors.grey)),
          ],
        ),
      ),
    );
  }

  void _showTopNodeInfo() {
    // 从当前矩阵数据获取启动资金
    final startFund = _matrixRawSlots != null
        ? ((_inviteInfo?['currentRound'] as int? ?? 1) > 1 ? '有' : '无')
        : '无';

    // 从 API 获取的 matrix 数据中获取 startFund
    double carryOverFund = 0;
    if (_matrixRawSlots != null) {
      // startFund 在 matrix 对象中
    }

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('顶点信息'),
        content: FutureBuilder<Map<String, dynamic>?>(
          future: ref.read(apiClientProvider).get<Map<String, dynamic>>('/api/matrix/current'),
          builder: (context, snapshot) {
            if (snapshot.connectionState == ConnectionState.waiting) {
              return const SizedBox(height: 60, child: Center(child: CircularProgressIndicator()));
            }
            final data = snapshot.data;
            final matrixData = data?['matrix'] as Map<String, dynamic>?;
            final round = matrixData?['round'] ?? 1;
            final startFundValue = double.tryParse(matrixData?['startFund']?.toString() ?? '0') ?? 0;

            return Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _infoRow('当前轮次', '第${round}轮'),
                _infoRow('上轮带入资金', startFundValue > 0 ? _formatAmount(startFundValue) : '无（首轮）'),
                if (startFundValue > 0)
                  Padding(
                    padding: const EdgeInsets.only(top: 8),
                    child: Text(
                      '该资金来自上一轮5、6号位用户的收益（35%），自动带入本轮作为启动资金。',
                      style: TextStyle(fontSize: 11, color: Colors.grey.shade600),
                    ),
                  ),
              ],
            );
          },
        ),
        actions: [TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('关闭'))],
      ),
    );
  }

  void _showUserInfo(PromotionPosition position) {
    final user = position.user!;
    String inviterName = '未知';

    if (_matrixRawSlots != null) {
      final slotData = _matrixRawSlots!.firstWhere(
        (s) => s['slotNumber'] == position.position,
        orElse: () => {},
      );
      if (slotData.isNotEmpty) {
        final userData = slotData['user'] as Map<String, dynamic>?;
        inviterName = userData?['inviterNickname'] ?? '无上级';
      }
    }

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(user.displayName),
        content: FutureBuilder<Map<String, dynamic>?>(
          future: ref.read(apiClientProvider).get<Map<String, dynamic>>(
            '/api/matrix/user-round-info',
            queryParameters: {'userId': user.id.toString()},
          ),
          builder: (context, snapshot) {
            final roundInfo = snapshot.data;
            final currentRound = roundInfo?['currentRound'] ?? '...';
            final currentFund = double.tryParse(roundInfo?['currentFund']?.toString() ?? '0') ?? 0;

            return Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _infoRow('账号', user.account),
                _infoRow('昵称', user.nickname.isNotEmpty ? user.nickname : '未设置'),
                _infoRow('坑位', '${position.position}号位'),
                _infoRow('上级用户', inviterName),
                _infoRow('类型', user.isOldUser ? '老用户' : '新用户'),
                _infoRow('当前轮次', '第$currentRound轮'),
                _infoRow('当前资金', currentFund > 0 ? _formatAmount(currentFund) : '2000'),
              ],
            );
          },
        ),
        actions: [TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('关闭'))],
      ),
    );
  }

  Widget _infoRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: [
          Text('$label：', style: const TextStyle(fontSize: 13, color: Colors.grey)),
          Expanded(child: Text(value, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500))),
        ],
      ),
    );
  }

  Widget _ruleLine(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        children: [
          Expanded(child: Text(label, style: const TextStyle(fontSize: 13))),
          Text(value, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
        ],
      ),
    );
  }

  String _formatAmount(double value) {
    if (value < 0.1) return '0';
    // 向下取整到小数点后1位（不四舍五入）
    final floored = (value * 10).floor() / 10;
    if (floored % 1 == 0) return floored.toInt().toString();
    return floored.toStringAsFixed(1);
  }
}

class PromotionMatrixViewModel {
  final List<PromotionPosition> positions;
  final double? currentClaimableIncome;
  final double? currentNextRoundFund;
  final double newUserReward;
  final double oldUserReentryBase;
  final double rewardRate;

  const PromotionMatrixViewModel({
    required this.positions,
    this.currentClaimableIncome,
    this.currentNextRoundFund,
    required this.newUserReward,
    required this.oldUserReentryBase,
    required this.rewardRate,
  });

  List<double> get oldUserReentryPreview => List.generate(
        3,
        (index) => oldUserReentryAmountFor(index + 1),
      );

  double oldUserReentryAmountFor(int sequence) {
    return calculateOldUserReentryAmount(
      base: oldUserReentryBase,
      rate: rewardRate,
      sequence: sequence,
    );
  }

  int get filledCount => positions.where((position) => position.user != null).length;

  double get withdrawableAmount =>
      currentClaimableIncome ??
      positions
          .where((position) => position.position <= 4)
          .fold(0, (sum, position) => sum + position.amount);

  double get nextRoundAmount =>
      currentNextRoundFund ??
      positions
          .where((position) => position.position >= 5)
          .fold(0, (sum, position) => sum + position.amount);

  factory PromotionMatrixViewModel.empty() {
    return PromotionMatrixViewModel(
      positions: List.generate(6, (index) => PromotionPosition.empty(index + 1)),
      newUserReward: 700,
      oldUserReentryBase: 1300,
      rewardRate: 0.35,
    );
  }

  /// 从新的 /api/matrix/current 接口数据构建
  factory PromotionMatrixViewModel.fromMatrixData(
    Map<String, dynamic> data, {
    required double startupAmount,
    required double rewardRate,
    required double oldUserReentryBase,
  }) {
    final newUserReward = startupAmount * rewardRate;

    // 如果没有矩阵数据，返回空状态
    if (data.isEmpty || data['matrix'] == null) {
      return PromotionMatrixViewModel.empty();
    }

    final slots = data['slots'] as List? ?? [];
    final matrix = Map<String, dynamic>.from(data['matrix'] as Map);

    return PromotionMatrixViewModel(
      positions: List.generate(6, (index) {
        final position = index + 1;
        // 找到对应坑位的数据
        final slotData = slots.cast<Map<String, dynamic>>().where(
          (s) => s['slotNumber'] == position,
        ).firstOrNull;

        if (slotData == null) {
          return PromotionPosition.empty(position);
        }

        final userData = slotData['user'] as Map<String, dynamic>?;
        final isNewUser = slotData['isNewUser'] == true;
        final incomeAmount = double.tryParse(slotData['incomeAmount']?.toString() ?? '0') ?? 0.0;
        final reentryCount = int.tryParse(slotData['reentryCount']?.toString() ?? '0') ?? 0;

        final user = userData != null
            ? PromotionUser(
                id: userData['id'] as int? ?? 0,
                account: userData['account']?.toString() ?? '',
                nickname: userData['nickname']?.toString() ?? '',
                registerTime: slotData['createdAt']?.toString() ?? '',
                relation: PromotionRelation.direct,
                isOldUser: !isNewUser,
                reentrySequence: reentryCount > 0 ? reentryCount : null,
              )
            : null;

        String description;
        if (isNewUser) {
          description = position <= 4 ? '新用户入位 · 可领取收益' : '新用户入位 · 下轮开启资金';
        } else {
          if (position <= 4) {
            description = '老用户再次入位 · 只占位';
          } else {
            description = '老用户第${reentryCount}次进入 · 下轮启动资金';
          }
        }

        return PromotionPosition(
          position: position,
          user: user,
          amount: incomeAmount,
          description: description,
        );
      }),
      currentClaimableIncome: double.tryParse(matrix['claimableIncome']?.toString() ?? '0') ?? 0,
      currentNextRoundFund: double.tryParse(matrix['nextRoundFund']?.toString() ?? '0') ?? 0,
      newUserReward: newUserReward,
      oldUserReentryBase: oldUserReentryBase,
      rewardRate: rewardRate,
    );
  }

  factory PromotionMatrixViewModel.fromInviteRecords(
    Map<String, dynamic> records, {
    required double startupAmount,
    required double rewardRate,
    required double oldUserReentryBase,
  }) {
    final directUsers = _parseUsers(records['directInvitees'], PromotionRelation.direct);
    final indirectUsers = _parseUsers(records['indirectInvitees'], PromotionRelation.indirect);
    final candidates = [...directUsers, ...indirectUsers]..sort(_compareUsers);
    final newUserReward = startupAmount * rewardRate;
    var oldUserReentrySequence = 0;

    return PromotionMatrixViewModel(
      positions: List.generate(6, (index) {
        final position = index + 1;
        final user = index < candidates.length ? candidates[index] : null;
        final isOldUserStartupSlot = user?.isOldUser == true && position >= 5;
        int? oldUserSequence;
        if (isOldUserStartupSlot) {
          oldUserReentrySequence += 1;
          oldUserSequence = user!.reentrySequence ?? oldUserReentrySequence;
        }
        final amount = _positionAmount(
          position: position,
          user: user,
          newUserReward: newUserReward,
          oldUserReentryBase: oldUserReentryBase,
          rewardRate: rewardRate,
          oldUserReentrySequence: oldUserSequence,
        );

        return PromotionPosition(
          position: position,
          user: user,
          amount: amount,
          description: _positionDescription(
            position,
            user,
            oldUserReentrySequence: oldUserSequence,
          ),
        );
      }),
      newUserReward: newUserReward,
      oldUserReentryBase: oldUserReentryBase,
      rewardRate: rewardRate,
    );
  }

  static double calculateOldUserReentryAmount({
    required double base,
    required double rate,
    required int sequence,
  }) {
    var remaining = base;
    for (var index = 1; index < sequence; index++) {
      remaining -= remaining * rate;
    }
    return remaining * rate;
  }

  static double _positionAmount({
    required int position,
    required PromotionUser? user,
    required double newUserReward,
    required double oldUserReentryBase,
    required double rewardRate,
    required int? oldUserReentrySequence,
  }) {
    if (user == null) return 0;
    if (!user.isOldUser) return newUserReward;
    if (position <= 4) return 0;
    return calculateOldUserReentryAmount(
      base: oldUserReentryBase,
      rate: rewardRate,
      sequence: oldUserReentrySequence ?? 1,
    );
  }

  static List<PromotionUser> _parseUsers(dynamic value, PromotionRelation relation) {
    final list = value is List ? value : const [];
    return list.map((item) {
      final map = Map<String, dynamic>.from(item as Map);
      return PromotionUser(
        id: map['id'] as int? ?? 0,
        account: map['account']?.toString() ?? '',
        nickname: map['nickname']?.toString() ?? '',
        registerTime: map['registerTime']?.toString() ?? '',
        relation: relation,
        isOldUser: _isOldUserEntry(map),
        reentrySequence: _parseReentrySequence(map),
      );
    }).toList();
  }

  static bool _isOldUserEntry(Map<String, dynamic> map) {
    final entryType = map['entryType']?.toString().toLowerCase();
    return map['isOldUser'] == true ||
        map['isReentry'] == true ||
        map['isExistingUser'] == true ||
        entryType == 'old' ||
        entryType == 'old_user' ||
        entryType == 'reentry';
  }

  static int? _parseReentrySequence(Map<String, dynamic> map) {
    final value = map['reentrySequence'] ??
        map['reentryCount'] ??
        map['promotionReentryCount'] ??
        map['oldUserEntryCount'];
    final sequence = value is int ? value : int.tryParse(value?.toString() ?? '');
    if (sequence == null || sequence <= 0) return null;
    return sequence;
  }

  static int _compareUsers(PromotionUser first, PromotionUser second) {
    final firstTime = DateTime.tryParse(first.registerTime);
    final secondTime = DateTime.tryParse(second.registerTime);
    if (firstTime != null && secondTime != null) {
      final timeResult = firstTime.compareTo(secondTime);
      if (timeResult != 0) return timeResult;
    }
    return first.id.compareTo(second.id);
  }

  static String _positionDescription(
    int position,
    PromotionUser? user, {
    int? oldUserReentrySequence,
  }) {
    if (user == null) return '等待新用户或跟随用户补入';
    if (user.isOldUser && position <= 4) return '老用户再次入位 · 只占位';
    if (user.isOldUser) return '老用户第${oldUserReentrySequence ?? 1}次进入 · 下轮启动资金';
    final relationLabel = user.relation == PromotionRelation.direct ? '直接推广' : '跟随链补位';
    final destination = position <= 4 ? '可领取收益' : '下轮开启资金';
    return '$relationLabel · $destination';
  }
}

class PromotionPosition {
  final int position;
  final PromotionUser? user;
  final double amount;
  final String description;

  const PromotionPosition({
    required this.position,
    required this.user,
    required this.amount,
    required this.description,
  });

  factory PromotionPosition.empty(int position) {
    return PromotionPosition(
      position: position,
      user: null,
      amount: 0,
      description: '等待新用户或跟随用户补入',
    );
  }
}

class PromotionUser {
  final int id;
  final String account;
  final String nickname;
  final String registerTime;
  final PromotionRelation relation;
  final bool isOldUser;
  final int? reentrySequence;

  const PromotionUser({
    required this.id,
    required this.account,
    required this.nickname,
    required this.registerTime,
    required this.relation,
    this.isOldUser = false,
    this.reentrySequence,
  });

  String get displayName {
    if (nickname.isNotEmpty) return nickname;
    if (account.isNotEmpty) return account;
    return '用户$id';
  }
}

enum PromotionRelation { direct, indirect }
