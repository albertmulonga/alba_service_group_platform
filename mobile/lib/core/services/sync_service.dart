import 'dart:convert';
import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:sqflite/sqflite.dart';
import 'package:path/path.dart' as p;
import 'package:uuid/uuid.dart';
import '../config/api_config.dart';

/// ═══════════════════════════════════════════════════════════════
/// SyncService — File d'attente SQLite + moteur de synchronisation
///
/// Chaque opération reçoit :
///  - UUID idempotency key
///  - endpoint, method, body JSON
///  - userId + deviceId
///  - createdAt, attempts, status
/// ═══════════════════════════════════════════════════════════════

enum SyncStatus { pending, syncing, done, error, conflict }

class SyncOperation {
  final String id;
  final String endpoint;
  final String method;
  final Map<String, dynamic> body;
  final String userId;
  final String deviceId;
  final String createdAt;
  int attempts;
  String status;
  String? lastError;

  SyncOperation({
    required this.id,
    required this.endpoint,
    required this.method,
    required this.body,
    required this.userId,
    required this.deviceId,
    required this.createdAt,
    this.attempts = 0,
    this.status = 'pending',
    this.lastError,
  });

  Map<String, dynamic> toMap() => {
    'id': id, 'endpoint': endpoint, 'method': method,
    'body': jsonEncode(body), 'userId': userId, 'deviceId': deviceId,
    'createdAt': createdAt, 'attempts': attempts,
    'status': status, 'lastError': lastError,
  };

  factory SyncOperation.fromMap(Map<String, dynamic> m) => SyncOperation(
    id: m['id'], endpoint: m['endpoint'], method: m['method'],
    body: jsonDecode(m['body']) as Map<String, dynamic>,
    userId: m['userId'], deviceId: m['deviceId'],
    createdAt: m['createdAt'], attempts: m['attempts'] as int,
    status: m['status'], lastError: m['lastError'],
  );
}

class SyncService {
  Database? _db;
  final FlutterSecureStorage _storage = const FlutterSecureStorage();
  final _uuid = const Uuid();
  late Dio _dio;

  String? _deviceId;

  Future<void> init() async {
    final dbPath = p.join(await getDatabasesPath(), 'alba_offline.db');
    _db = await openDatabase(dbPath, version: 1, onCreate: (db, v) async {
      await db.execute('''
        CREATE TABLE ${ApiConfig.queueTable} (
          id TEXT PRIMARY KEY, endpoint TEXT, method TEXT,
          body TEXT, userId TEXT, deviceId TEXT,
          createdAt TEXT, attempts INTEGER,
          status TEXT, lastError TEXT
        )
      ''');
      await db.execute('''
        CREATE TABLE ${ApiConfig.logTable} (
          id TEXT PRIMARY KEY, operationId TEXT,
          timestamp TEXT, result TEXT, detail TEXT, httpStatus INTEGER
        )
      ''');
    });

    // Setup Dio for sync
    _dio = Dio(BaseOptions(
      baseUrl: ApiConfig.baseUrl,
      connectTimeout: ApiConfig.connectTimeout,
      receiveTimeout: ApiConfig.receiveTimeout,
    ));
    _dio.interceptors.add(InterceptorsWrapper(onRequest: (opts, h) async {
      final token = await _storage.read(key: ApiConfig.tokenKey);
      if (token != null) opts.headers['Authorization'] = 'Bearer $token';
      h.next(opts);
    }));

    _deviceId = await _getOrCreateDeviceId();
  }

  Future<String> _getOrCreateDeviceId() async {
    var id = await _storage.read(key: ApiConfig.deviceIdKey);
    if (id == null) {
      id = _uuid.v4();
      await _storage.write(key: ApiConfig.deviceIdKey, value: id);
    }
    return id;
  }

  /// Ajoute une opération à la file
  Future<String> enqueue({
    required String endpoint,
    required String method,
    required Map<String, dynamic> body,
    required String userId,
  }) async {
    await _ensureInit();
    final op = SyncOperation(
      id: _uuid.v4(),
      endpoint: endpoint,
      method: method,
      body: body,
      userId: userId,
      deviceId: _deviceId!,
      createdAt: DateTime.now().toIso8601String(),
    );
    await _db!.insert(ApiConfig.queueTable, op.toMap(),
        conflictAlgorithm: ConflictAlgorithm.replace);
    return op.id;
  }

  /// Rejoue toutes les opérations en attente
  Future<Map<String, int>> sync() async {
    await _ensureInit();
    int synced = 0, failed = 0, conflicts = 0;

    final rows = await _db!.query(ApiConfig.queueTable,
        where: 'status IN (?,?)', whereArgs: ['pending', 'failed'],
        orderBy: 'createdAt ASC');

    for (final row in rows) {
      final op = SyncOperation.fromMap(row);

      try {
        await _execute(op);
        await _db!.delete(ApiConfig.queueTable, where: 'id = ?', whereArgs: [op.id]);
        await _log(op.id, 'success');
        synced++;
      } catch (e) {
        final statusCode = e is DioException ? e.response?.statusCode : null;
        final isConflict = statusCode == 409;

        if (isConflict) {
          await _db!.update(ApiConfig.queueTable,
              {'status': 'conflict', 'lastError': 'Conflict 409', 'attempts': op.attempts + 1},
              where: 'id = ?', whereArgs: [op.id]);
          await _log(op.id, 'conflict', httpStatus: 409);
          conflicts++;
        } else {
          final next = op.attempts + 1;
          final newStatus = next >= ApiConfig.maxRetries ? 'failed' : 'pending';
          await _db!.update(ApiConfig.queueTable,
              {'status': newStatus, 'attempts': next, 'lastError': e.toString()},
              where: 'id = ?', whereArgs: [op.id]);
          await _log(op.id, 'error', detail: e.toString());
          if (newStatus == 'failed') failed++;
        }
      }
    }
    return {'synced': synced, 'failed': failed, 'conflicts': conflicts};
  }

  Future<void> _execute(SyncOperation op) async {
    final headers = {
      'X-Idempotency-Key': op.id,
      'X-Device-Id': op.deviceId,
      'X-User-Id': op.userId,
    };
    final opts = Options(headers: headers);
    switch (op.method.toUpperCase()) {
      case 'POST':   await _dio.post(op.endpoint, data: op.body, options: opts); break;
      case 'PUT':    await _dio.put(op.endpoint, data: op.body, options: opts); break;
      case 'PATCH':  await _dio.patch(op.endpoint, data: op.body, options: opts); break;
      case 'DELETE': await _dio.delete(op.endpoint, options: opts); break;
      default: throw Exception('Méthode non supportée: ${op.method}');
    }
  }

  Future<void> _log(String opId, String result, { String? detail, int? httpStatus }) async {
    await _db!.insert(ApiConfig.logTable, {
      'id': _uuid.v4(), 'operationId': opId,
      'timestamp': DateTime.now().toIso8601String(),
      'result': result, 'detail': detail, 'httpStatus': httpStatus,
    }, conflictAlgorithm: ConflictAlgorithm.replace);
  }

  Future<int> queueSize() async {
    await _ensureInit();
    final r = await _db!.rawQuery(
        "SELECT COUNT(*) as cnt FROM ${ApiConfig.queueTable} WHERE status IN ('pending','failed')");
    return Sqflite.firstIntValue(r) ?? 0;
  }

  Future<void> _ensureInit() async {
    if (_db == null) await init();
  }
}

final syncServiceProvider = Provider<SyncService>((ref) {
  final s = SyncService();
  s.init();
  return s;
});
