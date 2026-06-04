import 'dart:io';

import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:package_info_plus/package_info_plus.dart';
import 'package:path_provider/path_provider.dart';

import '../network/api_client.dart';
import '../utils/toast.dart';

class AppVersionInfo {
  const AppVersionInfo({
    required this.versionName,
    required this.versionCode,
    required this.downloadUrl,
    required this.forceUpdate,
    this.changelog,
    this.fileSize,
  });

  final String versionName;
  final int versionCode;
  final String downloadUrl;
  final bool forceUpdate;
  final String? changelog;
  final int? fileSize;

  factory AppVersionInfo.fromJson(Map<String, dynamic> json) {
    return AppVersionInfo(
      versionName: json['versionName']?.toString() ?? '',
      versionCode: int.tryParse(json['versionCode']?.toString() ?? '0') ?? 0,
      downloadUrl: json['downloadUrl']?.toString() ?? '',
      forceUpdate: json['forceUpdate'] == true || json['forceUpdate']?.toString() == '1',
      changelog: json['changelog']?.toString(),
      fileSize: int.tryParse(json['fileSize']?.toString() ?? ''),
    );
  }
}

class AppUpdateService {
  AppUpdateService._();

  static const _installerChannel = MethodChannel('com.example.app/apk_installer');
  static bool _checking = false;
  static bool _dialogShowing = false;

  static Future<void> checkForUpdate(
    BuildContext context,
    WidgetRef ref, {
    bool manual = false,
  }) async {
    if (_checking || _dialogShowing) return;
    // Web 平台不支持 Platform，也不支持 APK 安装，直接跳过
    if (kIsWeb) {
      if (manual && context.mounted) Toast.info(context, '当前平台暂不支持在线安装更新');
      return;
    }
    if (!Platform.isAndroid) {
      if (manual && context.mounted) Toast.info(context, '当前平台暂不支持在线安装更新');
      return;
    }

    _checking = true;
    try {
      final packageInfo = await PackageInfo.fromPlatform();
      final currentCode = int.tryParse(packageInfo.buildNumber) ?? 0;
      final result = await ref.read(apiClientProvider).get<Map<String, dynamic>>(
        '/api/app/version',
        queryParameters: {'platform': 'android'},
      );
      if (!context.mounted) return;
      if (result == null) {
        if (manual) Toast.info(context, '当前已是最新版本');
        return;
      }
      final latest = AppVersionInfo.fromJson(result);
      if (latest.versionCode <= currentCode || latest.downloadUrl.isEmpty) {
        if (manual) Toast.info(context, '当前已是最新版本');
        return;
      }
      await _showUpdateDialog(context, latest);
    } catch (e) {
      if (manual && context.mounted) Toast.error(context, '检查更新失败：$e');
    } finally {
      _checking = false;
    }
  }

  static Future<void> _showUpdateDialog(BuildContext context, AppVersionInfo version) async {
    _dialogShowing = true;
    try {
      await showDialog<void>(
        context: context,
        barrierDismissible: !version.forceUpdate,
        builder: (dialogContext) => PopScope(
          canPop: !version.forceUpdate,
          child: AlertDialog(
            title: Text('发现新版本 v${version.versionName}'),
            content: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (version.changelog?.trim().isNotEmpty == true) ...[
                  const Text('更新内容', style: TextStyle(fontWeight: FontWeight.w600)),
                  const SizedBox(height: 8),
                  Text(version.changelog!.trim()),
                ] else
                  const Text('检测到新版本，建议立即更新。'),
                if (version.fileSize != null && version.fileSize! > 0) ...[
                  const SizedBox(height: 12),
                  Text(
                    '安装包大小：${_formatFileSize(version.fileSize!)}',
                    style: const TextStyle(fontSize: 12, color: Colors.grey),
                  ),
                ],
              ],
            ),
            actions: [
              if (!version.forceUpdate)
                TextButton(
                  onPressed: () => Navigator.pop(dialogContext),
                  child: const Text('稍后再说'),
                ),
              ElevatedButton(
                onPressed: () async {
                  Navigator.pop(dialogContext);
                  await _downloadAndInstall(context, version);
                },
                child: const Text('立即更新'),
              ),
            ],
          ),
        ),
      );
    } finally {
      _dialogShowing = false;
    }
  }

  static Future<void> _downloadAndInstall(BuildContext context, AppVersionInfo version) async {
    final progress = ValueNotifier<double>(0);
    var finished = false;
    if (!context.mounted) return;

    showDialog<void>(
      context: context,
      barrierDismissible: false,
      builder: (dialogContext) => ValueListenableBuilder<double>(
        valueListenable: progress,
        builder: (context, value, _) => AlertDialog(
          title: const Text('正在下载更新'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              LinearProgressIndicator(value: value <= 0 ? null : value),
              const SizedBox(height: 12),
              Text(value <= 0 ? '准备下载...' : '${(value * 100).toStringAsFixed(0)}%'),
            ],
          ),
        ),
      ),
    );

    try {
      final dir = await getTemporaryDirectory();
      final apkPath = '${dir.path}${Platform.pathSeparator}jjyx-update-${version.versionCode}.apk';
      await Dio().download(
        version.downloadUrl,
        apkPath,
        onReceiveProgress: (received, total) {
          if (total > 0) {
            progress.value = received / total;
          }
        },
        options: Options(responseType: ResponseType.bytes, followRedirects: true),
      );
      finished = true;
      if (!context.mounted) return;
      Navigator.of(context, rootNavigator: true).pop();
      if (!context.mounted) return;
      await _installApk(context, apkPath);
    } catch (e) {
      if (!finished && context.mounted) Navigator.of(context, rootNavigator: true).pop();
      if (context.mounted) Toast.error(context, '下载安装包失败：$e');
    } finally {
      progress.dispose();
    }
  }

  static Future<void> _installApk(BuildContext context, String apkPath) async {
    try {
      await _installerChannel.invokeMethod<bool>('installApk', {'path': apkPath});
    } on PlatformException catch (e) {
      if (!context.mounted) return;
      if (e.code == 'permission_required') {
        Toast.info(context, '请允许本应用安装未知应用，授权后再次点击更新');
      } else {
        Toast.error(context, '打开安装器失败：${e.message ?? e.code}');
      }
    } catch (e) {
      if (context.mounted) Toast.error(context, '打开安装器失败：$e');
    }
  }

  static String _formatFileSize(int size) {
    if (size >= 1024 * 1024) {
      return '${(size / 1024 / 1024).toStringAsFixed(1)} MB';
    }
    if (size >= 1024) {
      return '${(size / 1024).toStringAsFixed(1)} KB';
    }
    return '$size B';
  }
}
