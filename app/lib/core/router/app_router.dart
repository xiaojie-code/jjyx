import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../storage/token_storage.dart';
import '../../features/auth/pages/login_page.dart';
import '../../features/auth/pages/register_page.dart';
import '../../features/chat/pages/chat_list_page.dart';
import '../../features/contacts/pages/contacts_page.dart';
import '../../features/game/pages/game_hall_page.dart';
import '../../features/shop/pages/shop_page.dart';
import '../../features/profile/pages/profile_page.dart';
import '../../features/main/main_shell.dart';

/// 路由路径常量
class RoutePaths {
  RoutePaths._();
  static const String login = '/login';
  static const String register = '/register';
  static const String main = '/';
  static const String chatList = '/chat';
  static const String contacts = '/contacts';
  static const String gameHall = '/game';
  static const String shop = '/shop';
  static const String profile = '/profile';
}

/// 全局导航 key
final rootNavigatorKey = GlobalKey<NavigatorState>();
final _shellNavigatorKey = GlobalKey<NavigatorState>();

/// GoRouter 配置
final routerProvider = Provider<GoRouter>((ref) {
  return GoRouter(
    navigatorKey: rootNavigatorKey,
    initialLocation: RoutePaths.login,
    routes: [
      // 登录页
      GoRoute(
        path: RoutePaths.login,
        builder: (context, state) => const LoginPage(),
      ),
      // 注册页
      GoRoute(
        path: RoutePaths.register,
        builder: (context, state) => const RegisterPage(),
      ),
      // 主页面 Shell（底部 TabBar）
      ShellRoute(
        navigatorKey: _shellNavigatorKey,
        builder: (context, state, child) => MainShell(child: child),
        routes: [
          GoRoute(
            path: RoutePaths.chatList,
            pageBuilder: (context, state) => const NoTransitionPage(
              child: ChatListPage(),
            ),
          ),
          GoRoute(
            path: RoutePaths.contacts,
            pageBuilder: (context, state) => const NoTransitionPage(
              child: ContactsPage(),
            ),
          ),
          GoRoute(
            path: RoutePaths.gameHall,
            pageBuilder: (context, state) => const NoTransitionPage(
              child: GameHallPage(),
            ),
          ),
          GoRoute(
            path: RoutePaths.shop,
            pageBuilder: (context, state) => const NoTransitionPage(
              child: ShopPage(),
            ),
          ),
          GoRoute(
            path: RoutePaths.profile,
            pageBuilder: (context, state) => const NoTransitionPage(
              child: ProfilePage(),
            ),
          ),
        ],
      ),
    ],
    // 重定向：无 token 跳登录，/ 跳到 /chat
    redirect: (context, state) {
      final isLoginPage = state.matchedLocation == '/login' || state.matchedLocation == '/register';
      final token = TokenStorage.getToken();

      // 未登录且不在登录页 → 跳登录
      if ((token == null || token.isEmpty) && !isLoginPage) {
        return RoutePaths.login;
      }
      // 已登录且在登录页 → 跳主页
      if (token != null && token.isNotEmpty && isLoginPage) {
        return RoutePaths.chatList;
      }
      // / 跳到 /chat
      if (state.matchedLocation == '/') {
        return RoutePaths.chatList;
      }
      return null;
    },
  );
});
