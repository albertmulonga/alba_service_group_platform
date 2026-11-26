import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// ═══════════════════════════════════════════════════════════════
/// ALBA SERVICE GROUP — Identité visuelle
/// Bleu marine (primaire) · Or (secondaire) · Blanc · Gris clair
/// ═══════════════════════════════════════════════════════════════

class AlbaColors {
  // Primary — Bleu marine
  static const navy        = Color(0xFF06103A);
  static const navyLight   = Color(0xFF0F2460);
  static const navyDefault = Color(0xFF1E3A8A);
  static const navyAccent  = Color(0xFF1D4ED8);

  // Secondary — Or
  static const gold        = Color(0xFFD4A017);
  static const goldLight   = Color(0xFFF5C542);
  static const goldDark    = Color(0xFFB8860B);

  // Neutrals
  static const white       = Color(0xFFFFFFFF);
  static const grayLight   = Color(0xFFF5F7FA);
  static const grayMedium  = Color(0xFF9CA3AF);
  static const grayDark    = Color(0xFF374151);

  // Semantic
  static const success     = Color(0xFF22C55E);
  static const warning     = Color(0xFFF59E0B);
  static const danger      = Color(0xFFEF4444);
  static const info        = Color(0xFF3B82F6);
}

class AppTheme {
  static ThemeData get lightTheme => ThemeData(
    useMaterial3: true,
    brightness: Brightness.light,
    colorScheme: const ColorScheme.light(
      primary: AlbaColors.navyDefault,
      onPrimary: AlbaColors.white,
      secondary: AlbaColors.gold,
      onSecondary: AlbaColors.white,
      surface: AlbaColors.white,
      onSurface: AlbaColors.grayDark,
      error: AlbaColors.danger,
    ),
    scaffoldBackgroundColor: AlbaColors.grayLight,
    appBarTheme: const AppBarTheme(
      backgroundColor: AlbaColors.navy,
      foregroundColor: AlbaColors.white,
      elevation: 0,
      centerTitle: true,
      titleTextStyle: TextStyle(
        fontFamily: 'Poppins',
        fontSize: 18,
        fontWeight: FontWeight.w600,
        color: AlbaColors.white,
      ),
    ),
    cardTheme: CardTheme(
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: BorderSide(color: AlbaColors.grayLight, width: 1),
      ),
    ),
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: AlbaColors.navyDefault,
        foregroundColor: AlbaColors.white,
        minimumSize: const Size(double.infinity, 52),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
        textStyle: const TextStyle(
          fontFamily: 'Poppins',
          fontSize: 15,
          fontWeight: FontWeight.w600,
        ),
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: AlbaColors.grayLight,
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: BorderSide.none,
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: const BorderSide(color: AlbaColors.navyDefault, width: 1.5),
      ),
      labelStyle: const TextStyle(fontSize: 14, color: AlbaColors.grayDark),
    ),
    floatingActionButtonTheme: const FloatingActionButtonThemeData(
      backgroundColor: AlbaColors.navyDefault,
      foregroundColor: AlbaColors.white,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
    ),
    navigationBarTheme: NavigationBarThemeData(
      backgroundColor: AlbaColors.white,
      indicatorColor: AlbaColors.navyDefault.withValues(alpha: 0.1),
      labelTextStyle: const WidgetStatePropertyAll(
        TextStyle(fontSize: 11, fontWeight: FontWeight.w500, color: AlbaColors.navyDefault),
      ),
    ),
    snackBarTheme: SnackBarThemeData(
      behavior: SnackBarBehavior.floating,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      backgroundColor: AlbaColors.navy,
    ),
  );

  static ThemeData get darkTheme => ThemeData(
    useMaterial3: true,
    brightness: Brightness.dark,
    colorScheme: const ColorScheme.dark(
      primary: AlbaColors.gold,
      onPrimary: AlbaColors.navy,
      secondary: AlbaColors.navyAccent,
      surface: Color(0xFF111827),
      onSurface: Color(0xFFE5E7EB),
      error: AlbaColors.danger,
    ),
    scaffoldBackgroundColor: const Color(0xFF0B1220),
    appBarTheme: const AppBarTheme(
      backgroundColor: Color(0xFF0F2460),
      foregroundColor: AlbaColors.white,
      elevation: 0,
      centerTitle: true,
    ),
  );
}

/// ─── Theme mode provider ────────────────────────────────────────────────────
final themeModeProvider = StateProvider<ThemeMode>((ref) {
  // TODO: read from shared_preferences
  return ThemeMode.system;
});
