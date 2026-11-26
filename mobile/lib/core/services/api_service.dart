import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../config/api_config.dart';
import 'sync_service.dart';

/// ═══════════════════════════════════════════════════════════════
/// Service API — Dio + JWT interceptor + offline fallback
/// ═══════════════════════════════════════════════════════════════
class ApiService {
  final Dio _dio;
  final FlutterSecureStorage _storage;
  final SyncService _sync;

  ApiService(this._sync)
      : _dio = Dio(BaseOptions(
          baseUrl: ApiConfig.baseUrl,
          connectTimeout: ApiConfig.connectTimeout,
          receiveTimeout: ApiConfig.receiveTimeout,
        )),
        _storage = const FlutterSecureStorage() {
    _setupInterceptors();
  }

  void _setupInterceptors() {
    // JWT injection
    _dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) async {
        final token = await _storage.read(key: ApiConfig.tokenKey);
        if (token != null) options.headers['Authorization'] = 'Bearer $token';
        handler.next(options);
      },
      onError: (error, handler) async {
        if (error.response?.statusCode == 401) {
          await _storage.delete(key: ApiConfig.tokenKey);
          await _storage.delete(key: ApiConfig.userKey);
          // TODO: redirect to login
        }
        handler.next(error);
      },
    ));
  }

  Future<Response<T>> get<T>(String path, {Map<String, dynamic>? params}) =>
      _dio.get<T>(path, queryParameters: params);

  Future<Response<T>> post<T>(String path, dynamic data) =>
      _dio.post<T>(path, data: data);

  Future<Response<T>> put<T>(String path, dynamic data) =>
      _dio.put<T>(path, data: data);

  Future<Response<T>> delete<T>(String path) => _dio.delete<T>(path);

  /// POST that queues offline if no connectivity
  Future<Map<String, dynamic>> offlinePost(
    String path, Map<String, dynamic> data, String userId,
  ) async {
    if (await _isOnline()) {
      try {
        final r = await post(path, data);
        return r.data as Map<String, dynamic>;
      } on DioException catch (e) {
        if (e.type == DioExceptionType.connectionError || e.type == DioExceptionType.unknown) {
          return _queueAndReturn(path, 'POST', data, userId);
        }
        rethrow;
      }
    } else {
      return _queueAndReturn(path, 'POST', data, userId);
    }
  }

  Future<bool> _isOnline() async {
    try {
      final r = await _dio.get('/health', options: Options(
        validateStatus: (_) => true,
        receiveTimeout: const Duration(seconds: 3),
      ));
      return r.statusCode != null;
    } catch (_) {
      return false;
    }
  }

  Future<Map<String, dynamic>> _queueAndReturn(
    String path, String method, Map<String, dynamic> body, String userId,
  ) async {
    final opId = await _sync.enqueue(
      endpoint: path, method: method, body: body, userId: userId,
    );
    return {...body, 'id': opId, '_queued': true, '_queueId': opId};
  }
}

final apiServiceProvider = Provider<ApiService>((ref) {
  final sync = ref.watch(syncServiceProvider);
  return ApiService(sync);
});
