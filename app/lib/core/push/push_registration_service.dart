import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:package_info_plus/package_info_plus.dart';

import '../network/api_client.dart';
import '../network/api_endpoints.dart';
import '../utils/notification_service.dart';

class PushRegistrationService {
  PushRegistrationService._();

  static final PushRegistrationService instance = PushRegistrationService._();
  static const _channel = MethodChannel('com.example.app/push');

  Future<bool> register(ApiClient api) async {
    if (kIsWeb) return false;

    try {
      final raw = await _channel.invokeMethod<Map<dynamic, dynamic>>(
        'registerVendorPush',
      );
      final info = Map<String, dynamic>.from(raw ?? {});
      final token = info['token']?.toString().trim() ?? '';
      final supported = info['supported'] == true;

      if (!supported || token.isEmpty) {
        NotificationService.instance.updateVendorPushEnabled(false);
        debugPrint('[Push] vendor push token unavailable: $info');
        return false;
      }

      final packageInfo = await PackageInfo.fromPlatform();
      await api.post<Map<String, dynamic>>(
        ApiEndpoints.pushDevice,
        data: {
          'platform': 'android',
          'vendor': info['vendor']?.toString() ?? 'unknown',
          'deviceToken': token,
          'deviceId': info['deviceId']?.toString(),
          'manufacturer': info['manufacturer']?.toString(),
          'model': info['model']?.toString(),
          'appVersion': packageInfo.version,
          'enabled': true,
        },
      );

      NotificationService.instance.updateVendorPushEnabled(true);
      debugPrint('[Push] vendor push registered: ${info['vendor']}');
      return true;
    } catch (error) {
      NotificationService.instance.updateVendorPushEnabled(false);
      debugPrint('[Push] register failed: $error');
      return false;
    }
  }

  Future<Map<String, dynamic>> getDeviceInfo() async {
    if (kIsWeb) return {'supported': false, 'vendor': 'web'};
    try {
      final raw = await _channel.invokeMethod<Map<dynamic, dynamic>>(
        'getPushDeviceInfo',
      );
      return Map<String, dynamic>.from(raw ?? {});
    } catch (_) {
      return {'supported': false, 'vendor': 'unknown'};
    }
  }
}
