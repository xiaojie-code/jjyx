import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:audioplayers/audioplayers.dart';
import 'package:permission_handler/permission_handler.dart';

/// 新消息通知回调：点击通知时调用，携带 conversationId
typedef NotificationTapCallback = void Function(int conversationId, String title);

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
  AudioPlayer? _soundPlayer;
  bool _initialized = false;
  NotificationTapCallback? onTap;
  InAppBannerCallback? onInAppBanner;

  // 用户设置
  bool soundEnabled = true;
  bool popupEnabled = true;
  bool masterEnabled = true;

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
        if (conversationId > 0) {
          onTap?.call(conversationId, title);
        }
      }
    });
  }

  /// 请求通知权限（注册/登录后调用）
  Future<void> requestPermission() async {
    if (kIsWeb) return;
    try {
      final status = await Permission.notification.status;
      if (!status.isGranted) {
        await Permission.notification.request();
      }
    } catch (_) {}
  }

  /// 更新用户设置
  void updateSettings({bool? master, bool? sound, bool? popup}) {
    if (master != null) masterEnabled = master;
    if (sound != null) soundEnabled = sound;
    if (popup != null) popupEnabled = popup;
  }

  /// 收到新消息时调用
  Future<void> onNewMessage({
    required int conversationId,
    required String senderName,
    required String content,
    required bool isAppInForeground,
    String? avatar,
    bool bannerSuppressed = false,
  }) async {
    if (!masterEnabled) return;

    // 播放提示音（前台后台都播放）
    if (soundEnabled) {
      _playSound();
    }

    if (isAppInForeground) {
      // 前台：弹应用内横幅（仿微信）
      if (popupEnabled && !bannerSuppressed) {
        onInAppBanner?.call(
          conversationId: conversationId,
          title: senderName,
          content: content,
          avatar: avatar,
        );
      }
    } else {
      // 后台：系统通知弹窗
      if (popupEnabled && !kIsWeb) {
        _showNativeNotification(
          conversationId: conversationId,
          title: senderName,
          body: content,
        );
      }
    }
  }

  void _playSound() {
    try {
      _soundPlayer ??= AudioPlayer();
      _soundPlayer!.setReleaseMode(ReleaseMode.release);
      _soundPlayer!.play(
        AssetSource('notification.mp3'),
        volume: 0.6,
      ).catchError((_) {});
    } catch (_) {}
  }

  /// 通过 MethodChannel 调用原生显示通知
  void _showNativeNotification({
    required int conversationId,
    required String title,
    required String body,
  }) {
    try {
      _channel.invokeMethod('showNotification', {
        'id': conversationId,
        'title': title,
        'body': body,
        'conversationId': conversationId,
      });
    } catch (_) {}
  }
}
