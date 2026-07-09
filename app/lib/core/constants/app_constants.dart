/// 应用全局常量
class AppConstants {
  AppConstants._();

  /// API 基础地址（手机调试时通过 --dart-define=API_BASE_URL=http://电脑IP:3001 覆盖）
  static const String apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://localhost:3001',
  );

  /// APK/静态下载地址前缀。生产环境可通过
  /// --dart-define=DOWNLOAD_BASE_URL=http://101.32.252.79 覆盖。
  static const String downloadBaseUrl = String.fromEnvironment(
    'DOWNLOAD_BASE_URL',
    defaultValue: apiBaseUrl,
  );

  /// API 路径前缀
  static const String apiPrefix = '/api';

  /// WebSocket 地址
  static const String wsUrl = String.fromEnvironment(
    'WS_BASE_URL',
    defaultValue: apiBaseUrl,
  );

  static const String saimaWsUrlOverride = String.fromEnvironment(
    'SAIMA_WS_URL',
    defaultValue: '',
  );

  static String get saimaWsUrl {
    if (saimaWsUrlOverride.isNotEmpty) return saimaWsUrlOverride;
    final apiUri = Uri.tryParse(apiBaseUrl);
    if (apiUri != null && apiUri.host.isNotEmpty) {
      final protocol = apiUri.scheme == 'https' ? 'wss' : 'ws';
      final host = apiUri.host.toLowerCase();
      final isLocalHost = host == 'localhost' ||
          host == '127.0.0.1' ||
          host == '::1' ||
          host.startsWith('192.168.') ||
          host.startsWith('10.') ||
          RegExp(r'^172\.(1[6-9]|2[0-9]|3[0-1])\.').hasMatch(host);
      if (isLocalHost) {
        return '$protocol://${apiUri.host}:8080';
      }
      return '$protocol://${apiUri.host}/saima-ws';
    }
    return 'ws://localhost:8080';
  }

  /// Token 存储 key
  static const String mahjongHttpUrlOverride = String.fromEnvironment(
    'MAHJONG_HTTP_URL',
    defaultValue: '',
  );

  static const String mahjongWsUrlOverride = String.fromEnvironment(
    'MAHJONG_WS_URL',
    defaultValue: '',
  );

  static String get mahjongHttpUrl {
    if (mahjongHttpUrlOverride.isNotEmpty) return mahjongHttpUrlOverride;
    final apiUri = Uri.tryParse(apiBaseUrl);
    if (apiUri != null && apiUri.host.isNotEmpty) {
      final protocol = apiUri.scheme == 'https' ? 'https' : 'http';
      return '$protocol://${apiUri.host}:15103';
    }
    return 'http://localhost:15103';
  }

  static String get mahjongWsUrl {
    if (mahjongWsUrlOverride.isNotEmpty) return mahjongWsUrlOverride;
    final apiUri = Uri.tryParse(apiBaseUrl);
    if (apiUri != null && apiUri.host.isNotEmpty) {
      final protocol = apiUri.scheme == 'https' ? 'https' : 'http';
      return '$protocol://${apiUri.host}:42001';
    }
    return 'http://localhost:42001';
  }

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
