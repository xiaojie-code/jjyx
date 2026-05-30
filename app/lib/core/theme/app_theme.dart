import 'package:flutter/material.dart';

/// 2D卡通风格主题
class AppTheme {
  AppTheme._();

  // 主色调 - 活泼的蓝色
  static const Color primaryColor = Color(0xFF4A90D9);
  // 辅助色 - 暖橙色
  static const Color accentColor = Color(0xFFFF9F43);
  // 背景色 - 浅灰蓝
  static const Color backgroundColor = Color(0xFFF5F7FA);
  // 卡片背景
  static const Color cardColor = Colors.white;
  // 文字主色
  static const Color textPrimary = Color(0xFF2D3436);
  // 文字次要色
  static const Color textSecondary = Color(0xFF636E72);
  // 分割线
  static const Color dividerColor = Color(0xFFE0E0E0);
  // 成功色
  static const Color successColor = Color(0xFF2ED573);
  // 错误色
  static const Color errorColor = Color(0xFFFF4757);
  // 底部导航栏选中色
  static const Color navActiveColor = primaryColor;
  // 底部导航栏未选中色
  static const Color navInactiveColor = Color(0xFFB2BEC3);

  static ThemeData get lightTheme {
    return ThemeData(
      useMaterial3: true,
      colorScheme: ColorScheme.fromSeed(
        seedColor: primaryColor,
        primary: primaryColor,
        secondary: accentColor,
        surface: cardColor,
        error: errorColor,
      ),
      scaffoldBackgroundColor: backgroundColor,
      appBarTheme: const AppBarTheme(
        backgroundColor: primaryColor,
        foregroundColor: Colors.white,
        elevation: 0,
        centerTitle: true,
      ),
      bottomNavigationBarTheme: const BottomNavigationBarThemeData(
        backgroundColor: Colors.white,
        selectedItemColor: navActiveColor,
        unselectedItemColor: navInactiveColor,
        type: BottomNavigationBarType.fixed,
        elevation: 8,
      ),
      cardTheme: CardTheme(
        color: cardColor,
        elevation: 2,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
        ),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: primaryColor,
          foregroundColor: Colors.white,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(24),
          ),
          padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 14),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: Colors.white,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: dividerColor),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: dividerColor),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: primaryColor, width: 2),
        ),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      ),
    );
  }
}
