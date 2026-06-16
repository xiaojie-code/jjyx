import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/constants/app_constants.dart';
import '../../../core/network/api_client.dart';
import '../../../core/network/api_endpoints.dart';
import '../../../core/storage/token_storage.dart';
import '../../../core/utils/activation_guard.dart';
import '../../../core/webview/game_webview.dart';
import '../../../core/webview/js_bridge.dart';
import '../../auth/providers/auth_provider.dart';

class GameHallPage extends ConsumerStatefulWidget {
  const GameHallPage({super.key});

  @override
  ConsumerState<GameHallPage> createState() => _GameHallPageState();
}

class _GameHallPageState extends ConsumerState<GameHallPage> {
  static const String _gameShellVersion = '20260617-fishing-reward-cap';

  List<Map<String, dynamic>> _games = [];
  bool _loading = true;
  bool _starting = false;
  bool get _gamesInTesting => false;

  @override
  void initState() {
    super.initState();
    _loadGames();
  }

  Future<void> _loadGames() async {
    try {
      final result = await ref
          .read(apiClientProvider)
          .get<List<dynamic>>(ApiEndpoints.gameList);
      setState(() {
        _games =
            (result ?? []).map((e) => Map<String, dynamic>.from(e)).toList();
        _loading = false;
      });
    } catch (e) {
      setState(() => _loading = false);
    }
  }

  bool _isLotteryGame(Map<String, dynamic> game) {
    final name = (game['name'] ?? '').toString().toLowerCase();
    final description = (game['description'] ?? '').toString().toLowerCase();
    final url =
        (game['gameUrl'] ?? game['game_url'] ?? '').toString().toLowerCase();
    return name.contains('转盘') ||
        name.contains('抽奖') ||
        description.contains('转盘') ||
        description.contains('抽奖') ||
        url.contains('lottery') ||
        url.contains('wheel') ||
        url.contains('turntable') ||
        url.contains('zhuanpan');
  }

  String _gameSearchText(Map<String, dynamic> game) {
    return [
      game['name'],
      game['description'],
      game['gameUrl'],
      game['game_url'],
    ].whereType<Object>().map((e) => e.toString().toLowerCase()).join(' ');
  }

  bool _isSnakeGame(Map<String, dynamic> game) {
    final text = _gameSearchText(game);
    return text.contains('蛇') ||
        text.contains('贪吃蛇') ||
        text.contains('麻象') ||
        text.contains('象雀') ||
        text.contains('对弈') ||
        text.contains('snake') ||
        text.contains('ssdzz');
  }

  bool _isFishingGame(Map<String, dynamic> game) {
    final text = _gameSearchText(game);
    return text.contains('实况钓鱼') ||
        text.contains('钓鱼') ||
        text.contains('捕鱼') ||
        text.contains('fishing') ||
        text.contains('skdy');
  }

  bool _isKillerGame(Map<String, dynamic> game) {
    final text = _gameSearchText(game);
    return text.contains('大逃杀') ||
        text.contains('逃杀') ||
        text.contains('杀手') ||
        text.contains('killer') ||
        text.contains('dts');
  }

  bool _isHorseGame(Map<String, dynamic> game) {
    final text = _gameSearchText(game);
    return text.contains('赛马') ||
        text.contains('saima') ||
        text.contains('horse') ||
        text.contains('smyx');
  }

  String _displayGameName(Map<String, dynamic> game) {
    if (_isLotteryGame(game)) return '幸运转盘';
    if (_isFishingGame(game)) return '实况钓鱼';
    if (_isSnakeGame(game)) return '象雀对弈';
    if (_isKillerGame(game)) return '大逃杀';
    if (_isHorseGame(game)) return '赛马';
    return (game['name'] ?? '').toString();
  }

  String _gameDescription(Map<String, dynamic> game) {
    if (_isSnakeGame(game)) {
      return '象雀双玩，搓麻对弈两不误';
    }
    if (_isFishingGame(game)) {
      return '沉浸垂钓，轻松上鱼';
    }
    if (_isKillerGame(game)) {
      return '卡通乱斗，极速开战';
    }
    if (_isHorseGame(game)) {
      return '投注竞猜，极速开赛';
    }
    if (_isLotteryGame(game)) {
      return '幸运抽奖，好礼转出';
    }
    return (game['description'] ?? '').toString().trim();
  }

  String? _localGameIconAsset(Map<String, dynamic> game) {
    final text = _gameSearchText(game);
    if (text.contains('转盘') ||
        text.contains('抽奖') ||
        text.contains('lottery') ||
        text.contains('wheel') ||
        text.contains('turntable') ||
        text.contains('zhuanpan')) {
      return 'assets/game-icons/xyzp.png';
    }
    if (_isFishingGame(game)) {
      return 'assets/game-icons/skdy.png';
    }
    if (_isSnakeGame(game)) {
      return 'video/image.png';
    }
    if (_isKillerGame(game)) {
      return 'assets/game-icons/dts.jpg';
    }
    if (_isHorseGame(game)) {
      return 'assets/game-icons/smyx.png';
    }
    return null;
  }

  Widget _buildGameIcon(Map<String, dynamic> game) {
    final asset = _localGameIconAsset(game);
    final isLottery = _isLotteryGame(game);
    if (asset == null) {
      return Icon(
        isLottery ? Icons.casino : Icons.sports_esports,
        size: 48,
        color: isLottery ? Colors.orange.shade300 : Colors.blue.shade300,
      );
    }

    return Container(
      width: 78,
      height: 78,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(18),
        boxShadow: const [
          BoxShadow(
            color: Color(0x1A000000),
            blurRadius: 10,
            offset: Offset(0, 5),
          ),
        ],
      ),
      clipBehavior: Clip.antiAlias,
      child: Image.asset(
        asset,
        fit: BoxFit.cover,
        errorBuilder: (context, error, stackTrace) => Icon(
          Icons.sports_esports,
          size: 48,
          color: Colors.blue.shade300,
        ),
      ),
    );
  }

  int _asInt(dynamic value) {
    if (value is int) return value;
    if (value is num) return value.toInt();
    return int.tryParse(value?.toString() ?? '') ?? 0;
  }

  Map<String, dynamic>? _asMap(dynamic value) {
    return value is Map ? Map<String, dynamic>.from(value) : null;
  }

  String _lotteryPrizeFullName(int level) {
    switch (level) {
      case 1:
        return '沧恒云芯智能AI机器人';
      case 2:
        return '云芯智慧大屏100寸';
      case 3:
        return '云芯大屏对开门冰箱';
      case 4:
        return '激活码';
      case 5:
        return '电动自行车';
      case 6:
        return '1000积分';
      case 7:
        return '500积分';
      default:
        return '';
    }
  }

  String _lotteryRecordDisplayTitle(Map<String, dynamic> record) {
    final level = _asInt(record['prizeLevel'] ?? record['level']);
    final name = _lotteryPrizeFullName(level).isNotEmpty
        ? _lotteryPrizeFullName(level)
        : (record['prizeName'] ?? record['name'] ?? '').toString();
    return '$level等奖：$name';
  }

  String _lotteryRecordDisplaySubtitle(Map<String, dynamic> record) {
    final type = (record['prizeType'] ?? record['type'] ?? '').toString();
    final amount = _asInt(record['prizeAmount'] ?? record['amount']);
    final payload = _asMap(record['prizePayload'] ?? record['payload']);
    if (type == 'points') return '已到账 $amount 积分';
    if (type == 'cdk') return '激活码：${payload?['code'] ?? '生成中'}';
    if (type == 'physical') return '实物奖品，请联系客服登记领取';
    return '谢谢参与';
  }

  String _lotteryWheelDisplayLabel(Map<String, dynamic> prize) {
    switch (_asInt(prize['level'])) {
      case 1:
        return '1等奖\n沧恒云芯\n智能AI机器人';
      case 2:
        return '2等奖\n云芯智慧大屏\n100寸';
      case 3:
        return '3等奖\n云芯大屏\n对开门冰箱';
      case 4:
        return '4等奖\n激活码';
      case 5:
        return '5等奖\n电动自行车';
      case 6:
        return '6等奖\n1000积分';
      case 7:
        return '7等奖\n500积分';
      default:
        return (prize['name'] ?? '').toString();
    }
  }

  int _lotteryPrizeIndex(List<dynamic> prizes, Map<String, dynamic>? record) {
    final level = _asInt(record?['prizeLevel'] ?? record?['level']);
    for (var i = 0; i < prizes.length; i += 1) {
      final prize = Map<String, dynamic>.from(prizes[i] as Map);
      if (_asInt(prize['level']) == level) return i;
    }
    return prizes.isEmpty ? 0 : prizes.length - 1;
  }

  double _nextLotteryWheelRotation(
    double currentRotation,
    int prizeIndex,
    int prizeCount,
  ) {
    if (prizeCount <= 0) return currentRotation + math.pi * 8;
    const fullCircle = math.pi * 2;
    final sweep = fullCircle / prizeCount;
    final current = ((currentRotation % fullCircle) + fullCircle) % fullCircle;
    final target = -(prizeIndex * sweep + sweep / 2);
    final delta = ((target - current) % fullCircle + fullCircle) % fullCircle;
    return currentRotation + fullCircle * 6 + delta;
  }

  Widget _buildLotteryWheel({
    required List<dynamic> prizes,
    required double rotation,
    required bool spinning,
    required int remaining,
    required VoidCallback onSpin,
  }) {
    final prizeItems = prizes
        .map((raw) => Map<String, dynamic>.from(raw as Map))
        .toList(growable: false);
    final enabled = !spinning && remaining > 0 && prizeItems.isNotEmpty;

    return Center(
      child: Container(
        width: double.infinity,
        constraints: const BoxConstraints(maxWidth: 390),
        padding: const EdgeInsets.fromLTRB(12, 10, 12, 14),
        decoration: BoxDecoration(
          gradient: const LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [Color(0xFFFFFBEB), Color(0xFFFFF1F2)],
          ),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: const Color(0xFFFFD7A8)),
          boxShadow: const [
            BoxShadow(
              color: Color(0x1FD97706),
              blurRadius: 22,
              offset: Offset(0, 10),
            ),
          ],
        ),
        child: SizedBox(
          width: 360,
          height: 396,
          child: Stack(
            alignment: Alignment.center,
            clipBehavior: Clip.none,
            children: [
              const Positioned(
                top: 0,
                child: CustomPaint(
                  size: Size(72, 82),
                  painter: _LotteryPointerPainter(),
                ),
              ),
              Positioned(
                top: 46,
                child: TweenAnimationBuilder<double>(
                  tween: Tween<double>(end: rotation),
                  duration: const Duration(milliseconds: 2300),
                  curve: Curves.easeOutCubic,
                  builder: (context, value, child) {
                    return Transform.rotate(angle: value, child: child);
                  },
                  child: CustomPaint(
                    size: const Size.square(330),
                    painter: _LotteryWheelPainter(
                      prizes: prizeItems,
                      labelBuilder: _lotteryWheelDisplayLabel,
                    ),
                  ),
                ),
              ),
              Positioned(
                top: 160,
                child: DecoratedBox(
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    boxShadow: const [
                      BoxShadow(
                        color: Color(0x33000000),
                        blurRadius: 14,
                        offset: Offset(0, 7),
                      ),
                    ],
                    border: Border.all(color: Colors.white, width: 5),
                    gradient: LinearGradient(
                      begin: Alignment.topCenter,
                      end: Alignment.bottomCenter,
                      colors: enabled
                          ? const [Color(0xFFFF6A3D), Color(0xFFE11D48)]
                          : const [Color(0xFFD0D5DD), Color(0xFF98A2B3)],
                    ),
                  ),
                  child: Material(
                    color: Colors.transparent,
                    shape: const CircleBorder(),
                    child: InkWell(
                      customBorder: const CircleBorder(),
                      onTap: enabled ? onSpin : null,
                      child: SizedBox(
                        width: 100,
                        height: 100,
                        child: Center(
                          child: Text(
                            spinning ? '抽奖中' : '抽奖',
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 19,
                              fontWeight: FontWeight.w900,
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _showLotteryDialog() async {
    final api = ref.read(apiClientProvider);
    Map<String, dynamic>? status;
    Map<String, dynamic>? lastRecord;
    bool loading = true;
    bool spinning = false;
    double wheelRotation = 0;
    String? error;

    Future<void> showPrizeResult(Map<String, dynamic>? record) async {
      if (!mounted || record == null) return;
      final title = _lotteryRecordDisplayTitle(record);
      final subtitle = _lotteryRecordDisplaySubtitle(record);
      await showDialog<void>(
        context: context,
        barrierDismissible: false,
        builder: (resultContext) => AlertDialog(
          backgroundColor: const Color(0xFFFFFCF5),
          surfaceTintColor: Colors.transparent,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(22),
          ),
          icon: Container(
            width: 78,
            height: 78,
            decoration: const BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [Color(0xFFFFF7AD), Color(0xFFFF8A00)],
              ),
              shape: BoxShape.circle,
              boxShadow: [
                BoxShadow(
                  color: Color(0x33D97706),
                  blurRadius: 16,
                  offset: Offset(0, 8),
                ),
              ],
            ),
            child: const Icon(
              Icons.emoji_events_rounded,
              size: 46,
              color: Colors.white,
            ),
          ),
          title: const Text(
            '恭喜中奖',
            textAlign: TextAlign.center,
            style: TextStyle(
              color: Color(0xFF101828),
              fontSize: 24,
              fontWeight: FontWeight.w900,
            ),
          ),
          content: Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 18),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: const Color(0xFFFFD7A8)),
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  title,
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                    color: Color(0xFFD84315),
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  subtitle,
                  textAlign: TextAlign.center,
                  style: const TextStyle(fontSize: 14, color: Colors.black54),
                ),
              ],
            ),
          ),
          actionsAlignment: MainAxisAlignment.center,
          actions: [
            FilledButton(
              style: FilledButton.styleFrom(
                backgroundColor: const Color(0xFFFF4D24),
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(999),
                ),
              ),
              onPressed: () => Navigator.of(resultContext).pop(),
              child: const Padding(
                padding: EdgeInsets.symmetric(horizontal: 24),
                child: Text('知道了'),
              ),
            ),
          ],
        ),
      );
    }

    Future<void> load(StateSetter setDialogState) async {
      try {
        final result =
            await api.get<Map<String, dynamic>>(ApiEndpoints.lotteryStatus);
        if (!mounted) return;
        setDialogState(() {
          status = result;
          loading = false;
          error = null;
        });
      } catch (e) {
        if (!mounted) return;
        setDialogState(() {
          loading = false;
          error = e.toString();
        });
      }
    }

    Future<void> spin(StateSetter setDialogState) async {
      final remaining = _asInt(status?['remainingChances']);
      if (remaining <= 0) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('暂无抽奖机会')),
        );
        return;
      }

      setDialogState(() => spinning = true);
      try {
        final result =
            await api.post<Map<String, dynamic>>(ApiEndpoints.lotterySpin);
        if (!mounted) return;
        final record = _asMap(result?['record']);
        final prize = _asMap(result?['prize']);
        final nextStatus = _asMap(result?['status']) ?? status;
        final nextPrizes = (nextStatus?['prizes'] as List?) ?? const [];
        final prizeIndex = _lotteryPrizeIndex(nextPrizes, record ?? prize);
        setDialogState(() {
          status = nextStatus;
          lastRecord = record;
          wheelRotation = _nextLotteryWheelRotation(
            wheelRotation,
            prizeIndex,
            nextPrizes.length,
          );
          error = null;
        });
        await Future.delayed(const Duration(milliseconds: 2400));
        if (!mounted) return;
        setDialogState(() => spinning = false);
        await ref.read(authProvider.notifier).loadProfile();
        await showPrizeResult(record ?? prize);
      } catch (e) {
        if (!mounted) return;
        setDialogState(() {
          spinning = false;
          error = e.toString();
        });
      }
    }

    await showDialog<void>(
      context: context,
      builder: (dialogContext) {
        var requested = false;
        return StatefulBuilder(
          builder: (context, setDialogState) {
            if (!requested) {
              requested = true;
              Future.microtask(() => load(setDialogState));
            }

            final prizes = (status?['prizes'] as List?) ?? const [];
            final records = (status?['records'] as List?) ?? const [];
            final remaining = _asInt(status?['remainingChances']);
            final teamCount = _asInt(status?['teamActiveCount']);
            final nextNeed = _asInt(status?['nextTeamChanceNeed']);

            return AlertDialog(
              backgroundColor: const Color(0xFFFFFCF5),
              surfaceTintColor: Colors.transparent,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(22),
              ),
              insetPadding:
                  const EdgeInsets.symmetric(horizontal: 18, vertical: 24),
              titlePadding: const EdgeInsets.fromLTRB(20, 18, 20, 0),
              contentPadding: const EdgeInsets.fromLTRB(18, 14, 18, 0),
              actionsPadding: const EdgeInsets.fromLTRB(16, 6, 16, 14),
              title: Row(
                children: [
                  Container(
                    width: 36,
                    height: 36,
                    decoration: const BoxDecoration(
                      shape: BoxShape.circle,
                      gradient: LinearGradient(
                        colors: [Color(0xFFFFC857), Color(0xFFFF4D24)],
                      ),
                    ),
                    child: const Icon(
                      Icons.casino_rounded,
                      color: Colors.white,
                      size: 21,
                    ),
                  ),
                  const SizedBox(width: 10),
                  const Expanded(
                    child: Text(
                      '幸运转盘',
                      style: TextStyle(
                        color: Color(0xFF101828),
                        fontSize: 21,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                  ),
                ],
              ),
              content: SizedBox(
                width: math.min(MediaQuery.of(context).size.width - 36, 450),
                child: loading
                    ? const SizedBox(
                        height: 180,
                        child: Center(child: CircularProgressIndicator()))
                    : SingleChildScrollView(
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            if (error != null)
                              Padding(
                                padding: const EdgeInsets.only(bottom: 8),
                                child: Text(error!,
                                    style: const TextStyle(
                                        color: Colors.redAccent, fontSize: 12)),
                              ),
                            Container(
                              width: double.infinity,
                              padding: const EdgeInsets.all(10),
                              decoration: BoxDecoration(
                                color: Colors.white,
                                borderRadius: BorderRadius.circular(14),
                                border: Border.all(
                                  color: const Color(0xFFFFD7A8),
                                ),
                                boxShadow: const [
                                  BoxShadow(
                                    color: Color(0x0FD97706),
                                    blurRadius: 12,
                                    offset: Offset(0, 6),
                                  ),
                                ],
                              ),
                              child: Row(
                                mainAxisAlignment:
                                    MainAxisAlignment.spaceAround,
                                children: [
                                  _lotteryStat('剩余次数', '$remaining'),
                                  _lotteryStat('有效团队', '$teamCount人'),
                                  _lotteryStat('下次机会', '差$nextNeed人'),
                                ],
                              ),
                            ),
                            const SizedBox(height: 12),
                            _buildLotteryWheel(
                              prizes: prizes,
                              rotation: wheelRotation,
                              spinning: spinning,
                              remaining: remaining,
                              onSpin: () => spin(setDialogState),
                            ),
                            const SizedBox(height: 12),
                            const Text(
                              '规则：激活账号送1次抽奖；有效团队每增加10人送1次抽奖。',
                              style:
                                  TextStyle(fontSize: 12, color: Colors.grey),
                            ),
                            if (lastRecord != null) ...[
                              const SizedBox(height: 12),
                              Container(
                                width: double.infinity,
                                padding: const EdgeInsets.all(12),
                                decoration: BoxDecoration(
                                  color: const Color(0xFFF0FDF4),
                                  borderRadius: BorderRadius.circular(12),
                                  border: Border.all(
                                    color: const Color(0xFFBBF7D0),
                                  ),
                                ),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                        _lotteryRecordDisplayTitle(lastRecord!),
                                        style: const TextStyle(
                                            fontWeight: FontWeight.bold)),
                                    const SizedBox(height: 4),
                                    Text(
                                        _lotteryRecordDisplaySubtitle(
                                            lastRecord!),
                                        style: const TextStyle(
                                            fontSize: 12, color: Colors.grey)),
                                  ],
                                ),
                              ),
                            ],
                            if (records.isNotEmpty) ...[
                              const SizedBox(height: 12),
                              const Text('最近记录',
                                  style:
                                      TextStyle(fontWeight: FontWeight.w600)),
                              const SizedBox(height: 6),
                              ...records.take(5).map((raw) {
                                final record =
                                    Map<String, dynamic>.from(raw as Map);
                                return Container(
                                  margin: const EdgeInsets.only(bottom: 6),
                                  padding: const EdgeInsets.symmetric(
                                      horizontal: 10, vertical: 8),
                                  decoration: BoxDecoration(
                                    color: Colors.white,
                                    borderRadius: BorderRadius.circular(10),
                                    border: Border.all(
                                      color: const Color(0xFFF2F4F7),
                                    ),
                                  ),
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        _lotteryRecordDisplayTitle(record),
                                        style: const TextStyle(
                                          fontSize: 13,
                                          fontWeight: FontWeight.w700,
                                        ),
                                      ),
                                      const SizedBox(height: 2),
                                      Text(
                                        _lotteryRecordDisplaySubtitle(record),
                                        style: const TextStyle(
                                          fontSize: 11,
                                          color: Colors.grey,
                                        ),
                                      ),
                                    ],
                                  ),
                                );
                              }),
                            ],
                          ],
                        ),
                      ),
              ),
              actions: [
                TextButton(
                    onPressed:
                        spinning ? null : () => Navigator.pop(dialogContext),
                    child: const Text('关闭')),
                ElevatedButton.icon(
                  onPressed: spinning || loading || remaining <= 0
                      ? null
                      : () => spin(setDialogState),
                  icon: spinning
                      ? const SizedBox(
                          width: 14,
                          height: 14,
                          child: CircularProgressIndicator(strokeWidth: 2))
                      : const Icon(Icons.casino, size: 18),
                  label: Text(spinning ? '抽奖中' : '开始抽奖'),
                ),
              ],
            );
          },
        );
      },
    );
  }

  Widget _lotteryStat(String label, String value) {
    return Expanded(
      child: Container(
        margin: const EdgeInsets.symmetric(horizontal: 3),
        padding: const EdgeInsets.symmetric(vertical: 9, horizontal: 6),
        decoration: BoxDecoration(
          color: const Color(0xFFFFF7ED),
          borderRadius: BorderRadius.circular(10),
        ),
        child: Column(
          children: [
            Text(
              value,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                color: Color(0xFF9A3412),
                fontSize: 17,
                fontWeight: FontWeight.w900,
              ),
            ),
            const SizedBox(height: 3),
            Text(
              label,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                fontSize: 11,
                color: Color(0xFF667085),
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _startGame(Map<String, dynamic> game) async {
    if (_gamesInTesting) {
      await showDialog<void>(
        context: context,
        builder: (dialogContext) => AlertDialog(
          title: const Text('测试中'),
          content: const Text('敬请期待'),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(dialogContext).pop(),
              child: const Text('确定'),
            ),
          ],
        ),
      );
      return;
    }

    if (_isSnakeGame(game) || _isHorseGame(game)) {
      await showDialog<void>(
        context: context,
        builder: (dialogContext) => AlertDialog(
          title: const Text('测试中'),
          content: const Text('敬请期待'),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(dialogContext).pop(),
              child: const Text('确定'),
            ),
          ],
        ),
      );
      return;
    }

    final user = ref.read(authProvider).user;
    if (user == null) return;
    if (!checkActivation(context, user.isActivated)) return;

    if (_isLotteryGame(game)) {
      await _showLotteryDialog();
      return;
    }

    final gameId = (game['id'] as num?)?.toInt();
    if (gameId == null || _starting) return;

    setState(() => _starting = true);
    try {
      final api = ref.read(apiClientProvider);
      final startResult = await api.post<Map<String, dynamic>>(
        ApiEndpoints.gameStart(gameId),
      );
      final rawUrl =
          (startResult?['gameUrl'] ?? game['gameUrl'] ?? game['game_url'] ?? '')
              .toString();
      final safeRawUrl = _normalizeKnownGameUrl(game, rawUrl);
      if (safeRawUrl.isEmpty) {
        throw Exception('game url is empty');
      }

      double points = 0;
      try {
        final balance =
            await api.get<Map<String, dynamic>>(ApiEndpoints.currencyBalance);
        points = (balance?['points'] as num?)?.toDouble() ?? 0;
      } catch (_) {}

      final gameUrl = _resolveGameUrl(safeRawUrl, gameId);
      final orientation =
          (startResult?['orientation'] ?? game['orientation'] ?? 'landscape')
              .toString();
      final token = TokenStorage.getToken() ?? '';
      if (!mounted) return;

      final rootNavigator = Navigator.of(context, rootNavigator: true);
      void closeGameRoute() {
        if (mounted && rootNavigator.canPop()) {
          rootNavigator.pop();
        }
      }

      final jsBridge = JSBridge(
        apiClient: api,
        gameId: gameId,
        onExit: closeGameRoute,
      );

      await rootNavigator.push(
        MaterialPageRoute(
          builder: (_) => GameWebView(
            gameUrl: gameUrl,
            gameId: gameId,
            userInfo: GameUserInfo(
              token: token,
              userId: user.id,
              account: user.account,
              nickname: user.nickname.isNotEmpty ? user.nickname : user.account,
              avatar: user.avatar,
              points: points,
              gameId: gameId,
            ),
            jsBridge: jsBridge,
            onExit: closeGameRoute,
            orientation: orientation,
            showExitButton: false,
          ),
        ),
      );
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('游戏启动失败，请稍后重试')),
      );
    } finally {
      if (mounted) setState(() => _starting = false);
    }
  }

  String _resolveGameUrl(String rawUrl, int gameId) {
    final uri = Uri.parse(rawUrl);
    if (uri.hasScheme) return _appendGameShellVersion(uri, gameId).toString();
    final path = rawUrl.startsWith('/') ? rawUrl : '/$rawUrl';
    return _appendGameShellVersion(
      Uri.parse(AppConstants.apiBaseUrl).resolve(path),
      gameId,
    ).toString();
  }

  bool _isInvalidGameUrl(String rawUrl) {
    final text = rawUrl.trim().toLowerCase();
    return text.isEmpty ||
        text == '__placeholder__' ||
        text.contains('/__placeholder__');
  }

  String _normalizeKnownGameUrl(Map<String, dynamic> game, String rawUrl) {
    if (!_isInvalidGameUrl(rawUrl)) return rawUrl;
    if (_isSnakeGame(game)) return '/uploads/games/snake/index.html';
    if (_isFishingGame(game)) return '/uploads/games/fishing/index.html';
    if (_isKillerGame(game)) return '/uploads/games/killer/index.html';
    if (_isHorseGame(game)) return '/uploads/games/saima/index.html';
    if (_isLotteryGame(game)) return 'lottery://native';
    return '';
  }

  Uri _appendGameShellVersion(Uri uri, int gameId) {
    final params = Map<String, String>.from(uri.queryParameters);
    params['game_shell_v'] = _gameShellVersion;
    params['gameId'] = gameId.toString();
    return uri.replace(queryParameters: params);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('游戏')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _games.isEmpty
              ? const Center(child: Text('暂无游戏'))
              : RefreshIndicator(
                  onRefresh: _loadGames,
                  child: GridView.builder(
                    padding: const EdgeInsets.all(16),
                    gridDelegate:
                        const SliverGridDelegateWithFixedCrossAxisCount(
                      crossAxisCount: 2,
                      mainAxisSpacing: 16,
                      crossAxisSpacing: 16,
                      childAspectRatio: 0.85,
                    ),
                    itemCount: _games.length,
                    itemBuilder: (context, index) {
                      final game = _games[index];
                      return GestureDetector(
                        onTap: () => _startGame(game),
                        child: Card(
                          elevation: 2,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              _buildGameIcon(game),
                              const SizedBox(height: 10),
                              Text(
                                _displayGameName(game),
                                style: const TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                              const SizedBox(height: 4),
                              Padding(
                                padding:
                                    const EdgeInsets.symmetric(horizontal: 8),
                                child: Text(
                                  _gameDescription(game),
                                  style: const TextStyle(
                                    fontSize: 12,
                                    color: Colors.grey,
                                  ),
                                  maxLines: 1,
                                  softWrap: false,
                                  overflow: TextOverflow.ellipsis,
                                  textAlign: TextAlign.center,
                                ),
                              ),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
                ),
    );
  }
}

class _LotteryPointerPainter extends CustomPainter {
  const _LotteryPointerPainter();

  @override
  void paint(Canvas canvas, Size size) {
    final pointer = Path()
      ..moveTo(size.width / 2, size.height)
      ..lineTo(size.width * 0.12, size.height * 0.25)
      ..quadraticBezierTo(
        size.width * 0.08,
        size.height * 0.14,
        size.width * 0.22,
        size.height * 0.1,
      )
      ..quadraticBezierTo(
        size.width / 2,
        -2,
        size.width * 0.78,
        size.height * 0.1,
      )
      ..quadraticBezierTo(
        size.width * 0.92,
        size.height * 0.14,
        size.width * 0.88,
        size.height * 0.25,
      )
      ..close();

    canvas.drawShadow(pointer, Colors.black87, 9, true);
    canvas.drawPath(
      pointer,
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = 7
        ..strokeJoin = StrokeJoin.round
        ..color = const Color(0xFF9F1239),
    );
    canvas.drawPath(
      pointer,
      Paint()
        ..style = PaintingStyle.fill
        ..shader = const LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [Color(0xFFFF7A45), Color(0xFFE11D48)],
        ).createShader(Offset.zero & size),
    );
    canvas.drawPath(
      pointer,
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = 4
        ..strokeJoin = StrokeJoin.round
        ..color = Colors.white,
    );
    canvas.drawPath(
      pointer,
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = 1.5
        ..strokeJoin = StrokeJoin.round
        ..color = const Color(0xFFFFF1F2),
    );
    canvas.drawCircle(
      Offset(size.width / 2, size.height * 0.23),
      10,
      Paint()..color = const Color(0xFFFFD54F),
    );
    canvas.drawCircle(
      Offset(size.width / 2, size.height * 0.23),
      10,
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = 2.5
        ..color = Colors.white,
    );
  }

  @override
  bool shouldRepaint(covariant _LotteryPointerPainter oldDelegate) => false;
}

class _LotteryWheelPainter extends CustomPainter {
  _LotteryWheelPainter({
    required this.prizes,
    required this.labelBuilder,
  });

  final List<Map<String, dynamic>> prizes;
  final String Function(Map<String, dynamic>) labelBuilder;

  static const List<Color> _colors = [
    Color(0xFFE11D48),
    Color(0xFFFF8A00),
    Color(0xFFFACC15),
    Color(0xFF22C55E),
    Color(0xFF14B8A6),
    Color(0xFF3B82F6),
    Color(0xFF8B5CF6),
  ];

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final outerRadius = math.min(size.width, size.height) / 2 - 2;
    final radius = outerRadius - 16;
    final rect = Rect.fromCircle(center: center, radius: radius);
    final count = prizes.isEmpty ? 1 : prizes.length;
    final sweep = math.pi * 2 / count;
    final borderPaint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2.2
      ..color = Colors.white;

    final outerPath = Path()
      ..addOval(Rect.fromCircle(center: center, radius: outerRadius - 1));
    canvas.drawShadow(outerPath, Colors.black54, 8, true);
    canvas.drawCircle(
      center,
      outerRadius,
      Paint()
        ..shader = const RadialGradient(
          colors: [Color(0xFFFFF7AD), Color(0xFFF59E0B)],
        ).createShader(Rect.fromCircle(center: center, radius: outerRadius)),
    );
    canvas.drawCircle(
      center,
      outerRadius - 9,
      Paint()..color = Colors.white,
    );

    for (var i = 0; i < count; i += 1) {
      final start = -math.pi / 2 + i * sweep;
      final segmentPaint = Paint()
        ..style = PaintingStyle.fill
        ..color = _colors[i % _colors.length];
      canvas.drawArc(rect, start, sweep, true, segmentPaint);
      canvas.drawArc(rect, start, sweep, true, borderPaint);

      if (prizes.isEmpty) continue;
      final label = labelBuilder(prizes[i]);
      final textPainter = TextPainter(
        text: TextSpan(
          text: label,
          style: const TextStyle(
            color: Colors.white,
            fontSize: 10.2,
            height: 1.1,
            fontWeight: FontWeight.w800,
            shadows: [
              Shadow(
                color: Color(0x66000000),
                blurRadius: 2,
                offset: Offset(0, 1),
              ),
            ],
          ),
        ),
        textAlign: TextAlign.center,
        textDirection: TextDirection.ltr,
        maxLines: 4,
      )..layout(maxWidth: 104);

      canvas.save();
      canvas.translate(center.dx, center.dy);
      canvas.rotate(start + sweep / 2 + math.pi / 2);
      canvas.translate(0, -radius * 0.63);
      textPainter.paint(
        canvas,
        Offset(-textPainter.width / 2, -textPainter.height / 2),
      );
      canvas.restore();
    }

    canvas.drawCircle(
      center,
      radius + 2,
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = 5
        ..color = Colors.white,
    );
    for (var i = 0; i < 18; i += 1) {
      final angle = -math.pi / 2 + i * math.pi * 2 / 18;
      final lightCenter = Offset(
        center.dx + math.cos(angle) * (outerRadius - 7),
        center.dy + math.sin(angle) * (outerRadius - 7),
      );
      canvas.drawCircle(
        lightCenter,
        i.isEven ? 4.2 : 3.4,
        Paint()
          ..color =
              i.isEven ? const Color(0xFFFFF7AD) : const Color(0xFFFFFFFF),
      );
      canvas.drawCircle(
        lightCenter,
        i.isEven ? 4.2 : 3.4,
        Paint()
          ..style = PaintingStyle.stroke
          ..strokeWidth = 1
          ..color = const Color(0xFFEAB308),
      );
    }
  }

  @override
  bool shouldRepaint(covariant _LotteryWheelPainter oldDelegate) {
    return oldDelegate.prizes != prizes ||
        oldDelegate.labelBuilder != labelBuilder;
  }
}
