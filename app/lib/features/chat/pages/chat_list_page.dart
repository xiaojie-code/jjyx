import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'dart:convert';
import '../../../core/constants/app_constants.dart';
import '../../../core/network/api_client.dart';
import '../../../core/network/api_endpoints.dart';
import '../../../core/utils/toast.dart';
import '../providers/chat_provider.dart';
import '../../main/providers/badge_provider.dart';
import 'chat_page.dart';
import 'ai_chat_page.dart';

class ChatListPage extends ConsumerStatefulWidget {
  const ChatListPage({super.key});

  @override
  ConsumerState<ChatListPage> createState() => _ChatListPageState();
}

class _ChatListPageState extends ConsumerState<ChatListPage>
    with WidgetsBindingObserver {
  List<ConversationItem> _conversations = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _loadConversations();
    // 先注册监听器，再确保连接（避免离线消息在监听器注册前到达）
    ref.read(socketServiceProvider).addMessageListener(_onNewMessageInList);
    ref
        .read(socketServiceProvider)
        .addConversationNewListener(_onConversationNew);
    ref.read(socketServiceProvider).addConnectListener(_onSocketConnected);
    ref.read(socketServiceProvider).connect();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    try {
      ref
          .read(socketServiceProvider)
          .removeMessageListener(_onNewMessageInList);
      ref
          .read(socketServiceProvider)
          .removeConversationNewListener(_onConversationNew);
      ref.read(socketServiceProvider).removeConnectListener(_onSocketConnected);
    } catch (_) {}
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    // 从后台恢复时刷新会话列表
    if (state == AppLifecycleState.resumed) {
      _loadConversations();
    }
  }

  void _onNewMessageInList(ChatMessage msg) {
    if (!mounted) return;
    // 直接在本地更新会话列表，不等待 API
    setState(() {
      final idx = _conversations
          .indexWhere((c) => c.conversationId == msg.conversationId);
      if (idx >= 0) {
        // 更新已有会话的最后消息和未读数
        final old = _conversations[idx];
        _conversations[idx] = ConversationItem(
          conversationId: old.conversationId,
          type: old.type,
          name: old.name,
          isPinned: old.isPinned,
          unreadCount: old.unreadCount + 1,
          peerUser: old.peerUser,
          lastMessage: msg,
        );
      }
    });
    // 同时从服务器刷新完整数据（确保数据一致性）
    _loadConversations();
  }

  void _onConversationNew() {
    if (!mounted) return;
    _loadConversations();
  }

  void _onSocketConnected() {
    if (!mounted) return;
    // Socket 连接成功后，延迟刷新会话列表（等待离线消息推送完成）
    Future.delayed(const Duration(milliseconds: 500), () {
      if (mounted) _loadConversations();
    });
  }

  Future<void> _loadConversations() async {
    try {
      final result = await ref
          .read(apiClientProvider)
          .get<List<dynamic>>(ApiEndpoints.conversations);
      if (!mounted) return;
      final conversations = (result ?? []).map((e) {
        final map = Map<String, dynamic>.from(e);
        return ConversationItem(
          conversationId: map['conversationId'] as int,
          type: map['type'] as int?,
          name: map['name'] as String?,
          isPinned: map['isPinned'] as bool? ?? false,
          unreadCount: map['unreadCount'] as int? ?? 0,
          peerUser: map['peerUser'] != null
              ? Map<String, dynamic>.from(map['peerUser'])
              : null,
          lastMessage: map['lastMessage'] != null
              ? ChatMessage.fromJson(
                  Map<String, dynamic>.from(map['lastMessage']))
              : null,
        );
      }).toList();
      conversations.sort((a, b) {
        // 置顶优先
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        // 按最新消息时间降序（越新越靠上）
        final aTime = a.lastMessage?.createdAt ?? '';
        final bTime = b.lastMessage?.createdAt ?? '';
        return bTime.compareTo(aTime);
      });
      if (!mounted) return;
      setState(() {
        _conversations = conversations;
        _loading = false;
      });
      if (!mounted) return;
      final totalUnread =
          _conversations.fold<int>(0, (sum, c) => sum + c.unreadCount);
      ref.read(badgeProvider.notifier).setUnreadCount(totalUnread);
    } catch (e) {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _togglePin(ConversationItem conv) async {
    try {
      await ref.read(apiClientProvider).put(
        ApiEndpoints.pinConversation(conv.conversationId),
        data: {'isPinned': !conv.isPinned},
      );
      _loadConversations();
    } catch (e) {
      if (mounted) Toast.error(context, '$e');
    }
  }

  void _searchMessages() {
    showSearch(context: context, delegate: _MessageSearchDelegate(ref));
  }

  /// 格式化消息时间（仿微信风格）
  /// 今天：显示 HH:mm
  /// 昨天：显示 "昨天"
  /// 本周内：显示 "周X"
  /// 更早：显示 MM/DD
  String _formatMessageTime(String? timeStr) {
    if (timeStr == null || timeStr.isEmpty) return '';
    try {
      final time = DateTime.parse(timeStr).toLocal();
      final now = DateTime.now();
      final today = DateTime(now.year, now.month, now.day);
      final messageDay = DateTime(time.year, time.month, time.day);
      final diff = today.difference(messageDay).inDays;

      if (diff == 0) {
        // 今天：显示时分
        return '${time.hour.toString().padLeft(2, '0')}:${time.minute.toString().padLeft(2, '0')}';
      } else if (diff == 1) {
        return '昨天';
      } else if (diff < 7) {
        // 本周内：显示星期几
        const weekdays = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
        return weekdays[time.weekday - 1];
      } else {
        // 更早：显示月/日
        return '${time.month}/${time.day}';
      }
    } catch (_) {
      return '';
    }
  }

  String _messagePreview(ChatMessage? message) {
    if (message == null) return '';
    switch (message.msgType) {
      case 2:
        return '[语音]';
      case 3:
        return _systemMessagePreview(message.content);
      case 4:
        return '[图片]';
      case 5:
        return '[AI对话]';
      case 6:
        return '[消息已撤回]';
      default:
        return message.content;
    }
  }

  String _systemMessagePreview(String content) {
    try {
      final data = jsonDecode(content);
      if (data is Map && data['kind'] == 'group_meeting') {
        return '[群会议] ${data['text']?.toString() ?? '有人发起了群会议'}';
      }
    } catch (_) {}
    return content;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('消息'),
        actions: [
          IconButton(
              icon: const Icon(Icons.search), onPressed: _searchMessages),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _loadConversations,
              child: ListView.builder(
                itemCount: _conversations.length + 2, // +2 for AI entry + 数字人
                itemBuilder: (context, index) {
                  // 云AI 入口（顶部）
                  if (index == 0) {
                    return ListTile(
                      leading: const CircleAvatar(
                        backgroundImage: AssetImage('video/yunAi.png'),
                      ),
                      title: const Text('云AI',
                          style: TextStyle(fontWeight: FontWeight.w600)),
                      subtitle: const Text('有什么可以帮你的？'),
                      onTap: () {
                        Navigator.of(context, rootNavigator: true)
                            .push(MaterialPageRoute(
                          builder: (_) => const AiChatPage(),
                        ));
                      },
                    );
                  }

                  // 数字人入口
                  if (index == 1) {
                    return ListTile(
                      leading: CircleAvatar(
                        backgroundColor: Colors.purple.shade100,
                        child: const Icon(Icons.face, color: Colors.purple),
                      ),
                      title: const Text('数字人',
                          style: TextStyle(fontWeight: FontWeight.w600)),
                      subtitle: const Text('智能数字人助手'),
                      onTap: () {
                        Navigator.of(context, rootNavigator: true)
                            .push(MaterialPageRoute(
                          builder: (_) => const _DigitalHumanPage(),
                        ));
                      },
                    );
                  }

                  final conv = _conversations[index - 2];
                  final peerName = conv.peerUser?['nickname'] ??
                      conv.peerUser?['account'] ??
                      conv.name ??
                      '聊天';
                  final peerAvatar = conv.peerUser?['avatar'] as String?;

                  return ListTile(
                    leading: CircleAvatar(
                      backgroundColor: Colors.grey.shade200,
                      backgroundImage: peerAvatar != null &&
                              peerAvatar.isNotEmpty &&
                              !peerAvatar.contains('default')
                          ? NetworkImage(peerAvatar.startsWith('http') ? peerAvatar : '${AppConstants.apiBaseUrl}$peerAvatar')
                          : null,
                      child: peerAvatar == null ||
                              peerAvatar.isEmpty ||
                              peerAvatar.contains('default')
                          ? Icon(conv.type == 2 ? Icons.group : Icons.person,
                              color: Colors.grey.shade600)
                          : null,
                    ),
                    title: Row(
                      children: [
                        if (conv.isPinned)
                          Container(
                            margin: const EdgeInsets.only(right: 4),
                            padding: const EdgeInsets.symmetric(
                                horizontal: 4, vertical: 1),
                            decoration: BoxDecoration(
                              color: Colors.blue.shade50,
                              borderRadius: BorderRadius.circular(2),
                            ),
                            child: Text('置顶',
                                style: TextStyle(
                                    fontSize: 10, color: Colors.blue.shade700)),
                          ),
                        Expanded(
                            child: Text(peerName,
                                style: const TextStyle(
                                    fontWeight: FontWeight.w500))),
                      ],
                    ),
                    subtitle: Text(
                      _messagePreview(conv.lastMessage),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(fontSize: 13, color: Colors.grey),
                    ),
                    trailing: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        Text(
                          _formatMessageTime(conv.lastMessage?.createdAt),
                          style: TextStyle(fontSize: 11, color: Colors.grey.shade500),
                        ),
                        const SizedBox(height: 4),
                        if (conv.unreadCount > 0)
                          Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(
                                color: Colors.red,
                                borderRadius: BorderRadius.circular(10)),
                            child: Text('${conv.unreadCount}',
                                style: const TextStyle(
                                    color: Colors.white, fontSize: 11)),
                          )
                        else
                          const SizedBox(height: 16),
                      ],
                    ),
                    onTap: () async {
                      await Navigator.of(context, rootNavigator: true)
                          .push(MaterialPageRoute(
                        builder: (_) => ChatPage(
                          conversationId: conv.conversationId,
                          title: peerName,
                          type: conv.type,
                        ),
                      ));
                      // 返回后刷新消息列表（更新未读数）
                      _loadConversations();
                    },
                    onLongPress: () => _togglePin(conv),
                  );
                },
              ),
            ),
    );
  }
}

/// 聊天记录搜索
class _MessageSearchDelegate extends SearchDelegate<String> {
  final WidgetRef ref;
  _MessageSearchDelegate(this.ref);

  @override
  List<Widget> buildActions(BuildContext context) => [
        IconButton(icon: const Icon(Icons.clear), onPressed: () => query = ''),
      ];

  @override
  Widget buildLeading(BuildContext context) => IconButton(
      icon: const Icon(Icons.arrow_back), onPressed: () => close(context, ''));

  @override
  Widget buildResults(BuildContext context) => _buildSearch();

  @override
  Widget buildSuggestions(BuildContext context) =>
      query.isEmpty ? const Center(child: Text('输入关键词搜索聊天记录')) : _buildSearch();

  Widget _buildSearch() {
    if (query.trim().isEmpty) return const SizedBox();
    return FutureBuilder(
      future: ref.read(apiClientProvider).get<List<dynamic>>(
        ApiEndpoints.messageSearch,
        queryParameters: {'keyword': query},
      ),
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Center(child: CircularProgressIndicator());
        }
        final results = snapshot.data ?? [];
        if (results.isEmpty) return const Center(child: Text('未找到相关消息'));
        return ListView.builder(
          itemCount: results.length,
          itemBuilder: (context, index) {
            final msg = Map<String, dynamic>.from(results[index]);
            final msgType = int.tryParse(msg['msgType']?.toString() ?? '') ?? 1;
            final content = msg['content']?.toString() ?? '';
            final conversationId = int.tryParse(msg['conversationId']?.toString() ?? '') ?? 0;
            final senderNickname = msg['senderNickname']?.toString() ?? '';
            final createdAt = msg['createdAt']?.toString() ?? '';
            return ListTile(
              leading: const CircleAvatar(
                backgroundColor: Color(0xFFE3F2FD),
                child: Icon(Icons.chat_bubble_outline, size: 18, color: Colors.blue),
              ),
              title: Text(_searchMessagePreview(msgType, content),
                  maxLines: 2, overflow: TextOverflow.ellipsis),
              subtitle: Text(
                '${senderNickname.isNotEmpty ? '$senderNickname · ' : ''}$createdAt',
                style: const TextStyle(fontSize: 11),
              ),
              onTap: () {
                if (conversationId <= 0) return;
                close(context, '');
                Navigator.of(context, rootNavigator: true).push(MaterialPageRoute(
                  builder: (_) => ChatPage(
                    conversationId: conversationId,
                    title: senderNickname.isNotEmpty ? senderNickname : '聊天',
                  ),
                ));
              },
            );
          },
        );
      },
    );
  }

  String _searchMessagePreview(int msgType, String content) {
    switch (msgType) {
      case 2:
        return '[语音]';
      case 3:
        return _systemMessagePreview(content);
      case 4:
        return '[图片]';
      default:
        return content;
    }
  }

  String _systemMessagePreview(String content) {
    try {
      final data = jsonDecode(content);
      if (data is Map && data['kind'] == 'group_meeting') {
        return '[群会议] ${data['text']?.toString() ?? '有人发起了群会议'}';
      }
    } catch (_) {}
    return content;
  }
}

/// 数字人页面 - 暂未开放
class _DigitalHumanPage extends StatelessWidget {
  const _DigitalHumanPage();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('数字人')),
      body: const Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.face, size: 80, color: Colors.purple),
            SizedBox(height: 24),
            Text(
              '测试中，暂未开放',
              style: TextStyle(fontSize: 18, color: Colors.grey, fontWeight: FontWeight.w500),
            ),
          ],
        ),
      ),
    );
  }
}
