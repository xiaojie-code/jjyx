import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/constants/app_constants.dart';
import '../../../core/network/api_client.dart';
import '../../../core/network/api_endpoints.dart';
import '../../../core/router/app_router.dart';
import '../../../core/update/app_update_service.dart';
import '../../../core/update/update_state.dart';
import '../../auth/providers/auth_provider.dart';
import 'activate_page.dart';
import 'edit_avatar_page.dart';
import 'edit_nickname_page.dart';
import 'promotion_reward_page.dart';
import 'recharge_page.dart';
import 'settings_page.dart';
import 'synthesize_page.dart';
import 'withdraw_page.dart';

class ProfilePage extends ConsumerStatefulWidget {
  const ProfilePage({super.key});

  @override
  ConsumerState<ProfilePage> createState() => _ProfilePageState();
}

class _ProfilePageState extends ConsumerState<ProfilePage> {
  @override
  void initState() {
    super.initState();
    Future.microtask(() => ref.read(authProvider.notifier).loadProfile());
    // 静默检测更新（用于红点提示）
    Future.microtask(() => AppUpdateService.checkSilently(ref));
  }

  void _push(Widget page) {
    Navigator.of(context, rootNavigator: true)
        .push(MaterialPageRoute(builder: (_) => page));
  }

  void _showPointLogs() {
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (_) => const _PointLogSheet(),
    );
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authProvider);
    final user = authState.user;
    final profile = authState.profile;
    final currency = profile?.currency;
    final hasUpdate = ref.watch(updateStateProvider).hasUpdate;

    return Scaffold(
      appBar: AppBar(
        title: const Text('我的'),
        actions: [
          IconButton(
            icon: _buildDotIcon(Icons.settings, hasUpdate),
            onPressed: () => _push(const SettingsPage()),
          ),
        ],
      ),
      body: user == null
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: () => ref.read(authProvider.notifier).loadProfile(),
              child: SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.all(16),
                child: Column(
                  children: [
                    GestureDetector(
                      onTap: () => _push(const EditAvatarPage()),
                      child: CircleAvatar(
                        radius: 40,
                        backgroundImage: user.avatar.isNotEmpty &&
                                !user.avatar.contains('default')
                            ? NetworkImage(
                                user.avatar.startsWith('http')
                                    ? user.avatar
                                    : '${AppConstants.apiBaseUrl}${user.avatar}',
                              )
                            : null,
                        child: user.avatar.isEmpty ||
                                user.avatar.contains('default')
                            ? const Icon(Icons.person, size: 40)
                            : null,
                      ),
                    ),
                    const SizedBox(height: 8),
                    GestureDetector(
                      onTap: () => _push(
                        EditNicknamePage(currentNickname: user.nickname),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(
                            user.nickname,
                            style: const TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          const SizedBox(width: 4),
                          const Icon(Icons.edit, size: 16, color: Colors.grey),
                        ],
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      user.isActivated ? '已激活' : '未激活',
                      style: TextStyle(
                        color: user.isActivated ? Colors.green : Colors.orange,
                      ),
                    ),
                    const SizedBox(height: 16),
                    if (currency != null) ...[
                      _buildCurrencyGrid(currency, profile!.shares),
                      const SizedBox(height: 16),
                    ],
                    _buildMenuItem(
                      Icons.card_giftcard,
                      '激活游戏',
                      () => _push(const ActivatePage()),
                    ),
                    _buildMenuItem(
                      Icons.payment,
                      '充值',
                      () => _push(const RechargePage()),
                    ),
                    _buildMenuItem(
                      Icons.group_add,
                      '推广奖励',
                      () => _push(const PromotionRewardPage()),
                    ),
                    _buildMenuItem(
                      Icons.sync,
                      '积分合成',
                      () => _push(const SynthesizePage()),
                    ),
                    _buildMenuItem(
                      Icons.account_balance_wallet,
                      '提现',
                      () => _push(const WithdrawPage()),
                    ),
                    const Divider(height: 32),
                    SizedBox(
                      width: double.infinity,
                      child: OutlinedButton(
                        onPressed: () async {
                          await ref.read(authProvider.notifier).logout();
                          if (!context.mounted) return;
                          context.go(RoutePaths.login);
                        },
                        style: OutlinedButton.styleFrom(
                          foregroundColor: Colors.red,
                        ),
                        child: const Text('退出登录'),
                      ),
                    ),
                  ],
                ),
              ),
            ),
    );
  }

  Widget _buildCurrencyGrid(dynamic currency, int shares) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
      ),
      padding: const EdgeInsets.all(12),
      child: Column(
        children: [
          Row(
            children: [
              _currencyItem('积分', currency.points, onTap: _showPointLogs),
              _currencyItem('金币', currency.gold),
              _currencyItem('银币', currency.silver),
            ],
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              _currencyItem('奖励积分', currency.rewardPoints),
              _currencyItem('持股数', shares.toDouble()),
            ],
          ),
        ],
      ),
    );
  }

  Widget _currencyItem(String label, double value, {VoidCallback? onTap}) {
    return Expanded(
      child: InkWell(
        borderRadius: BorderRadius.circular(8),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 4),
          child: Column(
            children: [
              Text(
                value % 1 == 0
                    ? value.toInt().toString()
                    : value.toStringAsFixed(2),
                style: const TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                label,
                style: const TextStyle(fontSize: 12, color: Colors.grey),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildMenuItem(IconData icon, String title, VoidCallback onTap) {
    return ListTile(
      leading: Icon(icon),
      title: Text(title),
      trailing: const Icon(Icons.chevron_right),
      onTap: onTap,
    );
  }

  /// 带红点的图标
  Widget _buildDotIcon(IconData icon, bool show) {
    if (!show) return Icon(icon);
    return Stack(
      clipBehavior: Clip.none,
      children: [
        Icon(icon),
        Positioned(
          right: -2,
          top: -2,
          child: Container(
            width: 9,
            height: 9,
            decoration: BoxDecoration(
              color: Colors.red,
              shape: BoxShape.circle,
              border: Border.all(color: Colors.white, width: 1),
            ),
          ),
        ),
      ],
    );
  }
}

class _PointLogSheet extends ConsumerStatefulWidget {
  const _PointLogSheet();

  @override
  ConsumerState<_PointLogSheet> createState() => _PointLogSheetState();
}

class _PointLogSheetState extends ConsumerState<_PointLogSheet> {
  bool _loading = true;
  String? _error;
  List<Map<String, dynamic>> _logs = [];

  @override
  void initState() {
    super.initState();
    _loadLogs();
  }

  Future<void> _loadLogs() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final result =
          await ref.read(apiClientProvider).get<Map<String, dynamic>>(
        ApiEndpoints.currencyLogs,
        queryParameters: {
          'currencyType': 'points',
          'page': 1,
          'pageSize': 80,
        },
      );
      final rawList = result?['list'];
      final list = rawList is List
          ? rawList
              .whereType<Map>()
              .map((item) => Map<String, dynamic>.from(item))
              .toList()
          : <Map<String, dynamic>>[];
      if (!mounted) return;
      setState(() {
        _logs = list;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = apiErrorMessage(e, fallback: '积分明细加载失败');
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return DefaultTabController(
      length: 2,
      child: SizedBox(
        height: MediaQuery.of(context).size.height * 0.78,
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 12, 8, 0),
              child: Row(
                children: [
                  const Expanded(
                    child: Text(
                      '积分明细',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                  IconButton(
                    onPressed: _loadLogs,
                    icon: const Icon(Icons.refresh),
                  ),
                  IconButton(
                    onPressed: () => Navigator.pop(context),
                    icon: const Icon(Icons.close),
                  ),
                ],
              ),
            ),
            const TabBar(
              tabs: [
                Tab(text: '收入'),
                Tab(text: '支出'),
              ],
            ),
            Expanded(
              child: _loading
                  ? const Center(child: CircularProgressIndicator())
                  : _error != null
                      ? Center(child: Text(_error!))
                      : TabBarView(
                          children: [
                            _buildLogList(income: true),
                            _buildLogList(income: false),
                          ],
                        ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildLogList({required bool income}) {
    final list = _logs.where((item) {
      final amount = _numValue(item['amount']);
      return income ? amount > 0 : amount < 0;
    }).toList();

    if (list.isEmpty) {
      return Center(child: Text(income ? '暂无收入记录' : '暂无支出记录'));
    }

    return ListView.separated(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
      itemCount: list.length,
      separatorBuilder: (_, __) => const Divider(height: 1),
      itemBuilder: (context, index) {
        final item = list[index];
        final amount = _numValue(item['amount']);
        final before =
            _numValue(item['beforeBalance'] ?? item['before_balance']);
        final after = _numValue(item['afterBalance'] ?? item['after_balance']);
        final description = (item['description'] ?? '').toString();
        final logType = (item['logType'] ?? item['log_type'] ?? '').toString();
        final createdAt =
            _formatDateTime(item['createdAt'] ?? item['created_at']);
        final title = _displayLogTitle(description, logType);
        final typeText = _displayLogType(item);

        return ListTile(
          contentPadding: EdgeInsets.zero,
          title: Text(
            title,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
          subtitle: Padding(
            padding: const EdgeInsets.only(top: 4),
            child: Text(
              '$createdAt\n类型：$typeText  余额：${_formatAmount(before)} → ${_formatAmount(after)}',
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
          ),
          trailing: Text(
            '${amount > 0 ? '+' : ''}${_formatAmount(amount)}',
            style: TextStyle(
              color: amount > 0 ? Colors.green : Colors.red,
              fontSize: 16,
              fontWeight: FontWeight.bold,
            ),
          ),
        );
      },
    );
  }

  double _numValue(dynamic value) {
    if (value is num) return value.toDouble();
    return double.tryParse(value?.toString() ?? '') ?? 0;
  }

  String _displayLogTitle(String description, String logType) {
    final text = '$description $logType'.toLowerCase();
    if (text.contains('fishing_daily_login')) return '实况钓鱼每日奖励';
    if (text.contains('fish_sell') || text.contains('sell_fish')) {
      return '实况钓鱼卖鱼收入';
    }
    if (text.contains('killer game reward') ||
        text.contains('killer_win') ||
        text.contains('killer_reward')) {
      return '大逃杀结算奖励';
    }
    if (text.contains('killer_bet') || text.contains('大逃杀投注')) {
      return '大逃杀投入积分';
    }
    if (text.contains('snake_round_settle')) return '蛇蛇大作战结算奖励';
    if (text.contains('snake_revive')) return '蛇蛇大作战积分复活';
    if (text.contains('snake_skin_buy')) return '蛇蛇大作战购买皮肤';
    if (text.contains('horse_bet')) return '赛马投入积分';
    if (text.contains('horse_win')) return '赛马获胜结算';
    if (text.contains('lottery_win')) return '幸运转盘中奖';
    if (text.contains('direct_game_reward')) return '直推游戏流水奖励';
    if (text.contains('weekly_point_return')) return '每周积分返还';
    if (text.contains('daily_deduction')) return '每日积分扣除';
    if (text.contains('recharge')) return '充值到账';
    if (description.trim().isNotEmpty) return description.trim();
    return _displayLogTypeByRaw(logType);
  }

  String _displayLogType(Map<String, dynamic> item) {
    final combined = [
      item['description'],
      item['logType'],
      item['log_type'],
      item['sourceType'],
      item['source_type'],
    ].whereType<Object>().map((e) => e.toString().toLowerCase()).join(' ');
    final gameName = _gameNameForLog(combined);
    if (gameName != null) return gameName;
    return _displayLogTypeByRaw(
      (item['logType'] ?? item['log_type'] ?? '').toString(),
    );
  }

  String? _gameNameForLog(String text) {
    if (text.contains('fishing') ||
        text.contains('fish_') ||
        text.contains('钓鱼') ||
        text.contains('卖鱼')) {
      return '实况钓鱼';
    }
    if (text.contains('snake') || text.contains('蛇')) return '蛇蛇大作战';
    if (text.contains('killer') ||
        text.contains('大逃杀') ||
        text.contains('逃杀')) {
      return '大逃杀';
    }
    if (text.contains('horse') || text.contains('赛马')) return '赛马';
    if (text.contains('lottery') ||
        text.contains('转盘') ||
        text.contains('抽奖')) {
      return '幸运转盘';
    }
    return null;
  }

  String _displayLogTypeByRaw(String logType) {
    switch (logType.toLowerCase()) {
      case 'game_earn':
        return '游戏收入';
      case 'game_spend':
        return '游戏支出';
      case 'game_bet':
        return '游戏投入';
      case 'game_entry':
        return '游戏入场';
      case 'lottery_win':
        return '幸运转盘';
      case 'killer_win':
        return '大逃杀';
      case 'horse_win':
        return '赛马';
      case 'horse_bet':
        return '赛马';
      case 'direct_game_reward':
        return '直推流水奖励';
      case 'weekly_point_return':
        return '每周积分返还';
      case 'daily_deduction':
        return '每日积分扣除';
      case 'recharge':
      case 'recharge_approve':
        return '充值到账';
      case 'admin_add':
        return '后台发放';
      case 'withdraw':
        return '提现';
      case 'synthesize':
        return '积分合成';
      default:
        return logType.isEmpty ? '积分变动' : logType;
    }
  }

  String _formatDateTime(dynamic value) {
    final raw = value?.toString() ?? '';
    if (raw.isEmpty) return '';
    DateTime? date;
    try {
      date = DateTime.parse(raw).toLocal();
    } catch (_) {
      final normalized = raw.replaceFirst(' ', 'T');
      try {
        date = DateTime.parse(normalized).toLocal();
      } catch (_) {
        return raw;
      }
    }
    String two(int n) => n.toString().padLeft(2, '0');
    return '${date.year}-${two(date.month)}-${two(date.day)} '
        '${two(date.hour)}:${two(date.minute)}:${two(date.second)}';
  }

  String _formatAmount(double value) {
    if (value % 1 == 0) return value.toInt().toString();
    return value.toStringAsFixed(2);
  }
}
