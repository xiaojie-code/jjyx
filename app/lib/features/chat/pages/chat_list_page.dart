import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter/services.dart';
import 'package:image_picker/image_picker.dart';
import 'package:permission_handler/permission_handler.dart';
import 'dart:convert';
import '../../../core/constants/app_constants.dart';
import '../../../core/network/api_client.dart';
import '../../../core/network/api_endpoints.dart';
import '../../../core/utils/toast.dart';
import '../providers/chat_provider.dart';
import '../../main/providers/badge_provider.dart';
import '../../auth/providers/auth_provider.dart';
import '../utils/meeting_utils.dart';
import 'chat_page.dart';
import 'ai_chat_page.dart';
import 'meeting_page.dart';
import 'service_notification_page.dart';

class ChatListPage extends ConsumerStatefulWidget {
  const ChatListPage({super.key});

  @override
  ConsumerState<ChatListPage> createState() => _ChatListPageState();
}

class _ChatListPageState extends ConsumerState<ChatListPage>
    with WidgetsBindingObserver {
  List<ConversationItem> _conversations = [];
  bool _loading = true;
  int _serviceUnread = 0;
  bool _serviceUnreadLoaded = false;
  bool _serviceUnreadLocallyCleared = false;
  bool _conversationUnreadLocallyCleared = false;
  final Map<int, int> _localConversationUnreadOverrides = <int, int>{};

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _clearMessageBadgesLocal();
    _loadConversations();
    _syncServiceUnread();
    // Register listeners before connecting so offline messages are not missed.
    ref.read(socketServiceProvider).addMessageListener(_onNewMessageInList);
    ref
        .read(socketServiceProvider)
        .addConversationNewListener(_onConversationNew);
    ref
        .read(socketServiceProvider)
        .addServiceNotificationListener(_onServiceNotification);
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
      ref
          .read(socketServiceProvider)
          .removeServiceNotificationListener(_onServiceNotification);
      ref.read(socketServiceProvider).removeConnectListener(_onSocketConnected);
    } catch (_) {}
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    // 浠庡悗鍙版仮澶嶆椂鍒锋柊浼氳瘽鍒楄〃
    if (state == AppLifecycleState.resumed) {
      _loadConversations();
      _syncServiceUnread();
    }
  }

  /// 加载当前用户的服务通知未读数。
  bool get _canUseServiceNotifications =>
      ref.read(authProvider).user != null ||
      ref.read(authProvider).profile != null;

  bool get _hasKnownUser =>
      ref.read(authProvider).user != null ||
      ref.read(authProvider).profile != null;

  void _clearMessageBadgesLocal() {
    _serviceUnreadLocallyCleared = true;
    _conversationUnreadLocallyCleared = true;
    _serviceUnreadLoaded = true;
    _serviceUnread = 0;
    ref.read(badgeProvider.notifier).clearUnread();
    ref.read(badgeProvider.notifier).clearServiceNotifications();
  }

  void _syncServiceUnread() {
    if (_canUseServiceNotifications) {
      _loadServiceUnread();
      return;
    }
    if (!_hasKnownUser) {
      if (mounted) {
        setState(() => _serviceUnread = 0);
      } else {
        _serviceUnread = 0;
      }
      ref.read(badgeProvider.notifier).setServiceNotificationCount(0);
      return;
    }
    _serviceUnreadLoaded = true;
    if (mounted) {
      setState(() => _serviceUnread = 0);
    } else {
      _serviceUnread = 0;
    }
    ref.read(badgeProvider.notifier).setServiceNotificationCount(0);
  }

  Future<void> _loadServiceUnread() async {
    if (!_canUseServiceNotifications) {
      _syncServiceUnread();
      return;
    }
    if (_serviceUnreadLocallyCleared) {
      if (mounted) {
        setState(() {
          _serviceUnread = 0;
          _serviceUnreadLoaded = true;
        });
      }
      ref.read(badgeProvider.notifier).clearServiceNotifications();
      return;
    }
    try {
      final result =
          await ref.read(apiClientProvider).get<Map<String, dynamic>>(
                ApiEndpoints.serviceNotificationsUnread,
              );
      if (!mounted) return;
      final count = result?['count'] as int? ?? 0;
      setState(() {
        _serviceUnread = count;
        _serviceUnreadLoaded = true;
      });
      ref.read(badgeProvider.notifier).setServiceNotificationCount(count);
    } catch (_) {}
  }

  void _onNewMessageInList(ChatMessage msg) {
    if (!mounted) return;
    if (_conversationUnreadLocallyCleared ||
        _localConversationUnreadOverrides.containsKey(msg.conversationId)) {
      _localConversationUnreadOverrides[msg.conversationId] =
          (_localConversationUnreadOverrides[msg.conversationId] ?? 0) + 1;
    }
    // 鐩存帴鍦ㄦ湰鍦版洿鏂颁細璇濆垪琛紝涓嶇瓑寰?API
    setState(() {
      final idx = _conversations
          .indexWhere((c) => c.conversationId == msg.conversationId);
      if (idx >= 0) {
        final old = _conversations.removeAt(idx);
        final updated = ConversationItem(
          conversationId: old.conversationId,
          type: old.type,
          name: old.name,
          avatar: old.avatar,
          createdAt: old.createdAt,
          isPinned: old.isPinned,
          unreadCount: old.unreadCount + 1,
          peerUser: old.peerUser,
          lastMessage: msg,
        );
        _conversations.add(updated);
        // 四个系统入口固定；普通会话收到新消息后立即按活动时间重排。
        _conversations.sort(_compareConversationActivity);
      }
    });
    // 鍚屾椂浠庢湇鍔″櫒鍒锋柊瀹屾暣鏁版嵁锛堢‘淇濇暟鎹竴鑷存€э級
    _loadConversations();
  }

  void _onConversationNew() {
    if (!mounted) return;
    _loadConversations();
  }

  /// 收到服务通知实时推送：刷新未读角标（提示音由 MainShell 统一处理）
  void _onServiceNotification(Map<String, dynamic> data) {
    if (!mounted) return;
    if (!_canUseServiceNotifications) {
      _syncServiceUnread();
      return;
    }
    _serviceUnreadLocallyCleared = false;
    // 本地先 +1，保证角标即时更新
    setState(() => _serviceUnread += 1);
    if (data['type']?.toString() == 'group_result') {
      _loadConversations();
    }
    // 再从服务器拉准确未读数
    _loadServiceUnread();
  }

  void _onSocketConnected() {
    if (!mounted) return;
    // Socket 杩炴帴鎴愬姛鍚庯紝寤惰繜鍒锋柊浼氳瘽鍒楄〃锛堢瓑寰呯绾挎秷鎭帹閫佸畬鎴愶級
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
        final conversationId =
            int.tryParse(map['conversationId']?.toString() ?? '') ?? 0;
        if (_conversationUnreadLocallyCleared &&
            !_localConversationUnreadOverrides.containsKey(conversationId)) {
          _localConversationUnreadOverrides[conversationId] = 0;
        }
        final serverUnread =
            int.tryParse(map['unreadCount']?.toString() ?? '') ?? 0;
        final localUnread = _localConversationUnreadOverrides[conversationId];
        return ConversationItem(
          conversationId: conversationId,
          type: map['type'] as int?,
          name: map['name'] as String?,
          avatar: map['avatar'] as String?,
          createdAt: map['createdAt']?.toString() ?? '',
          isPinned: map['isPinned'] as bool? ?? false,
          unreadCount: localUnread ?? serverUnread,
          peerUser: map['peerUser'] != null
              ? Map<String, dynamic>.from(map['peerUser'])
              : null,
          lastMessage: map['lastMessage'] != null
              ? ChatMessage.fromJson(
                  Map<String, dynamic>.from(map['lastMessage']))
              : null,
        );
      }).toList();
      conversations.sort(_compareConversationActivity);
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

  void _clearConversationUnreadLocal(int conversationId) {
    _localConversationUnreadOverrides[conversationId] = 0;
    var changed = false;
    setState(() {
      _conversations = _conversations.map((item) {
        if (item.conversationId != conversationId || item.unreadCount == 0) {
          return item;
        }
        changed = true;
        return ConversationItem(
          conversationId: item.conversationId,
          type: item.type,
          name: item.name,
          avatar: item.avatar,
          createdAt: item.createdAt,
          isPinned: item.isPinned,
          unreadCount: 0,
          peerUser: item.peerUser,
          lastMessage: item.lastMessage,
        );
      }).toList();
    });
    if (changed) {
      final totalUnread =
          _conversations.fold<int>(0, (sum, c) => sum + c.unreadCount);
      ref.read(badgeProvider.notifier).setUnreadCount(totalUnread);
    }
  }

  int _compareConversationActivity(
    ConversationItem a,
    ConversationItem b,
  ) {
    if (a.isPinned != b.isPinned) return a.isPinned ? -1 : 1;
    final aTime = _conversationActivityTimestamp(a);
    final bTime = _conversationActivityTimestamp(b);
    if (aTime != bTime) return bTime.compareTo(aTime);
    return b.conversationId.compareTo(a.conversationId);
  }

  int _conversationActivityTimestamp(ConversationItem item) {
    final messageTime = item.lastMessage?.createdAt ?? '';
    final raw = messageTime.isNotEmpty ? messageTime : item.createdAt;
    return DateTime.tryParse(raw)?.millisecondsSinceEpoch ?? 0;
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

  /// 长按会话弹出操作菜单（置顶/不显示/删除），在长按位置附近显示（仿微信）
  void _showConversationMenu(
      ConversationItem conv, String peerName, Offset position) {
    final overlay = Overlay.of(context).context.findRenderObject() as RenderBox;
    // 单聊才显示"修改备注"
    final isSingleChat = conv.type != 2 && conv.peerUser != null;
    showMenu<String>(
      context: context,
      position: RelativeRect.fromLTRB(
        position.dx,
        position.dy,
        overlay.size.width - position.dx,
        overlay.size.height - position.dy,
      ),
      items: [
        PopupMenuItem<String>(
          value: 'pin',
          child: Row(
            children: [
              Icon(
                  conv.isPinned
                      ? Icons.vertical_align_bottom
                      : Icons.vertical_align_top,
                  size: 18,
                  color: Colors.black87),
              const SizedBox(width: 10),
              Text(conv.isPinned ? '取消置顶' : '置顶该聊天'),
            ],
          ),
        ),
        if (isSingleChat)
          const PopupMenuItem<String>(
            value: 'remark',
            child: Row(
              children: [
                Icon(Icons.edit_note, size: 18, color: Colors.black87),
                SizedBox(width: 10),
                Text('修改备注'),
              ],
            ),
          ),
        const PopupMenuItem<String>(
          value: 'hide',
          child: Row(
            children: [
              Icon(Icons.visibility_off_outlined,
                  size: 18, color: Colors.black87),
              SizedBox(width: 10),
              Text('不显示该聊天'),
            ],
          ),
        ),
        const PopupMenuItem<String>(
          value: 'delete',
          child: Row(
            children: [
              Icon(Icons.delete_outline, size: 18, color: Colors.red),
              SizedBox(width: 10),
              Text('移除该聊天', style: TextStyle(color: Colors.red)),
            ],
          ),
        ),
      ],
    ).then((value) {
      if (value == 'pin') {
        _togglePin(conv);
      } else if (value == 'remark') {
        _showRemarkDialog(conv);
      } else if (value == 'hide') {
        _hideConversation(conv);
      } else if (value == 'delete') {
        _confirmDeleteConversation(conv, peerName);
      }
    });
  }

  /// 修改备注（单聊）
  Future<void> _showRemarkDialog(ConversationItem conv) async {
    final friendId = conv.peerUser?['id'] as int?;
    if (friendId == null) return;
    final currentRemark = conv.peerUser?['remark'] as String? ?? '';
    final ctrl = TextEditingController(text: currentRemark);
    final newRemark = await showDialog<String>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('修改备注'),
        content: TextField(
          controller: ctrl,
          autofocus: true,
          decoration: const InputDecoration(
            hintText: '输入备注名，留空则取消备注',
            border: OutlineInputBorder(),
          ),
        ),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(ctx), child: const Text('取消')),
          ElevatedButton(
              onPressed: () => Navigator.pop(ctx, ctrl.text.trim()),
              child: const Text('保存')),
        ],
      ),
    );
    ctrl.dispose();
    if (newRemark == null) return;
    try {
      await ref.read(apiClientProvider).put(
        ApiEndpoints.contactRemark(friendId),
        data: {'remark': newRemark},
      );
      if (mounted) {
        Toast.success(context, '备注已更新');
        _loadConversations();
      }
    } catch (e) {
      if (mounted) Toast.error(context, '$e');
    }
  }

  /// 不显示会话（不删除记录）
  Future<void> _hideConversation(ConversationItem conv) async {
    try {
      await ref.read(apiClientProvider).put(
            ApiEndpoints.hideConversation(conv.conversationId),
          );
      _loadConversations();
    } catch (e) {
      if (mounted) Toast.error(context, '$e');
    }
  }

  /// 删除会话（删除聊天记录，需确认）
  Future<void> _confirmDeleteConversation(
      ConversationItem conv, String peerName) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('移除聊天'),
        content: Text('确定将与「$peerName」的聊天从列表移除吗？聊天记录不会删除。'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('取消'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('移除', style: TextStyle(color: Colors.red)),
          ),
        ],
      ),
    );
    if (confirmed != true) return;
    try {
      await ref.read(apiClientProvider).delete(
            ApiEndpoints.deleteConversation(conv.conversationId),
          );
      _loadConversations();
    } catch (e) {
      if (mounted) Toast.error(context, '$e');
    }
  }

  void _searchMessages() {
    showSearch(context: context, delegate: _MessageSearchDelegate(ref));
  }

  String _conversationDisplayName(ConversationItem conv) {
    final remark = (conv.peerUser?['remark'] as String?)?.trim();
    if (remark != null && remark.isNotEmpty) return remark;
    return conv.peerUser?['nickname'] ??
        conv.peerUser?['account'] ??
        conv.name ??
        '聊天';
  }

  List<ConversationItem> get _groupConversations =>
      _conversations.where((conv) => conv.type == 2).toList();

  bool _canStartGroupMeetingForFree(List<Map<String, dynamic>> members) {
    final authState = ref.read(authProvider);
    final myId = authState.user?.id ?? authState.profile?.user.id ?? 0;
    for (final member in members) {
      if (int.tryParse(member['userId']?.toString() ?? '') == myId) {
        final role = int.tryParse(member['role']?.toString() ?? '') ?? 1;
        return member['isOwner'] == true || role >= 2;
      }
    }
    return false;
  }

  Future<void> _openGroupMeetingEntry() async {
    final groups = _groupConversations;
    if (groups.isEmpty) {
      Toast.info(context, '暂无可发起会议的群聊');
      return;
    }

    final selected = await showModalBottomSheet<ConversationItem>(
      context: context,
      builder: (ctx) => SafeArea(
        child: ListView.separated(
          shrinkWrap: true,
          itemCount: groups.length,
          separatorBuilder: (_, __) => const Divider(height: 1),
          itemBuilder: (_, index) {
            final conv = groups[index];
            final name = _conversationDisplayName(conv);
            return ListTile(
              leading: CircleAvatar(
                backgroundColor: Colors.blue.shade50,
                backgroundImage: conv.avatar != null &&
                        conv.avatar!.isNotEmpty &&
                        !conv.avatar!.contains('default')
                    ? NetworkImage(conv.avatar!.startsWith('http')
                        ? conv.avatar!
                        : '${AppConstants.apiBaseUrl}${conv.avatar}')
                    : null,
                child: conv.avatar == null ||
                        conv.avatar!.isEmpty ||
                        conv.avatar!.contains('default')
                    ? const Icon(Icons.group, color: Colors.blue)
                    : null,
              ),
              title: Text(name),
              subtitle: const Text('点击选择群聊'),
              onTap: () => Navigator.pop(ctx, conv),
            );
          },
        ),
      ),
    );
    if (selected == null) return;
    await _startGroupMeetingFromEntry(selected);
  }

  Future<void> _startGroupMeetingFromEntry(ConversationItem conv) async {
    final api = ref.read(apiClientProvider);
    final groupId = conv.conversationId;
    final groupName = _conversationDisplayName(conv);
    try {
      Map<String, dynamic>? meeting = await api.get<Map<String, dynamic>>(
        ApiEndpoints.groupMeetingActive(groupId),
      );
      meeting = normalizeActiveMeeting(meeting);

      if (meeting == null) {
        final membersResult = await api.get<List<dynamic>>(
          ApiEndpoints.groupMembers(groupId),
        );
        final members = (membersResult ?? [])
            .map((item) => Map<String, dynamic>.from(item as Map))
            .toList();
        final free = _canStartGroupMeetingForFree(members);
        int currentPoints = 0;
        if (!free) {
          try {
            final balance = await api
                .get<Map<String, dynamic>>(ApiEndpoints.currencyBalance);
            currentPoints =
                (double.tryParse(balance?['points']?.toString() ?? '0') ?? 0)
                    .toInt();
          } catch (_) {}
        }

        final confirmed = await showDialog<bool>(
          context: context,
          builder: (ctx) => AlertDialog(
            title: const Text('发起群会议'),
            content: Text(
              free
                  ? '是否在「$groupName」发起群会议？'
                  : '发起群会议需要10000积分\n当前积分余额：$currentPoints',
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(ctx, false),
                child: const Text('取消'),
              ),
              ElevatedButton(
                onPressed: () => Navigator.pop(ctx, true),
                child: const Text('确认'),
              ),
            ],
          ),
        );
        if (confirmed != true) return;
        if (!free && currentPoints < 10000) {
          Toast.warning(context, '积分不足，无法发起会议');
          return;
        }

        meeting = await api.post<Map<String, dynamic>>(
          ApiEndpoints.groupMeetingStart(groupId),
          data: {'title': '$groupName的会议', 'confirmCost': !free},
        );
      }

      if (!mounted || meeting == null) return;
      Navigator.of(context, rootNavigator: true).push(MaterialPageRoute(
        builder: (_) => MeetingPage(
          groupId: groupId,
          groupName: groupName,
          meeting: meeting!,
        ),
      ));
    } catch (e) {
      if (mounted) {
        Toast.error(context, apiErrorMessage(e, fallback: '发起群会议失败'));
      }
    }
  }

  /// 鏍煎紡鍖栨秷鎭椂闂达紙浠垮井淇￠鏍硷級
  /// 浠婂ぉ锛氭樉绀?HH:mm
  /// 昨天锛氭樉绀?"昨天"
  /// 鏈懆鍐咃細鏄剧ず "鍛╔"
  /// 鏇存棭锛氭樉绀?MM/DD
  String _formatMessageTime(String? timeStr) {
    if (timeStr == null || timeStr.isEmpty) return '';
    try {
      final time = DateTime.parse(timeStr).toLocal();
      final now = DateTime.now();
      final today = DateTime(now.year, now.month, now.day);
      final messageDay = DateTime(time.year, time.month, time.day);
      final diff = today.difference(messageDay).inDays;

      if (diff == 0) {
        // Today: HH:mm
        return '${time.hour.toString().padLeft(2, '0')}:${time.minute.toString().padLeft(2, '0')}';
      } else if (diff == 1) {
        return '昨天';
      } else if (diff < 7) {
        // This week: weekday
        const weekdays = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
        return weekdays[time.weekday - 1];
      } else {
        // Older: MM/DD
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
      if (data is Map && data['kind'] == 'member_join') {
        return data['text']?.toString() ?? '有新成员加入群聊';
      }
      if (data is Map && data['kind'] == 'group_invite') {
        return data['text']?.toString() ?? '邀请加入群聊';
      }
    } catch (_) {}
    return content;
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authProvider);
    final showServiceNotifications =
        authState.user != null || authState.profile != null;
    if (_hasKnownUser && !_serviceUnreadLoaded) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) _loadServiceUnread();
      });
    }
    final headerCount = showServiceNotifications ? 4 : 3;
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
                itemCount: _conversations.length + headerCount,
                itemBuilder: (context, index) {
                  // 浜慉I 鍏ュ彛锛堥《閮級
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

                  // Digital human entry
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
                          builder: (_) => const _DigitalHumanPageV2(),
                        ));
                      },
                    );
                  }

                  if (index == 2) {
                    return ListTile(
                      leading: CircleAvatar(
                        backgroundColor: Colors.green.shade100,
                        child:
                            const Icon(Icons.video_call, color: Colors.green),
                      ),
                      title: const Text('群会议',
                          style: TextStyle(fontWeight: FontWeight.w600)),
                      subtitle: const Text('选择群聊发起会议'),
                      onTap: _openGroupMeetingEntry,
                    );
                  }

                  // 服务通知入口：所有已登录用户都可查看业务进度。
                  if (showServiceNotifications && index == 3) {
                    return ListTile(
                      leading: Stack(
                        clipBehavior: Clip.none,
                        children: [
                          CircleAvatar(
                            backgroundColor: Colors.orange.shade100,
                            child: const Icon(Icons.notifications,
                                color: Colors.orange),
                          ),
                          if (_serviceUnread > 0)
                            Positioned(
                              right: -4,
                              top: -4,
                              child: Container(
                                padding: const EdgeInsets.symmetric(
                                    horizontal: 5, vertical: 1),
                                decoration: BoxDecoration(
                                    color: Colors.red,
                                    borderRadius: BorderRadius.circular(10)),
                                constraints: const BoxConstraints(
                                    minWidth: 16, minHeight: 16),
                                child: Text(
                                  _serviceUnread > 99
                                      ? '99+'
                                      : '$_serviceUnread',
                                  textAlign: TextAlign.center,
                                  style: const TextStyle(
                                      color: Colors.white, fontSize: 10),
                                ),
                              ),
                            ),
                        ],
                      ),
                      title: const Text('服务通知',
                          style: TextStyle(fontWeight: FontWeight.w600)),
                      subtitle: const Text('业务处理结果和系统提醒'),
                      onTap: () async {
                        setState(() {
                          _serviceUnread = 0;
                          _serviceUnreadLoaded = true;
                          _serviceUnreadLocallyCleared = true;
                        });
                        ref
                            .read(badgeProvider.notifier)
                            .clearServiceNotifications();
                        await Navigator.of(context, rootNavigator: true)
                            .push(MaterialPageRoute(
                          builder: (_) => const ServiceNotificationPage(),
                        ));
                      },
                    );
                  }

                  final conv = _conversations[index - headerCount];
                  final peerName = _conversationDisplayName(conv);
                  // 确定头像：群聊用群头像，单聊用对方头像
                  final String? displayAvatar;
                  if (conv.type == 2) {
                    displayAvatar = conv.avatar;
                  } else {
                    displayAvatar = conv.peerUser?['avatar'] as String?;
                  }

                  return GestureDetector(
                    onLongPressStart: (details) => _showConversationMenu(
                        conv, peerName, details.globalPosition),
                    child: ListTile(
                      leading: CircleAvatar(
                        backgroundColor: Colors.grey.shade200,
                        backgroundImage: displayAvatar != null &&
                                displayAvatar.isNotEmpty &&
                                !displayAvatar.contains('default')
                            ? NetworkImage(displayAvatar.startsWith('http')
                                ? displayAvatar
                                : '${AppConstants.apiBaseUrl}$displayAvatar')
                            : null,
                        child: displayAvatar == null ||
                                displayAvatar.isEmpty ||
                                displayAvatar.contains('default')
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
                                      fontSize: 10,
                                      color: Colors.blue.shade700)),
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
                        style:
                            const TextStyle(fontSize: 13, color: Colors.grey),
                      ),
                      trailing: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          Text(
                            _formatMessageTime(conv.lastMessage?.createdAt),
                            style: TextStyle(
                                fontSize: 11, color: Colors.grey.shade500),
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
                        _clearConversationUnreadLocal(conv.conversationId);
                        await Navigator.of(context, rootNavigator: true)
                            .push(MaterialPageRoute(
                          builder: (_) => ChatPage(
                            conversationId: conv.conversationId,
                            title: peerName,
                            type: conv.type,
                          ),
                        ));
                        // 杩斿洖鍚庡埛鏂版秷鎭垪琛紙鏇存柊鏈鏁帮級
                        _loadConversations();
                      },
                    ),
                  );
                },
              ),
            ),
    );
  }
}

/// 聊天璁板綍鎼滅储
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
            final conversationId =
                int.tryParse(msg['conversationId']?.toString() ?? '') ?? 0;
            final senderNickname = msg['senderNickname']?.toString() ?? '';
            final createdAt = msg['createdAt']?.toString() ?? '';
            return ListTile(
              leading: const CircleAvatar(
                backgroundColor: Color(0xFFE3F2FD),
                child: Icon(Icons.chat_bubble_outline,
                    size: 18, color: Colors.blue),
              ),
              title: Text(_searchMessagePreview(msgType, content),
                  maxLines: 2, overflow: TextOverflow.ellipsis),
              subtitle: Text(
                '${senderNickname.isNotEmpty ? '$senderNickname 路 ' : ''}$createdAt',
                style: const TextStyle(fontSize: 11),
              ),
              onTap: () {
                if (conversationId <= 0) return;
                close(context, '');
                Navigator.of(context, rootNavigator: true)
                    .push(MaterialPageRoute(
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
      if (data is Map && data['kind'] == 'member_join') {
        return data['text']?.toString() ?? '有新成员加入群聊';
      }
      if (data is Map && data['kind'] == 'group_invite') {
        return data['text']?.toString() ?? '邀请加入群聊';
      }
    } catch (_) {}
    return content;
  }
}

class _DigitalHumanPageV2 extends StatefulWidget {
  const _DigitalHumanPageV2();

  @override
  State<_DigitalHumanPageV2> createState() => _DigitalHumanPageV2State();
}

class _DigitalHumanPageV2State extends State<_DigitalHumanPageV2> {
  static const _digitalHumanChannel =
      MethodChannel('com.example.app/digital_human');
  static const _videoExts = {'mp4', 'mov', 'avi', 'mkv', 'webm', '3gp', 'm4v'};
  static const _audioExts = {
    'mp3',
    'wav',
    'm4a',
    'aac',
    'flac',
    'ogg',
    'opus',
    'amr',
    'wma'
  };
  final ImagePicker _imagePicker = ImagePicker();
  String _mode = '极速模式';
  bool _generating = false;

  Future<bool> _requestAnyPermission(
    List<Permission> permissions,
    String deniedMessage,
  ) async {
    for (final permission in permissions) {
      final status = await permission.status;
      if (status.isGranted || status.isLimited) return true;
    }

    for (final permission in permissions) {
      final status = await permission.request();
      if (status.isGranted || status.isLimited) return true;
    }

    if (!mounted) return false;
    Toast.error(context, deniedMessage);
    return false;
  }

  String _fileNameFromPath(String path) {
    if (path.isEmpty) return '';
    final parts = path.split(RegExp(r'[\\/]'));
    return parts.isEmpty ? path : parts.last;
  }

  String _displayFileName(XFile file) {
    final name = file.name.trim();
    return name.isNotEmpty ? name : _fileNameFromPath(file.path);
  }

  bool _hasAllowedExt(String name, Set<String> exts) {
    final clean = name.split('?').first.toLowerCase();
    final index = clean.lastIndexOf('.');
    if (index < 0 || index == clean.length - 1) return false;
    return exts.contains(clean.substring(index + 1));
  }

  Future<bool> _confirmFakeUpload({
    required String title,
    required String fileName,
  }) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: Text(title),
        content: Text('已选择：$fileName'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext, false),
            child: const Text('取消'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(dialogContext, true),
            child: const Text('确认上传'),
          ),
        ],
      ),
    );
    return confirmed == true;
  }

  Future<void> _pickTrainingVideo() async {
    final allowed = await _requestAnyPermission(
      [Permission.videos, Permission.storage],
      '请允许访问相册后再选择视频',
    );
    if (!allowed) return;

    final picked = await _imagePicker.pickVideo(source: ImageSource.gallery);
    if (picked == null || !mounted) return;

    final fileName = _displayFileName(picked);
    if (!_hasAllowedExt(fileName, _videoExts)) {
      Toast.error(context, '请选择MP4、MOV等常见视频文件');
      return;
    }

    final confirmed = await _confirmFakeUpload(
      title: '确认上传形象视频',
      fileName: fileName,
    );
    if (!mounted) return;
    if (confirmed) Toast.success(context, '形象视频已选择');
  }

  Future<void> _authorizeImage() async {
    final allowed = await _requestAnyPermission(
      [Permission.camera],
      '请允许使用相机后再授权形象',
    );
    if (!allowed) return;

    final picked = await _imagePicker.pickImage(
      source: ImageSource.camera,
      imageQuality: 88,
    );
    if (picked == null || !mounted) return;
    Toast.success(context, '形象授权已完成');
  }

  Future<void> _pickCustomVoice() async {
    final allowed = await _requestAnyPermission(
      [Permission.audio, Permission.storage],
      '请允许访问本地文件后再选择音频',
    );
    if (!allowed) return;

    try {
      final result =
          await _digitalHumanChannel.invokeMapMethod<String, dynamic>(
        'pickAudioFile',
      );
      if (result == null || !mounted) return;
      final fileName = (result['name'] ?? result['uri'] ?? '').toString();
      if (!_hasAllowedExt(fileName, _audioExts)) {
        Toast.error(context, '请选择MP3、WAV等常见音频文件');
        return;
      }
      final confirmed = await _confirmFakeUpload(
        title: '确认上传定制声音',
        fileName: fileName,
      );
      if (!mounted) return;
      if (confirmed) Toast.success(context, '声音文件已选择');
    } on PlatformException catch (e) {
      if (!mounted) return;
      Toast.error(context, e.message ?? '无法打开文件管理器');
    } catch (_) {
      if (!mounted) return;
      Toast.error(context, '无法打开文件管理器');
    }
  }

  Future<void> _startCustomize() async {
    if (_generating) return;
    _generating = true;
    Toast.info(
      context,
      'AI数字人生成中',
      duration: const Duration(seconds: 5),
    );
    await Future.delayed(const Duration(seconds: 5));
    _generating = false;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF6F7FB),
      body: SafeArea(
        child: Column(
          children: [
            _DigitalHumanHeader(
              mode: _mode,
              onBack: () => Navigator.of(context).pop(),
              onModeSelected: (value) {
                setState(() => _mode = value);
              },
            ),
            Expanded(
              child: ListView(
                padding: const EdgeInsets.fromLTRB(22, 18, 22, 24),
                children: [
                  const _DigitalHumanSectionTitle(number: '1.', title: '上传形象'),
                  const SizedBox(height: 12),
                  _UploadTrainingCard(onTap: _pickTrainingVideo),
                  const SizedBox(height: 36),
                  const _DigitalHumanSectionTitle(number: '2.', title: '授权形象'),
                  const SizedBox(height: 12),
                  _AuthorizationCard(onAuthorize: _authorizeImage),
                  const SizedBox(height: 36),
                  const _DigitalHumanSectionTitle(number: '3.', title: '选择声音'),
                  const SizedBox(height: 12),
                  _VoiceSelector(onCustomVoice: _pickCustomVoice),
                  const SizedBox(height: 170),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(22, 8, 22, 26),
              child: _StartCustomizeButton(onPressed: _startCustomize),
            ),
          ],
        ),
      ),
    );
  }
}

class _DigitalHumanHeader extends StatelessWidget {
  final String mode;
  final VoidCallback onBack;
  final ValueChanged<String> onModeSelected;

  const _DigitalHumanHeader({
    required this.mode,
    required this.onBack,
    required this.onModeSelected,
  });

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: double.infinity,
      height: 58,
      child: Stack(
        alignment: Alignment.center,
        children: [
          Positioned(
            left: 14,
            child: IconButton(
              icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 28),
              onPressed: onBack,
              color: Colors.black,
              splashRadius: 24,
            ),
          ),
          PopupMenuButton<String>(
            initialValue: mode,
            color: Colors.white,
            elevation: 8,
            offset: const Offset(0, 36),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(10),
            ),
            onSelected: onModeSelected,
            itemBuilder: (context) => const [
              PopupMenuItem(value: '极速模式', child: Text('极速模式')),
              PopupMenuItem(value: '标准模式', child: Text('标准模式')),
            ],
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  mode,
                  style: const TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.w800,
                    color: Colors.black,
                  ),
                ),
                const SizedBox(width: 5),
                const Icon(
                  Icons.arrow_drop_down_rounded,
                  size: 22,
                  color: Colors.black,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _DigitalHumanSectionTitle extends StatelessWidget {
  final String number;
  final String title;

  const _DigitalHumanSectionTitle({
    required this.number,
    required this.title,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.end,
      children: [
        Stack(
          clipBehavior: Clip.none,
          children: [
            Positioned(
              left: 1,
              right: 0,
              bottom: 2,
              child: Container(
                height: 8,
                decoration: BoxDecoration(
                  color: const Color(0xFF59E6A9),
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            Text(
              number,
              style: const TextStyle(
                fontSize: 20,
                height: 1,
                fontStyle: FontStyle.italic,
                fontWeight: FontWeight.w900,
                color: Colors.black,
              ),
            ),
          ],
        ),
        const SizedBox(width: 12),
        Text(
          title,
          style: const TextStyle(
            fontSize: 18,
            height: 1,
            fontWeight: FontWeight.w800,
            color: Colors.black,
          ),
        ),
      ],
    );
  }
}

class _UploadTrainingCard extends StatelessWidget {
  final VoidCallback onTap;

  const _UploadTrainingCard({required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(8),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(8),
        child: const SizedBox(
          height: 284,
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.add_rounded, size: 52, color: Color(0xFFC8CDD5)),
              SizedBox(height: 12),
              Text(
                '上传形象视频',
                style: TextStyle(
                  fontSize: 15,
                  color: Color(0xFFA8AFBC),
                  fontWeight: FontWeight.w500,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _AuthorizationCard extends StatelessWidget {
  final VoidCallback onAuthorize;

  const _AuthorizationCard({required this.onAuthorize});

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 84,
      padding: const EdgeInsets.fromLTRB(22, 14, 24, 14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        children: [
          const Icon(
            Icons.shield_outlined,
            size: 34,
            color: Color(0xFFC1C7D2),
          ),
          const SizedBox(width: 18),
          const Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(
                  '待授权',
                  style: TextStyle(
                    fontSize: 17,
                    fontWeight: FontWeight.w800,
                    color: Colors.black,
                  ),
                ),
                SizedBox(height: 6),
                Text(
                  '授权你的形象定制数字人',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontSize: 13,
                    color: Color(0xFFA0A7B4),
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ],
            ),
          ),
          Material(
            color: const Color(0xFF101114),
            borderRadius: BorderRadius.circular(24),
            child: InkWell(
              onTap: onAuthorize,
              borderRadius: BorderRadius.circular(24),
              child: const SizedBox(
                width: 96,
                height: 48,
                child: Center(
                  child: Text(
                    '去授权',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 15,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _VoiceSelector extends StatelessWidget {
  final VoidCallback onCustomVoice;

  const _VoiceSelector({required this.onCustomVoice});

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 106,
      child: ListView(
        scrollDirection: Axis.horizontal,
        clipBehavior: Clip.none,
        children: [
          _VoiceCard(
            isCustom: true,
            label: '定制声音',
            onTap: onCustomVoice,
          ),
          const SizedBox(width: 18),
          const _VoiceCard(label: '萌娃音', showVip: true),
          const SizedBox(width: 18),
          const _VoiceCard(label: '御姐音', showVip: true),
          const SizedBox(width: 18),
          const _VoiceCard(label: '男青年', showVip: true),
        ],
      ),
    );
  }
}

class _VoiceCard extends StatelessWidget {
  final String label;
  final bool isCustom;
  final bool showVip;
  final VoidCallback? onTap;

  const _VoiceCard({
    required this.label,
    this.isCustom = false,
    this.showVip = false,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Stack(
      clipBehavior: Clip.none,
      children: [
        Material(
          color: Colors.white,
          borderRadius: BorderRadius.circular(8),
          child: InkWell(
            onTap: onTap,
            borderRadius: BorderRadius.circular(8),
            child: SizedBox(
              width: 84,
              height: 106,
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  if (isCustom) ...[
                    const Icon(Icons.add_rounded,
                        size: 42, color: Colors.black),
                    const SizedBox(height: 8),
                  ],
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 6),
                    child: Text(
                      label,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontSize: isCustom ? 12 : 15,
                        fontWeight:
                            isCustom ? FontWeight.w500 : FontWeight.w600,
                        color: Colors.black,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
        if (showVip)
          Positioned(
            right: 0,
            top: 0,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
              decoration: const BoxDecoration(
                color: Color(0xFFE8C18F),
                borderRadius: BorderRadius.only(
                  topRight: Radius.circular(8),
                  bottomLeft: Radius.circular(8),
                ),
              ),
              child: const Text(
                'VIP',
                style: TextStyle(
                  color: Colors.black,
                  fontSize: 9,
                  fontWeight: FontWeight.w900,
                ),
              ),
            ),
          ),
      ],
    );
  }
}

class _StartCustomizeButton extends StatelessWidget {
  final VoidCallback onPressed;

  const _StartCustomizeButton({required this.onPressed});

  @override
  Widget build(BuildContext context) {
    return Material(
      color: const Color(0xFF101114),
      borderRadius: BorderRadius.circular(8),
      child: InkWell(
        onTap: onPressed,
        borderRadius: BorderRadius.circular(8),
        child: const SizedBox(
          height: 58,
          child: Center(
            child: Text(
              '开始定制',
              style: TextStyle(
                color: Colors.white,
                fontSize: 18,
                fontWeight: FontWeight.w800,
              ),
            ),
          ),
        ),
      ),
    );
  }
}
