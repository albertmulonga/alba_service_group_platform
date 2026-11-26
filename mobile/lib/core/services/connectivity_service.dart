import 'dart:async';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'sync_service.dart';

/// Surveille la connectivité et déclenche la synchronisation
/// automatiquement dès qu'Internet revient.
class ConnectivityService {
  final Connectivity _connectivity = Connectivity();
  final SyncService _sync;
  late StreamSubscription<List<ConnectivityResult>> _sub;

  ConnectivityService(this._sync) {
    _sub = _connectivity.onConnectivityChanged.listen((results) {
      final online = results.any((r) => r != ConnectivityResult.none);
      if (online) {
        // Retour en ligne → sync après stabilisation réseau
        Timer(const Duration(seconds: 2), () => _sync.sync());
      }
    });

    // Sync initial si déjà en ligne
    _connectivity.checkConnectivity().then((results) {
      if (results.any((r) => r != ConnectivityResult.none)) {
        Timer(const Duration(seconds: 3), () => _sync.sync());
      }
    });
  }

  void dispose() => _sub.cancel();
}

final connectivityServiceProvider = Provider<ConnectivityService>((ref) {
  final sync = ref.watch(syncServiceProvider);
  final svc = ConnectivityService(sync);
  ref.onDispose(() => svc.dispose());
  return svc;
});
