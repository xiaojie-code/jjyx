/// 应用全局常量
class AppConstants {
  AppConstants._();

  /// API 基础地址（手机调试时通过 --dart-define=API_BASE_URL=http://电脑IP:3001 覆盖）
  static const String apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://localhost:3001',
  );

  /// API 路径前缀
  static const String apiPrefix = '/api';

  /// WebSocket 地址
  static const String wsUrl = String.fromEnvironment(
    'WS_BASE_URL',
    defaultValue: apiBaseUrl,
  );

  /// Token 存储 key
  static const String tokenKey = 'auth_token';
  static const String refreshTokenKey = 'refresh_token';

  /// 昵称长度限制
  static const int nicknameMinLength = 2;
  static const int nicknameMaxLength = 10;

  /// 分页默认值
  static const int defaultPageSize = 20;

  /// 连接超时时间（毫秒）
  static const int connectTimeout = 15000;

  /// 接收超时时间（毫秒）
  static const int receiveTimeout = 15000;
}
