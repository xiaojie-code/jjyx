import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../constants/app_constants.dart';
import '../storage/token_storage.dart';

/// 统一 API 响应模型
class ApiResponse<T> {
  final int code;
  final String message;
  final T? data;

  ApiResponse({required this.code, required this.message, this.data});

  bool get isSuccess => code == 0;
}

/// API 异常
class ApiException implements Exception {
  final int? code;
  final String message;

  ApiException({this.code, required this.message});

  @override
  String toString() => 'ApiException(code: $code, message: $message)';
}

String apiErrorMessage(Object error, {String fallback = '操作失败'}) {
  if (error is ApiException && error.message.isNotEmpty) {
    return error.message;
  }
  if (error is DioException) {
    final inner = error.error;
    if (inner is ApiException && inner.message.isNotEmpty) {
      return inner.message;
    }
    final data = error.response?.data;
    if (data is Map<String, dynamic>) {
      final message = data['message']?.toString() ?? '';
      if (message.isNotEmpty) return message;
    }
    final message = error.message;
    if (message != null && message.isNotEmpty) return message;
  }

  final text = error.toString();
  final match = RegExp(r'message:\s*([^)]*)\)').firstMatch(text);
  final parsed = match?.group(1)?.trim();
  if (parsed != null && parsed.isNotEmpty) return parsed;
  return fallback;
}

/// Dio 网络请求封装
class ApiClient {
  late final Dio _dio;

  ApiClient() {
    _dio = Dio(
      BaseOptions(
        baseUrl: AppConstants.apiBaseUrl,
        connectTimeout:
            const Duration(milliseconds: AppConstants.connectTimeout),
        receiveTimeout:
            const Duration(milliseconds: AppConstants.receiveTimeout),
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      ),
    );

    // JWT Token 拦截器
    _dio.interceptors.add(_authInterceptor());

    // 响应拦截器 - 解包 { code, message, data }
    _dio.interceptors.add(_responseInterceptor());
  }

  /// 认证拦截器：自动附加 Authorization header
  Interceptor _authInterceptor() {
    return InterceptorsWrapper(
      onRequest: (options, handler) {
        final token = TokenStorage.getToken();
        if (token != null && token.isNotEmpty) {
          options.headers['Authorization'] = 'Bearer $token';
        }
        handler.next(options);
      },
      onError: (error, handler) async {
        if (error.response?.statusCode == 401) {
          // TODO: 实现 token 刷新逻辑
          // 1. 尝试用 refreshToken 获取新 token
          // 2. 成功则重试原请求
          // 3. 失败则跳转登录页
          await TokenStorage.clearTokens();
        }
        handler.next(error);
      },
    );
  }

  /// 响应拦截器：解包后端统一响应格式 { code: 0, message: 'success', data: ... }
  Interceptor _responseInterceptor() {
    return InterceptorsWrapper(
      onResponse: (response, handler) {
        final data = response.data;
        if (data is Map<String, dynamic>) {
          final code = data['code'] as int?;
          final message = data['message'] as String? ?? '';

          if (code != null && code != 0) {
            handler.reject(
              DioException(
                requestOptions: response.requestOptions,
                response: response,
                error: ApiException(code: code, message: message),
              ),
            );
            return;
          }
          // 解包：只返回 data 字段
          response.data = data['data'];
        }
        handler.next(response);
      },
      onError: (error, handler) {
        if (error.error is ApiException) {
          handler.next(error);
          return;
        }

        // 尝试从响应体中提取后端返回的错误信息
        String? serverMessage;
        final responseData = error.response?.data;
        if (responseData is Map<String, dynamic>) {
          serverMessage = responseData['message'] as String?;
        }

        // 网络错误统一处理
        String message;
        switch (error.type) {
          case DioExceptionType.connectionTimeout:
            message = '连接超时，请检查网络';
            break;
          case DioExceptionType.receiveTimeout:
            message = '响应超时，请稍后重试';
            break;
          case DioExceptionType.connectionError:
            message = '网络连接失败，请检查网络设置';
            break;
          default:
            message =
                serverMessage ?? error.response?.statusMessage ?? '网络请求失败';
        }

        handler.next(
          DioException(
            requestOptions: error.requestOptions,
            response: error.response,
            error: ApiException(
              code: error.response?.statusCode,
              message: message,
            ),
          ),
        );
      },
    );
  }

  // ==================== 请求方法 ====================

  Future<T?> get<T>(
    String path, {
    Map<String, dynamic>? queryParameters,
    Options? options,
  }) async {
    final response = await _dio.get<T>(
      path,
      queryParameters: queryParameters,
      options: options,
    );
    return response.data;
  }

  Future<T?> post<T>(
    String path, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
    Options? options,
  }) async {
    final response = await _dio.post<T>(
      path,
      data: data,
      queryParameters: queryParameters,
      options: options,
    );
    return response.data;
  }

  Future<T?> put<T>(
    String path, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
    Options? options,
  }) async {
    final response = await _dio.put<T>(
      path,
      data: data,
      queryParameters: queryParameters,
      options: options,
    );
    return response.data;
  }

  Future<T?> delete<T>(
    String path, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
    Options? options,
  }) async {
    final response = await _dio.delete<T>(
      path,
      data: data,
      queryParameters: queryParameters,
      options: options,
    );
    return response.data;
  }

  /// 文件上传
  Future<T?> upload<T>(
    String path, {
    required FormData formData,
    ProgressCallback? onSendProgress,
  }) async {
    final response = await _dio.post<T>(
      path,
      data: formData,
      onSendProgress: onSendProgress,
      options: Options(contentType: 'multipart/form-data'),
    );
    return response.data;
  }
}

/// Riverpod Provider
final apiClientProvider = Provider<ApiClient>((ref) {
  return ApiClient();
});
