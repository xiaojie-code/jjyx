import 'dart:async';
import 'package:flutter/material.dart';
import '../constants/app_constants.dart';

/// 应用内顶部新消息横幅提醒（仿微信）
/// - 从顶部滑入
/// - 点击进入对应会话
/// - 左滑/右滑关闭
/// - 几秒后自动消失
class InAppNotification {
  InAppNotification._();

  static OverlayEntry? _currentEntry;
  static Timer? _dismissTimer;

  /// 显示一条应用内通知横幅
  static void show({
    required BuildContext context,
    required String title,
    required String content,
    String? avatar,
    required VoidCallback onTap,
  }) {
    final overlay = Overlay.of(context, rootOverlay: true);

    // 先移除上一条
    _remove();

    final entry = OverlayEntry(
      builder: (ctx) => _NotificationBanner(
        title: title,
        content: content,
        avatar: avatar,
        onTap: () {
          _remove();
          onTap();
        },
        onDismiss: _remove,
      ),
    );
    _currentEntry = entry;
    overlay.insert(entry);

    // 4 秒后自动消失
    _dismissTimer?.cancel();
    _dismissTimer = Timer(const Duration(seconds: 4), _remove);
  }

  static void _remove() {
    _dismissTimer?.cancel();
    _dismissTimer = null;
    _currentEntry?.remove();
    _currentEntry = null;
  }
}

class _NotificationBanner extends StatefulWidget {
  final String title;
  final String content;
  final String? avatar;
  final VoidCallback onTap;
  final VoidCallback onDismiss;

  const _NotificationBanner({
    required this.title,
    required this.content,
    required this.avatar,
    required this.onTap,
    required this.onDismiss,
  });

  @override
  State<_NotificationBanner> createState() => _NotificationBannerState();
}

class _NotificationBannerState extends State<_NotificationBanner>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;
  late final Animation<Offset> _offset;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 280),
    );
    _offset = Tween<Offset>(
      begin: const Offset(0, -1.2),
      end: Offset.zero,
    ).animate(CurvedAnimation(parent: _controller, curve: Curves.easeOut));
    _controller.forward();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  ImageProvider? _avatarImage(String? avatar) {
    if (avatar == null || avatar.isEmpty || avatar.contains('default')) {
      return null;
    }
    final url = avatar.startsWith('http')
        ? avatar
        : '${AppConstants.apiBaseUrl}$avatar';
    return NetworkImage(url);
  }

  @override
  Widget build(BuildContext context) {
    final topPadding = MediaQuery.of(context).padding.top;
    final avatarImg = _avatarImage(widget.avatar);

    return Positioned(
      top: topPadding + 8,
      left: 8,
      right: 8,
      child: SlideTransition(
        position: _offset,
        child: Material(
          color: Colors.transparent,
          child: Dismissible(
            key: const ValueKey('in_app_notification'),
            direction: DismissDirection.horizontal,
            onDismissed: (_) => widget.onDismiss(),
            child: GestureDetector(
              onTap: widget.onTap,
              child: Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(12),
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
                    CircleAvatar(
                      radius: 20,
                      backgroundColor: Colors.grey.shade200,
                      backgroundImage: avatarImg,
                      child: avatarImg == null
                          ? Text(
                              widget.title.isNotEmpty
                                  ? widget.title[0].toUpperCase()
                                  : '?',
                              style: const TextStyle(
                                  fontWeight: FontWeight.bold,
                                  color: Colors.black54),
                            )
                          : null,
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(
                            widget.title,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                                fontSize: 15, fontWeight: FontWeight.w600),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            widget.content,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(
                                fontSize: 13, color: Colors.grey.shade600),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
