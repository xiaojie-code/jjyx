import 'package:shared_preferences/shared_preferences.dart';
import '../constants/app_constants.dart';

/// Token 本地存储管理
class TokenStorage {
  TokenStorage._();

  static SharedPreferences? _prefs;

  static Future<void> init() async {
    _prefs = await SharedPreferences.getInstance();
  }

  /// 获取 access token
  static String? getToken() {
    return _prefs?.getString(AppConstants.tokenKey);
  }

  /// 保存 access token
  static Future<bool> setToken(String token) async {
    return await _prefs?.setString(AppConstants.tokenKey, token) ?? false;
  }

  /// 获取 refresh token
  static String? getRefreshToken() {
    return _prefs?.getString(AppConstants.refreshTokenKey);
  }

  /// 保存 refresh token
  static Future<bool> setRefreshToken(String token) async {
    return await _prefs?.setString(AppConstants.refreshTokenKey, token) ?? false;
  }

  /// 清除所有 token（退出登录时调用）
  static Future<void> clearTokens() async {
    await _prefs?.remove(AppConstants.tokenKey);
    await _prefs?.remove(AppConstants.refreshTokenKey);
  }

  /// 是否已登录
  static bool get isLoggedIn {
    final token = getToken();
    return token != null && token.isNotEmpty;
  }
}
