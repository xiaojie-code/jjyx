import 'dart:async';
import 'dart:collection';
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:flutter_inappwebview/flutter_inappwebview.dart';

import 'js_bridge.dart';

/// Reusable WebView container for loading H5 games.
///
/// Usage:
/// ```dart
/// GameWebView(
///   gameUrl: 'https://game.example.com/snake',
///   gameId: 1,
///   userInfo: GameUserInfo(...),
///   jsBridge: jsBridge,
///   onExit: () => Navigator.pop(context),
/// )
/// ```
class GameWebView extends StatefulWidget {
  /// The URL of the H5 game to load.
  final String gameUrl;

  /// Numeric game identifier (used by JSBridge and API calls).
  final int gameId;

  /// User info to send to H5 on page load.
  final GameUserInfo userInfo;

  /// The JSBridge instance that handles App↔H5 communication.
  final JSBridge jsBridge;

  /// Called when the user exits the game.
  final VoidCallback onExit;

  /// 游戏屏幕方向：'landscape' 横屏，'portrait' 竖屏
  final String orientation;

  /// Whether to show the app-level floating close button.
  final bool showExitButton;

  const GameWebView({
    super.key,
    required this.gameUrl,
    required this.gameId,
    required this.userInfo,
    required this.jsBridge,
    required this.onExit,
    this.orientation = 'landscape',
    this.showExitButton = true,
  });

  @override
  State<GameWebView> createState() => GameWebViewState();
}

class GameWebViewState extends State<GameWebView> {
  static const MethodChannel _windowChannel = MethodChannel(
    'com.example.app/window',
  );

  InAppWebViewController? _webViewController;
  bool _isLoading = true;
  bool _hasError = false;
  String _errorMessage = '';
  final List<String> _debugLogs = [];
  bool _debugPanelExpanded = false;
  Timer? _xiangqiScreenPollTimer;
  bool _showXiangqiRoomEntryGuard = false;
  bool _xiangqiRoomEntryBusy = false;
  DateTime? _xiangqiRoomEntryGuardCooldownUntil;

  bool get _isXiangqiGame {
    final url = widget.gameUrl.toLowerCase();
    return url.contains('/uploads/games/xiangqi/') ||
        url.contains('/assets/h5-games/xiangqi/') ||
        url.contains('/h5-games/xiangqi/');
  }

  bool get _forceNoCacheForBundledGame {
    final url = widget.gameUrl.toLowerCase();
    return url.contains('/uploads/games/xiangqi/') ||
        url.contains('/assets/h5-games/xiangqi/') ||
        url.contains('/h5-games/xiangqi/') ||
        url.contains('/uploads/games/mahjong/') ||
        url.contains('/assets/h5-games/mahjong/') ||
        url.contains('/h5-games/mahjong/') ||
        url.contains('/uploads/games/fishing/') ||
        url.contains('/assets/h5-games/fishing/') ||
        url.contains('/h5-games/fishing/') ||
        url.contains('/uploads/games/killer/') ||
        url.contains('/assets/h5-games/killer/') ||
        url.contains('/h5-games/killer/') ||
        url.contains('/uploads/games/saima2/') ||
        url.contains('/assets/h5-games/saima2/') ||
        url.contains('/h5-games/saima2/');
  }

  int _loadProgress = 0;
  int _lastLoggedProgress = -10;

  bool get _debugEnabled {
    if (kDebugMode) return true;
    final uri = Uri.tryParse(widget.gameUrl);
    return uri?.queryParameters['debug'] == '1' ||
        uri?.queryParameters['gameDebug'] == '1';
  }

  @override
  void initState() {
    super.initState();
    // 根据游戏方向设置屏幕
    final orientation = widget.orientation.toLowerCase().trim();
    if (orientation == 'landscape') {
      SystemChrome.setPreferredOrientations([
        DeviceOrientation.landscapeLeft,
        DeviceOrientation.landscapeRight,
      ]);
    } else {
      SystemChrome.setPreferredOrientations([
        DeviceOrientation.portraitUp,
      ]);
    }
    SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersiveSticky);
    _setGameFullscreen(true);
    _addDebugLog('open ${_shortUrl(widget.gameUrl)}');
    _addDebugLog('orientation ${widget.orientation}');
  }

  Future<void> _setGameFullscreen(bool enabled) async {
    try {
      await _windowChannel.invokeMethod(
        enabled ? 'enterGameFullscreen' : 'exitGameFullscreen',
      );
    } catch (_) {}
  }

  void _addDebugLog(String message) {
    if (!_debugEnabled) return;

    final now = DateTime.now();
    final timestamp = '${now.hour.toString().padLeft(2, '0')}:'
        '${now.minute.toString().padLeft(2, '0')}:'
        '${now.second.toString().padLeft(2, '0')}';
    final entry = '$timestamp $message';

    if (!mounted) {
      _debugLogs.add(entry);
      return;
    }

    setState(() {
      _debugLogs.add(entry);
      if (_debugLogs.length > 120) {
        _debugLogs.removeRange(0, _debugLogs.length - 120);
      }
    });
  }

  void _startXiangqiScreenPolling() {
    if (!_isXiangqiGame) return;
    _xiangqiScreenPollTimer?.cancel();
    _xiangqiScreenPollTimer = Timer.periodic(
      const Duration(milliseconds: 350),
      (_) => _pollXiangqiScreenMode(),
    );
    _pollXiangqiScreenMode();
  }

  Future<void> _pollXiangqiScreenMode() async {
    final controller = _webViewController;
    if (!_isXiangqiGame || controller == null || !mounted) return;
    try {
      final result = await controller.evaluateJavascript(
        source: '''
(function () {
  var mode = String(
    (document.body && document.body.getAttribute("data-xq-screen")) ||
    window.__XQ_LAST_SCREEN_MODE__ ||
    ""
  );
  var home = false;
  try {
    var homeOverlay = document.getElementById("xiangqiHomeOverlay");
    home = !!(homeOverlay && homeOverlay.classList && homeOverlay.classList.contains("show"));
  } catch (_) {}
  var suppress = window.__XQ_NATIVE_ROOM_GUARD_SUPPRESS__ === true;
  try {
    if (
      document.body &&
      document.body.classList &&
      (
        document.body.classList.contains("xq-room-entry-ready") ||
        Date.now() < Number(window.__XQ_FORCE_ROOM_ENTRY_GUARD_UNTIL__ || 0)
      )
    ) {
      mode = "room";
    }
  } catch (_) {}
  if (mode !== "room") {
    try {
      var scene = window.cc && cc.director && cc.director.getScene ? cc.director.getScene() : null;
      if (
        scene &&
        typeof window.__xiangqiGetLikelyRoomButtons === "function" &&
        window.__xiangqiGetLikelyRoomButtons(scene).length >= 3
      ) {
        mode = "room";
      }
    } catch (_) {}
  }
  return (suppress ? "1" : "0") + "|" + (home ? "1" : "0") + "|" + mode;
})()
''',
      );
      final parts = result?.toString().replaceAll('"', '').trim().split('|') ??
          const <String>[];
      final suppressFromH5 = parts.isNotEmpty && parts[0] == '1';
      final mode = parts.length > 2 ? parts.sublist(2).join('|').trim() : '';
      final now = DateTime.now();
      final cooldownUntil = _xiangqiRoomEntryGuardCooldownUntil;
      final inRoomEntryCooldown =
          cooldownUntil != null && now.isBefore(cooldownUntil);
      if (inRoomEntryCooldown && mode == 'room') {
        if (_showXiangqiRoomEntryGuard && mounted) {
          setState(() => _showXiangqiRoomEntryGuard = false);
        }
        return;
      }
      if (cooldownUntil != null && !now.isBefore(cooldownUntil)) {
        _xiangqiRoomEntryGuardCooldownUntil = null;
      }
      if (suppressFromH5 && mode != 'room') {
        if (_showXiangqiRoomEntryGuard && mounted) {
          setState(() => _showXiangqiRoomEntryGuard = false);
        }
        return;
      }
      // Xiangqi now handles room staking inside the bundled H5. Keeping the
      // native fallback overlay active can swallow taps after returning here.
      final shouldShow = false;
      if (shouldShow != _showXiangqiRoomEntryGuard && mounted) {
        setState(() => _showXiangqiRoomEntryGuard = shouldShow);
        _addDebugLog(
          'xiangqi room guard ${shouldShow ? 'on' : 'off'} mode=$mode',
        );
      }
    } catch (_) {}
  }

  UnmodifiableListView<UserScript> _initialUserScripts() {
    final initDataJson = jsonEncode(widget.userInfo.toJson());
    final messageJson = jsonEncode({
      'action': 'init',
      'data': widget.userInfo.toJson(),
    });

    return UnmodifiableListView<UserScript>([
      UserScript(
        injectionTime: UserScriptInjectionTime.AT_DOCUMENT_START,
        source: '''
window.__GAME_APP_INIT__ = $initDataJson;
window.__KILLER_APP_INIT__ = $initDataJson;
window.__SAIMA_APP_INIT__ = $initDataJson;
window.__MAHJONG_APP_INIT__ = $initDataJson;
window.__APP_GAME_INIT_MESSAGE__ = $messageJson;
''',
      ),
    ]);
  }

  String _shortUrl(Object? url) {
    final value = (url ?? '').toString();
    if (value.length <= 160) return value;
    return '${value.substring(0, 80)}...${value.substring(value.length - 60)}';
  }

  @override
  void dispose() {
    _xiangqiScreenPollTimer?.cancel();
    widget.jsBridge.detach();
    // 恢复竖屏和系统 UI
    SystemChrome.setPreferredOrientations([
      DeviceOrientation.portraitUp,
    ]);
    SystemChrome.setEnabledSystemUIMode(
      SystemUiMode.manual,
      overlays: SystemUiOverlay.values,
    );
    _setGameFullscreen(false);
    super.dispose();
  }

  /// Reload the current game URL after an error.
  void _retry() {
    _addDebugLog('retry');
    setState(() {
      _isLoading = true;
      _hasError = false;
      _errorMessage = '';
    });
    _webViewController?.loadUrl(
      urlRequest: URLRequest(url: WebUri(widget.gameUrl)),
    );
  }

  /// Show a confirmation dialog before exiting the game.
  Future<bool> _confirmExit() async {
    final result = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('退出游戏'),
        content: const Text('确定要退出当前游戏吗？'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('取消'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('确定'),
          ),
        ],
      ),
    );
    return result ?? false;
  }

  @override
  Widget build(BuildContext context) {
    // ignore: deprecated_member_use
    return WillPopScope(
      onWillPop: () async {
        if (await _confirmExit()) {
          widget.onExit();
          return false;
        }
        return false;
      },
      child: Scaffold(
        backgroundColor: Colors.black,
        resizeToAvoidBottomInset: false,
        body: Stack(
          fit: StackFit.expand,
          children: [
            // WebView layer
            if (!_hasError)
              Positioned.fill(
                child: InAppWebView(
                  initialUrlRequest: URLRequest(
                    url: WebUri(widget.gameUrl),
                  ),
                  initialUserScripts: _initialUserScripts(),
                  initialSettings: InAppWebViewSettings(
                    javaScriptEnabled: true,
                    domStorageEnabled: true,
                    databaseEnabled: true,
                    allowFileAccess: true,
                    allowContentAccess: true,
                    allowFileAccessFromFileURLs: true,
                    allowUniversalAccessFromFileURLs: true,
                    clearCache: _forceNoCacheForBundledGame,
                    cacheEnabled: !_forceNoCacheForBundledGame,
                    cacheMode: _forceNoCacheForBundledGame
                        ? CacheMode.LOAD_NO_CACHE
                        : CacheMode.LOAD_DEFAULT,
                    mixedContentMode:
                        MixedContentMode.MIXED_CONTENT_ALWAYS_ALLOW,
                    webViewAssetLoader: kIsWeb
                        ? null
                        : WebViewAssetLoader(
                            domain: 'appassets.androidplatform.net',
                            httpAllowed: true,
                            pathHandlers: [
                              AssetsPathHandler(path: '/assets/'),
                            ],
                          ),
                    mediaPlaybackRequiresUserGesture: false,
                    allowsInlineMediaPlayback: true,
                    userAgent:
                        'CompetitiveGamePlatform/1.0 GameId/${widget.gameId}',
                    supportZoom: false,
                    verticalScrollBarEnabled: false,
                    horizontalScrollBarEnabled: false,
                    transparentBackground: false,
                  ),
                  onWebViewCreated: (controller) {
                    _webViewController = controller;
                    _addDebugLog('webview created');
                    if (_forceNoCacheForBundledGame) {
                      controller.clearCache();
                    }
                    // Attach JSBridge to the controller — registers all JS handlers.
                    widget.jsBridge.attach(controller);
                  },
                  onLoadStart: (controller, url) {
                    _addDebugLog('load start ${_shortUrl(url)}');
                    setState(() {
                      _isLoading = true;
                      _hasError = false;
                      if (_isXiangqiGame) {
                        _showXiangqiRoomEntryGuard = false;
                        _xiangqiRoomEntryGuardCooldownUntil = null;
                      }
                    });
                  },
                  onLoadStop: (controller, url) {
                    _addDebugLog('load stop ${_shortUrl(url)}');
                    setState(() {
                      _isLoading = false;
                    });
                    // Send user info to H5 once the page finishes loading.
                    widget.jsBridge.sendInit(widget.userInfo);
                    _startXiangqiScreenPolling();
                  },
                  onProgressChanged: (controller, progress) {
                    if (progress != _loadProgress) {
                      setState(() => _loadProgress = progress);
                    }
                    if (progress == 100 ||
                        progress - _lastLoggedProgress >= 10) {
                      _lastLoggedProgress = progress;
                      _addDebugLog('progress $progress%');
                    }
                  },
                  onConsoleMessage: (controller, consoleMessage) {
                    final level =
                        consoleMessage.messageLevel.toString().split('.').last;
                    _addDebugLog(
                      'console $level: '
                      '${consoleMessage.message}',
                    );
                  },
                  onReceivedHttpError: (controller, request, response) {
                    _addDebugLog(
                      'http ${response.statusCode} ${_shortUrl(request.url)}',
                    );
                  },
                  onReceivedError: (controller, request, error) {
                    _addDebugLog(
                      'error ${error.type}: ${error.description} '
                      '${_shortUrl(request.url)}',
                    );
                    // Only treat main frame errors as page-level failures.
                    if (request.isForMainFrame ?? false) {
                      setState(() {
                        _isLoading = false;
                        _hasError = true;
                        _errorMessage = error.description;
                      });
                    }
                  },
                ),
              ),

            // Error state with retry
            if (_hasError) _buildErrorView(),

            // Loading indicator overlay
            if (_isLoading && !_hasError) _buildLoadingOverlay(),

            // Exit button overlay at top-left
            if (widget.showExitButton) _buildExitButton(),

            _buildDebugTools(),
          ],
        ),
      ),
    );
  }

  Widget _buildLoadingOverlay() {
    return Container(
      color: Colors.black54,
      child: const Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            CircularProgressIndicator(color: Colors.white),
            SizedBox(height: 16),
            Text(
              '游戏加载中...',
              style: TextStyle(color: Colors.white, fontSize: 16),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildErrorView() {
    return Container(
      color: Colors.black,
      child: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.wifi_off, color: Colors.white54, size: 64),
            const SizedBox(height: 16),
            Text(
              _errorMessage.isNotEmpty ? _errorMessage : '页面加载失败',
              style: const TextStyle(color: Colors.white70, fontSize: 14),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 24),
            ElevatedButton.icon(
              onPressed: _retry,
              icon: const Icon(Icons.refresh),
              label: const Text('重试'),
            ),
          ],
        ),
      ),
    );
  }

  Map<String, Object> _xiangqiRoomConfig(int index) {
    const rooms = [
      {
        'roomName': '入门房间',
        'roomKey': 'beginner',
        'stake': 100,
        'winReturn': 200,
      },
      {
        'roomName': '高手房间',
        'roomKey': 'expert',
        'stake': 300,
        'winReturn': 600,
      },
      {
        'roomName': '国手房间',
        'roomKey': 'master',
        'stake': 1000,
        'winReturn': 2000,
      },
    ];
    final safeIndex = index.clamp(0, rooms.length - 1).toInt();
    return rooms[safeIndex];
  }

  Future<void> _handleXiangqiRoomTap(int index) async {
    if (_xiangqiRoomEntryBusy) return;
    final controller = _webViewController;
    if (controller == null) return;

    final config = _xiangqiRoomConfig(index);
    final roomName = config['roomName'] as String;
    final roomKey = config['roomKey'] as String;
    final stake = config['stake'] as int;
    final winReturn = config['winReturn'] as int;

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('确认押注'),
        content: Text(
          '$roomName需先押注 $stake 积分。\n'
          '胜利获得 $winReturn 积分，失败扣除押注，平局返还押注。\n'
          '是否确认进入？',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(false),
            child: const Text('取消'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(dialogContext).pop(true),
            child: const Text('确认'),
          ),
        ],
      ),
    );
    if (confirmed != true || !mounted) return;

    setState(() => _xiangqiRoomEntryBusy = true);
    final roundId =
        'xiangqi_battle_${roomKey}_${DateTime.now().millisecondsSinceEpoch}';
    final result = await widget.jsBridge.changePointsFromNative(
      amount: -stake.toDouble(),
      reason: 'xiangqi_battle_bet',
      requestId: '$roundId:bet',
      extra: {
        'module': 'battle',
        'roomName': roomName,
        'roomKey': roomKey,
        'stake': stake,
        'roundId': roundId,
      },
    );

    if (!mounted) return;
    setState(() => _xiangqiRoomEntryBusy = false);

    if (result['success'] != true) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('积分不足或押注扣除失败，请稍后再试')),
      );
      return;
    }

    final payload = jsonEncode({
      'roomName': roomName,
      'roomKey': roomKey,
      'stake': stake,
      'winReturn': winReturn,
      'roundId': roundId,
      'balance': result['balance'],
    });
    try {
      await controller.evaluateJavascript(
        source: '''
(function () {
  var stake = $payload;
  if (window.__xiangqiSetNativeBattleStake) {
    window.__xiangqiSetNativeBattleStake(stake);
  }
  if (window.__xiangqiNativeEnterRoom) {
    return window.__xiangqiNativeEnterRoom($index);
  }
  return false;
})()
''',
      );
    } catch (_) {}
    if (mounted) {
      setState(() {
        _xiangqiRoomEntryGuardCooldownUntil = DateTime.now().add(
          const Duration(milliseconds: 2500),
        );
        _showXiangqiRoomEntryGuard = false;
      });
    }
  }

  Widget _buildXiangqiRoomEntryGuard() {
    return LayoutBuilder(
      builder: (context, constraints) {
        final isPortrait = constraints.maxHeight > constraints.maxWidth;
        final topFractions = isPortrait
            ? <double>[0.335, 0.490, 0.646]
            : <double>[0.285, 0.415, 0.545];
        final hitHeight = isPortrait ? 0.072 : 0.078;
        final horizontalInset =
            constraints.maxWidth * (isPortrait ? 0.11 : 0.18);
        return Stack(
          children: [
            for (var i = 0; i < topFractions.length; i += 1)
              Positioned(
                left: horizontalInset,
                right: horizontalInset,
                top: constraints.maxHeight * topFractions[i],
                height: constraints.maxHeight * hitHeight,
                child: GestureDetector(
                  behavior: HitTestBehavior.opaque,
                  onTap: () => _handleXiangqiRoomTap(i),
                  child: const SizedBox.expand(),
                ),
              ),
            if (_xiangqiRoomEntryBusy)
              Positioned.fill(
                child: Container(
                  color: Colors.black26,
                  child: const Center(
                    child: CircularProgressIndicator(color: Colors.white),
                  ),
                ),
              ),
          ],
        );
      },
    );
  }

  Widget _buildDebugTools() {
    if (!_debugEnabled) return const SizedBox.shrink();

    if (!_debugPanelExpanded) {
      return Positioned(
        top: MediaQuery.of(context).padding.top + 8,
        left: MediaQuery.of(context).size.width / 2 - 24,
        child: Material(
          color: Colors.black54,
          shape: const CircleBorder(),
          child: IconButton(
            tooltip: 'Debug logs',
            icon: const Icon(Icons.bug_report, color: Colors.white),
            onPressed: () {
              setState(() => _debugPanelExpanded = true);
            },
          ),
        ),
      );
    }

    final maxHeight = MediaQuery.of(context).size.height * 0.38;
    final logs = _debugLogs.isEmpty ? 'No logs yet' : _debugLogs.join('\n');

    return Positioned(
      left: 8,
      right: 8,
      bottom: 8,
      child: Material(
        color: Colors.black87,
        borderRadius: BorderRadius.circular(8),
        child: ConstrainedBox(
          constraints: BoxConstraints(maxHeight: maxHeight),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(10, 6, 6, 2),
                child: Row(
                  children: [
                    Expanded(
                      child: Text(
                        'WebView logs  $_loadProgress%',
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                    IconButton(
                      tooltip: 'Clear logs',
                      icon: const Icon(Icons.delete_outline,
                          color: Colors.white70, size: 18),
                      onPressed: () {
                        setState(() => _debugLogs.clear());
                      },
                    ),
                    IconButton(
                      tooltip: 'Hide logs',
                      icon: const Icon(Icons.close,
                          color: Colors.white70, size: 18),
                      onPressed: () {
                        setState(() => _debugPanelExpanded = false);
                      },
                    ),
                  ],
                ),
              ),
              const Divider(height: 1, color: Colors.white24),
              Flexible(
                child: SingleChildScrollView(
                  reverse: true,
                  padding: const EdgeInsets.all(10),
                  child: SelectableText(
                    logs,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 10,
                      height: 1.25,
                      fontFamily: 'monospace',
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

  Widget _buildExitButton() {
    return Positioned(
      top: MediaQuery.of(context).padding.top + 8,
      left: 8,
      child: GestureDetector(
        onTap: () async {
          if (await _confirmExit()) {
            widget.onExit();
          }
        },
        child: Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: Colors.black45,
            borderRadius: BorderRadius.circular(20),
          ),
          child: const Icon(
            Icons.close,
            color: Colors.white,
            size: 24,
          ),
        ),
      ),
    );
  }
}
