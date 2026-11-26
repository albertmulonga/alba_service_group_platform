import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:freezed_annotation/freezed_annotation.dart';
import '../config/api_config.dart';
import 'api_service.dart';

/// ═══════════════════════════════════════════════════════════════
/// AuthService — login, session, JWT sécurisé
/// ═══════════════════════════════════════════════════════════════

@freezed
class AuthState with _$AuthState {
  const factory AuthState({
    @Default(false) bool isLoading,
    @Default(false) bool isAuthenticated,
    String? token,
    Map<String, dynamic>? user,
    String? error,
  }) = _AuthState;
}

class AuthService extends AsyncNotifier<AuthState> {
  final _storage = const FlutterSecureStorage();
  late final Dio _dio;

  @override
  Future<AuthState> build() async {
    _dio = Dio(BaseOptions(
      baseUrl: ApiConfig.baseUrl,
      connectTimeout: ApiConfig.connectTimeout,
    ));

    // Restore session
    final token = await _storage.read(key: ApiConfig.tokenKey);
    if (token == null) return const AuthState();

    try {
      final r = await _dio.get(ApiConfig.profileUrl,
          options: Options(headers: {'Authorization': 'Bearer $token'}));
      return AuthState(isAuthenticated: true, token: token, user: r.data);
    } catch (_) {
      await _clearSession();
      return const AuthState();
    }
  }

  Future<String?> login(String email, String password) async {
    state = const AsyncValue.loading();
    try {
      final r = await _dio.post(ApiConfig.loginUrl, data: {
        'email': email,
        'password': password,
      });

      final token = r.data['accessToken'] as String?;
      if (token == null) throw Exception('Token manquant dans la réponse');

      await _storage.write(key: ApiConfig.tokenKey, value: token);
      await _storage.write(key: ApiConfig.userKey, value: r.data['user']?.toString() ?? '{}');

      // Load profile
      Map<String, dynamic>? profile;
      try {
        final pr = await _dio.get(ApiConfig.profileUrl,
            options: Options(headers: {'Authorization': 'Bearer $token'}));
        profile = pr.data;
      } catch (_) {}

      state = AsyncValue.data(AuthState(
        isAuthenticated: true, token: token, user: profile ?? r.data['user'],
      ));
      return null; // no error
    } on DioException catch (e) {
      final msg = e.response?.data?['message'] ?? 'Connexion impossible. Vérifiez le serveur.';
      final error = msg is List ? msg.first : msg;
      state = AsyncValue.data(AuthState(error: error.toString()));
      return error.toString();
    }
  }

  Future<void> logout() async {
    await _clearSession();
    state = const AsyncValue.data(AuthState());
  }

  Future<void> _clearSession() async {
    await _storage.delete(key: ApiConfig.tokenKey);
    await _storage.delete(key: ApiConfig.userKey);
  }
}

final authServiceProvider = AsyncNotifierProvider<AuthService, AuthState>(AuthService.new);

/// Simple state provider version for the router
final authStateProvider = FutureProvider<AuthState>((ref) async {
  final state = ref.watch(authServiceProvider);
  return state.maybeWhen(
    data: (s) => s,
    orElse: () => const AuthState(isLoading: true),
  );
});
