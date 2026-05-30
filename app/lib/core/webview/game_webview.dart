import 'package:flutter/material.dart';
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

  const GameWebView({
    super.key,
    required this.gameUrl,
    required this.gameId,
    required this.userInfo,
    required this.jsBridge,
    required this.onExit,
    this.orientation = 'landscape',
  });

  @override
  State<GameWebView> createState() => GameWebViewState();
}

class GameWebViewState extends State<GameWebView> {
  InAppWebViewController? _webViewController;
  bool _isLoading = true;
  bool _hasError = false;
  String _errorMessage = '';

  @override
  void initState() {
    super.initState();
    // 根据游戏方向设置屏幕
    if (widget.orientation == 'landscape') {
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
  }

  @override
  void dispose() {
    widget.jsBridge.detach();
    // 恢复竖屏和系统 UI
    SystemChrome.setPreferredOrientations([
      DeviceOrientation.portraitUp,
    ]);
    SystemChrome.setEnabledSystemUIMode(
      SystemUiMode.manual,
      overlays: SystemUiOverlay.values,
    );
    super.dispose();
  }

  /// Reload the current game URL after an error.
  void _retry() {
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
        body: Stack(
          children: [
            // WebView layer
            if (!_hasError)
              InAppWebView(
                initialUrlRequest: URLRequest(
                  url: WebUri(widget.gameUrl),
                ),
                initialSettings: InAppWebViewSettings(
                  javaScriptEnabled: true,
                  mediaPlaybackRequiresUserGesture: false,
                  allowsInlineMediaPlayback: true,
                  userAgent:
                      'CompetitiveGamePlatform/1.0 GameId/${widget.gameId}',
                  supportZoom: false,
                  verticalScrollBarEnabled: false,
                  horizontalScrollBarEnabled: false,
                  transparentBackground: true,
                ),
                onWebViewCreated: (controller) {
                  _webViewController = controller;
                  // Attach JSBridge to the controller — registers all JS handlers.
                  widget.jsBridge.attach(controller);
                },
                onLoadStart: (controller, url) {
                  setState(() {
                    _isLoading = true;
                    _hasError = false;
                  });
                },
                onLoadStop: (controller, url) {
                  setState(() => _isLoading = false);
                  // Send user info to H5 once the page finishes loading.
                  widget.jsBridge.sendInit(widget.userInfo);
                },
                onReceivedError: (controller, request, error) {
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

            // Error state with retry
            if (_hasError) _buildErrorView(),

            // Loading indicator overlay
            if (_isLoading && !_hasError) _buildLoadingOverlay(),

            // Exit button overlay at top-left
            _buildExitButton(),
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
