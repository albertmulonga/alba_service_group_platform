import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/services/api_service.dart';

final clientsProvider = FutureProvider<List<Map<String, dynamic>>>((ref) async {
  final api = ref.watch(apiServiceProvider);
  final r = await api.get('/customers');
  final data = r.data;
  if (data is List) return data.cast<Map<String, dynamic>>();
  if (data is Map && data['data'] is List) return (data['data'] as List).cast<Map<String, dynamic>>();
  return [];
});

class ClientsScreen extends ConsumerStatefulWidget {
  const ClientsScreen({super.key});
  @override
  ConsumerState<ClientsScreen> createState() => _ClientsScreenState();
}

class _ClientsScreenState extends ConsumerState<ClientsScreen> {
  String _search = '';

  @override
  Widget build(BuildContext context) {
    final clients = ref.watch(clientsProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Clients & CRM'),
        backgroundColor: AlbaColors.navy,
        actions: [
          IconButton(icon: const Icon(LucideIcons.refreshCw, size: 18), onPressed: () => ref.invalidate(clientsProvider)),
        ],
      ),
      body: Column(
        children: [
          // Search bar
          Padding(
            padding: const EdgeInsets.all(16),
            child: TextField(
              decoration: InputDecoration(
                hintText: 'Rechercher un client...',
                prefixIcon: const Icon(LucideIcons.search, size: 18),
                filled: true,
                fillColor: Colors.white,
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: BorderSide.none),
              ),
              onChanged: (v) => setState(() => _search = v.toLowerCase()),
            ),
          ),

          // List
          Expanded(
            child: clients.when(
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (e, _) => _ErrorView(message: e.toString(), onRetry: () => ref.invalidate(clientsProvider)),
              data: (list) {
                final filtered = list.where((c) {
                  final name = '${c['firstName'] ?? ''} ${c['lastName'] ?? ''} ${c['companyName'] ?? ''}'.toLowerCase();
                  return _search.isEmpty || name.contains(_search);
                }).toList();

                if (filtered.isEmpty) {
                  return const Center(child: _EmptyState(label: 'Aucun client trouvé', icon: LucideIcons.users));
                }

                return RefreshIndicator(
                  onRefresh: () async => ref.invalidate(clientsProvider),
                  child: ListView.builder(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    itemCount: filtered.length,
                    itemBuilder: (ctx, i) {
                      final c = filtered[i];
                      final name = '${c['firstName'] ?? ''} ${c['lastName'] ?? ''}'.trim();
                      final company = c['companyName'] ?? '';
                      final phone = c['phone'] ?? '';
                      final status = c['status'] ?? 'ACTIVE';
                      return _ClientTile(
                        name: name, company: company, phone: phone,
                        status: status, code: c['code'] ?? '',
                        onTap: () => context.go('/clients/${c['id']}'),
                      );
                    },
                  ),
                );
              },
            ),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _showAddModal(context),
        icon: const Icon(LucideIcons.plus, size: 18),
        label: const Text('Nouveau client'),
        backgroundColor: AlbaColors.navyDefault,
      ),
    );
  }

  void _showAddModal(BuildContext context) {
    showModalBottomSheet(
      context: context, isScrollControlled: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (_) => const _AddClientModal(),
    );
  }
}

class _ClientTile extends StatelessWidget {
  final String name, company, phone, status, code;
  final VoidCallback onTap;
  const _ClientTile({required this.name, required this.company, required this.phone, required this.status, required this.code, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final isActive = status == 'ACTIVE';
    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      child: ListTile(
        onTap: onTap,
        leading: CircleAvatar(
          backgroundColor: AlbaColors.navyDefault.withValues(alpha: 0.1),
          child: Text(name.isNotEmpty ? name[0].toUpperCase() : 'C',
            style: const TextStyle(color: AlbaColors.navyDefault, fontWeight: FontWeight.w700)),
        ),
        title: Text(name, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (company.isNotEmpty) Text(company, style: const TextStyle(fontSize: 12, color: AlbaColors.grayMedium)),
            if (phone.isNotEmpty) Text(phone, style: const TextStyle(fontSize: 12, color: AlbaColors.grayMedium)),
          ],
        ),
        trailing: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            Text(code, style: const TextStyle(fontSize: 10, fontFamily: 'monospace', color: AlbaColors.grayMedium)),
            const SizedBox(height: 4),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
              decoration: BoxDecoration(
                color: isActive ? AlbaColors.success.withValues(alpha: 0.1) : Colors.grey.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(99),
              ),
              child: Text(isActive ? 'Actif' : 'Inactif',
                style: TextStyle(fontSize: 10, color: isActive ? AlbaColors.success : AlbaColors.grayMedium, fontWeight: FontWeight.w600)),
            ),
          ],
        ),
      ),
    );
  }
}

class _AddClientModal extends ConsumerStatefulWidget {
  const _AddClientModal();
  @override
  ConsumerState<_AddClientModal> createState() => _AddClientModalState();
}

class _AddClientModalState extends ConsumerState<_AddClientModal> {
  final _firstNameCtrl = TextEditingController();
  final _lastNameCtrl  = TextEditingController();
  final _phoneCtrl     = TextEditingController();
  final _emailCtrl     = TextEditingController();
  bool _loading = false;

  Future<void> _save() async {
    if (_firstNameCtrl.text.isEmpty || _lastNameCtrl.text.isEmpty) return;
    setState(() => _loading = true);
    try {
      final api = ref.read(apiServiceProvider);
      await api.offlinePost('/customers', {
        'firstName': _firstNameCtrl.text.trim(),
        'lastName': _lastNameCtrl.text.trim(),
        'phone': _phoneCtrl.text.trim(),
        'email': _emailCtrl.text.trim(),
        'status': 'ACTIVE',
      }, 'current-user');
      ref.invalidate(clientsProvider);
      if (mounted) Navigator.pop(context);
    } finally { if (mounted) setState(() => _loading = false); }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
      child: Container(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Text('Nouveau client', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
            const SizedBox(height: 20),
            Row(children: [
              Expanded(child: TextField(controller: _firstNameCtrl, decoration: const InputDecoration(labelText: 'Prénom *'))),
              const SizedBox(width: 12),
              Expanded(child: TextField(controller: _lastNameCtrl, decoration: const InputDecoration(labelText: 'Nom *'))),
            ]),
            const SizedBox(height: 12),
            TextField(controller: _phoneCtrl, keyboardType: TextInputType.phone, decoration: const InputDecoration(labelText: 'Téléphone')),
            const SizedBox(height: 12),
            TextField(controller: _emailCtrl, keyboardType: TextInputType.emailAddress, decoration: const InputDecoration(labelText: 'Email')),
            const SizedBox(height: 20),
            ElevatedButton(
              onPressed: _loading ? null : _save,
              child: _loading ? const SizedBox(h: 20, width: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2)) : const Text('Enregistrer'),
            ),
          ],
        ),
      ),
    );
  }
}
