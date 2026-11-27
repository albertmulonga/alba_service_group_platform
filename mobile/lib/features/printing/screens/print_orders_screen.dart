import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/services/api_service.dart';

final printOrdersProvider = FutureProvider<List<Map<String, dynamic>>>((ref) async {
  final api = ref.watch(apiServiceProvider);
  final r = await api.get('/print/orders');
  final d = r.data;
  if (d is List) return d.cast<Map<String, dynamic>>();
  if (d is Map && d['data'] is List) return (d['data'] as List).cast<Map<String, dynamic>>();
  return [];
});

const _statusColors = {
  'PENDING': AlbaColors.warning, 'DESIGN': AlbaColors.info,
  'PRODUCTION': AlbaColors.navyAccent, 'QUALITY_CONTROL': AlbaColors.gold,
  'FINISHED': AlbaColors.success, 'DELIVERED': AlbaColors.success,
  'CANCELLED': AlbaColors.danger,
};

const _statusLabels = {
  'PENDING': 'En attente', 'DESIGN': 'Design',
  'PRODUCTION': 'Production', 'QUALITY_CONTROL': 'Contrôle qualité',
  'FINISHED': 'Terminé', 'DELIVERED': 'Livré', 'CANCELLED': 'Annulé',
};

class PrintOrdersScreen extends ConsumerWidget {
  const PrintOrdersScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final orders = ref.watch(printOrdersProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Commandes Imprimerie'),
        backgroundColor: AlbaColors.navy,
        actions: [
          IconButton(icon: const Icon(LucideIcons.refreshCw, size: 18),
            onPressed: () => ref.invalidate(printOrdersProvider)),
        ],
      ),
      body: orders.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('Erreur : $e')),
        data: (list) {
          if (list.isEmpty) return const Center(
            child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
              Icon(LucideIcons.printer, size: 48, color: Colors.grey),
              SizedBox(height: 12),
              Text('Aucune commande', style: TextStyle(color: Colors.grey)),
            ]),
          );

          // KPIs
          final active = list.where((o) => !['DELIVERED','CANCELLED','FINISHED'].contains(o['status'])).length;
          final done   = list.where((o) => o['status'] == 'DELIVERED').length;

          return Column(
            children: [
              Padding(
                padding: const EdgeInsets.all(16),
                child: Row(children: [
                  _Chip(label: 'Total', value: '${list.length}', color: AlbaColors.navyDefault),
                  const SizedBox(width: 10),
                  _Chip(label: 'En cours', value: '$active', color: AlbaColors.warning),
                  const SizedBox(width: 10),
                  _Chip(label: 'Livrées', value: '$done', color: AlbaColors.success),
                ]),
              ),
              Expanded(
                child: RefreshIndicator(
                  onRefresh: () async => ref.invalidate(printOrdersProvider),
                  child: ListView.builder(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    itemCount: list.length,
                    itemBuilder: (_, i) {
                      final o = list[i];
                      final status = o['status'] ?? 'PENDING';
                      final color = _statusColors[status] ?? AlbaColors.grayMedium;
                      final label = _statusLabels[status] ?? status;
                      final customerName = o['customer'] is Map
                        ? '${o['customer']['firstName'] ?? ''} ${o['customer']['lastName'] ?? ''}'.trim()
                        : '—';
                      final total = ((o['total'] ?? 0) as num).toDouble();

                      return Card(
                        margin: const EdgeInsets.only(bottom: 10),
                        child: ListTile(
                          leading: Container(
                            width: 44, height: 44,
                            decoration: BoxDecoration(
                              color: color.withValues(alpha: 0.1),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Icon(LucideIcons.printer, size: 20, color: color),
                          ),
                          title: Text(o['reference'] ?? '—',
                            style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13, fontFamily: 'monospace')),
                          subtitle: Text(customerName, style: const TextStyle(fontSize: 12, color: AlbaColors.grayMedium)),
                          trailing: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            crossAxisAlignment: CrossAxisAlignment.end,
                            children: [
                              Text('${total.toStringAsFixed(0)} FC',
                                style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
                              const SizedBox(height: 4),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                decoration: BoxDecoration(
                                  color: color.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(99),
                                ),
                                child: Text(label, style: TextStyle(fontSize: 10, color: color, fontWeight: FontWeight.w600)),
                              ),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}

class _Chip extends StatelessWidget {
  final String label, value;
  final Color color;
  const _Chip({required this.label, required this.value, required this.color});
  @override
  Widget build(BuildContext context) => Expanded(
    child: Container(
      padding: const EdgeInsets.symmetric(vertical: 10),
      decoration: BoxDecoration(color: color.withValues(alpha: 0.08), borderRadius: BorderRadius.circular(14)),
      child: Column(children: [
        Text(value, style: TextStyle(fontWeight: FontWeight.w800, fontSize: 18, color: color)),
        Text(label, style: const TextStyle(fontSize: 10, color: AlbaColors.grayMedium)),
      ]),
    ),
  );
}
