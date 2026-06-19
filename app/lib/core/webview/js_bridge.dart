import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:flutter_inappwebview/flutter_inappwebview.dart';

import '../constants/app_constants.dart';
import '../network/api_client.dart';
import '../network/api_endpoints.dart';

/// User info passed to H5 games during initialization.
class GameUserInfo {
  final String token;
  final int userId;
  final String account;
  final String nickname;
  final String avatar;
  final double points;
  final int gameId;

  const GameUserInfo({
    required this.token,
    required this.userId,
    required this.account,
    required this.nickname,
    required this.avatar,
    required this.points,
    this.gameId = 0,
  });

  Map<String, dynamic> toJson() => {
        'token': token,
        'userId': userId,
        'account': account,
        'nickname': nickname,
        'avatar': avatar,
        'points': points,
        'balance': points,
        'coin': points,
        'gameId': gameId,
        'apiBaseUrl': AppConstants.apiBaseUrl,
        'wsUrl': AppConstants.wsUrl,
        'saimaWsUrl': AppConstants.saimaWsUrl,
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
  double? _latestPoints;

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
    _latestPoints = userInfo.points;
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
      'points': balance,
      'coin': balance,
    });
  }

  /// Send a generic point change result back to H5.
  Future<void> sendPointsChangeResult({
    required bool success,
    required double balance,
    required double amount,
    double? requestedAmount,
    bool duplicate = false,
    String? message,
    String? requestId,
  }) async {
    final data = {
      'success': success,
      'balance': balance,
      'points': balance,
      'coin': balance,
      'amount': amount,
      'duplicate': duplicate,
    };
    if (requestedAmount != null) {
      data['requestedAmount'] = requestedAmount;
    }
    if (message != null && message.isNotEmpty) {
      data['message'] = message;
    }
    if (requestId != null && requestId.isNotEmpty) {
      data['requestId'] = requestId;
    }
    await _sendToH5('pointsChangeResult', data);
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
        case 'changePoints':
          _handleChangePoints(data);
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
    if (amount <= 0) {
      await sendDeductPointsResult(
        success: false,
        balance: _userInfo?.points ?? 0,
      );
      return;
    }

    try {
      final spendAmount = -amount.abs();
      final result = await _apiClient.post<Map<String, dynamic>>(
        ApiEndpoints.gamePointsChange(_gameId),
        data: {
          'amount': spendAmount,
          'reason': reason.isNotEmpty ? reason : 'game_spend',
        },
      );

      final balance = (result?['balance'] as num?)?.toDouble() ??
          (result?['points'] as num?)?.toDouble() ??
          0;
      _latestPoints = balance;
      await sendDeductPointsResult(success: true, balance: balance);
    } catch (e) {
      debugPrint('[JSBridge] deductPoints failed: $e');
      await sendDeductPointsResult(
        success: false,
        balance: _latestPoints ?? _userInfo?.points ?? 0,
      );
    }
  }

  /// Handle `changePoints` — generic H5 point delta.
  Future<void> _handleChangePoints(Map<String, dynamic> data) async {
    final amount = (data['amount'] as num?)?.toDouble() ?? 0;
    final reason = data['reason'] as String? ?? '';
    final requestId = data['requestId']?.toString();
    if (amount == 0) {
      await sendPointsChangeResult(
        success: false,
        balance: _latestPoints ?? _userInfo?.points ?? 0,
        amount: amount,
        requestId: requestId,
      );
      return;
    }

    try {
      final requestData = Map<String, dynamic>.from(data);
      requestData['amount'] = amount;
      requestData['reason'] =
          reason.isNotEmpty ? reason : 'game_points_change';
      final result = await _apiClient.post<Map<String, dynamic>>(
        ApiEndpoints.gamePointsChange(_gameId),
        data: requestData,
      );

      final balance = (result?['balance'] as num?)?.toDouble() ??
          (result?['points'] as num?)?.toDouble() ??
          0;
      final actualAmount = (result?['amount'] as num?)?.toDouble() ?? amount;
      final duplicate = result?['duplicate'] == true;
      _latestPoints = balance;
      await sendPointsChangeResult(
        success: true,
        balance: balance,
        amount: actualAmount,
        requestedAmount: amount,
        duplicate: duplicate,
        message: result?['message']?.toString(),
        requestId: requestId,
      );
    } catch (e) {
      debugPrint('[JSBridge] changePoints failed: $e');
      await sendPointsChangeResult(
        success: false,
        balance: _latestPoints ?? _userInfo?.points ?? 0,
        amount: amount,
        requestId: requestId,
      );
    }
  }

  /// Handle `gameSettle` — game over, record results and award items.
  Future<void> _handleGameSettle(Map<String, dynamic> data) async {
    try {
      final pointsEarned = data['pointsEarned'] ??
          data['points'] ??
          data['coin'] ??
          data['score'];
      await _apiClient.post(
        ApiEndpoints.gameSettle(_gameId),
        data: {
          'rank': data['rank'],
          'pointsEarned': pointsEarned,
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
    if (skinId.isEmpty || cost <= 0) {
      await sendBuySkinResult(success: false, skinId: skinId);
      return;
    }

    try {
      final result = await _apiClient.post<Map<String, dynamic>>(
        ApiEndpoints.gamePointsChange(_gameId),
        data: {
          'amount': -cost.abs(),
          'reason': 'buy_skin:$skinId',
          'skinId': skinId,
        },
      );
      final balance = (result?['balance'] as num?)?.toDouble() ??
          (result?['points'] as num?)?.toDouble();
      if (balance != null) _latestPoints = balance;
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
      _latestPoints = points;
      await _sendToH5('balanceUpdate', {
        'points': points,
        'balance': points,
        'coin': points,
      });
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
