import 'package:flutter/scheduler.dart';
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

  bool _sameState(BadgeState a, BadgeState b) {
    return a.unreadMessageCount == b.unreadMessageCount &&
        a.pendingFriendRequests == b.pendingFriendRequests &&
        a.serviceNotificationCount == b.serviceNotificationCount;
  }

  void _update(BadgeState Function(BadgeState current) buildNext) {
    void apply() {
      if (!mounted) return;
      final next = buildNext(state);
      if (_sameState(state, next)) return;
      state = next;
    }

    final phase = SchedulerBinding.instance.schedulerPhase;
    if (phase == SchedulerPhase.idle ||
        phase == SchedulerPhase.postFrameCallbacks) {
      apply();
      return;
    }

    SchedulerBinding.instance.addPostFrameCallback((_) => apply());
  }

  /// 从服务器加载未读数
  Future<void> loadBadges({bool includeServiceNotifications = false}) async {
    try {
      final result = await _api.get<Map<String, dynamic>>('/api/social/badges');
      if (result != null) {
        _update((current) => current.copyWith(
              unreadMessageCount: result['unreadMessages'] as int? ?? 0,
              pendingFriendRequests: result['pendingRequests'] as int? ?? 0,
            ));
      }
      if (includeServiceNotifications) {
        await loadServiceNotifications();
      } else {
        _update((current) => current.copyWith(serviceNotificationCount: 0));
      }
    } catch (_) {
      if (!includeServiceNotifications) {
        _update((current) => current.copyWith(serviceNotificationCount: 0));
      }
      // 接口失败时不影响使用，静默处理
    }
  }

  Future<void> loadServiceNotifications() async {
    try {
      final result = await _api
          .get<Map<String, dynamic>>('/api/notifications/unread-count');
      _update((current) => current.copyWith(
            serviceNotificationCount: result?['count'] as int? ?? 0,
          ));
    } catch (_) {}
  }

  /// 收到新消息时增加未读数
  void incrementUnread() {
    _update((current) => current.copyWith(
          unreadMessageCount: current.unreadMessageCount + 1,
        ));
  }

  /// 查看消息后减少未读数
  void decrementUnread(int count) {
    _update((current) {
      final newCount = current.unreadMessageCount - count;
      return current.copyWith(unreadMessageCount: newCount < 0 ? 0 : newCount);
    });
  }

  /// 清除所有消息未读
  void clearUnread() {
    _update((current) => current.copyWith(unreadMessageCount: 0));
  }

  /// 直接设置未读消息数
  void setUnreadCount(int count) {
    _update((current) =>
        current.copyWith(unreadMessageCount: count < 0 ? 0 : count));
  }

  void setServiceNotificationCount(int count) {
    _update((current) =>
        current.copyWith(serviceNotificationCount: count < 0 ? 0 : count));
  }

  void incrementServiceNotifications() {
    _update((current) => current.copyWith(
          serviceNotificationCount: current.serviceNotificationCount + 1,
        ));
  }

  void clearServiceNotifications() {
    _update((current) => current.copyWith(serviceNotificationCount: 0));
  }

  /// 收到新好友申请
  void incrementFriendRequests() {
    _update((current) => current.copyWith(
          pendingFriendRequests: current.pendingFriendRequests + 1,
        ));
  }

  /// 查看好友申请后清除红点
  void clearFriendRequests() {
    _update((current) => current.copyWith(pendingFriendRequests: 0));
  }
}

final badgeProvider = StateNotifierProvider<BadgeNotifier, BadgeState>((ref) {
  final api = ref.read(apiClientProvider);
  return BadgeNotifier(api);
});
