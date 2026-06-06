import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/api_client.dart';

class BadgeState {
  final int unreadMessageCount;
  final int pendingFriendRequests;
  final int serviceNotificationCount;

  const BadgeState({
    this.unreadMessageCount = 0,
    this.pendingFriendRequests = 0,
    this.serviceNotificationCount = 0,
  });

  int get messageTabCount => unreadMessageCount + serviceNotificationCount;

  BadgeState copyWith({
    int? unreadMessageCount,
    int? pendingFriendRequests,
    int? serviceNotificationCount,
  }) {
    return BadgeState(
      unreadMessageCount: unreadMessageCount ?? this.unreadMessageCount,
      pendingFriendRequests:
          pendingFriendRequests ?? this.pendingFriendRequests,
      serviceNotificationCount:
          serviceNotificationCount ?? this.serviceNotificationCount,
    );
  }
}

class BadgeNotifier extends StateNotifier<BadgeState> {
  final ApiClient _api;

  BadgeNotifier(this._api) : super(const BadgeState());

  /// 从服务器加载未读数
  Future<void> loadBadges() async {
    try {
      final result = await _api.get<Map<String, dynamic>>('/api/social/badges');
      if (result != null) {
        state = state.copyWith(
          unreadMessageCount: result['unreadMessages'] as int? ?? 0,
          pendingFriendRequests: result['pendingRequests'] as int? ?? 0,
        );
      }
      await loadServiceNotifications();
    } catch (_) {
      // 接口失败时不影响使用，静默处理
    }
  }

  Future<void> loadServiceNotifications() async {
    try {
      final result = await _api
          .get<Map<String, dynamic>>('/api/notifications/unread-count');
      state = state.copyWith(
        serviceNotificationCount: result?['count'] as int? ?? 0,
      );
    } catch (_) {}
  }

  /// 收到新消息时增加未读数
  void incrementUnread() {
    state = state.copyWith(unreadMessageCount: state.unreadMessageCount + 1);
  }

  /// 查看消息后减少未读数
  void decrementUnread(int count) {
    final newCount = state.unreadMessageCount - count;
    state = state.copyWith(unreadMessageCount: newCount < 0 ? 0 : newCount);
  }

  /// 清除所有消息未读
  void clearUnread() {
    state = state.copyWith(unreadMessageCount: 0);
  }

  /// 直接设置未读消息数
  void setUnreadCount(int count) {
    state = state.copyWith(unreadMessageCount: count);
  }

  void setServiceNotificationCount(int count) {
    state = state.copyWith(serviceNotificationCount: count);
  }

  void incrementServiceNotifications() {
    state = state.copyWith(
      serviceNotificationCount: state.serviceNotificationCount + 1,
    );
  }

  void clearServiceNotifications() {
    state = state.copyWith(serviceNotificationCount: 0);
  }

  /// 收到新好友申请
  void incrementFriendRequests() {
    state =
        state.copyWith(pendingFriendRequests: state.pendingFriendRequests + 1);
  }

  /// 查看好友申请后清除红点
  void clearFriendRequests() {
    state = state.copyWith(pendingFriendRequests: 0);
  }
}

final badgeProvider = StateNotifierProvider<BadgeNotifier, BadgeState>((ref) {
  final api = ref.read(apiClientProvider);
  return BadgeNotifier(api);
});
