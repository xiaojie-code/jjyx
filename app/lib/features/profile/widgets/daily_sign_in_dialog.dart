import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../../core/network/api_client.dart';
import '../../../core/network/api_endpoints.dart';
import '../../auth/providers/auth_provider.dart';

String _todayText() {
  final now = DateTime.now();
  String two(int value) => value.toString().padLeft(2, '0');
  return '${now.year}-${two(now.month)}-${two(now.day)}';
}

Future<void> maybeShowDailySignInPrompt(
  BuildContext context,
  WidgetRef ref,
) async {
  final auth = ref.read(authProvider);
  var userId = auth.user?.id ?? auth.profile?.user.id ?? 0;
  if (userId <= 0) {
    await ref.read(authProvider.notifier).loadProfile();
    final refreshed = ref.read(authProvider);
    userId = refreshed.user?.id ?? refreshed.profile?.user.id ?? 0;
  }
  if (userId <= 0) return;

  final prefs = await SharedPreferences.getInstance();
  final key = 'daily_sign_in_prompt_${userId}_${_todayText()}';
  if (prefs.getBool(key) == true) return;

  Map<String, dynamic>? status;
  try {
    status = await ref
        .read(apiClientProvider)
        .get<Map<String, dynamic>>(ApiEndpoints.signInStatus);
  } catch (_) {
    return;
  }
  if (status == null || status['todaySigned'] == true) {
    await prefs.setBool(key, true);
    return;
  }
  if (status['canSignToday'] != true) return;

  await prefs.setBool(key, true);
  if (!context.mounted) return;
  await showDailySignInDialog(context, ref, initialStatus: status);
}

Future<bool?> showDailySignInDialog(
  BuildContext context,
  WidgetRef ref, {
  Map<String, dynamic>? initialStatus,
}) {
  return showDialog<bool>(
    context: context,
    barrierDismissible: true,
    builder: (_) => _DailySignInDialog(initialStatus: initialStatus),
  );
}

class _DailySignInDialog extends ConsumerStatefulWidget {
  final Map<String, dynamic>? initialStatus;

  const _DailySignInDialog({this.initialStatus});

  @override
  ConsumerState<_DailySignInDialog> createState() => _DailySignInDialogState();
}

class _DailySignInDialogState extends ConsumerState<_DailySignInDialog> {
  Map<String, dynamic>? _status;
  bool _loading = true;
  bool _claiming = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    if (widget.initialStatus != null) {
      _status = widget.initialStatus;
      _loading = false;
    } else {
      _loadStatus();
    }
  }

  Future<void> _loadStatus() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final result = await ref
          .read(apiClientProvider)
          .get<Map<String, dynamic>>(ApiEndpoints.signInStatus);
      if (!mounted) return;
      setState(() => _status = result);
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = apiErrorMessage(e, fallback: '签到信息加载失败'));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _claim() async {
    if (_claiming) return;
    setState(() {
      _claiming = true;
      _error = null;
    });
    try {
      final result = await ref
          .read(apiClientProvider)
          .post<Map<String, dynamic>>(ApiEndpoints.signInClaim);
      final status = result?['status'] as Map<String, dynamic>?;
      final message = result?['message']?.toString() ?? '签到成功';
      if (!mounted) return;
      setState(() => _status = status ?? _status);
      await ref.read(authProvider.notifier).loadProfile();
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(message), behavior: SnackBarBehavior.floating),
      );
      Navigator.of(context).pop(true);
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = apiErrorMessage(e, fallback: '签到失败，请稍后再试'));
    } finally {
      if (mounted) setState(() => _claiming = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final status = _status;
    final canSignToday = status?['canSignToday'] == true;
    final todaySigned = status?['todaySigned'] == true;
    final reward = (status?['todayReward'] as Map?) ?? const {};
    final rewardLabel = reward['label']?.toString() ?? '';

    return Dialog(
      insetPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      clipBehavior: Clip.antiAlias,
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 420),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: double.infinity,
              padding: const EdgeInsets.fromLTRB(20, 18, 12, 18),
              decoration: const BoxDecoration(
                gradient: LinearGradient(
                  colors: [Color(0xFFFF8A00), Color(0xFFFFC247)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
              ),
              child: Row(
                children: [
                  const Icon(Icons.event_available,
                      color: Colors.white, size: 30),
                  const SizedBox(width: 10),
                  const Expanded(
                    child: Text(
                      '每日签到',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                  IconButton(
                    onPressed: () => Navigator.of(context).pop(false),
                    icon: const Icon(Icons.close, color: Colors.white),
                    tooltip: '关闭',
                  ),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 14, 16, 16),
              child: _loading
                  ? const SizedBox(
                      height: 220,
                      child: Center(child: CircularProgressIndicator()),
                    )
                  : Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        if (_error != null) ...[
                          Container(
                            width: double.infinity,
                            padding: const EdgeInsets.all(10),
                            decoration: BoxDecoration(
                              color: Colors.red.shade50,
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Text(
                              _error!,
                              style: TextStyle(color: Colors.red.shade700),
                              textAlign: TextAlign.center,
                            ),
                          ),
                          const SizedBox(height: 12),
                        ],
                        _buildWeekGrid(status),
                        const SizedBox(height: 12),
                        _buildTodayReward(rewardLabel, todaySigned),
                        const SizedBox(height: 14),
                        Row(
                          children: [
                            Expanded(
                              child: OutlinedButton(
                                onPressed: () =>
                                    Navigator.of(context).pop(false),
                                child: const Text('稍后再说'),
                              ),
                            ),
                            const SizedBox(width: 10),
                            Expanded(
                              child: ElevatedButton(
                                onPressed:
                                    canSignToday && !_claiming ? _claim : null,
                                child: _claiming
                                    ? const SizedBox(
                                        width: 18,
                                        height: 18,
                                        child: CircularProgressIndicator(
                                            strokeWidth: 2),
                                      )
                                    : Text(todaySigned ? '今日已签到' : '立即签到'),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildWeekGrid(Map<String, dynamic>? status) {
    final days = ((status?['days'] as List?) ?? const [])
        .whereType<Map>()
        .map((item) => Map<String, dynamic>.from(item))
        .toList();
    if (days.isEmpty) {
      return SizedBox(
        height: 180,
        child: Center(
          child: TextButton.icon(
            onPressed: _loadStatus,
            icon: const Icon(Icons.refresh),
            label: const Text('重新加载'),
          ),
        ),
      );
    }

    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 4,
        mainAxisSpacing: 8,
        crossAxisSpacing: 8,
        childAspectRatio: 0.78,
      ),
      itemCount: days.length,
      itemBuilder: (context, index) => _buildDayCard(days[index]),
    );
  }

  Widget _buildDayCard(Map<String, dynamic> day) {
    final status = day['status']?.toString() ?? '';
    final isToday = day['isToday'] == true;
    final isSigned = day['isSigned'] == true;
    final missed = status == 'missed';
    final future = status == 'future';
    final points = (day['pointsReward'] as num?)?.toDouble() ?? 0;
    final copper = (day['copperReward'] as num?)?.toDouble() ?? 0;
    final label = _rewardText(points, copper);

    Color border = Colors.grey.shade200;
    Color bg = Colors.white;
    Color fg = Colors.black87;
    IconData icon = Icons.radio_button_unchecked;
    if (isSigned) {
      bg = Colors.green.shade50;
      border = Colors.green.shade300;
      fg = Colors.green.shade800;
      icon = Icons.check_circle;
    } else if (isToday) {
      bg = Colors.orange.shade50;
      border = Colors.orange.shade400;
      fg = Colors.orange.shade900;
      icon = Icons.touch_app;
    } else if (missed) {
      bg = Colors.grey.shade100;
      border = Colors.grey.shade300;
      fg = Colors.grey.shade500;
      icon = Icons.lock_clock;
    } else if (future) {
      fg = Colors.grey.shade500;
      icon = Icons.schedule;
    }

    return Container(
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: border),
      ),
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 6),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(icon, color: fg, size: 19),
          const SizedBox(height: 3),
          Text(
            day['weekDayName']?.toString().replaceFirst('星期', '周') ?? '',
            style:
                TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: fg),
          ),
          const SizedBox(height: 3),
          Flexible(
            child: Text(
              label,
              textAlign: TextAlign.center,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(fontSize: 11, height: 1.12, color: fg),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTodayReward(String rewardLabel, bool todaySigned) {
    final text = todaySigned
        ? '今日奖励已领取'
        : rewardLabel.isNotEmpty
            ? '今日签到可获得：$rewardLabel'
            : '今日签到可领取奖励';
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: Colors.orange.shade50,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: Colors.orange.shade100),
      ),
      child: Row(
        children: [
          Icon(
            todaySigned ? Icons.verified : Icons.card_giftcard,
            color: Colors.orange.shade700,
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              text,
              style: TextStyle(
                color: Colors.orange.shade900,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ],
      ),
    );
  }

  String _rewardText(double points, double copper) {
    final parts = <String>[];
    if (points > 0) {
      parts.add(points % 1 == 0
          ? '${points.toInt()}积分'
          : '${points.toStringAsFixed(2)}积分');
    }
    if (copper > 0) {
      parts.add(copper % 1 == 0
          ? '${copper.toInt()}铜币'
          : '${copper.toStringAsFixed(2)}铜币');
    }
    return parts.isEmpty ? '普通奖励' : parts.join('\n');
  }
}
