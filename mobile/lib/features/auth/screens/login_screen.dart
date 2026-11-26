import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/services/auth_service.dart';

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});
  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _formKey     = GlobalKey<FormState>();
  final _emailCtrl   = TextEditingController();
  final _pwdCtrl     = TextEditingController();
  bool _obscure      = true;
  bool _loading      = false;
  String? _error;

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate() || _loading) return;

    setState(() { _loading = true; _error = null; });
    final error = await ref.read(authServiceProvider.notifier)
        .login(_emailCtrl.text.trim(), _pwdCtrl.text);

    if (!mounted) return;
    if (error == null) {
      context.go('/home');
    } else {
      setState(() { _error = error; _loading = false; });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter, end: Alignment.bottomCenter,
            colors: [AlbaColors.navy, AlbaColors.navyLight],
          ),
        ),
        child: SafeArea(
          child: Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(28),
              child: Column(
                children: [
                  // ── Logo ──
                  Container(
                    width: 88, height: 88,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: Colors.white.withValues(alpha: 0.1),
                      border: Border.all(color: Colors.white.withValues(alpha: 0.3), width: 2),
                    ),
                    child: const Center(child: Text('A', style: TextStyle(
                      fontSize: 42, fontWeight: FontWeight.w900, color: Colors.white,
                    ))),
                  ),
                  const SizedBox(height: 20),
                  const Text('ALBA SERVICE GROUP', style: TextStyle(
                    fontSize: 20, fontWeight: FontWeight.w800, color: Colors.white, letterSpacing: 1,
                  )),
                  Text('Espace professionnel', style: TextStyle(
                    fontSize: 12, color: const Color(0xFF93C5FD).withValues(alpha: 0.85),
                  )),

                  const SizedBox(height: 40),

                  // ── Card ──
                  Container(
                    padding: const EdgeInsets.all(24),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(24),
                      boxShadow: [BoxShadow(
                        color: Colors.black.withValues(alpha: 0.2),
                        blurRadius: 24, offset: const Offset(0, 10),
                      )],
                    ),
                    child: Form(
                      key: _formKey,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          const Text('Connexion', style: TextStyle(
                            fontSize: 20, fontWeight: FontWeight.w700, color: AlbaColors.navy,
                          )),
                          const SizedBox(height: 4),
                          const Text('Accédez à votre espace de travail', style: TextStyle(
                            fontSize: 13, color: AlbaColors.grayMedium,
                          )),
                          const SizedBox(height: 24),

                          // Email
                          TextFormField(
                            controller: _emailCtrl,
                            keyboardType: TextInputType.emailAddress,
                            decoration: const InputDecoration(
                              labelText: 'Adresse e-mail',
                              prefixIcon: Icon(LucideIcons.mail, size: 20),
                            ),
                            validator: (v) {
                              if (v == null || v.isEmpty) return 'Adresse e-mail requise';
                              if (!RegExp(r'^[^@\s]+@[^@\s]+\.[^@\s]+$').hasMatch(v)) return 'Adresse e-mail invalide';
                              return null;
                            },
                          ),
                          const SizedBox(height: 16),

                          // Password
                          TextFormField(
                            controller: _pwdCtrl,
                            obscureText: _obscure,
                            decoration: InputDecoration(
                              labelText: 'Mot de passe',
                              prefixIcon: const Icon(LucideIcons.lock, size: 20),
                              suffixIcon: IconButton(
                                icon: Icon(_obscure ? LucideIcons.eyeOff : LucideIcons.eye, size: 20),
                                onPressed: () => setState(() => _obscure = !_obscure),
                              ),
                            ),
                            validator: (v) {
                              if (v == null || v.isEmpty) return 'Mot de passe requis';
                              if (v.length < 4) return 'Mot de passe trop court';
                              return null;
                            },
                          ),
                          const SizedBox(height: 8),

                          Align(
                            alignment: Alignment.centerRight,
                            child: TextButton(
                              onPressed: () {},
                              child: const Text('Mot de passe oublié ?', style: TextStyle(
                                fontSize: 12, color: AlbaColors.navyDefault,
                              )),
                            ),
                          ),
                          const SizedBox(height: 12),

                          // Error
                          if (_error != null) ...[
                            Container(
                              padding: const EdgeInsets.all(12),
                              decoration: BoxDecoration(
                                color: AlbaColors.danger.withValues(alpha: 0.08),
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(color: AlbaColors.danger.withValues(alpha: 0.3)),
                              ),
                              child: Row(
                                children: [
                                  const Icon(LucideIcons.alertCircle, size: 16, color: AlbaColors.danger),
                                  const SizedBox(width: 8),
                                  Expanded(child: Text(_error!, style: const TextStyle(
                                    fontSize: 12, color: AlbaColors.danger,
                                  ))),
                                ],
                              ),
                            ),
                            const SizedBox(height: 12),
                          ],

                          // Submit
                          ElevatedButton(
                            onPressed: _loading ? null : _submit,
                            child: _loading
                                ? const SizedBox(height: 22, width: 22,
                                    child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2.5))
                                : const Text('Se connecter'),
                          ),
                        ],
                      ),
                    ),
                  ),

                  const SizedBox(height: 24),
                  Text('© 2026 ALBA SERVICE GROUP — Kindu, RDC',
                    style: TextStyle(fontSize: 10, color: Colors.white.withValues(alpha: 0.4)),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
