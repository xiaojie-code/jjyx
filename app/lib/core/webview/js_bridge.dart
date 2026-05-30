import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:flutter_inappwebview/flutter_inappwebview.dart';

import '../network/api_client.dart';
import '../network/api_endpoints.dart';

/// User info passed to H5 games during initialization.
class GameUserInfo {
  final String token;
  final int userId;
  final String nickname;
  final String avatar;
  final double points;

  const GameUserInfo({
    required this.token,
    required this.userId,
    required this.nickname,
    required this.avatar,
    required this.points,
  });

  Map<String, dynamic> toJson() => {
        'token': token,
        'userId': userId,
        'nickname': nickname,
        'avatar': avatar,
        'points': points,
      };
}

/// Handles JSBridge communication between the App and H5 games.
///
/// Protocol format (both directions):
/// ```json
/// { "action": "actionName", "data": { ... } }
/// ```
class JSBridge {
  final ApiClient _apiClient;
  final int _gameId;
  final VoidCallback _onExit;

  InAppWebViewController? _controller;
  GameUserInfo? _userInfo;

  JSBridge({
    required ApiClient apiClient,
    required int gameId,
    required VoidCallback onExit,
  })  : _apiClient = apiClient,
        _gameId = gameId,
        _onExit = onExit;

  /// Bind a WebView controller and register all JS handlers.
  void attach(InAppWebViewController controller) {
    _controller = controller;
    // Web 平台不支持 addJavaScriptHandler，跳过注册
    if (!kIsWeb) {
      _registerHandlers(controller);
    }
  }

  /// Detach from the current controller.
  void detach() {
    _controller = null;
  }

  // ==================== App → H5 ====================

  /// Send the `init` message with user info when the game page finishes loading.
  Future<void> sendInit(GameUserInfo userInfo) async {
    _userInfo = userInfo;
    await _sendToH5('init', userInfo.toJson());
  }

  /// Send the result of a point deduction back to H5.
  Future<void> sendDeductPointsResult({
    required bool success,
    required double balance,
  }) async {
    await _sendToH5('deductPointsResult', {
      'success': success,
      'balance': balance,
    });
  }

  /// Send the result of a skin purchase back to H5.
  Future<void> sendBuySkinResult({
    required bool success,
    required String skinId,
  }) async {
    await _sendToH5('buySkinResult', {
      'success': success,
      'skinId': skinId,
    });
  }

  // ==================== H5 → App (handlers) ====================

  /// Register all JavaScript handlers that H5 can call.
  void _registerHandlers(InAppWebViewController controller) {
    controller.addJavaScriptHandler(
      handlerName: 'gameMessage',
      callback: _onGameMessage,
    );
  }

  /// Central router for all H5 → App messages.
  dynamic _onGameMessage(List<dynamic> args) {
    if (args.isEmpty) return null;

    try {
      final Map<String, dynamic> message =
          args[0] is String ? jsonDecode(args[0]) : Map<String, dynamic>.from(args[0]);

      final action = message['action'] as String?;
      final data = message['data'] as Map<String, dynamic>? ?? {};

      debugPrint('[JSBridge] Received action=$action data=$data');

      switch (action) {
        case 'deductPoints':
          _handleDeductPoints(data);
          break;
        case 'gameSettle':
          _handleGameSettle(data);
          break;
        case 'buySkin':
          _handleBuySkin(data);
          break;
        case 'exitGame':
          _handleExitGame();
          break;
        case 'getBalance':
          _handleGetBalance();
          break;
        default:
          debugPrint('[JSBridge] Unknown action: $action');
      }
    } catch (e) {
      debugPrint('[JSBridge] Error parsing message: $e');
    }

    return null;
  }

  /// Handle `deductPoints` — request to deduct points from the user's balance.
  Future<void> _handleDeductPoints(Map<String, dynamic> data) async {
    final amount = (data['amount'] as num?)?.toDouble() ?? 0;
    final reason = data['reason'] as String? ?? '';

    try {
      final result = await _apiClient.post<Map<String, dynamic>>(
        ApiEndpoints.currencyBalance,
        data: {
          'amount': amount,
          'reason': reason,
          'gameId': _gameId,
          'type': 'game_spend',
        },
      );

      final balance = (result?['balance'] as num?)?.toDouble() ?? 0;
      await sendDeductPointsResult(success: true, balance: balance);
    } catch (e) {
      debugPrint('[JSBridge] deductPoints failed: $e');
      await sendDeductPointsResult(
        success: false,
        balance: _userInfo?.points ?? 0,
      );
    }
  }

  /// Handle `gameSettle` — game over, record results and award items.
  Future<void> _handleGameSettle(Map<String, dynamic> data) async {
    try {
      await _apiClient.post(
        ApiEndpoints.gameSettle(_gameId),
        data: {
          'rank': data['rank'],
          'pointsEarned': data['pointsEarned'],
          'items': data['items'],
        },
      );
      debugPrint('[JSBridge] gameSettle success');
    } catch (e) {
      debugPrint('[JSBridge] gameSettle failed: $e');
    }
  }

  /// Handle `buySkin` — purchase a skin using points.
  Future<void> _handleBuySkin(Map<String, dynamic> data) async {
    final skinId = data['skinId'] as String? ?? '';
    final cost = (data['cost'] as num?)?.toDouble() ?? 0;

    try {
      await _apiClient.post(
        ApiEndpoints.currencyBalance,
        data: {
          'amount': cost,
          'reason': 'buy_skin',
          'skinId': skinId,
          'gameId': _gameId,
          'type': 'game_spend',
        },
      );
      await sendBuySkinResult(success: true, skinId: skinId);
    } catch (e) {
      debugPrint('[JSBridge] buySkin failed: $e');
      await sendBuySkinResult(success: false, skinId: skinId);
    }
  }

  /// Handle `exitGame` — user wants to leave the game.
  void _handleExitGame() {
    _onExit();
  }

  /// Handle `getBalance` — H5 requests the latest point balance.
  Future<void> _handleGetBalance() async {
    try {
      final result = await _apiClient.get<Map<String, dynamic>>(
        ApiEndpoints.currencyBalance,
      );

      final points = (result?['points'] as num?)?.toDouble() ?? 0;
      await _sendToH5('balanceUpdate', {'points': points});
    } catch (e) {
      debugPrint('[JSBridge] getBalance failed: $e');
    }
  }

  // ==================== Internal ====================

  /// Send a message to H5 via `window.onAppMessage(...)`.
  Future<void> _sendToH5(String action, Map<String, dynamic> data) async {
    final controller = _controller;
    if (controller == null) {
      debugPrint('[JSBridge] Cannot send to H5: no controller attached');
      return;
    }

    final message = jsonEncode({'action': action, 'data': data});
    debugPrint('[JSBridge] Sending to H5: $message');

    try {
      await controller.evaluateJavascript(
        source: 'window.onAppMessage($message)',
      );
    } catch (e) {
      debugPrint('[JSBridge] evaluateJavascript failed: $e');
    }
  }
}
