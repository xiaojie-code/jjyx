import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/router/app_router.dart';
import '../../core/network/api_client.dart';
import '../../core/network/api_endpoints.dart';
import '../../core/utils/notification_service.dart';
import '../../core/utils/in_app_notification.dart';
import '../../core/update/app_update_service.dart';
import '../../core/update/update_state.dart';
import 'providers/badge_provider.dart';
import '../chat/providers/chat_provider.dart';
import '../chat/pages/chat_page.dart';
import '../auth/providers/auth_provider.dart';

/// 主页面框架 - 底部 TabBar（消息、联系人、游戏、我的）
class MainShell extends ConsumerStatefulWidget {
  final Widget child;

  const MainShell({super.key, required this.child});

  @override
  ConsumerState<MainShell> createState() => _MainShellState();
}

class _MainShellState extends ConsumerState<MainShell> with WidgetsBindingObserver {
  bool _isAppInForeground = true;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    // 确保用户信息已加载
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (ref.read(authProvider).user == null) {
        ref.read(authProvider.notifier).loadProfile();
      }
      ref.read(badgeProvider.notifier).loadBadges();
      _loadNotificationSettings();
      // 登录后请求通知权限
      NotificationService.instance.requestPermission();
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

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    _isAppInForeground = state == AppLifecycleState.resumed;
  }

  Future<void> _loadNotificationSettings() async {
    try {
      final result = await ref.read(apiClientProvider).get<Map<String, dynamic>>(
        ApiEndpoints.userSettings,
      );
      if (result != null) {
        NotificationService.instance.updateSettings(
          master: result['notificationEnabled'] as bool? ?? true,
          sound: result['notificationSound'] as bool? ?? true,
          popup: result['notificationPopup'] as bool? ?? true,
        );
      }
    } catch (_) {}
  }

  void _onNotificationTap(int conversationId, String title) {
    // 点击通知跳转到对应会话
    if (!mounted) return;
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
          content = msg.content.length > 50 ? '${msg.content.substring(0, 50)}...' : msg.content;
      }
      NotificationService.instance.onNewMessage(
        conversationId: msg.conversationId,
        senderName: senderName,
        content: content,
        avatar: senderAvatar,
        isAppInForeground: _isAppInForeground,
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
    NotificationService.instance.onNewMessage(
      conversationId: -1,
      senderName: title,
      content: content,
      isAppInForeground: _isAppInForeground,
      // 服务通知不弹应用内横幅，仅提示音/后台系统通知
      bannerSuppressed: true,
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

  @override
  Widget build(BuildContext context) {
    final badges = ref.watch(badgeProvider);
    final hasUpdate = ref.watch(updateStateProvider).hasUpdate;

    return Scaffold(
      body: widget.child,
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _currentIndex(context),
        onTap: (index) => _onTap(context, index),
        items: [
          BottomNavigationBarItem(
            icon: _buildBadgeIcon(
                Icons.chat_bubble_outline, badges.unreadMessageCount),
            activeIcon:
                _buildBadgeIcon(Icons.chat_bubble, badges.unreadMessageCount),
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
