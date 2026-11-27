import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/services/api_service.dart';
import '../../commercial/screens/quotes_screen.dart';

final invoicesProvider = FutureProvider<List<Map<String, dynamic>>>((ref) async {
  final api = ref.watch(apiServiceProvider);
  final r = await api.get('/commercial/invoices');
  final d = r.data;
  if (d is List) return d.cast<Map<String, dynamic>>();
  if (d is Map && d['data'] is List) return (d['data'] as List).cast<Map<String, dynamic>>();
  return [];
});

class InvoicesScreen extends ConsumerStatefulWidget {
  const InvoicesScreen({super.key});
  @override
  ConsumerState<InvoicesScreen> createState() => _InvoicesScreenState();
}

class _InvoicesScreenState extends ConsumerState<InvoicesScreen> with SingleTickerProviderStateMixin {
  late TabController _tabs;

  @override
  void initState() {
    super.initState();
    _tabs = TabController(length: 2, vsync: this);
  }

  @override
  void dispose() {
    _tabs.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Commercial'),
        backgroundColor: AlbaColors.navy,
        bottom: TabBar(
          controller: _tabs,
          indicatorColor: AlbaColors.gold,
          labelColor: Colors.white,
          unselectedLabelColor: Colors.white60,
          tabs: const [
            Tab(text: 'Factures'),
            Tab(text: 'Devis'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabs,
        children: const [
          _InvoicesTab(),
          QuotesScreen(),
        ],
      ),
    );
  }
}

class _InvoicesTab extends ConsumerWidget {
  const _InvoicesTab();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final invoices = ref.watch(invoicesProvider);
    return invoices.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (e, _) => Center(child: Text('Erreur: $e')),
      data: (list) {
        if (list.isEmpty) return const Center(child: _EmptyState(label: 'Aucune facture', icon: LucideIcons.fileText));

        // KPI summary
        final total   = list.fold(0.0, (s, i) => s + ((i['total'] ?? 0) as num).toDouble());
        final unpaid  = list.where((i) => (i['status'] ?? '').toLowerCase() != 'paid').length;
        final paid    = list.where((i) => (i['status'] ?? '').toLowerCase() == 'paid').length;

        return Column(
          children: [
            // KPIs
            Padding(
              padding: const EdgeInsets.all(16),
              child: Row(children: [
                _KpiChip(label: 'Total', value: '${list.length}', color: AlbaColors.navyDefault),
                const SizedBox(width: 10),
                _KpiChip(label: 'Payées', value: '$paid', color: AlbaColors.success),
                const SizedBox(width: 10),
                _KpiChip(label: 'En attente', value: '$unpaid', color: AlbaColors.warning),
              ]),
            ),
            Expanded(
              child: RefreshIndicator(
                onRefresh: () async => ref.invalidate(invoicesProvider),
                child: ListView.builder(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  itemCount: list.length,
                  itemBuilder: (_, i) {
                    final inv = list[i];
                    final status = (inv['status'] ?? 'draft').toLowerCase();
                    final customerName = inv['customer'] is Map
                      ? '${inv['customer']['firstName'] ?? ''} ${inv['customer']['lastName'] ?? ''}'.trim()
                      : '—';
                    final total = ((inv['total'] ?? 0) as num).toDouble();

                    return Card(
                      margin: const EdgeInsets.only(bottom: 10),
                      child: ListTile(
                        leading: Container(
                          width: 44, height: 44,
                          decoration: BoxDecoration(
                            color: _statusColor(status).withValues(alpha: 0.1),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Icon(LucideIcons.fileText, size: 20, color: _statusColor(status)),
                        ),
                        title: Text(inv['reference'] ?? inv['number'] ?? '—',
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
                                color: _statusColor(status).withValues(alpha: 0.1),
                                borderRadius: BorderRadius.circular(99),
                              ),
                              child: Text(_statusLabel(status),
                                style: TextStyle(fontSize: 10, color: _statusColor(status), fontWeight: FontWeight.w600)),
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
    );
  }

  Color _statusColor(String s) => switch (s) {
    'paid' => AlbaColors.success, 'partial' => AlbaColors.warning,
    'cancelled' => AlbaColors.danger, _ => AlbaColors.navyDefault,
  };

  String _statusLabel(String s) => switch (s) {
    'paid' => 'Payée', 'partial' => 'Partielle',
    'cancelled' => 'Annulée', 'draft' => 'Brouillon',
    _ => s.toUpperCase(),
  };
}

class _KpiChip extends StatelessWidget {
  final String label, value;
  final Color color;
  const _KpiChip({required this.label, required this.value, required this.color});
  @override
  Widget build(BuildContext context) => Expanded(
    child: Container(
      padding: const EdgeInsets.symmetric(vertical: 10),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(14),
      ),
      child: Column(children: [
        Text(value, style: TextStyle(fontWeight: FontWeight.w800, fontSize: 18, color: color)),
        Text(label, style: const TextStyle(fontSize: 10, color: AlbaColors.grayMedium)),
      ]),
    ),
  );
}

class _EmptyState extends StatelessWidget {
  final String label;
  final IconData icon;
  const _EmptyState({required this.label, required this.icon});
  @override
  Widget build(BuildContext context) => Column(
    mainAxisAlignment: MainAxisAlignment.center,
    children: [
      Icon(icon, size: 48, color: AlbaColors.grayMedium.withValues(alpha: 0.5)),
      const SizedBox(height: 12),
      Text(label, style: const TextStyle(color: AlbaColors.grayMedium)),
    ],
  );
}
