import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/api_client.dart';
import '../../../core/network/api_endpoints.dart';
import '../../../core/utils/toast.dart';

class CreateGroupPage extends ConsumerStatefulWidget {
  const CreateGroupPage({super.key});

  @override
  ConsumerState<CreateGroupPage> createState() => _CreateGroupPageState();
}

class _CreateGroupPageState extends ConsumerState<CreateGroupPage> {
  final _nameCtrl = TextEditingController();
  List<Map<String, dynamic>> _contacts = [];
  final Set<int> _selected = {};
  bool _loading = true;
  bool _creating = false;

  @override
  void initState() {
    super.initState();
    _loadContacts();
  }

  @override
  void dispose() {
    _nameCtrl.dispose();
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

  Future<void> _create() async {
    final name = _nameCtrl.text.trim();
    if (name.isEmpty) {
      Toast.warning(context, '请输入群名称');
      return;
    }
    if (_selected.isEmpty) {
      Toast.warning(context, '请选择至少一个成员');
      return;
    }
    setState(() => _creating = true);
    try {
      await ref.read(apiClientProvider).post(
        ApiEndpoints.groups,
        data: {'name': name, 'memberIds': _selected.toList()},
      );
      if (mounted) {
        Toast.success(context, '群聊创建成功');
        Navigator.pop(context, true);
      }
    } catch (e) {
      if (mounted) Toast.error(context, '$e');
    } finally {
      if (mounted) setState(() => _creating = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('创建群聊'),
        actions: [
          TextButton(
            onPressed: _creating ? null : _create,
            child: _creating
                ? const SizedBox(
                    width: 16,
                    height: 16,
                    child: CircularProgressIndicator(strokeWidth: 2))
                : const Text('创建', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : Column(
              children: [
                Padding(
                  padding: const EdgeInsets.all(16),
                  child: TextField(
                    controller: _nameCtrl,
                    decoration: const InputDecoration(
                      labelText: '群名称',
                      border: OutlineInputBorder(),
                    ),
                  ),
                ),
                const Padding(
                  padding: EdgeInsets.symmetric(horizontal: 16),
                  child: Align(
                    alignment: Alignment.centerLeft,
                    child: Text('选择成员',
                        style: TextStyle(fontSize: 14, color: Colors.grey)),
                  ),
                ),
                Expanded(
                  child: _contacts.isEmpty
                      ? const Center(child: Text('暂无联系人'))
                      : ListView.builder(
                          itemCount: _contacts.length,
                          itemBuilder: (context, index) {
                            final c = _contacts[index];
                            final userId = c['userId'] as int;
                            final isSelected = _selected.contains(userId);
                            return CheckboxListTile(
                              value: isSelected,
                              onChanged: (v) {
                                setState(() {
                                  if (v == true) {
                                    _selected.add(userId);
                                  } else {
                                    _selected.remove(userId);
                                  }
                                });
                              },
                              title: Text(c['remark'] ?? c['nickname'] ?? ''),
                              subtitle: Text(c['nickname'] ?? ''),
                            );
                          },
                        ),
                ),
              ],
            ),
    );
  }
}
