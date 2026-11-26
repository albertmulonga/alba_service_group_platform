import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../../core/theme/app_theme.dart';

/// Écran principal avec bottom navigation (5 onglets)
class HomeScreen extends StatelessWidget {
  final StatefulNavigationShell shell;
  const HomeScreen({super.key, required this.shell});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: shell,
      bottomNavigationBar: Container(
        decoration: BoxDecoration(
          boxShadow: [BoxShadow(
            color: Colors.black.withValues(alpha: 0.06),
            blurRadius: 16, offset: const Offset(0, -4),
          )],
        ),
        child: NavigationBar(
          selectedIndex: shell.currentIndex,
          onDestinationSelected: (i) => shell.goBranch(
            i, initial: i == shell.currentIndex,
          ),
          destinations: const [
            NavigationDestination(
              icon: Icon(Icons.dashboard_outlined), selectedIcon: Icon(Icons.dashboard),
              label: 'Accueil',
            ),
            NavigationDestination(
              icon: Icon(Icons.people_outline), selectedIcon: Icon(Icons.people),
              label: 'Clients',
            ),
            NavigationDestination(
              icon: Icon(Icons.receipt_long_outlined), selectedIcon: Icon(Icons.receipt_long),
              label: 'Commercial',
            ),
            NavigationDestination(
              icon: Icon(Icons.inventory_2_outlined), selectedIcon: Icon(Icons.inventory_2),
              label: 'Stock',
            ),
            NavigationDestination(
              icon: Icon(Icons.grid_view_outlined), selectedIcon: Icon(Icons.grid_view),
              label: 'Plus',
            ),
          ],
        ),
      ),
    );
  }
}
