import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../features/auth/screens/login_screen.dart';
import '../../features/auth/screens/splash_screen.dart';
import '../../features/home/screens/home_screen.dart';
import '../../features/clients/screens/clients_screen.dart';
import '../../features/clients/screens/client_detail_screen.dart';
import '../../features/commercial/screens/invoices_screen.dart';
import '../../features/commercial/screens/quotes_screen.dart';
import '../../features/stock/screens/stock_screen.dart';
import '../../features/finance/screens/cash_screen.dart';
import '../../features/hr/screens/employees_screen.dart';
import '../../features/printing/screens/print_orders_screen.dart';
import '../../features/reports/screens/reports_screen.dart';
import '../../features/settings/screens/settings_screen.dart';
import '../../features/profile/screens/profile_screen.dart';
import '../services/auth_service.dart';

final appRouterProvider = Provider<GoRouter>((ref) {
  final authState = ref.watch(authStateProvider);

  return GoRouter(
    initialLocation: '/splash',
    redirect: (ctx, state) {
      final isLoading = authState.isLoading;
      final isAuth    = authState.isAuthenticated;
      final onSplash  = state.matchedLocation == '/splash';
      final onLogin   = state.matchedLocation == '/login';

      if (isLoading) return '/splash';
      if (!isAuth && !onLogin) return '/login';
      if (isAuth && (onLogin || onSplash)) return '/home';
      return null;
    },
    routes: [
      GoRoute(path: '/splash', builder: (_, __) => const SplashScreen()),
      GoRoute(path: '/login',  builder: (_, __) => const LoginScreen()),

      StatefulShellRoute.indexedStack(
        builder: (ctx, state, shell) => HomeScreen(shell: shell),
        branches: [
          StatefulShellBranch(routes: [
            GoRoute(
              path: '/home',
              builder: (_, __) => const DashboardTab(),
            ),
          ]),
          StatefulShellBranch(routes: [
            GoRoute(
              path: '/clients',
              builder: (_, __) => const ClientsScreen(),
              routes: [
                GoRoute(
                  path: ':id',
                  builder: (ctx, state) => ClientDetailScreen(id: state.pathParameters['id']!),
                ),
              ],
            ),
          ]),
          StatefulShellBranch(routes: [
            GoRoute(
              path: '/commercial',
              builder: (_, __) => const InvoicesScreen(),
              routes: [
                GoRoute(path: 'quotes', builder: (_, __) => const QuotesScreen()),
              ],
            ),
          ]),
          StatefulShellBranch(routes: [
            GoRoute(path: '/stock', builder: (_, __) => const StockScreen()),
          ]),
          StatefulShellBranch(routes: [
            GoRoute(path: '/more', builder: (_, __) => const MoreMenuScreen()),
          ]),
        ],
      ),

      // Additional standalone screens
      GoRoute(path: '/finance',   builder: (_, __) => const CashScreen()),
      GoRoute(path: '/hr',        builder: (_, __) => const EmployeesScreen()),
      GoRoute(path: '/printing',  builder: (_, __) => const PrintOrdersScreen()),
      GoRoute(path: '/reports',   builder: (_, __) => const ReportsScreen()),
      GoRoute(path: '/settings',  builder: (_, __) => const SettingsScreen()),
      GoRoute(path: '/profile',   builder: (_, __) => const ProfileScreen()),
    ],
  );
});

/// Placeholder screens — implemented in respective feature files
class DashboardTab extends StatelessWidget {
  const DashboardTab({super.key});
  @override
  Widget build(BuildContext context) => const SizedBox.shrink();
}

class MoreMenuScreen extends StatelessWidget {
  const MoreMenuScreen({super.key});
  @override
  Widget build(BuildContext context) => const SizedBox.shrink();
}
