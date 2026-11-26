import 'package:flutter/material.dart';
import '../../../core/theme/app_theme.dart';

class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});
  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> with TickerProviderStateMixin {
  late AnimationController _logoCtrl;
  late AnimationController _barCtrl;
  late Animation<double> _logoScale;
  late Animation<double> _logoOpacity;
  late Animation<double> _barWidth;

  @override
  void initState() {
    super.initState();

    _logoCtrl = AnimationController(vsync: this, duration: const Duration(milliseconds: 900));
    _barCtrl  = AnimationController(vsync: this, duration: const Duration(milliseconds: 2400));

    _logoScale   = CurvedAnimation(parent: _logoCtrl, curve: Curves.elasticOut).drive(Tween(begin: 0.4, end: 1.0));
    _logoOpacity = Tween<double>(begin: 0, end: 1).animate(CurvedAnimation(parent: _logoCtrl, curve: Curves.easeIn));
    _barWidth    = Tween<double>(begin: 0, end: 1).animate(CurvedAnimation(parent: _barCtrl, curve: Curves.easeInOut));

    _logoCtrl.forward();
    Future.delayed(const Duration(milliseconds: 400), _barCtrl.forward);
  }

  @override
  void dispose() {
    _logoCtrl.dispose();
    _barCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [AlbaColors.navy, AlbaColors.navyLight, AlbaColors.navyDefault, AlbaColors.navyAccent],
          ),
        ),
        child: SafeArea(
          child: Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                // ── Logo ring ──
                AnimatedBuilder(
                  animation: _logoCtrl,
                  builder: (_, __) => Opacity(
                    opacity: _logoOpacity.value,
                    child: Transform.scale(
                      scale: _logoScale.value,
                      child: Container(
                        width: 110, height: 110,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: Colors.white.withValues(alpha: 0.1),
                          border: Border.all(color: Colors.white.withValues(alpha: 0.3), width: 2),
                        ),
                        child: const Center(
                          child: Text('A', style: TextStyle(
                            fontSize: 56, fontWeight: FontWeight.w900, color: Colors.white,
                          )),
                        ),
                      ),
                    ),
                  ),
                ),

                const SizedBox(height: 28),

                // ── Company name ──
                const Text('ALBA SERVICE GROUP', style: TextStyle(
                  fontSize: 22, fontWeight: FontWeight.w900, color: Colors.white, letterSpacing: 1.5,
                )),
                const SizedBox(height: 6),
                Text('Platform — Kindu, Maniema', style: TextStyle(
                  fontSize: 13, color: const Color(0xFF93C5FD).withValues(alpha: 0.9),
                  letterSpacing: 0.6,
                )),

                const SizedBox(height: 48),

                // ── Progress bar ──
                SizedBox(
                  width: 240,
                  child: Column(
                    children: [
                      Container(
                        height: 4,
                        decoration: BoxDecoration(
                          color: Colors.white.withValues(alpha: 0.15),
                          borderRadius: BorderRadius.circular(99),
                        ),
                        child: AnimatedBuilder(
                          animation: _barCtrl,
                          builder: (_, __) => FractionallySizedBox(
                            alignment: Alignment.centerLeft,
                            widthFactor: _barWidth.value,
                            child: Container(
                              decoration: BoxDecoration(
                                borderRadius: BorderRadius.circular(99),
                                gradient: const LinearGradient(colors: [Color(0xFF60A5FA), Color(0xFF34D399)]),
                              ),
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(height: 10),
                      Text('Chargement...', style: TextStyle(
                        fontSize: 11, color: Colors.white.withValues(alpha: 0.5),
                        letterSpacing: 0.5,
                      )),
                    ],
                  ),
                ),

                const SizedBox(height: 60),
                Text('v1.0.0', style: TextStyle(
                  fontSize: 10, color: Colors.white.withValues(alpha: 0.25),
                )),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
