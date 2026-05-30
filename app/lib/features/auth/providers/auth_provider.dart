import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/api_client.dart';
import '../../../core/network/api_endpoints.dart';
import '../../../core/storage/token_storage.dart';
import '../../chat/providers/chat_provider.dart';
import '../models/user_model.dart';

class AuthState {
  final UserModel? user;
  final ProfileModel? profile;
  final bool isLoading;
  final String? error;

  const AuthState(
      {this.user, this.profile, this.isLoading = false, this.error});

  AuthState copyWith(
      {UserModel? user,
      ProfileModel? profile,
      bool? isLoading,
      String? error}) {
    return AuthState(
      user: user ?? this.user,
      profile: profile ?? this.profile,
      isLoading: isLoading ?? this.isLoading,
      error: error,
    );
  }
}

class AuthNotifier extends StateNotifier<AuthState> {
  final ApiClient _api;
  final SocketService _socketService;

  AuthNotifier(this._api, this._socketService) : super(const AuthState());

  Future<bool> register(
      String account, String password, String? inviteCode) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final result = await _api.post<Map<String, dynamic>>(
        ApiEndpoints.register,
        data: {
          'account': account,
          'password': password,
          if (inviteCode != null && inviteCode.isNotEmpty)
            'inviteCode': inviteCode,
        },
      );
      final token = result?['token'] as String?;
      if (token != null) {
        _socketService.disconnect();
        await TokenStorage.setToken(token);
      }
      final userData = result?['user'] as Map<String, dynamic>?;
      final user = userData != null ? UserModel.fromJson(userData) : null;
      state = AuthState(user: user);
      if (token != null) _socketService.connect();
      return true;
    } catch (e) {
      String message = '注册失败，请稍后重试';
      final errStr = e.toString();
      if (errStr.contains('已存在')) {
        message = '账号已存在，请换一个';
      } else if (errStr.contains('邀请码不存在')) {
        message = '邀请码不存在，请核对后重试';
      } else if (errStr.contains('邀请码格式不正确')) {
        message = '邀请码格式不正确，应为8位大写字母和数字组合';
      } else if (errStr.contains('Bad Request') || errStr.contains('400')) {
        message = '账号至少4位，密码至少6位';
      } else if (errStr.contains('维护中')) {
        message = '系统维护中，请稍后再试';
      } else if (errStr.contains('连接') ||
          errStr.contains('timeout') ||
          errStr.contains('网络')) {
        message = '网络连接失败，请检查网络';
      }
      state = state.copyWith(isLoading: false, error: message);
      return false;
    }
  }

  Future<bool> login(String account, String password) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final result = await _api.post<Map<String, dynamic>>(
        ApiEndpoints.login,
        data: {'account': account, 'password': password},
      );
      final token = result?['token'] as String?;
      if (token != null) {
        _socketService.disconnect();
        await TokenStorage.setToken(token);
      }
      final userData = result?['user'] as Map<String, dynamic>?;
      final user = userData != null ? UserModel.fromJson(userData) : null;
      state = AuthState(user: user);
      if (token != null) _socketService.connect();
      return true;
    } catch (e) {
      String message = '登录失败，请稍后重试';
      final errStr = e.toString();
      if (errStr.contains('账号不存在')) {
        message = '账号不存在，请核对后重试';
      } else if (errStr.contains('密码错误')) {
        message = '密码错误，请重新输入';
      } else if (errStr.contains('Unauthorized')) {
        message = '账号或密码错误';
      } else if (errStr.contains('已被禁用')) {
        message = '账号已被禁用，请联系管理员';
      } else if (errStr.contains('维护中')) {
        message = '系统维护中，请稍后再试';
      } else if (errStr.contains('连接') ||
          errStr.contains('timeout') ||
          errStr.contains('网络')) {
        message = '网络连接失败，请检查网络';
      }
      state = state.copyWith(isLoading: false, error: message);
      return false;
    }
  }

  Future<void> logout() async {
    _socketService.disconnect();
    await TokenStorage.clearTokens();
    state = const AuthState();
  }

  Future<void> loadProfile() async {
    try {
      final result = await _api.get<Map<String, dynamic>>(ApiEndpoints.me);
      if (result != null) {
        final profile = ProfileModel.fromJson(result);
        state = AuthState(user: profile.user, profile: profile);
      }
    } catch (_) {}
  }
}

final authProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  return AuthNotifier(
      ref.read(apiClientProvider), ref.read(socketServiceProvider));
});
