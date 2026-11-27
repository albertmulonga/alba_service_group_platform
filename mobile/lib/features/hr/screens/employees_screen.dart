import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/services/api_service.dart';

final employeesProvider = FutureProvider<List<Map<String, dynamic>>>((ref) async {
  final api = ref.watch(apiServiceProvider);
  final r = await api.get('/hr/employees', params: {'limit': '200'});
  final d = r.data;
  if (d is List) return d.cast<Map<String, dynamic>>();
  if (d is Map && d['data'] is List) return (d['data'] as List).cast<Map<String, dynamic>>();
  return [];
});

class EmployeesScreen extends ConsumerStatefulWidget {
  const EmployeesScreen({super.key});
  @override
  ConsumerState<EmployeesScreen> createState() => _EmployeesScreenState();
}

class _EmployeesScreenState extends ConsumerState<EmployeesScreen> {
  String _search = '';

  @override
  Widget build(BuildContext context) {
    final employees = ref.watch(employeesProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Ressources Humaines'),
        backgroundColor: AlbaColors.navy,
        actions: [
          IconButton(icon: const Icon(LucideIcons.refreshCw, size: 18),
            onPressed: () => ref.invalidate(employeesProvider)),
        ],
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: TextField(
              decoration: InputDecoration(
                hintText: 'Rechercher un employé...',
                prefixIcon: const Icon(LucideIcons.search, size: 18),
                filled: true, fillColor: Colors.white,
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: BorderSide.none),
              ),
              onChanged: (v) => setState(() => _search = v.toLowerCase()),
            ),
          ),
          Expanded(
            child: employees.when(
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (e, _) => Center(child: Text('Erreur : $e')),
              data: (list) {
                final filtered = list.where((e) {
                  final n = '${e['firstName'] ?? ''} ${e['lastName'] ?? ''} ${e['position'] ?? ''}'.toLowerCase();
                  return _search.isEmpty || n.contains(_search);
                }).toList();

                if (filtered.isEmpty) return const Center(
                  child: Text('Aucun employé trouvé', style: TextStyle(color: Colors.grey)));

                return RefreshIndicator(
                  onRefresh: () async => ref.invalidate(employeesProvider),
                  child: ListView.builder(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    itemCount: filtered.length,
                    itemBuilder: (_, i) {
                      final e = filtered[i];
                      final name = '${e['firstName'] ?? ''} ${e['lastName'] ?? ''}'.trim();
                      final dept = (e['department'] is Map) ? e['department']['name'] ?? '' : e['department'] ?? '';
                      final status = e['status'] ?? 'ACTIVE';
                      final isActive = status == 'ACTIVE' || status == 'active';

                      return Card(
                        margin: const EdgeInsets.only(bottom: 10),
                        child: ListTile(
                          leading: CircleAvatar(
                            backgroundColor: AlbaColors.navyDefault.withValues(alpha: 0.1),
                            child: Text(name.isNotEmpty ? name[0].toUpperCase() : 'E',
                              style: const TextStyle(color: AlbaColors.navyDefault, fontWeight: FontWeight.w700)),
                          ),
                          title: Text(name, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
                          subtitle: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              if ((e['position'] ?? '').isNotEmpty)
                                Text(e['position'], style: const TextStyle(fontSize: 12, color: AlbaColors.grayMedium)),
                              if (dept.isNotEmpty)
                                Text(dept, style: const TextStyle(fontSize: 11, color: AlbaColors.grayMedium)),
                            ],
                          ),
                          trailing: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                            decoration: BoxDecoration(
                              color: (isActive ? AlbaColors.success : AlbaColors.grayMedium).withValues(alpha: 0.1),
                              borderRadius: BorderRadius.circular(99),
                            ),
                            child: Text(isActive ? 'Actif' : 'Inactif',
                              style: TextStyle(
                                fontSize: 10,
                                color: isActive ? AlbaColors.success : AlbaColors.grayMedium,
                                fontWeight: FontWeight.w600)),
                          ),
                        ),
                      );
                    },
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}
