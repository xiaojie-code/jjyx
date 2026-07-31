import 'package:flutter/material.dart';

/// 顶部弹幕提示工具
class Toast {
  static void show(
    BuildContext context,
    String message, {
    bool isError = false,
    Duration duration = const Duration(seconds: 3),
  }) {
    // Dialogs are pushed onto the root navigator. Use the root overlay so
    // notifications from pages inside a shell navigator stay above them.
    final overlay = Overlay.of(context, rootOverlay: true);
    final entry = OverlayEntry(
      builder: (context) => _ToastWidget(
        message: message,
        isError: isError,
        duration: duration,
      ),
    );
    overlay.insert(entry);
    Future.delayed(duration, () {
      entry.remove();
    });
  }

  static void success(BuildContext context, String message) {
    show(context, message, isError: false);
  }

  static void error(BuildContext context, String message) {
    show(context, extractMessage(message), isError: true);
  }

  /// 从异常信息中提取友好的错误消息
  static String extractMessage(String raw) {
    // 提取 "message: xxx" 部分
    final msgMatch = RegExp(r'message:\s*(.+?)[\),]').firstMatch(raw);
    if (msgMatch != null) {
      return msgMatch.group(1)?.trim() ?? raw;
    }
    // 如果包含中文错误信息，直接提取中文部分
    final cnMatch =
        RegExp(r'[\u4e00-\u9fa5][\u4e00-\u9fa5\w，。！、：]+').firstMatch(raw);
    if (cnMatch != null) {
      return cnMatch.group(0) ?? raw;
    }
    return raw;
  }

  static void info(
    BuildContext context,
    String message, {
    Duration duration = const Duration(seconds: 3),
  }) {
    show(context, message, isError: false, duration: duration);
  }

  static void warning(BuildContext context, String message) {
    show(context, message, isError: false);
  }
}

class _ToastWidget extends StatefulWidget {
  final String message;
  final bool isError;
  final Duration duration;
  const _ToastWidget({
    required this.message,
    required this.isError,
    required this.duration,
  });

  @override
  State<_ToastWidget> createState() => _ToastWidgetState();
}

class _ToastWidgetState extends State<_ToastWidget>
    with SingleTickerProviderStateMixin {
  late AnimationController _ctrl;
  late Animation<Offset> _slideAnim;
  late Animation<double> _fadeAnim;

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(
        vsync: this, duration: const Duration(milliseconds: 300));
    _slideAnim = Tween<Offset>(begin: const Offset(0, -1), end: Offset.zero)
        .animate(CurvedAnimation(parent: _ctrl, curve: Curves.easeOut));
    _fadeAnim = Tween<double>(begin: 0, end: 1)
        .animate(CurvedAnimation(parent: _ctrl, curve: Curves.easeOut));
    _ctrl.forward();
    final reverseDelay = widget.duration - const Duration(milliseconds: 500);
    Future.delayed(reverseDelay.isNegative ? Duration.zero : reverseDelay, () {
      if (mounted) _ctrl.reverse();
    });
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Positioned(
      top: MediaQuery.of(context).padding.top + 12,
      left: 16,
      right: 16,
      child: SlideTransition(
        position: _slideAnim,
        child: FadeTransition(
          opacity: _fadeAnim,
          child: Material(
            color: Colors.transparent,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              decoration: BoxDecoration(
                color: widget.isError
                    ? const Color(0xFFFF4D4F)
                    : const Color(0xFF52C41A),
                borderRadius: BorderRadius.circular(8),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.15),
                    blurRadius: 12,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              child: Row(
                children: [
                  Icon(
                    widget.isError
                        ? Icons.error_outline
                        : Icons.check_circle_outline,
                    color: Colors.white,
                    size: 20,
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      widget.message,
                      style: const TextStyle(color: Colors.white, fontSize: 14),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
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
