/// ═══════════════════════════════════════════════════════════════
/// Configuration API — ALBA Mobile
/// ═══════════════════════════════════════════════════════════════
class ApiConfig {
  // Backend base URL — adjust for your server
  // Emulator: 10.0.2.2 → host machine
  // Physical device: use your PC's LAN IP (ex: http://192.168.1.20:4000)
  // Deployed builds: pass --dart-define=API_BASE_URL=https://api.example.com/api
  static const String baseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://10.0.2.2:4000/api',
  );
  static const String apiPrefix     = '/api';

  // Auth
  static const String loginUrl      = '/auth/login';
  static const String profileUrl    = '/auth/profile';
  static const String registerUrl    = '/auth/register';

  // Storage keys
  static const String tokenKey      = 'alba_token';
  static const String userKey        = 'alba_user';
  static const String deviceIdKey   = 'alba_device_id';
  static const String queueTable     = 'sync_queue';
  static const String logTable       = 'sync_log';

  // Timeouts
  static const Duration connectTimeout = Duration(seconds: 10);
  static const Duration receiveTimeout  = Duration(seconds: 30);

  // Sync
  static const int maxRetries        = 5;
  static const List<int> retryDelaysSec = [2, 5, 15, 30, 60];
}
