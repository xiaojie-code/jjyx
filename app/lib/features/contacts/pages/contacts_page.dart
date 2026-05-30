import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
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
  final _searchCtrl = TextEditingController();

  @override
  void initState() {
    super.initState();
    _loadContacts();
  }

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
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
                      return ListTile(
                        leading: CircleAvatar(
                          backgroundImage:
                              (c['avatar'] as String?)?.isNotEmpty == true
                                  ? NetworkImage(c['avatar'])
                                  : null,
                          child: (c['avatar'] as String?)?.isEmpty != false
                              ? const Icon(Icons.person)
                              : null,
                        ),
                        title: Text(c['remark'] ?? c['nickname'] ?? ''),
                        subtitle: Text(c['nickname'] ?? ''),
                        onTap: () async {
                          // 获取与该联系人的会话，跳转到聊天页面
                          try {
                            final result = await ref
                                .read(apiClientProvider)
                                .get<Map<String, dynamic>>(
                                  '/api/social/conversations/with/${c['userId']}',
                                );
                            if (!context.mounted) return;
                            if (result != null &&
                                result['conversationId'] != null) {
                              await Navigator.of(context, rootNavigator: true)
                                  .push(MaterialPageRoute(
                                builder: (_) => ChatPage(
                                  conversationId:
                                      result['conversationId'] as int,
                                  title: c['remark'] ?? c['nickname'] ?? '聊天',
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
                        onLongPress: () {
                          showDialog(
                            context: context,
                            builder: (ctx) => AlertDialog(
                              title: const Text('删除联系人'),
                              content: const Text('确定删除该联系人？将同时删除聊天记录'),
                              actions: [
                                TextButton(
                                    onPressed: () => Navigator.pop(ctx),
                                    child: const Text('取消')),
                                TextButton(
                                  onPressed: () async {
                                    await ref.read(apiClientProvider).delete(
                                        ApiEndpoints.contactDelete(
                                            c['userId']));
                                    if (!ctx.mounted) return;
                                    Navigator.pop(ctx);
                                    if (mounted) _loadContacts();
                                  },
                                  child: const Text('删除',
                                      style: TextStyle(color: Colors.red)),
                                ),
                              ],
                            ),
                          );
                        },
                      );
                    },
                  ),
                ),
    );
  }
}
