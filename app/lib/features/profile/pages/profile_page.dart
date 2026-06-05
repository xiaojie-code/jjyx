import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/constants/app_constants.dart';
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
                        child:
                            user.avatar.isEmpty || user.avatar.contains('default')
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
              _currencyItem('积分', currency.points),
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

  Widget _currencyItem(String label, double value) {
    return Expanded(
      child: Column(
        children: [
          Text(
            value % 1 == 0
                ? value.toInt().toString()
                : value.toStringAsFixed(2),
            style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 2),
          Text(
            label,
            style: const TextStyle(fontSize: 12, color: Colors.grey),
          ),
        ],
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
