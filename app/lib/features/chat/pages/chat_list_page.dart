import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
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

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
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

  /// 加载服务通知未读数（仅管理员有意义，普通用户一般为0）
  bool get _canUseServiceNotifications =>
      ref.read(authProvider).user != null ||
      ref.read(authProvider).profile != null;

  bool get _hasKnownUser =>
      ref.read(authProvider).user != null ||
      ref.read(authProvider).profile != null;

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
    // 鐩存帴鍦ㄦ湰鍦版洿鏂颁細璇濆垪琛紝涓嶇瓑寰?API
    setState(() {
      final idx = _conversations
          .indexWhere((c) => c.conversationId == msg.conversationId);
      if (idx >= 0) {
        // Update existing conversation preview and unread count.
        final old = _conversations[idx];
        _conversations[idx] = ConversationItem(
          conversationId: old.conversationId,
          type: old.type,
          name: old.name,
          avatar: old.avatar,
          isPinned: old.isPinned,
          unreadCount: old.unreadCount + 1,
          peerUser: old.peerUser,
          lastMessage: msg,
        );
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
    // 本地先 +1，保证角标即时更新
    setState(() => _serviceUnread += 1);
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
        return ConversationItem(
          conversationId: map['conversationId'] as int,
          type: map['type'] as int?,
          name: map['name'] as String?,
          avatar: map['avatar'] as String?,
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
        // 置顶浼樺厛
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        // 鎸夋渶鏂版秷鎭椂闂撮檷搴忥紙瓒婃柊瓒婇潬涓婏級
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
      Map<String, dynamic>? meeting =
          await api.get<Map<String, dynamic>>(
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
            final balance =
                await api.get<Map<String, dynamic>>(ApiEndpoints.currencyBalance);
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
    final isAdmin = authState.user?.isAdmin == true ||
        authState.profile?.user.isAdmin == true;
    final showServiceNotifications = isAdmin || _serviceUnread > 0;
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
                          builder: (_) => const _DigitalHumanPage(),
                        ));
                      },
                    );
                  }

                  if (index == 2) {
                    return ListTile(
                      leading: CircleAvatar(
                        backgroundColor: Colors.green.shade100,
                        child: const Icon(Icons.video_call,
                            color: Colors.green),
                      ),
                      title: const Text('群会议',
                          style: TextStyle(fontWeight: FontWeight.w600)),
                      subtitle: const Text('选择群聊发起会议'),
                      onTap: _openGroupMeetingEntry,
                    );
                  }

                  // 服务通知入口（仅管理员）
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
                        await Navigator.of(context, rootNavigator: true)
                            .push(MaterialPageRoute(
                          builder: (_) => const ServiceNotificationPage(),
                        ));
                        _loadServiceUnread();
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

/// Digital human page - not open yet.
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
              style: TextStyle(
                  fontSize: 18,
                  color: Colors.grey,
                  fontWeight: FontWeight.w500),
            ),
          ],
        ),
      ),
    );
  }
}
