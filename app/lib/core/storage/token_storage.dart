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
    return await _prefs?.setString(AppConstants.refreshTokenKey, token) ??
        false;
  }

  /// 仅在用户主动勾选并成功登录后保存登录页凭据。
  static String? getRememberedLoginAccount() {
    return _prefs?.getString(AppConstants.rememberedLoginAccountKey);
  }

  static String? getRememberedLoginPassword() {
    return _prefs?.getString(AppConstants.rememberedLoginPasswordKey);
  }

  static Future<void> saveRememberedLogin(
    String account,
    String password,
  ) async {
    await _prefs?.setString(AppConstants.rememberedLoginAccountKey, account);
    await _prefs?.setString(AppConstants.rememberedLoginPasswordKey, password);
  }

  static Future<void> clearRememberedLogin() async {
    await _prefs?.remove(AppConstants.rememberedLoginAccountKey);
    await _prefs?.remove(AppConstants.rememberedLoginPasswordKey);
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
