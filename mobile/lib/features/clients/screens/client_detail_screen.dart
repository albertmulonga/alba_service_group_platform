import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/services/api_service.dart';

final clientDetailProvider = FutureProvider.family<Map<String, dynamic>, String>((ref, id) async {
  final api = ref.watch(apiServiceProvider);
  final r = await api.get('/customers/$id');
  return r.data as Map<String, dynamic>;
});

class ClientDetailScreen extends ConsumerWidget {
  final String id;
  const ClientDetailScreen({super.key, required this.id});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final detail = ref.watch(clientDetailProvider(id));

    return Scaffold(
      appBar: AppBar(
        title: const Text('Fiche Client'),
        backgroundColor: AlbaColors.navy,
        leading: const BackButton(),
      ),
      body: detail.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('Erreur : $e')),
        data: (c) => SingleChildScrollView(
          padding: const EdgeInsets.all(20),
          child: Column(
            children: [
              // Header card
              Container(
                width: double.infinity, padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(colors: [AlbaColors.navy, AlbaColors.navyDefault]),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Column(children: [
                  CircleAvatar(radius: 36, backgroundColor: Colors.white.withValues(alpha: 0.2),
                    child: Text('${c['firstName']?[0] ?? ''}${c['lastName']?[0] ?? ''}'.toUpperCase(),
                      style: const TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.w700))),
                  const SizedBox(height: 12),
                  Text('${c['firstName'] ?? ''} ${c['lastName'] ?? ''}'.trim(),
                    style: const TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.w700)),
                  if ((c['companyName'] ?? '').isNotEmpty)
                    Text(c['companyName'], style: TextStyle(color: Colors.white.withValues(alpha: 0.7), fontSize: 13)),
                  const SizedBox(height: 8),
                  Text(c['code'] ?? '', style: TextStyle(color: Colors.white.withValues(alpha: 0.5), fontSize: 12, fontFamily: 'monospace')),
                ]),
              ),

              const SizedBox(height: 20),

              // Stats
              Row(children: [
                _StatCard(label: 'Commandes', value: '${c['totalOrders'] ?? 0}', color: AlbaColors.navyDefault),
                const SizedBox(width: 12),
                _StatCard(label: 'Fidélité', value: '${c['loyaltyPoints'] ?? 0} pts', color: AlbaColors.gold),
              ]),

              const SizedBox(height: 20),

              // Info card
              Card(child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(children: [
                  _InfoRow(icon: LucideIcons.phone, label: 'Téléphone', value: c['phone'] ?? '—'),
                  const Divider(height: 20),
                  _InfoRow(icon: LucideIcons.mail, label: 'Email', value: c['email'] ?? '—'),
                  const Divider(height: 20),
                  _InfoRow(icon: LucideIcons.mapPin, label: 'Ville', value: c['city'] ?? '—'),
                  const Divider(height: 20),
                  _InfoRow(icon: LucideIcons.map, label: 'Province', value: c['province'] ?? '—'),
                  const Divider(height: 20),
                  _InfoRow(icon: LucideIcons.calendar, label: 'Client depuis', value: (c['registeredAt'] ?? c['createdAt'] ?? '').toString().substring(0, 10)),
                ]),
              )),
            ],
          ),
        ),
      ),
    );
  }
}

class _StatCard extends StatelessWidget {
  final String label, value;
  final Color color;
  const _StatCard({required this.label, required this.value, required this.color});
  @override
  Widget build(BuildContext context) => Expanded(
    child: Container(
      padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 12),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: color.withValues(alpha: 0.2)),
      ),
      child: Column(children: [
        Text(value, style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800, color: color)),
        Text(label, style: const TextStyle(fontSize: 11, color: AlbaColors.grayMedium)),
      ]),
    ),
  );
}

class _InfoRow extends StatelessWidget {
  final IconData icon;
  final String label, value;
  const _InfoRow({required this.icon, required this.label, required this.value});
  @override
  Widget build(BuildContext context) => Row(
    children: [
      Icon(icon, size: 16, color: AlbaColors.navyDefault),
      const SizedBox(width: 12),
      Text(label, style: const TextStyle(fontSize: 12, color: AlbaColors.grayMedium, fontWeight: FontWeight.w500)),
      const Spacer(),
      Text(value, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
    ],
  );
}
