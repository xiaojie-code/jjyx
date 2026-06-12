import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/network/api_client.dart';
import '../../../core/network/api_endpoints.dart';
import '../../../core/router/app_router.dart';
import '../providers/auth_provider.dart';

class LoginPage extends ConsumerStatefulWidget {
  const LoginPage({super.key});

  @override
  ConsumerState<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends ConsumerState<LoginPage> {
  final _accountCtrl = TextEditingController();
  final _passwordCtrl = TextEditingController();

  Future<void> _login() async {
    final account = _accountCtrl.text.trim();
    final password = _passwordCtrl.text.trim();
    if (account.isEmpty || password.isEmpty) {
      _showToast('请输入账号和密码');
      return;
    }
    final success =
        await ref.read(authProvider.notifier).login(account, password);
    if (success && mounted) {
      context.go(RoutePaths.chatList);
    } else {
      final error = ref.read(authProvider).error;
      if (mounted && error != null) _showToast(error);
    }
  }

  Future<void> _showForgotPasswordDialog() async {
    final accountCtrl = TextEditingController(text: _accountCtrl.text.trim());
    final phoneCtrl = TextEditingController();
    var submitting = false;

    await showDialog<void>(
      context: context,
      builder: (dialogContext) {
        return StatefulBuilder(
          builder: (context, setDialogState) => AlertDialog(
            title: const Text('忘记密码'),
            content: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  TextField(
                    controller: accountCtrl,
                    decoration: const InputDecoration(
                      labelText: '账号',
                      border: OutlineInputBorder(),
                    ),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: phoneCtrl,
                    keyboardType: TextInputType.phone,
                    decoration: const InputDecoration(
                      labelText: '手机号',
                      border: OutlineInputBorder(),
                    ),
                  ),
                ],
              ),
            ),
            actions: [
              TextButton(
                onPressed:
                    submitting ? null : () => Navigator.pop(dialogContext),
                child: const Text('取消'),
              ),
              ElevatedButton(
                onPressed: submitting
                    ? null
                    : () async {
                        final account = accountCtrl.text.trim();
                        final phone = phoneCtrl.text.trim();
                        if (account.isEmpty || phone.isEmpty) {
                          _showToast('请填写账号和手机号');
                          return;
                        }
                        setDialogState(() => submitting = true);
                        try {
                          await ref.read(apiClientProvider).post(
                            ApiEndpoints.passwordResetRequest,
                            data: {'account': account, 'phone': phone},
                          );
                          if (!mounted || !dialogContext.mounted) return;
                          Navigator.of(dialogContext).pop();
                          _showToast('申请已提交，请等待管理员处理');
                        } catch (e) {
                          if (mounted) _showToast('$e');
                        } finally {
                          if (context.mounted) {
                            setDialogState(() => submitting = false);
                          }
                        }
                      },
                child: submitting
                    ? const SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Text('确认发送'),
              ),
            ],
          ),
        );
      },
    );
    accountCtrl.dispose();
    phoneCtrl.dispose();
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
                      const SizedBox(height: 16),
                      TextField(
                        controller: _passwordCtrl,
                        obscureText: true,
                        decoration: const InputDecoration(
                          labelText: '密码',
                          border: OutlineInputBorder(),
                          prefixIcon: Icon(Icons.lock),
                        ),
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
