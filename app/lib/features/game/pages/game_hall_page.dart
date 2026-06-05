import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/api_client.dart';
import '../../../core/network/api_endpoints.dart';
import '../../../core/constants/app_constants.dart';
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
  static const String _gameShellVersion = '20260605-gamefix';

  List<Map<String, dynamic>> _games = [];
  bool _loading = true;
  bool _starting = false;
  bool get _gamesTemporarilyDisabled => true;

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
    if (_gamesTemporarilyDisabled) {
      _showTestingDialog();
      return;
    }

    final user = ref.read(authProvider).user;
    if (user == null) return;
    if (!checkActivation(context, user.isActivated)) return;

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
      if (rawUrl.isEmpty) {
        throw Exception('game url is empty');
      }

      double points = 0;
      try {
        final balance =
            await api.get<Map<String, dynamic>>(ApiEndpoints.currencyBalance);
        points = (balance?['points'] as num?)?.toDouble() ?? 0;
      } catch (_) {}

      final gameUrl = _resolveGameUrl(rawUrl);
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
              nickname: user.nickname.isNotEmpty ? user.nickname : user.account,
              avatar: user.avatar,
              points: points,
            ),
            jsBridge: jsBridge,
            onExit: closeGameRoute,
            orientation: orientation,
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

  void _showTestingDialog() {
    if (!mounted) return;
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        content: const Text(
          '测试中，敬请期待',
          textAlign: TextAlign.center,
          style: TextStyle(fontSize: 16),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('确定'),
          ),
        ],
      ),
    );
  }

  String _resolveGameUrl(String rawUrl) {
    final uri = Uri.parse(rawUrl);
    if (uri.hasScheme) return _appendGameShellVersion(uri).toString();
    final path = rawUrl.startsWith('/') ? rawUrl : '/$rawUrl';
    return _appendGameShellVersion(
      Uri.parse(AppConstants.apiBaseUrl).resolve(path),
    ).toString();
  }

  Uri _appendGameShellVersion(Uri uri) {
    final params = Map<String, String>.from(uri.queryParameters);
    params['game_shell_v'] = _gameShellVersion;
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
                              Icon(
                                Icons.sports_esports,
                                size: 48,
                                color: Colors.blue.shade300,
                              ),
                              const SizedBox(height: 8),
                              Text(
                                game['name'] ?? '',
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
                                  game['description'] ?? '',
                                  style: const TextStyle(
                                    fontSize: 12,
                                    color: Colors.grey,
                                  ),
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
