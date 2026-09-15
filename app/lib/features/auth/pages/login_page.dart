import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/network/api_client.dart';
import '../../../core/network/api_endpoints.dart';
import '../../../core/router/app_router.dart';
import '../../../core/storage/token_storage.dart';
import '../providers/auth_provider.dart';
import '../widgets/forgot_password_dialog.dart';

class LoginPage extends ConsumerStatefulWidget {
  const LoginPage({super.key});

  @override
  ConsumerState<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends ConsumerState<LoginPage> {
  final _accountCtrl = TextEditingController();
  final _passwordCtrl = _PasswordEditingController();
  bool _obscurePassword = true;
  bool _rememberPassword = false;
  bool _hasRememberedLogin = false;
  String? _rememberedAccount;
  String? _rememberedPassword;
  String? _autoFilledAccount;

  @override
  void initState() {
    super.initState();
    _rememberedAccount = TokenStorage.getRememberedLoginAccount();
    _rememberedPassword = TokenStorage.getRememberedLoginPassword();
    _accountCtrl.addListener(_handleAccountChanged);
    if (_rememberedAccount != null && _rememberedPassword != null) {
      _accountCtrl.text = _rememberedAccount!;
      _fillRememberedPassword();
    }
  }

  void _handleAccountChanged() {
    final account = _accountCtrl.text.trim();
    final matchesRemembered = account.isNotEmpty &&
        account == _rememberedAccount &&
        _rememberedPassword != null;

    if (matchesRemembered) {
      _hasRememberedLogin = true;
      if (_autoFilledAccount != account) _fillRememberedPassword();
    } else {
      _hasRememberedLogin = false;
      _rememberPassword = false;
      if (_autoFilledAccount != null && _autoFilledAccount != account) {
        _passwordCtrl.setPassword('');
        _autoFilledAccount = null;
      }
    }
    if (mounted) setState(() {});
  }

  void _fillRememberedPassword() {
    final password = _rememberedPassword;
    final account = _rememberedAccount;
    if (password == null || account == null) return;
    _passwordCtrl.setPassword(password);
    _autoFilledAccount = account;
    _rememberPassword = true;
  }

  Future<void> _login() async {
    final account = _accountCtrl.text.trim();
    final password = _passwordCtrl.text.trim();
    if (account.isEmpty || password.isEmpty) {
      _showToast('请输入账号和密码');
      return;
    }
    final success =
        await ref.read(authProvider.notifier).login(account, password);
    if (!mounted) return;

    if (!success) {
      final error = ref.read(authProvider).error;
      if (error != null) _showToast(error);
      return;
    }

    if (_rememberPassword) {
      await TokenStorage.saveRememberedLogin(account, password);
    } else if (_rememberedAccount == account) {
      await TokenStorage.clearRememberedLogin();
    }
    if (!mounted) return;
    context.go(RoutePaths.chatList);
  }

  Future<void> _showForgotPasswordDialog() async {
    final submitted = await showDialog<bool>(
      context: context,
      barrierDismissible: false,
      builder: (_) => ForgotPasswordDialog(
        initialAccount: _accountCtrl.text.trim(),
        onSubmit: (account, phone) async {
          await ref.read(apiClientProvider).post(
            ApiEndpoints.passwordResetRequest,
            data: {'account': account, 'phone': phone},
          );
        },
      ),
    );
    if (mounted && submitted == true) {
      _showToast('申请已提交，请等待管理员处理');
    }
  }

  void _showToast(String message) {
    final overlay = Overlay.of(context);
    final entry = OverlayEntry(
      builder: (context) => _ToastOverlay(message: message),
    );
    overlay.insert(entry);
    Future.delayed(const Duration(seconds: 3), () {
      entry.remove();
    });
  }

  @override
  void dispose() {
    _accountCtrl.removeListener(_handleAccountChanged);
    _accountCtrl.dispose();
    _passwordCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authProvider);

    return Scaffold(
      resizeToAvoidBottomInset: true,
      body: SafeArea(
        child: LayoutBuilder(
          builder: (context, constraints) {
            final keyboardOpen = MediaQuery.viewInsetsOf(context).bottom > 0;
            final logoSize =
                keyboardOpen || constraints.maxHeight < 640 ? 108.0 : 170.0;
            final topPadding = keyboardOpen ? 16.0 : 32.0;
            final titleGap = keyboardOpen ? 24.0 : 48.0;
            final minHeight = constraints.maxHeight > topPadding + 24
                ? constraints.maxHeight - topPadding - 24
                : 0.0;

            return SingleChildScrollView(
              keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
              padding: EdgeInsets.fromLTRB(32, topPadding, 32, 24),
              child: ConstrainedBox(
                constraints: BoxConstraints(minHeight: minHeight),
                child: IntrinsicHeight(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Container(
                        width: logoSize,
                        height: logoSize,
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(30),
                          boxShadow: const [
                            BoxShadow(
                              color: Color(0x14000000),
                              blurRadius: 22,
                              offset: Offset(0, 10),
                            ),
                          ],
                        ),
                        clipBehavior: Clip.antiAlias,
                        child: Image.asset(
                          'assets/app-icon/new-icon-original.png',
                          fit: BoxFit.cover,
                          errorBuilder: (context, error, stackTrace) =>
                              const Center(
                            child: Icon(
                              Icons.image_not_supported_outlined,
                              color: Colors.grey,
                              size: 48,
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(height: 16),
                      const Text(
                        '云AI智能平台',
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          fontSize: 28,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      SizedBox(height: titleGap),
                      TextField(
                        controller: _accountCtrl,
                        decoration: const InputDecoration(
                          labelText: '账号',
                          border: OutlineInputBorder(),
                          prefixIcon: Icon(Icons.person),
                        ),
                      ),
                      AnimatedSwitcher(
                        duration: const Duration(milliseconds: 180),
                        child: _hasRememberedLogin
                            ? Align(
                                key: const ValueKey('remembered-login'),
                                alignment: Alignment.centerLeft,
                                child: Padding(
                                  padding: const EdgeInsets.only(top: 6),
                                  child: Row(
                                    children: [
                                      const Icon(Icons.check_circle,
                                          size: 15, color: Colors.green),
                                      const SizedBox(width: 5),
                                      Text(
                                        '已找到保存的登录信息，密码已自动填充',
                                        style: TextStyle(
                                          color: Colors.green.shade700,
                                          fontSize: 12,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              )
                            : const SizedBox.shrink(
                                key: ValueKey('no-remembered-login'),
                              ),
                      ),
                      const SizedBox(height: 16),
                      TextField(
                        controller: _passwordCtrl,
                        obscureText: false,
                        enableSuggestions: false,
                        autocorrect: false,
                        keyboardType: TextInputType.visiblePassword,
                        textInputAction: TextInputAction.done,
                        decoration: InputDecoration(
                          labelText: '密码',
                          border: const OutlineInputBorder(),
                          prefixIcon: const Icon(Icons.lock),
                          suffixIcon: IconButton(
                            tooltip: _obscurePassword ? '显示密码' : '隐藏密码',
                            icon: Icon(_obscurePassword
                                ? Icons.visibility_outlined
                                : Icons.visibility_off_outlined),
                            onPressed: () {
                              setState(() {
                                _obscurePassword = !_obscurePassword;
                                _passwordCtrl.setObscured(_obscurePassword);
                              });
                            },
                          ),
                        ),
                        onSubmitted: (_) => _login(),
                      ),
                      Row(
                        children: [
                          Checkbox(
                            value: _rememberPassword,
                            onChanged: (value) {
                              setState(
                                  () => _rememberPassword = value ?? false);
                            },
                          ),
                          const Text('记住密码'),
                          if (_hasRememberedLogin)
                            const Padding(
                              padding: EdgeInsets.only(left: 8),
                              child: Text(
                                '已保存',
                                style: TextStyle(
                                  color: Colors.green,
                                  fontSize: 12,
                                ),
                              ),
                            ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      Align(
                        alignment: Alignment.centerRight,
                        child: TextButton(
                          onPressed: _showForgotPasswordDialog,
                          child: const Text('忘记密码？'),
                        ),
                      ),
                      const SizedBox(height: 12),
                      SizedBox(
                        width: double.infinity,
                        height: 48,
                        child: ElevatedButton(
                          onPressed: authState.isLoading ? null : _login,
                          child: authState.isLoading
                              ? const SizedBox(
                                  width: 20,
                                  height: 20,
                                  child:
                                      CircularProgressIndicator(strokeWidth: 2),
                                )
                              : const Text(
                                  '登录',
                                  style: TextStyle(fontSize: 16),
                                ),
                        ),
                      ),
                      const SizedBox(height: 16),
                      TextButton(
                        onPressed: () => context.go(RoutePaths.register),
                        child: const Text('没有账号？去注册'),
                      ),
                    ],
                  ),
                ),
              ),
            );
          },
        ),
      ),
    );
  }
}

class _ToastOverlay extends StatefulWidget {
  final String message;
  const _ToastOverlay({required this.message});

  @override
  State<_ToastOverlay> createState() => _ToastOverlayState();
}

/// 密码仍保存为真实值用于登录，只渲染圆点，并短暂显示最后输入的一位。
class _PasswordEditingController extends TextEditingController {
  Timer? _revealTimer;
  bool _obscured = true;
  bool _revealLastCharacter = false;

  void setPassword(String password) {
    _revealTimer?.cancel();
    _revealLastCharacter = false;
    super.value = TextEditingValue(
      text: password,
      selection: TextSelection.collapsed(offset: password.length),
    );
  }

  void setObscured(bool obscured) {
    _obscured = obscured;
    if (obscured) _revealLastCharacter = false;
    notifyListeners();
  }

  @override
  set value(TextEditingValue newValue) {
    final changed = newValue.text != text;
    super.value = newValue;
    if (changed && _obscured && newValue.text.isNotEmpty) {
      _revealTimer?.cancel();
      _revealLastCharacter = true;
      notifyListeners();
      _revealTimer = Timer(const Duration(milliseconds: 850), () {
        _revealLastCharacter = false;
        notifyListeners();
      });
    }
  }

  @override
  TextSpan buildTextSpan({
    required BuildContext context,
    TextStyle? style,
    required bool withComposing,
  }) {
    if (!_obscured || text.isEmpty) {
      return TextSpan(style: style, text: text);
    }
    final hiddenCount = _revealLastCharacter ? text.length - 1 : text.length;
    final masked = '•' * hiddenCount +
        (_revealLastCharacter ? text.substring(text.length - 1) : '');
    return TextSpan(style: style, text: masked);
  }

  @override
  void dispose() {
    _revealTimer?.cancel();
    super.dispose();
  }
}

class _ToastOverlayState extends State<_ToastOverlay>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _animation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      duration: const Duration(milliseconds: 300),
      vsync: this,
    );
    _animation = CurvedAnimation(parent: _controller, curve: Curves.easeOut);
    _controller.forward();
    Future.delayed(const Duration(milliseconds: 2500), () {
      if (mounted) _controller.reverse();
    });
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Positioned(
      top: MediaQuery.of(context).padding.top + 20,
      left: 24,
      right: 24,
      child: FadeTransition(
        opacity: _animation,
        child: SlideTransition(
          position: Tween<Offset>(
            begin: const Offset(0, -0.5),
            end: Offset.zero,
          ).animate(_animation),
          child: Material(
            color: Colors.transparent,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
              decoration: BoxDecoration(
                color: const Color(0xFFFF4D4F),
                borderRadius: BorderRadius.circular(12),
                boxShadow: [
                  BoxShadow(
                    color: const Color(0xFFFF4D4F).withOpacity(0.3),
                    blurRadius: 12,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              child: Row(
                children: [
                  const Icon(Icons.error_outline,
                      color: Colors.white, size: 22),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      widget.message,
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 15,
                        fontWeight: FontWeight.w500,
                        decoration: TextDecoration.none,
                      ),
                    ),
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
