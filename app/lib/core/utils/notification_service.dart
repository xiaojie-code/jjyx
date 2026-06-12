import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:permission_handler/permission_handler.dart';

/// 新消息通知回调：点击通知时调用，携带 conversationId
typedef NotificationTapCallback = void Function(
    int conversationId, String title);

/// 应用内横幅回调：在前台收到非当前会话消息时调用
typedef InAppBannerCallback = void Function({
  required int conversationId,
  required String title,
  required String content,
  String? avatar,
});

/// 新消息通知服务
/// - App 前台：播放提示音 + 应用内横幅（非当前会话）
/// - App 后台：播放提示音 + 原生通知弹窗
class NotificationService {
  NotificationService._();
  static final NotificationService instance = NotificationService._();

  static const _channel = MethodChannel('com.example.app/notifications');
  bool _initialized = false;
  InAppBannerCallback? onInAppBanner;
  NotificationTapCallback? _onTap;
  ({int conversationId, String title})? _pendingTap;
  String? _lastNotificationKey;
  DateTime? _lastNotificationAt;
  int _nativeNotificationCounter = 0;

  // 用户设置
  bool soundEnabled = true;
  bool popupEnabled = true;
  bool masterEnabled = true;
  bool vendorPushEnabled = false;

  NotificationTapCallback? get onTap => _onTap;

  set onTap(NotificationTapCallback? callback) {
    _onTap = callback;
    _flushPendingTap();
  }

  /// 初始化通知服务
  Future<void> init() async {
    if (_initialized) return;
    _initialized = true;

    // 监听原生通知点击回调
    _channel.setMethodCallHandler((call) async {
      if (call.method == 'onNotificationTap') {
        final args = Map<String, dynamic>.from(call.arguments as Map);
        final conversationId = args['conversationId'] as int? ?? 0;
        final title = args['title'] as String? ?? '聊天';
        if (conversationId != 0) {
          _dispatchTap(conversationId, title);
        }
      }
    });

    if (!kIsWeb) {
      try {
        final args = await _channel.invokeMethod<Map<dynamic, dynamic>>(
          'getInitialNotificationTap',
        );
        if (args != null) {
          final conversationId =
              int.tryParse(args['conversationId']?.toString() ?? '') ?? 0;
          final title = args['title']?.toString() ?? '聊天';
          if (conversationId != 0) {
            _dispatchTap(conversationId, title);
          }
        }
      } catch (_) {}
    }
  }

  /// 请求通知权限（注册/登录后调用）
  Future<bool> requestPermission() async {
    if (kIsWeb) return true;
    try {
      final status = await Permission.notification.status;
      if (!status.isGranted) {
        final result = await Permission.notification.request();
        if (!result.isGranted) return false;
      }
      return areNotificationsEnabled();
    } catch (_) {
      return false;
    }
  }

  Future<bool> areNotificationsEnabled() async {
    if (kIsWeb) return true;
    try {
      final enabled = await _channel.invokeMethod<bool>(
        'areNotificationsEnabled',
      );
      return enabled ?? true;
    } catch (_) {
      return true;
    }
  }

  Future<void> openNotificationSettings() async {
    if (kIsWeb) return;
    try {
      await _channel.invokeMethod('openNotificationSettings');
    } catch (_) {}
  }

  Future<void> openNewMessageNotificationSettings() async {
    if (kIsWeb) return;
    try {
      await _channel.invokeMethod('openNewMessageNotificationSettings');
    } catch (_) {
      await openNotificationSettings();
    }
  }

  Future<void> openFullScreenNotificationSettings() async {
    if (kIsWeb) return;
    try {
      await _channel.invokeMethod('openFullScreenNotificationSettings');
    } catch (_) {
      await openNotificationSettings();
    }
  }

  Future<void> showTestNotification() async {
    if (kIsWeb) return;
    try {
      await _channel.invokeMethod('showTestNotification');
    } catch (_) {}
  }

  Future<Map<String, dynamic>> getNewMessageNotificationStatus() async {
    if (kIsWeb) return {'enabled': true, 'canAlert': true};
    try {
      final result =
          await _channel.invokeMethod<Map<dynamic, dynamic>>(
        'getNewMessageNotificationStatus',
      );
      return Map<String, dynamic>.from(result ?? {});
    } catch (_) {
      final enabled = await areNotificationsEnabled();
      return {'enabled': enabled, 'canAlert': enabled};
    }
  }

  Future<void> startBackgroundKeepAlive() async {
    if (kIsWeb) return;
    try {
      await _channel.invokeMethod('startNotificationKeepAlive');
    } catch (_) {}
  }

  Future<void> stopBackgroundKeepAlive() async {
    if (kIsWeb) return;
    try {
      await _channel.invokeMethod('stopNotificationKeepAlive');
    } catch (_) {}
  }

  /// 更新用户设置
  void updateSettings({bool? master, bool? sound, bool? popup}) {
    if (master != null) masterEnabled = master;
    if (sound != null) soundEnabled = sound;
    if (popup != null) popupEnabled = popup;
  }

  void updateVendorPushEnabled(bool enabled) {
    vendorPushEnabled = enabled;
  }

  /// 收到新消息时调用
  Future<void> onNewMessage({
    required int conversationId,
    required String senderName,
    required String content,
    required bool isAppInForeground,
    String? avatar,
    bool bannerSuppressed = false,
    String? dedupeKey,
  }) async {
    if (!masterEnabled) return;

    final title = senderName.trim().isEmpty ? '新消息' : senderName.trim();
    final body = content.trim().isEmpty ? '你收到了一条新消息' : content.trim();
    if (_isDuplicateNotification(dedupeKey ?? '$conversationId|$title|$body')) {
      return;
    }

    if (isAppInForeground) {
      if (soundEnabled) {
        await _playNotificationSound();
      }
      // 前台：弹应用内横幅（仿微信）
      if (popupEnabled && !bannerSuppressed) {
        onInAppBanner?.call(
          conversationId: conversationId,
          title: title,
          content: body,
          avatar: avatar,
        );
      }
    } else {
      // 后台：系统通知弹窗
      if (vendorPushEnabled) return;
      if (popupEnabled && !kIsWeb) {
        await _showNativeNotification(
          conversationId: conversationId,
          title: title,
          body: body,
          playSound: soundEnabled,
        );
      } else if (soundEnabled) {
        await _playNotificationSound();
      }
    }
  }

  bool _isDuplicateNotification(String key) {
    final now = DateTime.now();
    final lastAt = _lastNotificationAt;
    if (_lastNotificationKey == key &&
        lastAt != null &&
        now.difference(lastAt).inMilliseconds < 1500) {
      return true;
    }
    _lastNotificationKey = key;
    _lastNotificationAt = now;
    return false;
  }

  Future<void> _playNotificationSound() async {
    if (kIsWeb) return;
    try {
      await _channel.invokeMethod('playNotificationSound');
    } catch (_) {}
  }

  /// 通过 MethodChannel 调用原生显示通知
  Future<void> _showNativeNotification({
    required int conversationId,
    required String title,
    required String body,
    required bool playSound,
  }) async {
    try {
      await _channel.invokeMethod('showNotification', {
        'id': _nextNativeNotificationId(),
        'title': title,
        'body': body,
        'conversationId': conversationId,
        'playSound': playSound,
      });
    } catch (_) {}
  }

  int _nextNativeNotificationId() {
    _nativeNotificationCounter =
        (_nativeNotificationCounter + 1).remainder(100000);
    final now = DateTime.now().millisecondsSinceEpoch.remainder(2000000000);
    return now + _nativeNotificationCounter;
  }

  void _dispatchTap(int conversationId, String title) {
    final callback = _onTap;
    if (callback == null) {
      _pendingTap = (conversationId: conversationId, title: title);
      return;
    }
    callback(conversationId, title);
  }

  void _flushPendingTap() {
    final pending = _pendingTap;
    final callback = _onTap;
    if (pending == null || callback == null) return;
    _pendingTap = null;
    callback(pending.conversationId, pending.title);
  }
}
