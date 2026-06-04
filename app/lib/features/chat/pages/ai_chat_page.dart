import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/api_client.dart';
import '../../../core/network/api_endpoints.dart';
import '../../../core/constants/app_constants.dart';
import '../../auth/providers/auth_provider.dart';

class AiChatPage extends ConsumerStatefulWidget {
  const AiChatPage({super.key});

  @override
  ConsumerState<AiChatPage> createState() => _AiChatPageState();
}

class _AiChatPageState extends ConsumerState<AiChatPage> {
  final _inputCtrl = TextEditingController();
  final _scrollCtrl = ScrollController();
  final List<_AiMessage> _messages = [];
  bool _sending = false;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadHistory();
  }

  @override
  void dispose() {
    _inputCtrl.dispose();
    _scrollCtrl.dispose();
    super.dispose();
  }

  Future<void> _loadHistory() async {
    try {
      final result = await ref.read(apiClientProvider).get<List<dynamic>>(
        '/api/social/ai/history',
      );
      if (mounted) {
        setState(() {
          _messages.clear();
          for (final item in result ?? []) {
            final map = Map<String, dynamic>.from(item);
            _messages.add(_AiMessage(
              map['content']?.toString() ?? '',
              map['isUser'] == true,
            ));
          }
          _loading = false;
        });
        _scrollToBottom();
      }
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _send() async {
    final text = _inputCtrl.text.trim();
    if (text.isEmpty || _sending) return;

    setState(() {
      _messages.add(_AiMessage(text, true));
      _sending = true;
    });
    _inputCtrl.clear();
    _scrollToBottom();

    try {
      final result = await ref.read(apiClientProvider).post<Map<String, dynamic>>(
        ApiEndpoints.aiChat,
        data: {'message': text},
      );
      final reply = result?['reply'] as String? ?? '无回复';
      setState(() => _messages.add(_AiMessage(reply, false)));
    } catch (e) {
      setState(() => _messages.add(_AiMessage('请求失败，请重试', false)));
    } finally {
      setState(() => _sending = false);
      _scrollToBottom();
    }
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollCtrl.hasClients) {
        _scrollCtrl.animateTo(_scrollCtrl.position.maxScrollExtent,
            duration: const Duration(milliseconds: 200), curve: Curves.easeOut);
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final user = ref.watch(authProvider).user;
    final isActivated = user?.isActivated ?? false;

    return Scaffold(
      appBar: AppBar(title: const Text('云AI')),
      body: !isActivated
          ? const Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.lock_outline, size: 64, color: Colors.grey),
                  SizedBox(height: 16),
                  Text('请先激活后使用',
                      style: TextStyle(fontSize: 18, color: Colors.grey, fontWeight: FontWeight.w500)),
                  SizedBox(height: 8),
                  Text('前往"我的"→"激活游戏"输入激活码',
                      style: TextStyle(fontSize: 14, color: Colors.grey)),
                ],
              ),
            )
          : Column(
        children: [
          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator())
                : _messages.isEmpty
                    ? const Center(child: Text('向AI提问吧', style: TextStyle(color: Colors.grey)))
                    : ListView.builder(
                        controller: _scrollCtrl,
                        padding: const EdgeInsets.all(12),
                        itemCount: _messages.length,
                        itemBuilder: (context, index) {
                          final msg = _messages[index];
                          final userNickname = user?.nickname ?? '我';
                          final userAvatar = user?.avatar ?? '';
                          return _buildMessageRow(context, msg, userNickname, userAvatar);
                        },
                      ),
          ),
          if (_sending)
            const Padding(
              padding: EdgeInsets.all(8),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2)),
                  SizedBox(width: 8),
                  Text('AI思考中...', style: TextStyle(color: Colors.grey, fontSize: 12)),
                ],
              ),
            ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
            decoration: const BoxDecoration(
              color: Colors.white,
              boxShadow: [BoxShadow(color: Colors.black12, blurRadius: 4)],
            ),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _inputCtrl,
                    decoration: const InputDecoration(
                      hintText: '输入问题...',
                      border: InputBorder.none,
                      contentPadding: EdgeInsets.symmetric(horizontal: 12),
                    ),
                    maxLines: null,
                    textInputAction: TextInputAction.send,
                    onSubmitted: (_) => _send(),
                  ),
                ),
                IconButton(
                  icon: Icon(Icons.send, color: _sending ? Colors.grey : Colors.blue),
                  onPressed: _sending ? null : _send,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
  /// 清理 AI 回复中的 markdown 符号，改善观感
  String _cleanMarkdown(String text) {
    var s = text;
    // 去掉标题符号 ### / ## / #（行首）
    s = s.replaceAll(RegExp(r'^#{1,6}\s*', multiLine: true), '');
    // 去掉加粗/斜体的 ** 和 *
    s = s.replaceAll('**', '');
    s = s.replaceAll(RegExp(r'(?<!\*)\*(?!\*)'), '');
    // 去掉行首的列表标记 - 或 +（保留内容）
    s = s.replaceAll(RegExp(r'^\s*[-+]\s+', multiLine: true), '· ');
    // 去掉分隔线 ---
    s = s.replaceAll(RegExp(r'^\s*-{3,}\s*$', multiLine: true), '');
    // 去掉行内代码反引号
    s = s.replaceAll('`', '');
    // 去掉多余的连续空行
    s = s.replaceAll(RegExp(r'\n{3,}'), '\n\n');
    return s.trim();
  }

  Widget _buildMessageRow(BuildContext context, _AiMessage msg, String userNickname, String userAvatar) {
    final isUser = msg.isUser;
    final avatar = isUser
        ? (userAvatar.isNotEmpty && !userAvatar.contains('default')
            ? CircleAvatar(backgroundImage: NetworkImage(
                userAvatar.startsWith('http') ? userAvatar : '${AppConstants.apiBaseUrl}$userAvatar'), radius: 18)
            : CircleAvatar(radius: 18, backgroundColor: Colors.blue.shade100,
                child: Text(userNickname.isNotEmpty ? userNickname[0] : '我', style: const TextStyle(fontSize: 14))))
        : const CircleAvatar(radius: 18, backgroundImage: AssetImage('video/yunAi.png'));
    final name = isUser ? userNickname : '云AI';

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: isUser ? MainAxisAlignment.end : MainAxisAlignment.start,
        children: [
          if (!isUser) avatar,
          if (!isUser) const SizedBox(width: 8),
          Flexible(
            child: Column(
              crossAxisAlignment: isUser ? CrossAxisAlignment.end : CrossAxisAlignment.start,
              children: [
                Text(name, style: const TextStyle(fontSize: 12, color: Colors.grey)),
                const SizedBox(height: 2),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                  decoration: BoxDecoration(
                    color: isUser ? const Color(0xFF95EC69) : Colors.white,
                    borderRadius: BorderRadius.only(
                      topLeft: const Radius.circular(12),
                      topRight: const Radius.circular(12),
                      bottomLeft: Radius.circular(isUser ? 12 : 2),
                      bottomRight: Radius.circular(isUser ? 2 : 12),
                    ),
                    boxShadow: [
                      BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 2, offset: const Offset(0, 1)),
                    ],
                  ),
                  child: SelectableText(
                    isUser ? msg.content : _cleanMarkdown(msg.content),
                    style: const TextStyle(fontSize: 15),
                  ),
                ),
              ],
            ),
          ),
          if (isUser) const SizedBox(width: 8),
          if (isUser) avatar,
        ],
      ),
    );
  }
}

class _AiMessage {
  final String content;
  final bool isUser;
  _AiMessage(this.content, this.isUser);
}
