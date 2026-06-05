import 'dart:async';
import 'dart:io';

import 'package:crypto/crypto.dart';
import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:package_info_plus/package_info_plus.dart';
import 'package:path_provider/path_provider.dart';

import '../network/api_client.dart';
import '../utils/toast.dart';
import 'update_state.dart';

class AppVersionInfo {
  const AppVersionInfo({
    required this.versionName,
    required this.versionCode,
    required this.downloadUrl,
    required this.forceUpdate,
    this.changelog,
    this.fileSize,
    this.fileMd5,
  });

  final String versionName;
  final int versionCode;
  final String downloadUrl;
  final bool forceUpdate;
  final String? changelog;
  final int? fileSize;
  final String? fileMd5;

  factory AppVersionInfo.fromJson(Map<String, dynamic> json) {
    return AppVersionInfo(
      versionName: json['versionName']?.toString() ?? '',
      versionCode: int.tryParse(json['versionCode']?.toString() ?? '0') ?? 0,
      downloadUrl: json['downloadUrl']?.toString() ?? '',
      forceUpdate: json['forceUpdate'] == true || json['forceUpdate']?.toString() == '1',
      changelog: json['changelog']?.toString(),
      fileSize: int.tryParse(json['fileSize']?.toString() ?? ''),
      fileMd5: json['fileMd5']?.toString().trim().toLowerCase(),
    );
  }
}

class AppUpdateService {
  AppUpdateService._();

  static const _installerChannel = MethodChannel('com.example.app/apk_installer');
  static const _notifChannel = MethodChannel('com.example.app/notifications');
  static bool _checking = false;
  static bool _dialogShowing = false;
  // 最大自动重试次数（断点续传重试）
  static const int _maxRetries = 3;

  /// 静默检测更新（用于红点提示），不弹任何弹窗
  static Future<void> checkSilently(WidgetRef ref) async {
    if (kIsWeb || !Platform.isAndroid) return;
    try {
      final packageInfo = await PackageInfo.fromPlatform();
      final currentCode = int.tryParse(packageInfo.buildNumber) ?? 0;
      final result = await ref.read(apiClientProvider).get<Map<String, dynamic>>(
        '/api/app/version',
        queryParameters: {'platform': 'android'},
      );
      if (result == null) {
        ref.read(updateStateProvider.notifier).clearAvailable();
        return;
      }
      final latest = AppVersionInfo.fromJson(result);
      if (latest.versionCode > currentCode && latest.downloadUrl.isNotEmpty) {
        ref
            .read(updateStateProvider.notifier)
            .setAvailable(latest.versionCode, latest.versionName);
      } else {
        ref.read(updateStateProvider.notifier).clearAvailable();
      }
    } catch (_) {
      // 静默检测失败不打扰用户
    }
  }

  static Future<void> checkForUpdate(
    BuildContext context,
    WidgetRef ref, {
    bool manual = false,
  }) async {
    if (_checking || _dialogShowing) return;
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
        ref.read(updateStateProvider.notifier).clearAvailable();
        if (manual) Toast.info(context, '当前已是最新版本');
        return;
      }
      final latest = AppVersionInfo.fromJson(result);
      if (latest.versionCode <= currentCode || latest.downloadUrl.isEmpty) {
        ref.read(updateStateProvider.notifier).clearAvailable();
        if (manual) Toast.info(context, '当前已是最新版本');
        return;
      }
      // 更新红点状态
      ref
          .read(updateStateProvider.notifier)
          .setAvailable(latest.versionCode, latest.versionName);
      await _showUpdateDialog(context, latest);
    } catch (e) {
      if (manual && context.mounted) {
        Toast.error(context, '检查更新失败，请检查网络后重试');
      }
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

  /// APK 本地保存路径（按版本号命名，便于复用）
  static Future<String> _apkPath(AppVersionInfo version) async {
    final dir = await getTemporaryDirectory();
    return '${dir.path}${Platform.pathSeparator}jjyx-update-${version.versionCode}.apk';
  }

  static Future<void> _downloadAndInstall(BuildContext context, AppVersionInfo version) async {
    final apkPath = await _apkPath(version);

    // 1) 复用已下载的完整安装包：如果本地已有同版本且 MD5 校验通过，直接安装
    if (await _isCachedApkValid(apkPath, version)) {
      if (!context.mounted) return;
      await _installApk(context, apkPath);
      return;
    }

    final progress = ValueNotifier<double>(0);
    final statusText = ValueNotifier<String>('准备下载...');
    var finished = false;
    var cancelled = false;
    var cancelToken = CancelToken();
    if (!context.mounted) return;

    showDialog<void>(
      context: context,
      barrierDismissible: false,
      builder: (dialogContext) => PopScope(
        canPop: false,
        child: AlertDialog(
          title: const Text('正在下载更新'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              ValueListenableBuilder<double>(
                valueListenable: progress,
                builder: (context, value, _) =>
                    LinearProgressIndicator(value: value <= 0 ? null : value),
              ),
              const SizedBox(height: 12),
              ValueListenableBuilder<String>(
                valueListenable: statusText,
                builder: (context, text, _) => Text(text),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () {
                cancelled = true;
                cancelToken.cancel('用户取消');
                _cancelDownloadNotification();
                Navigator.pop(dialogContext);
              },
              child: const Text('取消'),
            ),
          ],
        ),
      ),
    );

    Object? lastError;
    // 2) 失败自动重试 + 3) 断点续传
    for (var attempt = 1; attempt <= _maxRetries && !cancelled; attempt++) {
      try {
        if (attempt > 1) {
          statusText.value = '网络异常，正在重试（$attempt/$_maxRetries）...';
          await Future.delayed(Duration(seconds: attempt));
          cancelToken = CancelToken(); // 重试需要新的 token
        }
        _showDownloadNotification(indeterminate: true, progress: 0);
        await _resumableDownload(
          version: version,
          savePath: apkPath,
          cancelToken: cancelToken,
          onProgress: (value) {
            progress.value = value;
            _showDownloadNotification(progress: (value * 100).round());
          },
          onStatus: (text) => statusText.value = text,
        );
        // 4) 文件校验
        statusText.value = '校验安装包...';
        if (!await _verifyApk(apkPath, version)) {
          // 校验失败，删除损坏文件，重试
          await _safeDelete(apkPath);
          lastError = const FormatException('安装包校验失败');
          continue;
        }
        finished = true;
        lastError = null;
        break;
      } catch (e) {
        lastError = e;
        if (cancelled || (e is DioException && CancelToken.isCancel(e))) {
          break;
        }
        // 继续下一次重试
      }
    }

    _cancelDownloadNotification();
    progress.dispose();
    statusText.dispose();

    if (cancelled) return;

    if (!finished) {
      if (context.mounted) {
        Navigator.of(context, rootNavigator: true).pop();
      }
      if (context.mounted && lastError != null) {
        await _showDownloadErrorDialog(context, version, _friendlyDownloadError(lastError));
      }
      return;
    }

    if (!context.mounted) return;
    Navigator.of(context, rootNavigator: true).pop();
    if (!context.mounted) return;
    await _installApk(context, apkPath);
  }

  /// 断点续传下载：若本地已有部分文件，用 Range 头从断点继续
  static Future<void> _resumableDownload({
    required AppVersionInfo version,
    required String savePath,
    required CancelToken cancelToken,
    required void Function(double) onProgress,
    required void Function(String) onStatus,
  }) async {
    final dio = Dio();
    final file = File(savePath);
    int downloaded = 0;
    if (await file.exists()) {
      downloaded = await file.length();
      // 如果已下载大小已达到或超过总大小，说明可能是残留，重新下
      if (version.fileSize != null &&
          version.fileSize! > 0 &&
          downloaded >= version.fileSize!) {
        await _safeDelete(savePath);
        downloaded = 0;
      }
    }

    final total = version.fileSize ?? 0;
    onStatus(downloaded > 0 ? '继续下载...' : '开始下载...');

    final raf = await file.open(mode: FileMode.writeOnlyAppend);
    try {
      final response = await dio.get<ResponseBody>(
        version.downloadUrl,
        cancelToken: cancelToken,
        options: Options(
          responseType: ResponseType.stream,
          followRedirects: true,
          headers: downloaded > 0 ? {'Range': 'bytes=$downloaded-'} : null,
          // 2xx 都接受（200 完整 / 206 断点续传）
          validateStatus: (status) => status != null && status < 400,
        ),
      );

      // 如果服务器不支持断点（返回 200 而非 206），从头写
      if (downloaded > 0 && response.statusCode == 200) {
        await raf.close();
        await _safeDelete(savePath);
        downloaded = 0;
        return _resumableDownload(
          version: version,
          savePath: savePath,
          cancelToken: cancelToken,
          onProgress: onProgress,
          onStatus: onStatus,
        );
      }

      var received = downloaded;
      final completer = Completer<void>();
      final stream = response.data!.stream;
      late StreamSubscription sub;
      sub = stream.listen(
        (chunk) async {
          sub.pause();
          try {
            await raf.writeFrom(chunk);
            received += chunk.length;
            if (total > 0) {
              onProgress(received / total);
              onStatus('已下载 ${(received / total * 100).toStringAsFixed(0)}%');
            } else {
              onStatus('已下载 ${_formatFileSize(received)}');
            }
            sub.resume();
          } catch (e) {
            sub.cancel();
            if (!completer.isCompleted) completer.completeError(e);
          }
        },
        onDone: () {
          if (!completer.isCompleted) completer.complete();
        },
        onError: (e) {
          if (!completer.isCompleted) completer.completeError(e);
        },
        cancelOnError: true,
      );
      await completer.future;
    } finally {
      await raf.close();
    }
  }

  /// 校验已下载安装包：优先校验 MD5，无 MD5 则校验文件大小
  static Future<bool> _verifyApk(String path, AppVersionInfo version) async {
    final file = File(path);
    if (!await file.exists()) return false;
    final length = await file.length();
    if (length <= 0) return false;

    // 有大小则先校验大小
    if (version.fileSize != null && version.fileSize! > 0 && length != version.fileSize!) {
      return false;
    }
    // 有 MD5 则校验 MD5
    if (version.fileMd5 != null && version.fileMd5!.isNotEmpty) {
      try {
        final digest = await md5.bind(file.openRead()).first;
        return digest.toString().toLowerCase() == version.fileMd5;
      } catch (_) {
        return false;
      }
    }
    // 没有 MD5 也没有大小，只要文件非空就算通过
    return true;
  }

  /// 检查本地缓存的安装包是否可直接复用
  static Future<bool> _isCachedApkValid(String path, AppVersionInfo version) async {
    try {
      return await _verifyApk(path, version);
    } catch (_) {
      return false;
    }
  }

  static Future<void> _safeDelete(String path) async {
    try {
      final f = File(path);
      if (await f.exists()) await f.delete();
    } catch (_) {}
  }

  /// 把下载异常翻译成用户友好的中文提示
  static String _friendlyDownloadError(Object error) {
    if (error is DioException) {
      switch (error.type) {
        case DioExceptionType.connectionTimeout:
        case DioExceptionType.sendTimeout:
        case DioExceptionType.receiveTimeout:
          return '网络连接超时，请检查网络后重试';
        case DioExceptionType.connectionError:
          return '网络连接失败，请检查网络是否正常';
        case DioExceptionType.badResponse:
          final code = error.response?.statusCode;
          if (code == 404) return '安装包文件不存在，请联系客服';
          if (code == 403) return '没有下载权限，请联系客服';
          if (code != null && code >= 500) return '服务器繁忙，请稍后重试';
          return '下载失败（错误码 $code），请稍后重试';
        case DioExceptionType.cancel:
          return '下载已取消';
        default:
          return '下载失败，请检查网络后重试';
      }
    }
    if (error is FormatException) {
      return '安装包校验失败，文件可能已损坏，请重试';
    }
    if (error is FileSystemException) {
      return '存储空间不足或无写入权限，请清理空间后重试';
    }
    return '下载失败，请稍后重试';
  }

  /// 下载失败弹窗，提供重试入口
  static Future<void> _showDownloadErrorDialog(
    BuildContext context,
    AppVersionInfo version,
    String message,
  ) async {
    await showDialog<void>(
      context: context,
      barrierDismissible: !version.forceUpdate,
      builder: (dialogContext) => PopScope(
        canPop: !version.forceUpdate,
        child: AlertDialog(
          title: const Text('更新失败'),
          content: Text(message),
          actions: [
            if (!version.forceUpdate)
              TextButton(
                onPressed: () => Navigator.pop(dialogContext),
                child: const Text('稍后再试'),
              ),
            ElevatedButton(
              onPressed: () async {
                Navigator.pop(dialogContext);
                await _downloadAndInstall(context, version);
              },
              child: const Text('重试'),
            ),
          ],
        ),
      ),
    );
  }

  static Future<void> _installApk(BuildContext context, String apkPath) async {
    try {
      await _installerChannel.invokeMethod<bool>('installApk', {'path': apkPath});
    } on PlatformException catch (e) {
      if (!context.mounted) return;
      if (e.code == 'permission_required') {
        await _showInstallPermissionGuide(context, apkPath);
      } else {
        Toast.error(context, '打开安装器失败：${e.message ?? e.code}');
      }
    } catch (e) {
      if (context.mounted) Toast.error(context, '打开安装器失败：$e');
    }
  }

  /// 5) 安装权限引导：引导用户开启"安装未知应用"权限
  static Future<void> _showInstallPermissionGuide(
    BuildContext context,
    String apkPath,
  ) async {
    await showDialog<void>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('需要安装权限'),
        content: const Text(
          '安装更新需要允许本应用"安装未知应用"。\n\n'
          '点击"去授权"后，请在系统设置里打开开关，然后返回应用，会自动继续安装。',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext),
            child: const Text('取消'),
          ),
          ElevatedButton(
            onPressed: () async {
              Navigator.pop(dialogContext);
              // 再次调用安装，原生侧会跳转到权限设置页
              if (context.mounted) {
                await _installApk(context, apkPath);
              }
            },
            child: const Text('去授权'),
          ),
        ],
      ),
    );
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

  /// 6) 在系统通知栏显示下载进度
  static void _showDownloadNotification({int progress = 0, bool indeterminate = false}) {
    if (kIsWeb) return;
    try {
      _notifChannel.invokeMethod('showDownloadProgress', {
        'progress': progress,
        'indeterminate': indeterminate,
      });
    } catch (_) {}
  }

  static void _cancelDownloadNotification() {
    if (kIsWeb) return;
    try {
      _notifChannel.invokeMethod('cancelDownloadProgress');
    } catch (_) {}
  }
}
