import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/router/app_router.dart';
import '../../core/network/api_client.dart';
import '../../core/network/api_endpoints.dart';
import '../../core/push/push_registration_service.dart';
import '../../core/utils/notification_service.dart';
import '../../core/utils/in_app_notification.dart';
import '../../core/update/app_update_service.dart';
import '../../core/update/update_state.dart';
import 'providers/badge_provider.dart';
import '../chat/providers/chat_provider.dart';
import '../chat/pages/chat_page.dart';
import '../chat/pages/service_notification_page.dart';
import '../auth/providers/auth_provider.dart';
import '../profile/widgets/daily_sign_in_dialog.dart';

/// 主页面框架 - 底部 TabBar（消息、联系人、游戏、我的）
class MainShell extends ConsumerStatefulWidget {
  final Widget child;

  const MainShell({super.key, required this.child});

  @override
  ConsumerState<MainShell> createState() => _MainShellState();
}

class _MainShellState extends ConsumerState<MainShell>
    with WidgetsBindingObserver {
  static const _platformChannel =
      MethodChannel('com.example.app/notifications');
  bool _isAppInForeground = true;
  bool _notificationGuideShown = false;

  bool get _canUseServiceNotifications =>
      ref.read(authProvider).user != null ||
      ref.read(authProvider).profile != null;

  Future<void> _loadBadgesForCurrentUser() async {
    if (ref.read(authProvider).user == null) {
      await ref.read(authProvider.notifier).loadProfile();
    }
    if (!mounted) return;
    await ref
        .read(badgeProvider.notifier)
        .loadBadges(includeServiceNotifications: _canUseServiceNotifications);
  }

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      _loadBadgesForCurrentUser();
      await Future.delayed(const Duration(milliseconds: 500));
      if (mounted && _isChatListVisible) {
        await maybeShowDailySignInPrompt(context, ref);
      }
      final settings = await _loadNotificationSettings();
      await _ensureMessageAlertPermission(settings: settings);
      await PushRegistrationService.instance.register(
        ref.read(apiClientProvider),
      );
      // 静默检测应用更新（用于"我的"红点提示）
      AppUpdateService.checkSilently(ref);
    });
    // 建立 Socket 连接（先注册监听器，再连接，避免离线消息在监听器注册前到达）
    final socket = ref.read(socketServiceProvider);
    // 监听 Socket 新消息，更新未读数
    socket.addMessageListener(_onNewMessage);
    // 监听好友申请，更新红点
    socket.addFriendRequestListener(_onFriendRequest);
    // 监听服务通知，提示音 + 后台弹窗
    socket.addServiceNotificationListener(_onServiceNotification);
    // 最后再连接（连接成功后会推送离线消息，此时监听器已就绪）
    socket.connect();

    // 设置通知点击回调
    NotificationService.instance.onTap = _onNotificationTap;
    // 设置应用内横幅回调
    NotificationService.instance.onInAppBanner = _showInAppBanner;
  }

  void _showInAppBanner({
    required int conversationId,
    required String title,
    required String content,
    String? avatar,
  }) {
    if (!mounted) return;
    InAppNotification.show(
      context: context,
      title: title,
      content: content,
      avatar: avatar,
      onTap: () => _onNotificationTap(conversationId, title),
    );
  }

  bool get _isChatListVisible {
    try {
      return GoRouterState.of(context).matchedLocation == RoutePaths.chatList;
    } catch (_) {
      return false;
    }
  }

  Future<void> _ensureMessageAlertPermission({
    Map<String, dynamic>? settings,
  }) async {
    if (_notificationGuideShown || !mounted) return;
    _notificationGuideShown = true;
    await _normalizeMessageAlertSettings(settings);
    final granted = await NotificationService.instance.requestPermission();
    final status =
        await NotificationService.instance.getNewMessageNotificationStatus();
    if (!mounted || status['channelId'] == null) return;
    final canAlert = status['canAlert'] == true;
    final canUseFullScreenIntent = status['canUseFullScreenIntent'] != false;
    if (granted && canAlert && canUseFullScreenIntent) return;

    final action = await showDialog<String>(
      context: context,
      barrierDismissible: false,
      builder: (dialogContext) => AlertDialog(
        title: const Text('开启新消息提醒'),
        content: const Text(
          '为了后台新消息能像微信一样弹窗并响铃，请开启系统通知、悬浮通知、声音、锁屏通知，以及强提醒弹窗权限。',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop('later'),
            child: const Text('稍后'),
          ),
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop('channel'),
            child: const Text('通知设置'),
          ),
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop('fullscreen'),
            child: const Text('强提醒设置'),
          ),
        ],
      ),
    );

    if (action == 'channel') {
      await NotificationService.instance.openNewMessageNotificationSettings();
    } else if (action == 'fullscreen') {
      await NotificationService.instance.openFullScreenNotificationSettings();
    }
  }

  Future<void> _normalizeMessageAlertSettings(
    Map<String, dynamic>? settings,
  ) async {
    final shouldEnable = settings == null ||
        settings['notificationEnabled'] != true ||
        settings['notificationSound'] != true ||
        settings['notificationPopup'] != true;
    NotificationService.instance.updateSettings(
      master: true,
      sound: true,
      popup: true,
    );
    if (!shouldEnable) return;
    try {
      await ref.read(apiClientProvider).put(
        ApiEndpoints.userSettings,
        data: {
          'notificationEnabled': true,
          'notificationSound': true,
          'notificationPopup': true,
        },
      );
    } catch (_) {}
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    _isAppInForeground = state == AppLifecycleState.resumed;
    if (_isAppInForeground) {
      NotificationService.instance.stopBackgroundKeepAlive();
      ref.read(socketServiceProvider).setAppForeground(true);
      _loadNotificationSettings().then(_normalizeMessageAlertSettings);
      ref.read(socketServiceProvider).connect();
    } else {
      NotificationService.instance.startBackgroundKeepAlive();
      ref.read(socketServiceProvider).setAppForeground(false);
      ref.read(socketServiceProvider).connect();
    }
  }

  Future<Map<String, dynamic>?> _loadNotificationSettings() async {
    try {
      final result =
          await ref.read(apiClientProvider).get<Map<String, dynamic>>(
                ApiEndpoints.userSettings,
              );
      if (result != null) {
        NotificationService.instance.updateSettings(
          master: result['notificationEnabled'] as bool? ?? true,
          sound: result['notificationSound'] as bool? ?? true,
          popup: result['notificationPopup'] as bool? ?? true,
        );
      }
      return result;
    } catch (_) {}
    return null;
  }

  void _onNotificationTap(int conversationId, String title) {
    // 点击通知跳转到对应会话
    if (!mounted) return;
    if (conversationId == -1) {
      Navigator.of(context, rootNavigator: true).push(MaterialPageRoute(
        builder: (_) => const ServiceNotificationPage(),
      ));
      ref.read(badgeProvider.notifier).clearServiceNotifications();
      return;
    }
    Navigator.of(context, rootNavigator: true).push(MaterialPageRoute(
      builder: (_) => ChatPage(
        conversationId: conversationId,
        title: title,
      ),
    ));
  }

  void _onNewMessage(ChatMessage msg) {
    if (!mounted) return;
    // 只有当用户不在该会话的聊天页面时才增加未读数和推送通知
    final socket = ref.read(socketServiceProvider);
    // 过滤掉自己发的消息（群邀请等 includeSender 消息）
    final myId = ref.read(authProvider).user?.id ?? 0;
    if (myId > 0 && msg.senderId == myId) return;
    if (socket.activeConversationId != msg.conversationId) {
      ref.read(badgeProvider.notifier).incrementUnread();

      // 触发新消息通知（声音+弹窗）
      final senderName = socket.senderNicknameCache[msg.senderId] ?? '新消息';
      final senderAvatar = socket.senderAvatarCache[msg.senderId];
      String content;
      switch (msg.msgType) {
        case 2:
          content = '[语音]';
          break;
        case 4:
          content = '[图片]';
          break;
        case 3:
          content = '[系统消息]';
          break;
        default:
          content = msg.content.length > 50
              ? '${msg.content.substring(0, 50)}...'
              : msg.content;
      }
      NotificationService.instance.onNewMessage(
        conversationId: msg.conversationId,
        senderName: senderName,
        content: content,
        avatar: senderAvatar,
        isAppInForeground: _isAppInForeground,
        bannerSuppressed: _isAppInForeground &&
            _isChatListVisible &&
            socket.activeConversationId == null,
        dedupeKey: msg.id > 0 ? 'message:${msg.id}' : null,
      );
    }
  }

  void _onFriendRequest() {
    if (!mounted) return;
    ref.read(badgeProvider.notifier).incrementFriendRequests();
  }

  /// 收到服务通知（提现/建群/充值申请）：提示音 + 后台系统通知
  void _onServiceNotification(Map<String, dynamic> data) {
    final title = data['title']?.toString() ?? '服务通知';
    final content = data['content']?.toString() ?? '';
    ref.read(badgeProvider.notifier).incrementServiceNotifications();
    NotificationService.instance.onNewMessage(
      conversationId: -1,
      senderName: title,
      content: content,
      isAppInForeground: _isAppInForeground,
      dedupeKey: data['id'] != null
          ? 'service:${data['id']}'
          : 'service:$title:$content',
    );
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    try {
      final socket = ref.read(socketServiceProvider);
      socket.removeMessageListener(_onNewMessage);
      socket.removeFriendRequestListener(_onFriendRequest);
      socket.removeServiceNotificationListener(_onServiceNotification);
    } catch (_) {}
    super.dispose();
  }

  int _currentIndex(BuildContext context) {
    final location = GoRouterState.of(context).matchedLocation;
    if (location.startsWith(RoutePaths.chatList)) return 0;
    if (location.startsWith(RoutePaths.contacts)) return 1;
    if (location.startsWith(RoutePaths.gameHall)) return 2;
    if (location.startsWith(RoutePaths.shop)) return 3;
    if (location.startsWith(RoutePaths.profile)) return 4;
    return 0;
  }

  void _onTap(BuildContext context, int index) {
    switch (index) {
      case 0:
        context.go(RoutePaths.chatList);
        break;
      case 1:
        context.go(RoutePaths.contacts);
        break;
      case 2:
        context.go(RoutePaths.gameHall);
        break;
      case 3:
        context.go(RoutePaths.shop);
        break;
      case 4:
        context.go(RoutePaths.profile);
        break;
    }
  }

  Future<void> _moveAppToBack() async {
    try {
      await _platformChannel.invokeMethod('moveTaskToBack');
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    final badges = ref.watch(badgeProvider);
    final hasUpdate = ref.watch(updateStateProvider).hasUpdate;

    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, result) async {
        if (didPop) return;
        if (_currentIndex(context) != 0) {
          context.go(RoutePaths.chatList);
          return;
        }
        await _moveAppToBack();
      },
      child: Scaffold(
        body: widget.child,
        bottomNavigationBar: BottomNavigationBar(
          currentIndex: _currentIndex(context),
          onTap: (index) => _onTap(context, index),
          items: [
            BottomNavigationBarItem(
              icon: _buildBadgeIcon(
                  Icons.chat_bubble_outline, badges.messageTabCount),
              activeIcon:
                  _buildBadgeIcon(Icons.chat_bubble, badges.messageTabCount),
              label: '消息',
            ),
            BottomNavigationBarItem(
              icon: _buildDotIcon(
                  Icons.people_outline, badges.pendingFriendRequests > 0),
              activeIcon:
                  _buildDotIcon(Icons.people, badges.pendingFriendRequests > 0),
              label: '联系人',
            ),
            const BottomNavigationBarItem(
              icon: Icon(Icons.sports_esports_outlined),
              activeIcon: Icon(Icons.sports_esports),
              label: '游戏',
            ),
            const BottomNavigationBarItem(
              icon: Icon(Icons.store_outlined),
              activeIcon: Icon(Icons.store),
              label: '商城',
            ),
            BottomNavigationBarItem(
              icon: _buildDotIcon(Icons.person_outline, hasUpdate),
              activeIcon: _buildDotIcon(Icons.person, hasUpdate),
              label: '我的',
            ),
          ],
        ),
      ),
    );
  }

  /// 带数字角标的图标
  Widget _buildBadgeIcon(IconData icon, int count) {
    if (count <= 0) return Icon(icon);
    return Stack(
      clipBehavior: Clip.none,
      children: [
        Icon(icon),
        Positioned(
          right: -6,
          top: -4,
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
            decoration: BoxDecoration(
              color: Colors.red,
              borderRadius: BorderRadius.circular(10),
            ),
            constraints: const BoxConstraints(minWidth: 16, minHeight: 14),
            child: Text(
              count > 99 ? '99+' : '$count',
              style: const TextStyle(
                  color: Colors.white,
                  fontSize: 10,
                  fontWeight: FontWeight.bold),
              textAlign: TextAlign.center,
            ),
          ),
        ),
      ],
    );
  }

  /// 带红点的图标
  Widget _buildDotIcon(IconData icon, bool show) {
    if (!show) return Icon(icon);
    return Stack(
      clipBehavior: Clip.none,
      children: [
        Icon(icon),
        Positioned(
          right: -2,
          top: -2,
          child: Container(
            width: 8,
            height: 8,
            decoration: const BoxDecoration(
              color: Colors.red,
              shape: BoxShape.circle,
            ),
          ),
        ),
      ],
    );
  }
}
