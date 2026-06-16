import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';
import 'package:dio/dio.dart';
import '../../../core/constants/app_constants.dart';
import '../../../core/network/api_client.dart';
import '../../../core/network/api_endpoints.dart';
import '../../../core/utils/toast.dart';
import '../../auth/providers/auth_provider.dart';
import 'meeting_page.dart';
import 'select_contacts_page.dart';

class GroupDetailPage extends ConsumerStatefulWidget {
  final int conversationId;
  final String groupName;

  const GroupDetailPage(
      {super.key, required this.conversationId, required this.groupName});

  @override
  ConsumerState<GroupDetailPage> createState() => _GroupDetailPageState();
}

class _GroupDetailPageState extends ConsumerState<GroupDetailPage> {
  List<Map<String, dynamic>> _members = [];
  List<Map<String, dynamic>> _filteredMembers = [];
  bool _loading = true;
  late String _groupName;
  String _announcement = '';
  String _myGroupNickname = '';
  String _groupAvatar = '';
  int _creatorId = 0;
  final _memberSearchCtrl = TextEditingController();

  @override
  void initState() {
    super.initState();
    _groupName = widget.groupName;
    _loadMembers();
    _loadGroupInfo();
  }

  Future<void> _loadMembers() async {
    try {
      final result = await ref.read(apiClientProvider).get<List<dynamic>>(
            ApiEndpoints.groupMembers(widget.conversationId),
          );
      setState(() {
        _members =
            (result ?? []).map((e) => Map<String, dynamic>.from(e)).toList();
        _filterMembers(_memberSearchCtrl.text);
        _loading = false;
      });
    } catch (e) {
      setState(() => _loading = false);
    }
  }

  void _filterMembers(String keyword) {
    final kw = keyword.trim().toLowerCase();
    if (kw.isEmpty) {
      _filteredMembers = _members;
    } else {
      _filteredMembers = _members.where((m) {
        final nickname = (m['nickname'] ?? '').toString().toLowerCase();
        final account = (m['account'] ?? '').toString().toLowerCase();
        return nickname.contains(kw) || account.contains(kw);
      }).toList();
    }
  }

  Future<void> _loadGroupInfo() async {
    try {
      final result = await ref.read(apiClientProvider).get<Map<String, dynamic>>(
        '/api/social/groups/${widget.conversationId}/info',
      );
      if (mounted && result != null) {
        setState(() {
          _announcement = result['announcement']?.toString() ?? '';
          _myGroupNickname = result['myGroupNickname']?.toString() ?? '';
          _groupAvatar = result['avatar']?.toString() ?? '';
          _creatorId = int.tryParse(result['creatorId']?.toString() ?? '') ?? 0;
        });
      }
    } catch (_) {}
  }

  /// 群主更换群头像
  Future<void> _changeGroupAvatar() async {
    final source = await showModalBottomSheet<ImageSource>(
      context: context,
      builder: (ctx) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: const Icon(Icons.photo_library_outlined),
              title: const Text('从相册选择'),
              onTap: () => Navigator.pop(ctx, ImageSource.gallery),
            ),
            if (!kIsWeb)
              ListTile(
                leading: const Icon(Icons.photo_camera_outlined),
                title: const Text('拍照'),
                onTap: () => Navigator.pop(ctx, ImageSource.camera),
              ),
          ],
        ),
      ),
    );
    if (source == null || !mounted) return;
    try {
      final picked = await ImagePicker().pickImage(
        source: source,
        maxWidth: 512,
        maxHeight: 512,
        imageQuality: 80,
      );
      if (picked == null) return;
      final bytes = await picked.readAsBytes();
      final filename = picked.name.isNotEmpty ? picked.name : 'group_avatar.jpg';
      final formData = FormData.fromMap({
        'avatar': MultipartFile.fromBytes(bytes, filename: filename),
      });
      final result = await ref.read(apiClientProvider).upload<Map<String, dynamic>>(
        ApiEndpoints.groupAvatar(widget.conversationId),
        formData: formData,
      );
      if (mounted && result != null) {
        setState(() => _groupAvatar = result['avatar']?.toString() ?? '');
        Toast.success(context, '群头像已更新');
      }
    } catch (e) {
      if (mounted) Toast.error(context, '更换群头像失败：$e');
    }
  }

  Future<void> _editAnnouncement() async {
    final ctrl = TextEditingController(text: _announcement);
    final newValue = await showDialog<String>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('编辑群公告'),
        content: TextField(
          controller: ctrl,
          maxLines: 5,
          decoration: const InputDecoration(
            hintText: '输入群公告内容',
            border: OutlineInputBorder(),
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('取消')),
          ElevatedButton(onPressed: () => Navigator.pop(ctx, ctrl.text), child: const Text('保存')),
        ],
      ),
    );
    ctrl.dispose();
    if (newValue == null) return;
    try {
      await ref.read(apiClientProvider).put(
        '/api/social/groups/${widget.conversationId}/announcement',
        data: {'announcement': newValue.trim()},
      );
      if (mounted) {
        setState(() => _announcement = newValue.trim());
        Toast.success(context, '群公告已更新');
      }
    } catch (e) {
      if (mounted) Toast.error(context, '$e');
    }
  }

  Future<void> _editMyGroupNickname() async {
    final ctrl = TextEditingController(text: _myGroupNickname);
    final newValue = await showDialog<String>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('我在本群的昵称'),
        content: TextField(
          controller: ctrl,
          decoration: const InputDecoration(
            hintText: '输入昵称，留空则使用默认昵称',
            border: OutlineInputBorder(),
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('取消')),
          ElevatedButton(onPressed: () => Navigator.pop(ctx, ctrl.text), child: const Text('保存')),
        ],
      ),
    );
    ctrl.dispose();
    if (newValue == null) return;
    try {
      await ref.read(apiClientProvider).put(
        '/api/social/groups/${widget.conversationId}/my-nickname',
        data: {'nickname': newValue.trim()},
      );
      if (mounted) {
        setState(() => _myGroupNickname = newValue.trim());
        Toast.success(context, '群昵称已更新');
      }
    } catch (e) {
      if (mounted) Toast.error(context, '$e');
    }
  }

  Future<void> _muteUser(int targetUserId, bool mute) async {
    try {
      await ref.read(apiClientProvider).put(
        '/api/social/groups/${widget.conversationId}/mute',
        data: {'targetUserId': targetUserId, 'mute': mute},
      );
      if (mounted) {
        Toast.success(context, mute ? '已禁言' : '已解除禁言');
        _loadMembers();
      }
    } catch (e) {
      if (mounted) Toast.error(context, '操作失败');
    }
  }

  Future<void> _removeMember(int targetUserId) async {
    try {
      await ref.read(apiClientProvider).delete(
            '/api/social/groups/${widget.conversationId}/members/$targetUserId',
          );
      if (mounted) {
        Toast.success(context, '已移除');
        _loadMembers();
      }
    } catch (e) {
      if (mounted) Toast.error(context, '操作失败');
    }
  }

  Future<void> _setAdmin(int targetUserId, bool admin) async {
    try {
      await ref.read(apiClientProvider).put(
        ApiEndpoints.groupMemberRole(widget.conversationId, targetUserId),
        data: {'role': admin ? 2 : 1},
      );
      if (mounted) {
        Toast.success(context, admin ? '已设为管理员' : '已取消管理员');
        _loadMembers();
      }
    } catch (_) {
      if (mounted) Toast.error(context, '操作失败');
    }
  }

  Future<void> _renameGroup() async {
    final ctrl = TextEditingController(text: _groupName);
    final name = await showDialog<String>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('修改群名'),
        content: TextField(
            controller: ctrl,
            decoration: const InputDecoration(border: OutlineInputBorder())),
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
    if (name == null || name.isEmpty || name == _groupName) return;
    try {
      await ref.read(apiClientProvider).put(
          ApiEndpoints.groupDetail(widget.conversationId),
          data: {'name': name});
      if (mounted) {
        setState(() => _groupName = name);
        Toast.success(context, '群名已更新');
      }
    } catch (_) {
      if (mounted) Toast.error(context, '修改失败');
    }
  }

  Future<void> _addMember() async {
    // 鑾峰彇褰撳墠缇ゆ垚鍛業D鍒楄〃锛屾帓闄ゅ凡鍦ㄧ兢涓殑
    final existingIds = _members
        .map((m) => int.tryParse(m['userId']?.toString() ?? '') ?? 0)
        .where((id) => id > 0)
        .toList();

    final selectedIds = await Navigator.push<List<int>>(
      context,
      MaterialPageRoute(
        builder: (_) => SelectContactsPage(excludeUserIds: existingIds),
      ),
    );
    if (selectedIds == null || selectedIds.isEmpty) return;

    int successCount = 0;
    for (final userId in selectedIds) {
      try {
        await ref.read(apiClientProvider).post(
            ApiEndpoints.groupMembers(widget.conversationId),
            data: {'memberId': userId});
        successCount++;
      } catch (_) {}
    }
    if (mounted) {
      Toast.success(context, '已发送 $successCount 个邀请');
      _loadMembers();
    }
  }

  Future<void> _deleteGroup() async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('解散群聊'),
        content: const Text('确定解散该群聊？此操作会删除群聊关系。'),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(ctx, false),
              child: const Text('取消')),
          TextButton(
              onPressed: () => Navigator.pop(ctx, true),
              child: const Text('解散', style: TextStyle(color: Colors.red))),
        ],
      ),
    );
    if (confirm != true) return;
    try {
      await ref
          .read(apiClientProvider)
          .delete(ApiEndpoints.groupDetail(widget.conversationId));
      if (mounted) {
        Toast.success(context, '群聊已解散');
        Navigator.pop(context, true);
      }
    } catch (_) {
      if (mounted) Toast.error(context, '解散失败');
    }
  }

  bool _canManageMeeting() {
    final authState = ref.read(authProvider);
    final myId = authState.user?.id ?? authState.profile?.user.id ?? 0;
    for (final member in _members) {
      if (int.tryParse(member['userId']?.toString() ?? '') == myId) {
        final role = int.tryParse(member['role']?.toString() ?? '') ?? 1;
        return member['isOwner'] == true || role >= 2;
      }
    }
    return false;
  }

  Future<void> _openMeeting() async {
    try {
      Map<String, dynamic>? meeting =
          await ref.read(apiClientProvider).get<Map<String, dynamic>>(
                ApiEndpoints.groupMeetingActive(widget.conversationId),
              );
      if (meeting == null) {
        final free = _canManageMeeting();
        var currentPoints = 0;
        if (!free) {
          try {
            final balance = await ref
                .read(apiClientProvider)
                .get<Map<String, dynamic>>('/api/currency/balance');
            currentPoints =
                (double.tryParse(balance?['points']?.toString() ?? '0') ?? 0)
                    .toInt();
          } catch (_) {}
        }
        final confirm = await showDialog<bool>(
          context: context,
          builder: (ctx) => AlertDialog(
            title: const Text('发起群会议'),
            content: Text(
              free
                  ? '当前没有进行中的会议，是否立即发起？'
                  : '发起会议将消耗10000积分\n当前积分余额：$currentPoints',
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(ctx, false),
                child: const Text('取消'),
              ),
              ElevatedButton(
                onPressed: () => Navigator.pop(ctx, true),
                child: const Text('确认发起'),
              ),
            ],
          ),
        );
        if (confirm != true) return;
        if (!free && currentPoints < 10000) {
          Toast.warning(context, '积分不足，无法发起会议');
          return;
        }
        meeting = await ref.read(apiClientProvider).post<Map<String, dynamic>>(
          ApiEndpoints.groupMeetingStart(widget.conversationId),
          data: {'title': '$_groupName的会议'},
        );
      }
      if (!mounted || meeting == null) return;
      final meetingData = meeting;
      Navigator.of(context, rootNavigator: true).push(MaterialPageRoute(
        builder: (_) => MeetingPage(
            groupId: widget.conversationId,
            groupName: _groupName,
            meeting: meetingData),
      ));
    } catch (e) {
      if (mounted) Toast.error(context, '$e');
    }
  }

  Future<void> _leaveGroup() async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('退出群聊'),
        content: const Text('确定退出该群聊？'),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(ctx, false),
              child: const Text('取消')),
          TextButton(
              onPressed: () => Navigator.pop(ctx, true),
              child: const Text('确定', style: TextStyle(color: Colors.red))),
        ],
      ),
    );
    if (confirm != true) return;
    try {
      await ref
          .read(apiClientProvider)
          .post('/api/social/groups/${widget.conversationId}/leave');
      if (mounted) {
        Toast.success(context, '已退出群聊');
        Navigator.pop(context, true);
      }
    } catch (e) {
      if (mounted) Toast.error(context, '退出失败');
    }
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authProvider);
    final myId = authState.user?.id ?? authState.profile?.user.id ?? 0;
    Map<String, dynamic>? myMember;
    for (final member in _members) {
      if (int.tryParse(member['userId']?.toString() ?? '') == myId) {
        myMember = member;
        break;
      }
    }
    final myRole = int.tryParse(myMember?['role']?.toString() ?? '') ?? 1;
    final iAmOwner = myMember?['isOwner'] == true;
    final canManage = iAmOwner || myRole >= 2;

    return Scaffold(
      appBar: AppBar(
        title: Text(_groupName),
        actions: [
          IconButton(icon: const Icon(Icons.videocam), onPressed: _openMeeting),
          if (canManage)
            IconButton(icon: const Icon(Icons.edit), onPressed: _renameGroup),
          IconButton(
              icon: const Icon(Icons.person_add), onPressed: _addMember),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : Column(
              children: [
                // 群信息
                Container(
                  padding: const EdgeInsets.all(16),
                  color: Colors.white,
                  child: Row(
                    children: [
                      GestureDetector(
                        onTap: iAmOwner ? _changeGroupAvatar : null,
                        child: Stack(
                          children: [
                            CircleAvatar(
                              radius: 24,
                              backgroundColor: Colors.blue.shade100,
                              backgroundImage: _groupAvatar.isNotEmpty &&
                                      !_groupAvatar.contains('default')
                                  ? NetworkImage(_groupAvatar.startsWith('http')
                                      ? _groupAvatar
                                      : '${AppConstants.apiBaseUrl}$_groupAvatar')
                                  : null,
                              child: _groupAvatar.isEmpty ||
                                      _groupAvatar.contains('default')
                                  ? const Icon(Icons.group, color: Colors.blue)
                                  : null,
                            ),
                            if (iAmOwner)
                              Positioned(
                                right: 0,
                                bottom: 0,
                                child: Container(
                                  padding: const EdgeInsets.all(2),
                                  decoration: BoxDecoration(
                                    color: Colors.white,
                                    shape: BoxShape.circle,
                                    border: Border.all(color: Colors.grey.shade300),
                                  ),
                                  child: const Icon(Icons.camera_alt, size: 12, color: Colors.grey),
                                ),
                              ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(_groupName,
                                style: const TextStyle(
                                    fontSize: 16, fontWeight: FontWeight.w600)),
                            Text('${_members.length} 位成员',
                                style: const TextStyle(
                                    fontSize: 13, color: Colors.grey)),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 8),
                // 缇ゅ叕鍛?
                ListTile(
                  dense: true,
                  leading: const Icon(Icons.campaign, size: 20, color: Colors.orange),
                  title: const Text('群公告', style: TextStyle(fontSize: 14)),
                  subtitle: Text(
                    _announcement.isEmpty ? '暂无公告' : _announcement,
                    maxLines: 2, overflow: TextOverflow.ellipsis,
                    style: const TextStyle(fontSize: 12, color: Colors.grey),
                  ),
                  trailing: canManage ? const Icon(Icons.edit, size: 16) : null,
                  onTap: canManage ? _editAnnouncement : null,
                ),
                // 鎴戝湪鏈兢鐨勬樀绉?
                ListTile(
                  dense: true,
                  leading: const Icon(Icons.badge, size: 20, color: Colors.blue),
                  title: const Text('我在本群的昵称', style: TextStyle(fontSize: 14)),
                  subtitle: Text(
                    _myGroupNickname.isEmpty ? '未设置' : _myGroupNickname,
                    style: const TextStyle(fontSize: 12, color: Colors.grey),
                  ),
                  trailing: const Icon(Icons.edit, size: 16),
                  onTap: _editMyGroupNickname,
                ),
                const SizedBox(height: 8),
                // 鎴愬憳鎼滅储
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                  child: TextField(
                    controller: _memberSearchCtrl,
                    onChanged: (v) => setState(() => _filterMembers(v)),
                    decoration: InputDecoration(
                      hintText: '搜索成员',
                      prefixIcon: const Icon(Icons.search, size: 20),
                      isDense: true,
                      contentPadding: const EdgeInsets.symmetric(vertical: 8),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                    ),
                  ),
                ),
                // 鎴愬憳鍒楄〃
                Expanded(
                  child: ListView.builder(
                    itemCount: _filteredMembers.length,
                    itemBuilder: (context, index) {
                      final m = _filteredMembers[index];
                      final role = m['role'] as int? ?? 1;
                      final isMuted = m['isMuted'] == true;
                      final isOwner = m['isOwner'] == true;
                      final targetUserId =
                          int.tryParse(m['userId']?.toString() ?? '') ?? 0;
                      return ListTile(
                        leading: CircleAvatar(
                          backgroundColor: isOwner
                              ? Colors.blue.shade100
                              : role == 2
                                  ? Colors.orange.shade100
                                  : Colors.grey.shade200,
                          child:
                              Icon(isOwner ? Icons.verified_user : Icons.person,
                                  color: isOwner
                                      ? Colors.blue
                                      : role == 2
                                          ? Colors.orange
                                          : Colors.grey),
                        ),
                        title: Row(
                          children: [
                            Text(m['nickname'] ?? "用户${m['userId']}"),
                            if (isOwner) ...[
                              const SizedBox(width: 6),
                              Container(
                                padding: const EdgeInsets.symmetric(
                                    horizontal: 4, vertical: 1),
                                decoration: BoxDecoration(
                                    color: Colors.blue.shade50,
                                    borderRadius: BorderRadius.circular(3)),
                                child: const Text('群主',
                                    style: TextStyle(
                                        fontSize: 10, color: Colors.blue)),
                              ),
                            ] else if (role == 2) ...[
                              const SizedBox(width: 6),
                              Container(
                                padding: const EdgeInsets.symmetric(
                                    horizontal: 4, vertical: 1),
                                decoration: BoxDecoration(
                                    color: Colors.orange.shade50,
                                    borderRadius: BorderRadius.circular(3)),
                                child: const Text('管理员',
                                    style: TextStyle(
                                        fontSize: 10, color: Colors.orange)),
                              ),
                            ],
                            if (isMuted) ...[
                              const SizedBox(width: 6),
                              Container(
                                padding: const EdgeInsets.symmetric(
                                    horizontal: 4, vertical: 1),
                                decoration: BoxDecoration(
                                    color: Colors.red.shade50,
                                    borderRadius: BorderRadius.circular(3)),
                                child: const Text('已禁言',
                                    style: TextStyle(
                                        fontSize: 10, color: Colors.red)),
                              ),
                            ],
                          ],
                        ),
                        trailing: canManage && targetUserId != myId
                            ? PopupMenuButton<String>(
                                onSelected: (action) {
                                  switch (action) {
                                    case 'mute':
                                      _muteUser(m['userId'], true);
                                      break;
                                    case 'unmute':
                                      _muteUser(m['userId'], false);
                                      break;
                                    case 'admin':
                                      _setAdmin(m['userId'], true);
                                      break;
                                    case 'member':
                                      _setAdmin(m['userId'], false);
                                      break;
                                    case 'remove':
                                      _removeMember(m['userId']);
                                      break;
                                  }
                                },
                                itemBuilder: (ctx) => [
                                  if (iAmOwner && !isOwner && role != 2)
                                    const PopupMenuItem(
                                        value: 'admin', child: Text('设为管理员')),
                                  if (iAmOwner && !isOwner && role == 2)
                                    const PopupMenuItem(
                                        value: 'member', child: Text('取消管理员')),
                                  if (!isMuted)
                                    const PopupMenuItem(
                                        value: 'mute', child: Text('禁言')),
                                  if (isMuted)
                                    const PopupMenuItem(
                                        value: 'unmute', child: Text('解除禁言')),
                                  if (!isOwner)
                                    const PopupMenuItem(
                                        value: 'remove',
                                        child: Text('移出群聊',
                                            style:
                                                TextStyle(color: Colors.red))),
                                ],
                              )
                            : null,
                      );
                    },
                  ),
                ),
                // 搴曢儴鎿嶄綔
                Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    children: [
                      SizedBox(
                        width: double.infinity,
                        child: OutlinedButton.icon(
                          onPressed: _openMeeting,
                          icon: const Icon(Icons.videocam),
                          label: Text(canManage ? '发起/加入群会议' : '加入群会议'),
                        ),
                      ),
                      const SizedBox(height: 8),
                      SizedBox(
                        width: double.infinity,
                        child: OutlinedButton(
                          onPressed: iAmOwner ? _deleteGroup : _leaveGroup,
                          style: OutlinedButton.styleFrom(
                              foregroundColor: Colors.red),
                          child: Text(iAmOwner ? '解散群聊' : '退出群聊'),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
    );
  }
}
