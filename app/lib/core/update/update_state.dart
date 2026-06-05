import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// 更新红点状态
class UpdateState {
  /// 服务器最新版本号（0 表示无更新或未检测）
  final int availableVersionCode;

  /// 最新版本名称
  final String availableVersionName;

  /// 用户已查看过的版本号
  final int seenVersionCode;

  const UpdateState({
    this.availableVersionCode = 0,
    this.availableVersionName = '',
    this.seenVersionCode = 0,
  });

  /// 是否显示红点：有新版本 且 用户还没查看过该版本
  bool get hasUpdate =>
      availableVersionCode > 0 && availableVersionCode > seenVersionCode;

  UpdateState copyWith({
    int? availableVersionCode,
    String? availableVersionName,
    int? seenVersionCode,
  }) {
    return UpdateState(
      availableVersionCode: availableVersionCode ?? this.availableVersionCode,
      availableVersionName: availableVersionName ?? this.availableVersionName,
      seenVersionCode: seenVersionCode ?? this.seenVersionCode,
    );
  }
}

class UpdateStateNotifier extends StateNotifier<UpdateState> {
  UpdateStateNotifier() : super(const UpdateState()) {
    _load();
  }

  static const _kSeenVersionKey = 'update_seen_version_code';

  Future<void> _load() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final seen = prefs.getInt(_kSeenVersionKey) ?? 0;
      state = state.copyWith(seenVersionCode: seen);
    } catch (_) {}
  }

  /// 检测到服务器有新版本时调用
  void setAvailable(int versionCode, String versionName) {
    state = state.copyWith(
      availableVersionCode: versionCode,
      availableVersionName: versionName,
    );
  }

  /// 没有新版本时清空
  void clearAvailable() {
    state = state.copyWith(availableVersionCode: 0, availableVersionName: '');
  }

  /// 用户查看后标记为已读（红点消失）
  Future<void> markSeen() async {
    if (state.availableVersionCode <= 0) return;
    final code = state.availableVersionCode;
    state = state.copyWith(seenVersionCode: code);
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setInt(_kSeenVersionKey, code);
    } catch (_) {}
  }
}

final updateStateProvider =
    StateNotifierProvider<UpdateStateNotifier, UpdateState>(
  (ref) => UpdateStateNotifier(),
);
