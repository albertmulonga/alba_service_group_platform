import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/services/api_service.dart';

final revenuesProvider = FutureProvider<List<Map<String, dynamic>>>((ref) async {
  final api = ref.watch(apiServiceProvider);
  final r = await api.get('/finance/revenues', params: {'limit': '100'});
  final d = r.data;
  if (d is List) return d.cast<Map<String, dynamic>>();
  if (d is Map && d['data'] is List) return (d['data'] as List).cast<Map<String, dynamic>>();
  return [];
});

final expensesProvider = FutureProvider<List<Map<String, dynamic>>>((ref) async {
  final api = ref.watch(apiServiceProvider);
  final r = await api.get('/finance/expenses', params: {'limit': '100'});
  final d = r.data;
  if (d is List) return d.cast<Map<String, dynamic>>();
  if (d is Map && d['data'] is List) return (d['data'] as List).cast<Map<String, dynamic>>();
  return [];
});

class CashScreen extends ConsumerWidget {
  const CashScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final revenues = ref.watch(revenuesProvider);
    final expenses = ref.watch(expensesProvider);

    final totalIncome  = revenues.maybeWhen(data: (l) => l.fold(0.0, (s, e) => s + ((e['amount'] ?? 0) as num).toDouble()), orElse: () => 0.0);
    final totalExpense = expenses.maybeWhen(data: (l) => l.fold(0.0, (s, e) => s + ((e['amount'] ?? 0) as num).toDouble()), orElse: () => 0.0);
    final balance = totalIncome - totalExpense;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Caisse & Finance'),
        backgroundColor: AlbaColors.navy,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            // Balance card
            Container(
              width: double.infinity, padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: balance >= 0
                    ? [const Color(0xFF065F46), const Color(0xFF059669)]
                    : [const Color(0xFF7F1D1D), const Color(0xFFDC2626)],
                ),
                borderRadius: BorderRadius.circular(20),
              ),
              child: Column(children: [
                Text('Solde de Caisse', style: TextStyle(color: Colors.white.withValues(alpha: 0.7), fontSize: 13)),
                const SizedBox(height: 8),
                Text('${balance.toStringAsFixed(0)} FC',
                  style: const TextStyle(color: Colors.white, fontSize: 32, fontWeight: FontWeight.w900)),
              ]),
            ),
            const SizedBox(height: 16),

            Row(children: [
              _SummaryCard(label: 'Encaissements', amount: totalIncome, color: AlbaColors.success, icon: LucideIcons.trendingUp),
              const SizedBox(width: 12),
              _SummaryCard(label: 'Décaissements', amount: totalExpense, color: AlbaColors.danger, icon: LucideIcons.trendingDown),
            ]),
            const SizedBox(height: 20),

            // Transactions list
            const Align(alignment: Alignment.centerLeft,
              child: Text('Dernières opérations', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15))),
            const SizedBox(height: 10),

            revenues.when(
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (e, _) => Text('Erreur: $e'),
              data: (revList) {
                return Column(
                  children: revList.take(10).map((r) => Card(
                    margin: const EdgeInsets.only(bottom: 8),
                    child: ListTile(
                      leading: Container(
                        width: 40, height: 40,
                        decoration: BoxDecoration(
                          color: AlbaColors.success.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: const Icon(LucideIcons.trendingUp, size: 18, color: AlbaColors.success),
                      ),
                      title: Text(r['description'] ?? '—', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
                      subtitle: Text((r['createdAt'] ?? '').toString().substring(0, 10), style: const TextStyle(fontSize: 11, color: AlbaColors.grayMedium)),
                      trailing: Text('+${((r['amount'] ?? 0) as num).toStringAsFixed(0)} FC',
                        style: const TextStyle(fontWeight: FontWeight.w700, color: AlbaColors.success, fontSize: 13)),
                    ),
                  )).toList(),
                );
              },
            ),
          ],
        ),
      ),
    );
  }
}

class _SummaryCard extends StatelessWidget {
  final String label;
  final double amount;
  final Color color;
  final IconData icon;
  const _SummaryCard({required this.label, required this.amount, required this.color, required this.icon});

  @override
  Widget build(BuildContext context) => Expanded(
    child: Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: color.withValues(alpha: 0.2)),
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Icon(icon, size: 16, color: color),
          const SizedBox(width: 6),
          Text(label, style: TextStyle(fontSize: 11, color: color, fontWeight: FontWeight.w600)),
        ]),
        const SizedBox(height: 8),
        Text('${amount.toStringAsFixed(0)} FC',
          style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: color)),
      ]),
    ),
  );
}
