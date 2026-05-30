import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/api_client.dart';
import '../../../core/network/api_endpoints.dart';

/// 联系人多选页面（用于拉人入群）
class SelectContactsPage extends ConsumerStatefulWidget {
  final List<int> excludeUserIds; // 已在群中的用户ID，不显示

  const SelectContactsPage({super.key, this.excludeUserIds = const []});

  @override
  ConsumerState<SelectContactsPage> createState() => _SelectContactsPageState();
}

class _SelectContactsPageState extends ConsumerState<SelectContactsPage> {
  List<Map<String, dynamic>> _contacts = [];
  List<Map<String, dynamic>> _filtered = [];
  final Set<int> _selected = {};
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
      final result = await ref.read(apiClientProvider).get<List<dynamic>>(ApiEndpoints.contacts);
      final contacts = (result ?? [])
          .map((e) => Map<String, dynamic>.from(e))
          .where((c) => !widget.excludeUserIds.contains(c['userId'] as int?))
          .toList();
      if (mounted) {
        setState(() {
          _contacts = contacts;
          _filtered = contacts;
          _loading = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _onSearch(String keyword) {
    final kw = keyword.trim().toLowerCase();
    setState(() {
      if (kw.isEmpty) {
        _filtered = _contacts;
      } else {
        _filtered = _contacts.where((c) {
          final nickname = (c['nickname'] ?? '').toString().toLowerCase();
          final account = (c['account'] ?? '').toString().toLowerCase();
          final remark = (c['remark'] ?? '').toString().toLowerCase();
          return nickname.contains(kw) || account.contains(kw) || remark.contains(kw);
        }).toList();
      }
    });
  }

  void _confirm() {
    Navigator.pop(context, _selected.toList());
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('选择联系人（已选${_selected.length}人）'),
        actions: [
          TextButton(
            onPressed: _selected.isEmpty ? null : _confirm,
            child: Text('确定', style: TextStyle(
              color: _selected.isEmpty ? Colors.grey : Colors.white,
              fontWeight: FontWeight.w600,
            )),
          ),
        ],
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(12),
            child: TextField(
              controller: _searchCtrl,
              onChanged: _onSearch,
              decoration: InputDecoration(
                hintText: '搜索联系人（昵称/账号/备注）',
                prefixIcon: const Icon(Icons.search),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                contentPadding: const EdgeInsets.symmetric(horizontal: 12),
              ),
            ),
          ),
          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator())
                : _filtered.isEmpty
                    ? const Center(child: Text('没有可添加的联系人', style: TextStyle(color: Colors.grey)))
                    : ListView.builder(
                        itemCount: _filtered.length,
                        itemBuilder: (context, index) {
                          final c = _filtered[index];
                          final userId = c['userId'] as int? ?? 0;
                          final isSelected = _selected.contains(userId);
                          final name = c['remark'] ?? c['nickname'] ?? '用户$userId';
                          return CheckboxListTile(
                            value: isSelected,
                            onChanged: (checked) {
                              setState(() {
                                if (checked == true) {
                                  _selected.add(userId);
                                } else {
                                  _selected.remove(userId);
                                }
                              });
                            },
                            title: Text(name),
                            subtitle: Text(c['nickname'] ?? '', style: const TextStyle(fontSize: 12, color: Colors.grey)),
                            secondary: CircleAvatar(
                              backgroundColor: Colors.blue.shade100,
                              child: const Icon(Icons.person, color: Colors.blue, size: 20),
                            ),
                          );
                        },
                      ),
          ),
        ],
      ),
    );
  }
}
