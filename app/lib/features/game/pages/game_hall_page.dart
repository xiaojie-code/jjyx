import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/constants/app_constants.dart';
import '../../../core/network/api_client.dart';
import '../../../core/network/api_endpoints.dart';
import '../../../core/webview/game_webview.dart';
import '../../../core/webview/js_bridge.dart';
import '../../../core/storage/token_storage.dart';
import '../../../core/utils/toast.dart';
import '../../auth/providers/auth_provider.dart';
import '../../../core/utils/activation_guard.dart';

class GameHallPage extends ConsumerStatefulWidget {
  const GameHallPage({super.key});

  @override
  ConsumerState<GameHallPage> createState() => _GameHallPageState();
}

class _GameHallPageState extends ConsumerState<GameHallPage> {
  List<Map<String, dynamic>> _games = [];
  bool _loading = true;

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

  Future<void> _startGame(Map<String, dynamic> game) async {
    final user = ref.read(authProvider).user;
    if (user == null) return;
    if (!checkActivation(context, user.isActivated)) return;

    // 获取用户当前积分
    int currentPoints = 0;
    try {
      final balance = await ref.read(apiClientProvider).get<Map<String, dynamic>>(
        '/api/currency/balance',
      );
      currentPoints = (double.tryParse(balance?['points']?.toString() ?? '0') ?? 0).toInt();
    } catch (_) {}

    // 显示下注弹窗
    final betAmount = await showDialog<int>(
      context: context,
      builder: (ctx) => _BetDialog(currentPoints: currentPoints),
    );

    if (betAmount == null || !mounted) return; // 用户取消

    try {
      final result =
          await ref.read(apiClientProvider).post<Map<String, dynamic>>(
                ApiEndpoints.gameStart(game['id'] as int),
                data: {'betAmount': betAmount},
              );
      if (result == null || !mounted) return;

      final rawGameUrl = result['gameUrl'] as String;

      // 占位游戏：弹窗提示
      if (rawGameUrl == '__placeholder__') {
        if (mounted) {
          showDialog(
            context: context,
            builder: (ctx) => AlertDialog(
              content: const Text('测试中，敬请期待', textAlign: TextAlign.center, style: TextStyle(fontSize: 16)),
              actions: [TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('确定'))],
            ),
          );
        }
        return;
      }

      final gameUrl = rawGameUrl.startsWith('http') ? rawGameUrl : '${AppConstants.apiBaseUrl}$rawGameUrl';
      final gameId = result['gameId'] as int;
      final orientation = result['orientation'] as String? ?? 'landscape';

      // Web 端不支持 InAppWebView，提示用户
      if (kIsWeb) {
        if (mounted) {
          Toast.error(context, '请在手机端体验游戏');
        }
        return;
      }

      final bridge = JSBridge(
        apiClient: ref.read(apiClientProvider),
        gameId: gameId,
        onExit: () => Navigator.of(context, rootNavigator: true).pop(),
      );

      final userInfo = GameUserInfo(
        token: TokenStorage.getToken() ?? '',
        userId: user.id,
        nickname: user.nickname,
        avatar: user.avatar,
        points: 0, // 会在 init 时从后端获取
      );

      Navigator.of(context, rootNavigator: true).push(MaterialPageRoute(
        builder: (_) => GameWebView(
          gameUrl: gameUrl,
          gameId: gameId,
          userInfo: userInfo,
          jsBridge: bridge,
          orientation: orientation,
          onExit: () => Navigator.of(context, rootNavigator: true).pop(),
        ),
      ));
    } catch (e) {
      if (mounted) {
        Toast.error(context, '$e');
      }
    }
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
                              borderRadius: BorderRadius.circular(12)),
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(Icons.sports_esports,
                                  size: 48, color: Colors.blue.shade300),
                              const SizedBox(height: 8),
                              Text(game['name'] ?? '',
                                  style: const TextStyle(
                                      fontSize: 16,
                                      fontWeight: FontWeight.bold)),
                              const SizedBox(height: 4),
                              Padding(
                                padding:
                                    const EdgeInsets.symmetric(horizontal: 8),
                                child: Text(
                                  game['description'] ?? '',
                                  style: const TextStyle(
                                      fontSize: 12, color: Colors.grey),
                                  maxLines: 2,
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


/// 下注弹窗
class _BetDialog extends StatefulWidget {
  final int currentPoints;
  const _BetDialog({required this.currentPoints});

  @override
  State<_BetDialog> createState() => _BetDialogState();
}

class _BetDialogState extends State<_BetDialog> {
  int? _selectedBet;
  final List<int> _betOptions = [100, 500, 1000, 3000, 5000, 10000];

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('选择下注', textAlign: TextAlign.center),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 16),
            decoration: BoxDecoration(
              color: Colors.blue.shade50,
              borderRadius: BorderRadius.circular(8),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.monetization_on, color: Colors.orange, size: 20),
                const SizedBox(width: 6),
                Text('当前积分：${widget.currentPoints}',
                    style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600)),
              ],
            ),
          ),
          const SizedBox(height: 16),
          Wrap(
            spacing: 10,
            runSpacing: 10,
            alignment: WrapAlignment.center,
            children: _betOptions.map((bet) {
              final selected = _selectedBet == bet;
              final enough = widget.currentPoints >= bet;
              return GestureDetector(
                onTap: enough ? () => setState(() => _selectedBet = bet) : null,
                child: Container(
                  width: 90,
                  padding: const EdgeInsets.symmetric(vertical: 10),
                  decoration: BoxDecoration(
                    color: selected
                        ? Colors.blue
                        : enough
                            ? Colors.white
                            : Colors.grey.shade200,
                    border: Border.all(
                      color: selected ? Colors.blue : Colors.grey.shade300,
                      width: selected ? 2 : 1,
                    ),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    bet >= 10000 ? '${bet ~/ 10000}万' : '$bet',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w600,
                      color: selected
                          ? Colors.white
                          : enough
                              ? Colors.black87
                              : Colors.grey,
                    ),
                  ),
                ),
              );
            }).toList(),
          ),
        ],
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context, null),
          child: const Text('取消'),
        ),
        ElevatedButton(
          onPressed: _selectedBet != null
              ? () {
                  if (widget.currentPoints < _selectedBet!) {
                    Toast.error(context, '积分不足');
                    return;
                  }
                  Navigator.pop(context, _selectedBet);
                }
              : null,
          child: const Text('确认开始'),
        ),
      ],
    );
  }
}
