import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/constants/app_constants.dart';
import '../../../core/network/api_client.dart';
import '../../../core/network/api_endpoints.dart';
import '../../../core/utils/toast.dart';
import 'friend_requests_page.dart';
import '../../chat/pages/create_group_page.dart';
import '../../chat/pages/chat_page.dart';

class ContactsPage extends ConsumerStatefulWidget {
  const ContactsPage({super.key});

  @override
  ConsumerState<ContactsPage> createState() => _ContactsPageState();
}

class _ContactsPageState extends ConsumerState<ContactsPage> {
  List<Map<String, dynamic>> _contacts = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadContacts();
  }

  Future<void> _loadContacts() async {
    try {
      final result = await ref
          .read(apiClientProvider)
          .get<List<dynamic>>(ApiEndpoints.contacts);
      setState(() {
        _contacts =
            (result ?? []).map((e) => Map<String, dynamic>.from(e)).toList();
        _loading = false;
      });
    } catch (e) {
      setState(() => _loading = false);
    }
  }

  void _showAddDialog() {
    final ctrl = TextEditingController();
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('添加联系人'),
        content: TextField(
            controller: ctrl,
            decoration: const InputDecoration(hintText: '输入对方账号')),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(ctx), child: const Text('取消')),
          TextButton(
            onPressed: () async {
              try {
                await ref.read(apiClientProvider).post(
                    ApiEndpoints.contactRequest,
                    data: {'account': ctrl.text.trim()});
                if (!mounted || !ctx.mounted) return;
                Navigator.pop(ctx);
                Toast.success(context, '申请已发送');
              } catch (e) {
                if (!mounted) return;
                String msg = '操作失败';
                final errStr = e.toString();
                if (errStr.contains('已发送过申请')) {
                  msg = '已发送过申请，请等待对方处理';
                } else if (errStr.contains('已经是好友')) {
                  msg = '你们已经是好友了';
                } else if (errStr.contains('不能添加自己')) {
                  msg = '不能添加自己为好友';
                } else if (errStr.contains('账号不存在')) {
                  msg = '账号不存在，请核对后重试';
                }
                Toast.warning(context, msg);
              }
            },
            child: const Text('发送申请'),
          ),
        ],
      ),
    );
  }

  /// 获取联系人显示名称：有备注显示"备注(账号)"，无备注显示昵称
  String _displayName(Map<String, dynamic> c) {
    final remark = (c['remark'] as String?)?.trim();
    final account = c['account'] as String? ?? '';
    final nickname = c['nickname'] as String? ?? '';
    if (remark != null && remark.isNotEmpty) {
      return '$remark($account)';
    }
    return nickname.isNotEmpty ? nickname : account;
  }

  /// 聊天标题用名称：有备注只显示备注（不显示账号），无备注显示昵称
  String _chatTitle(Map<String, dynamic> c) {
    final remark = (c['remark'] as String?)?.trim();
    final nickname = c['nickname'] as String? ?? '';
    final account = c['account'] as String? ?? '';
    if (remark != null && remark.isNotEmpty) return remark;
    return nickname.isNotEmpty ? nickname : account;
  }

  /// 长按联系人弹出操作菜单
  void _showContactMenu(Map<String, dynamic> c, Offset position) {
    final overlay =
        Overlay.of(context).context.findRenderObject() as RenderBox;
    showMenu<String>(
      context: context,
      position: RelativeRect.fromLTRB(
        position.dx,
        position.dy,
        overlay.size.width - position.dx,
        overlay.size.height - position.dy,
      ),
      items: const [
        PopupMenuItem<String>(
          value: 'remark',
          child: Row(
            children: [
              Icon(Icons.edit_note, size: 18, color: Colors.black87),
              SizedBox(width: 10),
              Text('修改备注'),
            ],
          ),
        ),
        PopupMenuItem<String>(
          value: 'delete',
          child: Row(
            children: [
              Icon(Icons.delete_outline, size: 18, color: Colors.red),
              SizedBox(width: 10),
              Text('删除', style: TextStyle(color: Colors.red)),
            ],
          ),
        ),
      ],
    ).then((value) {
      if (value == 'remark') {
        _showRemarkDialog(c);
      } else if (value == 'delete') {
        _confirmDeleteContact(c);
      }
    });
  }

  /// 修改备注弹窗
  Future<void> _showRemarkDialog(Map<String, dynamic> c) async {
    final ctrl = TextEditingController(text: c['remark'] as String? ?? '');
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
        ApiEndpoints.contactRemark(c['userId']),
        data: {'remark': newRemark},
      );
      if (mounted) {
        Toast.success(context, '备注已更新');
        _loadContacts();
      }
    } catch (e) {
      if (mounted) Toast.error(context, '$e');
    }
  }

  /// 删除联系人确认
  Future<void> _confirmDeleteContact(Map<String, dynamic> c) async {
    final displayName = _displayName(c);
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('删除联系人'),
        content: Text('确定删除「$displayName」？将同时删除聊天记录'),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(ctx, false),
              child: const Text('取消')),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('删除', style: TextStyle(color: Colors.red)),
          ),
        ],
      ),
    );
    if (confirmed != true) return;
    try {
      await ref
          .read(apiClientProvider)
          .delete(ApiEndpoints.contactDelete(c['userId']));
      if (mounted) _loadContacts();
    } catch (e) {
      if (mounted) Toast.error(context, '$e');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('联系人'),
        actions: [
          IconButton(
              icon: const Icon(Icons.notifications),
              onPressed: () {
                Navigator.of(context, rootNavigator: true).push(
                    MaterialPageRoute(
                        builder: (_) => const FriendRequestsPage()));
              }),
          IconButton(
              icon: const Icon(Icons.group_add),
              onPressed: () async {
                final result = await Navigator.of(context, rootNavigator: true)
                    .push(MaterialPageRoute(
                        builder: (_) => const CreateGroupPage()));
                if (result == true) _loadContacts();
              }),
          IconButton(
              icon: const Icon(Icons.person_add), onPressed: _showAddDialog),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _contacts.isEmpty
              ? const Center(child: Text('暂无联系人'))
              : RefreshIndicator(
                  onRefresh: _loadContacts,
                  child: ListView.builder(
                    itemCount: _contacts.length,
                    itemBuilder: (context, index) {
                      final c = _contacts[index];
                      final avatar = c['avatar'] as String?;
                      final displayName = _displayName(c);

                      return GestureDetector(
                        onLongPressStart: (details) =>
                            _showContactMenu(c, details.globalPosition),
                        child: ListTile(
                          leading: CircleAvatar(
                            backgroundColor: Colors.grey.shade200,
                            backgroundImage: avatar != null &&
                                    avatar.isNotEmpty &&
                                    !avatar.contains('default')
                                ? NetworkImage(avatar.startsWith('http')
                                    ? avatar
                                    : '${AppConstants.apiBaseUrl}$avatar')
                                : null,
                            child: avatar == null ||
                                    avatar.isEmpty ||
                                    avatar.contains('default')
                                ? const Icon(Icons.person,
                                    color: Colors.grey)
                                : null,
                          ),
                          title: Text(displayName),
                          onTap: () async {
                            try {
                              final result = await ref
                                  .read(apiClientProvider)
                                  .get<Map<String, dynamic>>(
                                    '/api/social/conversations/with/${c['userId']}',
                                  );
                              if (!context.mounted) return;
                              if (result != null &&
                                  result['conversationId'] != null) {
                                await Navigator.of(context,
                                        rootNavigator: true)
                                    .push(MaterialPageRoute(
                                  builder: (_) => ChatPage(
                                    conversationId:
                                        result['conversationId'] as int,
                                    title: _chatTitle(c),
                                    type: 1,
                                  ),
                                ));
                              } else {
                                Toast.error(context, '获取会话失败，请重试');
                              }
                            } catch (e) {
                              if (!context.mounted) return;
                              Toast.error(context, '获取会话失败');
                            }
                          },
                        ),
                      );
                    },
                  ),
                ),
    );
  }
}
