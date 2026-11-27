import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/services/api_service.dart';

final productsProvider = FutureProvider<List<Map<String, dynamic>>>((ref) async {
  final api = ref.watch(apiServiceProvider);
  final r = await api.get('/stock/products');
  final d = r.data;
  if (d is List) return d.cast<Map<String, dynamic>>();
  if (d is Map && d['data'] is List) return (d['data'] as List).cast<Map<String, dynamic>>();
  return [];
});

class StockScreen extends ConsumerWidget {
  const StockScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final products = ref.watch(productsProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Gestion des Stocks'),
        backgroundColor: AlbaColors.navy,
      ),
      body: products.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('Erreur : $e')),
        data: (list) {
          final lowStock = list.where((p) {
            final cur = (p['currentStock'] ?? 0) as num;
            final min = (p['minStock'] ?? 0) as num;
            return cur <= min;
          }).length;

          return Column(
            children: [
              // Alert banner
              if (lowStock > 0)
                Container(
                  margin: const EdgeInsets.all(16),
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: AlbaColors.danger.withValues(alpha: 0.08),
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: AlbaColors.danger.withValues(alpha: 0.3)),
                  ),
                  child: Row(children: [
                    const Icon(LucideIcons.alertTriangle, size: 18, color: AlbaColors.danger),
                    const SizedBox(width: 10),
                    Expanded(child: Text('$lowStock produit(s) sous le seuil minimum',
                      style: const TextStyle(fontSize: 12, color: AlbaColors.danger, fontWeight: FontWeight.w600))),
                  ]),
                ),

              Expanded(
                child: RefreshIndicator(
                  onRefresh: () async => ref.invalidate(productsProvider),
                  child: list.isEmpty
                    ? const Center(child: Text('Aucun produit', style: TextStyle(color: Colors.grey)))
                    : ListView.builder(
                        padding: const EdgeInsets.symmetric(horizontal: 16),
                        itemCount: list.length,
                        itemBuilder: (_, i) {
                          final p = list[i];
                          final cur = ((p['currentStock'] ?? 0) as num).toDouble();
                          final min = ((p['minStock'] ?? 0) as num).toDouble();
                          final isLow = cur <= min;
                          final price = ((p['sellingPrice'] ?? p['purchasePrice'] ?? 0) as num).toDouble();

                          return Card(
                            margin: const EdgeInsets.only(bottom: 10),
                            child: ListTile(
                              leading: Container(
                                width: 44, height: 44,
                                decoration: BoxDecoration(
                                  color: (isLow ? AlbaColors.danger : AlbaColors.navyDefault).withValues(alpha: 0.1),
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                child: Icon(LucideIcons.package, size: 20,
                                  color: isLow ? AlbaColors.danger : AlbaColors.navyDefault),
                              ),
                              title: Text(p['name'] ?? '—',
                                style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
                              subtitle: Text(p['code'] ?? '',
                                style: const TextStyle(fontSize: 11, color: AlbaColors.grayMedium, fontFamily: 'monospace')),
                              trailing: Column(
                                mainAxisAlignment: MainAxisAlignment.center,
                                crossAxisAlignment: CrossAxisAlignment.end,
                                children: [
                                  Text('${cur.toStringAsFixed(0)} en stock',
                                    style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700,
                                      color: isLow ? AlbaColors.danger : AlbaColors.grayDark)),
                                  const SizedBox(height: 4),
                                  Text('${price.toStringAsFixed(0)} FC',
                                    style: const TextStyle(fontSize: 11, color: AlbaColors.grayMedium)),
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
