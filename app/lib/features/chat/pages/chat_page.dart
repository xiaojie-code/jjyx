import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:audioplayers/audioplayers.dart';
import 'package:dio/dio.dart';
import 'package:image_picker/image_picker.dart';
import 'package:path_provider/path_provider.dart';
import 'package:record/record.dart';
import 'dart:async';
import 'dart:convert';
import '../../../core/constants/app_constants.dart';
import '../../../core/network/api_client.dart';
import '../../../core/network/api_endpoints.dart';
import '../../../core/utils/in_app_notification.dart';
import '../../../core/utils/notification_service.dart';
import '../../../core/utils/toast.dart';
import '../../main/providers/badge_provider.dart';
import '../../../core/storage/token_storage.dart';
import '../../auth/providers/auth_provider.dart';
import '../providers/chat_provider.dart';
import 'group_detail_page.dart';
import 'meeting_page.dart';
import 'service_notification_page.dart';

class ChatPage extends ConsumerStatefulWidget {
  final int conversationId;
  final String title;
  final int? type; // 1=单聊 2=群聊
  const ChatPage(
      {super.key,
      required this.conversationId,
      required this.title,
      this.type});

  @override
  ConsumerState<ChatPage> createState() => _ChatPageState();
}

class _ChatPageState extends ConsumerState<ChatPage> {
  final _inputCtrl = TextEditingController();
  final _scrollCtrl = ScrollController();
  AudioRecorder? _audioRecorder;
  List<ChatMessage> _messages = [];
  bool _loading = true;
  bool _loadingMore = false;
  bool _hasMore = true;
  int _page = 1;
  bool _isMuted = false;
  bool _canManageMeeting = false;
  bool get _canManageGroup => _canManageMeeting;
  bool _isRecordingVoice = false;
  bool _showVoiceButton = false;
  bool _showEmojiPicker = false;
  double _voiceCancelOffset = 0;
  double _voiceStartY = 0;
  DateTime? _voiceStartedAt;
  ChatMessage? _replyingTo; // 引用回复的目标消息

  static const List<String> _emojis = [
    '😀',
    '😂',
    '🤣',
    '😊',
    '😍',
    '🥰',
    '😘',
    '😜',
    '🤔',
    '😎',
    '🤗',
    '😴',
    '😭',
    '😡',
    '🥺',
    '😱',
    '👍',
    '👎',
    '👏',
    '🙏',
    '💪',
    '🤝',
    '✌️',
    '🤞',
    '❤️',
    '💔',
    '🔥',
    '⭐',
    '🎉',
    '🎊',
    '💯',
    '✅',
    '👋',
    '🙈',
    '🙉',
    '🙊',
    '💀',
    '👻',
    '🤡',
    '💩',
    '🐶',
    '🐱',
    '🐼',
    '🦊',
    '🌹',
    '🌸',
    '☀️',
    '🌙',
  ];
  AudioPlayer? _audioPlayer;
  StreamSubscription<void>? _playerCompleteSub;
  String? _playingVoiceUrl;
  final Map<int, int> _handledInvitationStatus = <int, int>{};

  bool get _voiceRecordingSupported => !kIsWeb;
  AudioRecorder get _recorder => _audioRecorder ??= AudioRecorder();

  late final SocketService _socketService;
  InAppBannerCallback? _previousInAppBanner;

  bool get _isAppInForeground =>
      WidgetsBinding.instance.lifecycleState == AppLifecycleState.resumed;

  @override
  void initState() {
    super.initState();
    _socketService = ref.read(socketServiceProvider);
    // 标记当前正在查看的会话
    _socketService.activeConversationId = widget.conversationId;
    // 确保用户信息已加载
    if (ref.read(authProvider).user == null) {
      ref.read(authProvider.notifier).loadProfile();
    }
    _loadMessages();
    _loadMyMuteState();
    _previousInAppBanner = NotificationService.instance.onInAppBanner;
    NotificationService.instance.onInAppBanner = _showInAppBanner;
    _socketService.addMessageListener(_onNewMessage);
    _socketService.addStatusListener(_onStatusUpdate);
    _socketService.addServiceNotificationListener(_onServiceNotification);
    // 滚动到顶部时加载更多历史消息
    _scrollCtrl.addListener(_onScroll);
    _socketService.addUpdateListener(_onMessageUpdate);
    _socketService.addConnectionStateListener(_onSocketStateChanged);
    _socketService.addConnectListener(_onSocketConnected);
    _socketService.connect();
  }

  @override
  void dispose() {
    try {
      _socketService.activeConversationId = null;
      NotificationService.instance.onInAppBanner = _previousInAppBanner;
      _socketService.removeMessageListener(_onNewMessage);
      _socketService.removeStatusListener(_onStatusUpdate);
      _socketService.removeServiceNotificationListener(_onServiceNotification);
      _socketService.removeUpdateListener(_onMessageUpdate);
      _socketService.removeConnectionStateListener(_onSocketStateChanged);
      _socketService.removeConnectListener(_onSocketConnected);
    } catch (_) {}
    _inputCtrl.dispose();
    _scrollCtrl.dispose();
    _audioRecorder?.dispose();
    _playerCompleteSub?.cancel();
    _audioPlayer?.dispose();
    super.dispose();
  }

  void _onNewMessage(ChatMessage msg) {
    if (!mounted) return;
    if (msg.conversationId == widget.conversationId) {
      // 从 socket 缓存中更新发送者头像信息
      final socketService = ref.read(socketServiceProvider);
      final cachedAvatar = socketService.senderAvatarCache[msg.senderId];
      final cachedNickname = socketService.senderNicknameCache[msg.senderId];
      if (msg.senderId > 0 &&
          (cachedAvatar != null || cachedNickname != null)) {
        final existing = _senderCache[msg.senderId] ?? {};
        _senderCache[msg.senderId] = {
          ...existing,
          if (cachedNickname != null) 'nickname': cachedNickname,
          if (cachedAvatar != null) 'avatar': cachedAvatar,
        };
      }
      if (mounted && !_messages.any((item) => item.id == msg.id)) {
        setState(() => _messages.add(msg));
      }
      _scrollToBottom();
      _socketService.markAsRead(widget.conversationId, msg.id);
    } else {
      _notifyForExternalMessage(msg);
    }
  }

  void _showInAppBanner({
    required int conversationId,
    required String title,
    required String content,
    String? avatar,
  }) {
    if (!mounted) return;
    InAppNotification.show(
      context: context,
      title: title,
      content: content,
      avatar: avatar,
      onTap: () {
        if (conversationId == -1) {
          Navigator.of(context, rootNavigator: true).push(MaterialPageRoute(
            builder: (_) => const ServiceNotificationPage(),
          ));
          return;
        }
        if (conversationId == widget.conversationId) return;
        Navigator.of(context, rootNavigator: true).push(MaterialPageRoute(
          builder: (_) => ChatPage(
            conversationId: conversationId,
            title: title,
          ),
        ));
      },
    );
  }

  void _notifyForExternalMessage(ChatMessage msg) {
    final authState = ref.read(authProvider);
    var myId = authState.user?.id ?? authState.profile?.user.id ?? 0;
    if (myId == 0) {
      myId = _getMyIdFromToken();
    }
    if (myId > 0 && msg.senderId == myId) return;

    final senderName =
        _socketService.senderNicknameCache[msg.senderId] ?? '新消息';
    final senderAvatar = _socketService.senderAvatarCache[msg.senderId];
    String content;
    switch (msg.msgType) {
      case 2:
        content = '[语音]';
        break;
      case 4:
        content = '[图片]';
        break;
      case 3:
        content = '[系统消息]';
        break;
      default:
        content = msg.content.length > 50
            ? '${msg.content.substring(0, 50)}...'
            : msg.content;
    }

    NotificationService.instance.onNewMessage(
      conversationId: msg.conversationId,
      senderName: senderName,
      content: content,
      avatar: senderAvatar,
      isAppInForeground: _isAppInForeground,
      dedupeKey: msg.id > 0 ? 'message:${msg.id}' : null,
    );
  }

  void _onServiceNotification(Map<String, dynamic> data) {
    if (!mounted) return;
    final title = data['title']?.toString() ?? '服务通知';
    final content = data['content']?.toString() ?? '';
    NotificationService.instance.onNewMessage(
      conversationId: -1,
      senderName: title,
      content: content,
      isAppInForeground: _isAppInForeground,
      dedupeKey: data['id'] != null
          ? 'service:${data['id']}'
          : 'service:$title:$content',
    );
  }

  void _onSocketStateChanged() {
    if (mounted) setState(() {});
  }

  void _onSocketConnected() {
    if (!mounted) return;
    _loadMessages();
  }

  void _onStatusUpdate(int messageId, int status) {
    if (!mounted) return;
    if (mounted) {
      setState(() {
        for (final msg in _messages) {
          if (msg.id == messageId) {
            msg.status = status;
            break;
          }
        }
      });
    }
  }

  void _onMessageUpdate(int messageId, int conversationId, String content) {
    if (!mounted || conversationId != widget.conversationId) return;
    setState(() {
      for (final msg in _messages) {
        if (msg.id == messageId) {
          msg.content = content;
          break;
        }
      }
    });
  }

  void _onScroll() {
    // 滚动到顶部时加载更多历史消息
    if (_scrollCtrl.position.pixels <= 50 && !_loadingMore && _hasMore) {
      _loadMoreMessages();
    }
  }

  Future<void> _loadMessages() async {
    try {
      _page = 1;
      _hasMore = true;
      final result =
          await ref.read(apiClientProvider).get<Map<String, dynamic>>(
        ApiEndpoints.conversationMessages(widget.conversationId),
        queryParameters: {'page': '1', 'pageSize': '30'},
      );
      final total = result?['total'] as int? ?? 0;
      setState(() {
        _messages = ((result?['list'] as List?) ?? []).map((e) {
          final map = Map<String, dynamic>.from(e);
          return ChatMessage.fromJson(map);
        }).toList();
        for (final e in (result?['list'] as List?) ?? []) {
          final map = Map<String, dynamic>.from(e);
          if (map['sender'] != null) {
            final sender = Map<String, dynamic>.from(map['sender']);
            final senderId = int.tryParse(sender['id']?.toString() ?? '') ?? 0;
            if (senderId > 0) _senderCache[senderId] = sender;
          }
        }
        _hasMore = _messages.length < total;
        _loading = false;
      });
      _scrollToBottom();

      if (_messages.isNotEmpty) {
        _socketService.markAsRead(widget.conversationId, _messages.last.id);
        if (mounted) {
          Future.delayed(const Duration(milliseconds: 300), () {
            if (mounted) {
              final authState = ref.read(authProvider);
              ref.read(badgeProvider.notifier).loadBadges(
                    includeServiceNotifications:
                        authState.user != null || authState.profile != null,
                  );
            }
          });
        }
      }
    } catch (e) {
      debugPrint('_loadMessages error: $e');
      setState(() => _loading = false);
    }
  }

  Future<void> _loadMoreMessages() async {
    if (_loadingMore || !_hasMore) return;
    setState(() => _loadingMore = true);
    try {
      final nextPage = _page + 1;
      final result =
          await ref.read(apiClientProvider).get<Map<String, dynamic>>(
        ApiEndpoints.conversationMessages(widget.conversationId),
        queryParameters: {'page': '$nextPage', 'pageSize': '30'},
      );
      final newMessages = ((result?['list'] as List?) ?? []).map((e) {
        final map = Map<String, dynamic>.from(e);
        return ChatMessage.fromJson(map);
      }).toList();
      for (final e in (result?['list'] as List?) ?? []) {
        final map = Map<String, dynamic>.from(e);
        if (map['sender'] != null) {
          final sender = Map<String, dynamic>.from(map['sender']);
          final senderId = int.tryParse(sender['id']?.toString() ?? '') ?? 0;
          if (senderId > 0) _senderCache[senderId] = sender;
        }
      }
      if (mounted) {
        setState(() {
          // 历史消息插入到列表前面
          _messages.insertAll(0, newMessages);
          _page = nextPage;
          _hasMore = newMessages.isNotEmpty;
          _loadingMore = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _loadingMore = false);
    }
  }

  Future<void> _loadMyMuteState() async {
    if (widget.type != 2) return;
    try {
      final result = await ref.read(apiClientProvider).get<List<dynamic>>(
            ApiEndpoints.groupMembers(widget.conversationId),
          );
      final authState = ref.read(authProvider);
      var myId = authState.user?.id ?? authState.profile?.user.id ?? 0;
      if (myId == 0) {
        myId = _getMyIdFromToken();
      }
      final members = result ?? [];
      bool muted = false;
      bool canManageMeeting = false;
      for (final item in members) {
        final member = Map<String, dynamic>.from(item as Map);
        final userId = int.tryParse(member['userId']?.toString() ?? '') ?? 0;
        if (userId == myId) {
          muted = member['isMuted'] == true;
          final role = int.tryParse(member['role']?.toString() ?? '') ?? 1;
          canManageMeeting = member['isOwner'] == true || role >= 2;
          break;
        }
      }
      if (mounted) {
        setState(() {
          _isMuted = muted;
          _canManageMeeting = canManageMeeting;
        });
      }
    } catch (e) {
      debugPrint('_loadMyMuteState error: $e');
    }
  }

  // 缓存发送者信息
  final Map<int, Map<String, dynamic>> _senderCache = {};

  /// 从 JWT token 中解析当前用户 ID
  int _getMyIdFromToken() {
    try {
      final token = TokenStorage.getToken();
      if (token == null) return 0;
      final parts = token.split('.');
      if (parts.length != 3) return 0;
      final payload =
          utf8.decode(base64Url.decode(base64Url.normalize(parts[1])));
      final map = jsonDecode(payload) as Map<String, dynamic>;
      return map['sub'] as int? ?? 0;
    } catch (_) {
      return 0;
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

  void _sendMessage() {
    if (_isMuted) return;
    final text = _inputCtrl.text.trim();
    if (text.isEmpty) return;

    final userId = ref.read(authProvider).user?.id ?? _getMyIdFromToken();
    final tempId = DateTime.now().millisecondsSinceEpoch;

    // 如果有引用回复，把引用信息加到内容前面
    String content = text;
    if (_replyingTo != null) {
      final replyPreview = _replyingTo!.content.length > 20
          ? '${_replyingTo!.content.substring(0, 20)}...'
          : _replyingTo!.content;
      content = '「回复：$replyPreview」\n$text';
    }

    // 乐观更新
    final optimistic = ChatMessage(
      id: tempId,
      conversationId: widget.conversationId,
      senderId: userId,
      content: content,
      msgType: 1,
      status: 1,
      createdAt: DateTime.now().toIso8601String(),
    );
    setState(() {
      _messages.add(optimistic);
      _replyingTo = null;
    });
    _scrollToBottom();
    _inputCtrl.clear();

    ref.read(socketServiceProvider).sendMessage(
      widget.conversationId,
      content,
      1,
      onFail: () {
        if (!mounted) return;
        // 标记为发送失败
        setState(() => optimistic.status = -1);
      },
      onSuccess: (ack) {
        if (!mounted) return;
        final realId = int.tryParse(ack['id']?.toString() ?? '') ?? 0;
        final createdAt = ack['createdAt']?.toString();
        if (realId > 0) {
          setState(() {
            optimistic.id = realId;
            optimistic.status = 1;
            if (createdAt != null && createdAt.isNotEmpty) {
              optimistic.createdAt = createdAt;
            }
          });
        }
      },
    );
  }

  Future<void> _showImageSourceSheet() async {
    if (_isMuted) return;
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
            ListTile(
              leading: const Icon(Icons.photo_camera_outlined),
              title: const Text('拍照发送'),
              onTap: () => Navigator.pop(ctx, ImageSource.camera),
            ),
          ],
        ),
      ),
    );
    if (source == null || !mounted) return;
    await _sendImage(source);
  }

  Future<void> _sendImage(ImageSource source) async {
    if (_isMuted) return;
    try {
      final picked =
          await ImagePicker().pickImage(source: source, imageQuality: 82);
      if (picked == null) return;
      final bytes = await picked.readAsBytes();
      final formData = FormData.fromMap({
        'conversationId': widget.conversationId.toString(),
        'image': MultipartFile.fromBytes(bytes, filename: picked.name),
      });
      final result =
          await ref.read(apiClientProvider).upload<Map<String, dynamic>>(
                ApiEndpoints.imageUpload,
                formData: formData,
              );
      if (result == null) return;
      final msg = ChatMessage.fromJson(Map<String, dynamic>.from(result));
      if (mounted) {
        setState(() => _messages.add(msg));
        _scrollToBottom();
      }
    } catch (e) {
      if (mounted) Toast.error(context, '图片发送失败：$e');
    }
  }

  Future<void> _startVoiceRecording() async {
    if (!_voiceRecordingSupported) return;
    // 先立即更新UI状态
    setState(() {
      _isRecordingVoice = true;
      _voiceStartedAt = DateTime.now();
      _voiceStartY = 0; // 会在 onPointerMove 中相对计算
    });
    try {
      final recorder = _recorder;
      final hasPermission = await recorder.hasPermission();
      if (!hasPermission) {
        if (mounted) {
          setState(() => _isRecordingVoice = false);
          Toast.warning(context, '请先允许麦克风权限');
        }
        return;
      }
      final tempDir = await getTemporaryDirectory();
      final path =
          '${tempDir.path}/voice_${DateTime.now().millisecondsSinceEpoch}.wav';
      await recorder.start(
        const RecordConfig(
          encoder: AudioEncoder.wav,
          sampleRate: 16000,
        ),
        path: path,
      );
    } catch (e) {
      if (mounted) {
        setState(() => _isRecordingVoice = false);
        Toast.error(context, '录音失败：$e');
      }
    }
  }

  Future<void> _cancelVoiceRecording() async {
    if (!_voiceRecordingSupported) return;
    try {
      final recorder = _audioRecorder;
      if (recorder != null) await recorder.stop();
    } catch (_) {}
    if (mounted) {
      setState(() {
        _isRecordingVoice = false;
        _voiceStartedAt = null;
      });
      Toast.info(context, '已取消录音');
    }
  }

  Future<void> _stopAndSendVoice() async {
    if (!_voiceRecordingSupported) return;
    final startedAt = _voiceStartedAt;
    try {
      final recorder = _audioRecorder;
      if (recorder == null) return;
      final path = await recorder.stop();
      final durationMs = startedAt == null
          ? 0
          : DateTime.now().difference(startedAt).inMilliseconds;
      if (mounted) {
        setState(() {
          _isRecordingVoice = false;
          _voiceStartedAt = null;
        });
      }
      if (path == null || path.isEmpty) return;
      if (durationMs < 800) {
        if (mounted) Toast.warning(context, '录音时间太短');
        return;
      }
      await _sendVoice(path, durationMs);
    } catch (e) {
      if (mounted) {
        setState(() {
          _isRecordingVoice = false;
          _voiceStartedAt = null;
        });
        Toast.error(context, '发送语音失败：$e');
      }
    }
  }

  Future<void> _sendVoice(String path, int durationMs) async {
    if (_isMuted) return;
    final filename = path.split(RegExp(r'[\\/]')).last;
    final formData = FormData.fromMap({
      'conversationId': widget.conversationId.toString(),
      'durationMs': durationMs.toString(),
      'voice': await MultipartFile.fromFile(path, filename: filename),
    });
    final result =
        await ref.read(apiClientProvider).upload<Map<String, dynamic>>(
              ApiEndpoints.voiceUpload,
              formData: formData,
            );
    if (result == null || !mounted) return;
    final msg = ChatMessage.fromJson(Map<String, dynamic>.from(result));
    setState(() => _messages.add(msg));
    _scrollToBottom();
  }

  Future<void> _playVoice(_VoicePayload voice) async {
    final url = _mediaUrl(voice.url);
    _audioPlayer ??= AudioPlayer();
    _playerCompleteSub ??= _audioPlayer!.onPlayerComplete.listen((_) {
      if (mounted) setState(() => _playingVoiceUrl = null);
    });
    try {
      if (_playingVoiceUrl == url) {
        await _audioPlayer!.stop();
        if (mounted) setState(() => _playingVoiceUrl = null);
        return;
      }
      await _audioPlayer!.stop();
      await _audioPlayer!.play(UrlSource(url));
      if (mounted) setState(() => _playingVoiceUrl = url);
    } catch (e) {
      final fallbackUrl = _wavFallbackUrl(url);
      if (fallbackUrl != null) {
        try {
          await _audioPlayer!.stop();
          await _audioPlayer!.play(UrlSource(fallbackUrl));
          if (mounted) setState(() => _playingVoiceUrl = fallbackUrl);
          return;
        } catch (_) {}
      }
      if (mounted) Toast.error(context, '语音播放失败：$e');
    }
  }

  String? _wavFallbackUrl(String url) {
    final lower = url.toLowerCase();
    if (!lower.endsWith('.m4a')) return null;
    return '${url.substring(0, url.length - 4)}.wav';
  }

  void _retrySend(ChatMessage msg) {
    setState(() => msg.status = 1);
    ref.read(socketServiceProvider).sendMessage(
      msg.conversationId,
      msg.content,
      msg.msgType,
      onFail: () {
        if (mounted) setState(() => msg.status = -1);
      },
      onSuccess: (ack) {
        if (!mounted) return;
        final realId = int.tryParse(ack['id']?.toString() ?? '') ?? 0;
        final createdAt = ack['createdAt']?.toString();
        setState(() {
          if (realId > 0) msg.id = realId;
          msg.status = 1;
          if (createdAt != null && createdAt.isNotEmpty) {
            msg.createdAt = createdAt;
          }
        });
      },
    );
  }

  Future<void> _showMessageActions(ChatMessage msg, bool isMe) async {
    // 判断是否可以撤回（2分钟内自己的消息）
    bool canRecall = false;
    if (isMe && msg.createdAt.isNotEmpty) {
      try {
        final msgTime = DateTime.parse(msg.createdAt);
        canRecall = DateTime.now().difference(msgTime).inMinutes < 2;
      } catch (_) {}
    }

    final result = await showModalBottomSheet<String>(
      context: context,
      builder: (ctx) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: const Icon(Icons.reply),
              title: const Text('引用回复'),
              onTap: () => Navigator.pop(ctx, 'reply'),
            ),
            if (isMe && msg.msgType == 1)
              ListTile(
                leading: const Icon(Icons.edit),
                title: const Text('编辑'),
                onTap: () => Navigator.pop(ctx, 'edit'),
              ),
            if (canRecall)
              ListTile(
                leading: const Icon(Icons.undo, color: Colors.orange),
                title: const Text('撤回', style: TextStyle(color: Colors.orange)),
                onTap: () => Navigator.pop(ctx, 'recall'),
              ),
            ListTile(
              leading: const Icon(Icons.delete, color: Colors.red),
              title: const Text('删除', style: TextStyle(color: Colors.red)),
              onTap: () => Navigator.pop(ctx, 'delete'),
            ),
            const SizedBox(height: 8),
          ],
        ),
      ),
    );
    if (result == 'delete') {
      try {
        await ref
            .read(apiClientProvider)
            .delete(ApiEndpoints.deleteMessage(msg.id));
        setState(() => _messages.remove(msg));
      } catch (e) {
        if (mounted) Toast.error(context, '$e');
      }
    } else if (result == 'edit') {
      _showEditDialog(msg);
    } else if (result == 'recall') {
      await _recallMessage(msg);
    } else if (result == 'reply') {
      setState(() => _replyingTo = msg);
    }
  }

  Future<void> _recallMessage(ChatMessage msg) async {
    try {
      await ref
          .read(apiClientProvider)
          .post('/api/social/messages/${msg.id}/recall');
      // 从列表中替换为撤回消息
      setState(() {
        final idx = _messages.indexOf(msg);
        if (idx >= 0) {
          _messages[idx] = ChatMessage(
            id: msg.id,
            conversationId: msg.conversationId,
            senderId: msg.senderId,
            content: '你撤回了一条消息',
            msgType: 6,
            status: msg.status,
            createdAt: msg.createdAt,
          );
        }
      });
    } catch (e) {
      if (mounted) Toast.error(context, '$e');
    }
  }

  Future<void> _showEditDialog(ChatMessage msg) async {
    final ctrl = TextEditingController(text: msg.content);
    final content = await showDialog<String>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('编辑消息'),
        content: TextField(
          controller: ctrl,
          autofocus: true,
          maxLines: 4,
          decoration: const InputDecoration(border: OutlineInputBorder()),
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
    if (content == null || content.isEmpty || content == msg.content) return;
    try {
      await ref
          .read(apiClientProvider)
          .put(ApiEndpoints.updateMessage(msg.id), data: {'content': content});
      if (mounted) {
        setState(() => msg.content = content);
      }
    } catch (e) {
      if (mounted) Toast.error(context, '编辑失败：$e');
    }
  }

  _MeetingNotice? _meetingNoticeFromMessage(ChatMessage msg) {
    if (msg.msgType != 3) return null;
    try {
      final data = jsonDecode(msg.content);
      if (data is! Map || data['kind'] != 'group_meeting') return null;
      final meetingId = int.tryParse(data['meetingId']?.toString() ?? '') ?? 0;
      final groupId = int.tryParse(data['groupId']?.toString() ?? '') ?? 0;
      if (meetingId <= 0 || groupId <= 0) return null;
      return _MeetingNotice(
        meetingId: meetingId,
        groupId: groupId,
        title: data['title']?.toString() ?? '群会议',
        text: data['text']?.toString() ?? '有人发起了群会议',
        actionText: data['actionText']?.toString() ?? '点击进入会议',
      );
    } catch (_) {
      return null;
    }
  }

  void _appendMeetingNoticeIfNeeded(Map<String, dynamic> meeting) {
    final notice = meeting['noticeMessage'];
    if (notice is! Map) return;
    final msg = ChatMessage.fromJson(Map<String, dynamic>.from(notice));
    if (msg.id <= 0 || _messages.any((item) => item.id == msg.id)) return;
    setState(() => _messages.add(msg));
    _scrollToBottom();
  }

  Future<void> _openMeetingFromNotice(_MeetingNotice notice) async {
    try {
      final meeting =
          await ref.read(apiClientProvider).get<Map<String, dynamic>>(
                ApiEndpoints.groupMeetingActive(notice.groupId),
              );
      if (!mounted) return;
      final activeMeetingId =
          int.tryParse(meeting?['id']?.toString() ?? '') ?? 0;
      if (meeting == null || activeMeetingId != notice.meetingId) {
        Toast.warning(context, '该会议已结束');
        return;
      }
      Navigator.of(context, rootNavigator: true).push(MaterialPageRoute(
        builder: (_) => MeetingPage(
          groupId: notice.groupId,
          groupName: widget.title,
          meeting: meeting,
        ),
      ));
    } catch (e) {
      if (mounted) Toast.error(context, '会议打开失败：$e');
    }
  }

  Future<void> _openMeeting() async {
    try {
      Map<String, dynamic>? meeting =
          await ref.read(apiClientProvider).get<Map<String, dynamic>>(
                ApiEndpoints.groupMeetingActive(widget.conversationId),
              );
      if (meeting == null) {
        if (!mounted) return;
        // 所有成员都可以发起会议，普通成员需要消耗积分
        String confirmText = '当前没有进行中的会议，是否立即发起？';
        var needsCost = false;
        var currentPoints = 0;
        if (!_canManageMeeting) {
          needsCost = true;
          // 获取当前积分余额
          try {
            final balance = await ref
                .read(apiClientProvider)
                .get<Map<String, dynamic>>('/api/currency/balance');
            currentPoints =
                (double.tryParse(balance?['points']?.toString() ?? '0') ?? 0)
                    .toInt();
          } catch (_) {}
          if (!mounted) return;
          confirmText = '发起会议将消耗10000积分\n当前积分余额：$currentPoints';
        }
        final start = await showDialog<bool>(
          context: context,
          builder: (ctx) => AlertDialog(
            title: const Text('发起群会议'),
            content: Text(confirmText),
            actions: [
              TextButton(
                  onPressed: () => Navigator.pop(ctx, false),
                  child: const Text('取消')),
              ElevatedButton(
                  onPressed: () => Navigator.pop(ctx, true),
                  child: const Text('发起')),
            ],
          ),
        );
        if (start != true) return;
        if (needsCost && currentPoints < 10000) {
          Toast.warning(context, '积分不足，无法发起会议');
          return;
        }
        meeting = await ref.read(apiClientProvider).post<Map<String, dynamic>>(
          ApiEndpoints.groupMeetingStart(widget.conversationId),
          data: {'title': '${widget.title}的会议', 'confirmCost': needsCost},
        );
        if (meeting != null && mounted) _appendMeetingNoticeIfNeeded(meeting);
      }
      if (!mounted || meeting == null) return;
      final meetingData = meeting;
      Navigator.of(context, rootNavigator: true).push(MaterialPageRoute(
        builder: (_) => MeetingPage(
          groupId: widget.conversationId,
          groupName: widget.title,
          meeting: meetingData,
        ),
      ));
    } catch (e) {
      if (mounted) Toast.error(context, '会议打开失败：$e');
    }
  }

  String _mediaUrl(String path) {
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    return '${AppConstants.apiBaseUrl}$path';
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

  Widget _messageContent(ChatMessage msg) {
    if (msg.msgType == 6) {
      // 撤回消息
      return Text('该消息已被撤回',
          style: TextStyle(
              fontSize: 13,
              color: Colors.grey.shade500,
              fontStyle: FontStyle.italic));
    }
    if (msg.msgType == 2) {
      return _voiceMessageContent(_VoicePayload.fromContent(msg.content));
    }
    if (msg.msgType == 4) {
      return ClipRRect(
        borderRadius: BorderRadius.circular(8),
        child: Image.network(
          _mediaUrl(msg.content),
          width: 180,
          fit: BoxFit.cover,
          errorBuilder: (_, __, ___) => const Text('[图片加载失败]'),
        ),
      );
    }
    final meetingNotice = _meetingNoticeFromMessage(msg);
    if (meetingNotice != null) return _meetingNoticeCard(meetingNotice);
    if (msg.msgType == 3) {
      // 解析系统消息
      try {
        final data = jsonDecode(msg.content);
        if (data is Map && data['kind'] == 'member_join') {
          return _memberJoinNotice(data);
        }
        if (data is Map && data['kind'] == 'group_invite') {
          return _groupInviteNotice(data);
        }
      } catch (_) {}
      return Text(
        msg.content,
        style: const TextStyle(fontSize: 14, color: Colors.black87),
      );
    }
    return Text(msg.content, style: const TextStyle(fontSize: 15));
  }

  Widget _voiceMessageContent(_VoicePayload voice) {
    final url = _mediaUrl(voice.url);
    final playing = _playingVoiceUrl == url;
    return InkWell(
      onTap: () => _playVoice(voice),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(playing ? Icons.stop_circle_outlined : Icons.play_circle_outline,
              size: 22, color: Colors.blue),
          const SizedBox(width: 6),
          Text(
            voice.durationText,
            style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w500),
          ),
          const SizedBox(width: 8),
          const Icon(Icons.graphic_eq, size: 18, color: Colors.blueGrey),
        ],
      ),
    );
  }

  Widget _groupInviteNotice(Map<dynamic, dynamic> data) {
    final invitationId =
        int.tryParse(data['invitationId']?.toString() ?? '') ?? 0;
    final groupName = data['groupName']?.toString() ?? '群聊';
    final text = data['text']?.toString() ?? '邀请你加入群聊：$groupName';
    final status = int.tryParse(data['status']?.toString() ?? '0') ?? 0;
    final currentStatus = _handledInvitationStatus[invitationId] ?? status;
    final handled = currentStatus != 0;
    final statusText = currentStatus == 1
        ? '已同意'
        : currentStatus == 2
            ? '已拒绝'
            : '';

    return Container(
      constraints: const BoxConstraints(maxWidth: 260),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.blue.shade50,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: Colors.blue.shade100),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.group_add, size: 18, color: Colors.blue),
              const SizedBox(width: 6),
              Flexible(
                child: Text(
                  groupName,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                      fontSize: 14, fontWeight: FontWeight.w600),
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Text(text,
              style: const TextStyle(fontSize: 13, color: Colors.black87)),
          const SizedBox(height: 10),
          if (handled)
            Text(statusText,
                style: const TextStyle(fontSize: 13, color: Colors.black54))
          else
            Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                OutlinedButton(
                  onPressed: invitationId > 0
                      ? () => _handleGroupInvitation(invitationId, false)
                      : null,
                  child: const Text('拒绝'),
                ),
                const SizedBox(width: 8),
                ElevatedButton(
                  onPressed: invitationId > 0
                      ? () => _handleGroupInvitation(invitationId, true)
                      : null,
                  child: const Text('同意'),
                ),
              ],
            ),
        ],
      ),
    );
  }

  Future<void> _handleGroupInvitation(int invitationId, bool accept) async {
    try {
      await ref.read(apiClientProvider).put(
        ApiEndpoints.groupInvitation(invitationId),
        data: {'accept': accept},
      );
      if (!mounted) return;
      setState(() => _handledInvitationStatus[invitationId] = accept ? 1 : 2);
      Toast.success(context, accept ? '已加入群聊' : '已拒绝邀请');
      await _loadMessages();
    } catch (e) {
      if (mounted) Toast.error(context, '$e');
    }
  }

  Widget _memberJoinNotice(Map<dynamic, dynamic> data) {
    final text = data['text']?.toString() ?? '有新成员加入群聊';
    final memberId = int.tryParse(data['memberId']?.toString() ?? '') ?? 0;
    final memberName = data['memberName']?.toString() ?? '未知';

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: Colors.grey.shade100,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.person_add, size: 16, color: Colors.blue),
          const SizedBox(width: 6),
          Flexible(
            child: Text(text,
                style: const TextStyle(fontSize: 13, color: Colors.black54)),
          ),
          if (_canManageGroup && memberId > 0) ...[
            const SizedBox(width: 8),
            GestureDetector(
              onTap: () => _showRemoveMemberDialog(memberId, memberName),
              child: const Text('移出',
                  style: TextStyle(fontSize: 12, color: Colors.red)),
            ),
          ],
        ],
      ),
    );
  }

  Future<void> _showRemoveMemberDialog(int memberId, String memberName) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('移出群聊'),
        content: Text('确定将"$memberName"移出群聊？'),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(ctx, false),
              child: const Text('取消')),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('移出', style: TextStyle(color: Colors.red)),
          ),
        ],
      ),
    );
    if (confirm != true || !mounted) return;
    try {
      await ref.read(apiClientProvider).delete(
            '/api/social/groups/${widget.conversationId}/members/$memberId',
          );
      if (mounted) Toast.success(context, '已移出');
    } catch (e) {
      if (mounted) Toast.error(context, '$e');
    }
  }

  Widget _meetingNoticeCard(_MeetingNotice notice) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.videocam, size: 18, color: Colors.blue),
            const SizedBox(width: 6),
            Flexible(
              child: Text(
                notice.text,
                style:
                    const TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
              ),
            ),
          ],
        ),
        const SizedBox(height: 4),
        Text(
          notice.title,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: const TextStyle(fontSize: 12, color: Colors.black54),
        ),
        const SizedBox(height: 4),
        Text(
          notice.actionText,
          style: const TextStyle(
            fontSize: 13,
            color: Colors.blue,
            decoration: TextDecoration.underline,
          ),
        ),
      ],
    );
  }

  String _statusText(int status) {
    switch (status) {
      case -1:
        return '发送失败';
      case 1:
        return '已发送';
      case 2:
        return '已读';
      default:
        return '';
    }
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authProvider);
    int myId = authState.user?.id ?? authState.profile?.user.id ?? 0;

    // 如果 authProvider 还没加载完，从 token 中解析 userId
    if (myId == 0) {
      myId = _getMyIdFromToken();
    }

    return Scaffold(
      appBar: AppBar(
        title: Text(widget.title),
        actions: [
          if (widget.type == 2)
            IconButton(
              icon: const Icon(Icons.videocam),
              onPressed: _openMeeting,
            ),
          if (widget.type == 2)
            IconButton(
              icon: const Icon(Icons.group),
              onPressed: () async {
                await Navigator.of(context, rootNavigator: true)
                    .push(MaterialPageRoute(
                  builder: (_) => GroupDetailPage(
                    conversationId: widget.conversationId,
                    groupName: widget.title,
                  ),
                ));
                if (mounted) _loadMyMuteState();
              },
            ),
        ],
      ),
      backgroundColor: const Color(0xFFF5F5F5),
      body: Column(
        children: [
          // 网络状态提示
          if (!ref.read(socketServiceProvider).isConnected)
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(vertical: 4),
              color: Colors.orange.shade100,
              child: const Text('网络连接中...',
                  textAlign: TextAlign.center,
                  style: TextStyle(fontSize: 12, color: Colors.orange)),
            ),
          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator())
                : ListView.builder(
                    controller: _scrollCtrl,
                    padding:
                        const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    itemCount: _messages.length + (_loadingMore ? 1 : 0),
                    itemBuilder: (context, index) {
                      // 顶部加载更多指示器
                      if (_loadingMore && index == 0) {
                        return const Padding(
                          padding: EdgeInsets.all(8),
                          child: Center(
                              child: SizedBox(
                                  width: 20,
                                  height: 20,
                                  child: CircularProgressIndicator(
                                      strokeWidth: 2))),
                        );
                      }
                      final msgIndex = _loadingMore ? index - 1 : index;
                      final msg = _messages[msgIndex];
                      final isMe = msg.senderId == myId;
                      final meetingNotice = _meetingNoticeFromMessage(msg);
                      final sender = _senderCache[msg.senderId];
                      final senderName = sender?['nickname'] ??
                          sender?['account'] ??
                          _socketService.senderNicknameCache[msg.senderId] ??
                          '用户${msg.senderId}';

                      return Padding(
                        padding: const EdgeInsets.symmetric(vertical: 6),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          mainAxisAlignment: isMe
                              ? MainAxisAlignment.end
                              : MainAxisAlignment.start,
                          children: [
                            // 左侧头像（对方消息）
                            if (!isMe) ...[
                              CircleAvatar(
                                radius: 18,
                                backgroundColor: Colors.grey.shade300,
                                backgroundImage:
                                    _avatarImage(sender?['avatar'] as String?),
                                child: _avatarImage(
                                            sender?['avatar'] as String?) ==
                                        null
                                    ? Text(
                                        senderName.isNotEmpty
                                            ? senderName[0].toUpperCase()
                                            : '?',
                                        style: const TextStyle(
                                            fontSize: 14,
                                            fontWeight: FontWeight.bold),
                                      )
                                    : null,
                              ),
                              const SizedBox(width: 8),
                            ],
                            // 消息内容
                            Flexible(
                              child: GestureDetector(
                                onTap: msg.status == -1 && isMe
                                    ? () => _retrySend(msg)
                                    : meetingNotice != null
                                        ? () => _openMeetingFromNotice(
                                            meetingNotice)
                                        : null,
                                onLongPress: () =>
                                    _showMessageActions(msg, isMe),
                                child: Column(
                                  crossAxisAlignment: isMe
                                      ? CrossAxisAlignment.end
                                      : CrossAxisAlignment.start,
                                  children: [
                                    // 昵称（对方消息显示）
                                    if (!isMe)
                                      Padding(
                                        padding:
                                            const EdgeInsets.only(bottom: 2),
                                        child: Text(senderName,
                                            style: const TextStyle(
                                                fontSize: 11,
                                                color: Colors.grey)),
                                      ),
                                    // 气泡
                                    Container(
                                      padding: const EdgeInsets.symmetric(
                                          horizontal: 12, vertical: 8),
                                      decoration: BoxDecoration(
                                        color: msg.status == -1
                                            ? Colors.red.shade50
                                            : isMe
                                                ? const Color(0xFF95EC69)
                                                : Colors.white,
                                        borderRadius: BorderRadius.only(
                                          topLeft: const Radius.circular(12),
                                          topRight: const Radius.circular(12),
                                          bottomLeft:
                                              Radius.circular(isMe ? 12 : 2),
                                          bottomRight:
                                              Radius.circular(isMe ? 2 : 12),
                                        ),
                                        boxShadow: [
                                          BoxShadow(
                                              color: Colors.black
                                                  .withOpacity(0.05),
                                              blurRadius: 2,
                                              offset: const Offset(0, 1)),
                                        ],
                                      ),
                                      constraints: BoxConstraints(
                                          maxWidth: MediaQuery.of(context)
                                                  .size
                                                  .width *
                                              0.65),
                                      child: _messageContent(msg),
                                    ),
                                    // 状态
                                    if (isMe)
                                      Padding(
                                        padding: const EdgeInsets.only(top: 2),
                                        child: Text(
                                          msg.status == -1
                                              ? '发送失败，点击重发'
                                              : _statusText(msg.status),
                                          style: TextStyle(
                                              fontSize: 10,
                                              color: msg.status == -1
                                                  ? Colors.red
                                                  : Colors.grey),
                                        ),
                                      ),
                                  ],
                                ),
                              ),
                            ),
                            // 右侧头像（我的消息）
                            if (isMe) ...[
                              const SizedBox(width: 8),
                              CircleAvatar(
                                radius: 18,
                                backgroundColor: Colors.blue.shade200,
                                backgroundImage: _avatarImage(
                                    ref.read(authProvider).user?.avatar),
                                child: _avatarImage(ref
                                            .read(authProvider)
                                            .user
                                            ?.avatar) ==
                                        null
                                    ? const Icon(Icons.person,
                                        size: 18, color: Colors.white)
                                    : null,
                              ),
                            ],
                          ],
                        ),
                      );
                    },
                  ),
          ),
          // 引用回复提示
          if (_replyingTo != null)
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              color: Colors.blue.shade50,
              child: Row(
                children: [
                  const Icon(Icons.reply, size: 16, color: Colors.blue),
                  const SizedBox(width: 6),
                  Expanded(
                    child: Text(
                      '回复：${_replyingTo!.content.length > 30 ? '${_replyingTo!.content.substring(0, 30)}...' : _replyingTo!.content}',
                      style: const TextStyle(fontSize: 12, color: Colors.blue),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  GestureDetector(
                    onTap: () => setState(() => _replyingTo = null),
                    child:
                        const Icon(Icons.close, size: 16, color: Colors.grey),
                  ),
                ],
              ),
            ),
          // 录音状态提示
          if (_isRecordingVoice)
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(vertical: 10),
              color: Colors.red.shade50,
              child: const Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.mic, color: Colors.red, size: 20),
                  SizedBox(width: 6),
                  Text('松开发送，上滑取消',
                      style: TextStyle(
                          fontSize: 13,
                          color: Colors.red,
                          fontWeight: FontWeight.w500)),
                ],
              ),
            ),
          // 输入栏
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
            decoration: const BoxDecoration(
              color: Colors.white,
              boxShadow: [BoxShadow(color: Colors.black12, blurRadius: 4)],
            ),
            child: Row(
              children: [
                IconButton(
                  icon: Icon(Icons.image_outlined,
                      color: _isMuted ? Colors.grey : Colors.blueGrey),
                  onPressed: _isMuted ? null : _showImageSourceSheet,
                ),
                // 语音/键盘切换按钮
                if (_voiceRecordingSupported)
                  IconButton(
                    icon: Icon(
                      _showVoiceButton ? Icons.keyboard : Icons.mic_none,
                      color: _isMuted ? Colors.grey : Colors.blueGrey,
                    ),
                    onPressed: _isMuted
                        ? null
                        : () => setState(
                            () => _showVoiceButton = !_showVoiceButton),
                  ),
                // 输入框或按住说话按钮
                Expanded(
                  child: _showVoiceButton &&
                          _voiceRecordingSupported &&
                          !_isMuted
                      ? Listener(
                          onPointerDown: (event) {
                            _voiceStartY = event.localPosition.dy;
                            _startVoiceRecording();
                          },
                          onPointerMove: (event) {
                            setState(() {
                              _voiceCancelOffset =
                                  event.localPosition.dy - _voiceStartY;
                            });
                          },
                          onPointerUp: (_) {
                            if (_voiceCancelOffset < -80) {
                              _cancelVoiceRecording();
                            } else {
                              _stopAndSendVoice();
                            }
                            setState(() => _voiceCancelOffset = 0);
                          },
                          child: Container(
                            height: 40,
                            decoration: BoxDecoration(
                              color: _isRecordingVoice
                                  ? Colors.grey.shade300
                                  : Colors.grey.shade100,
                              borderRadius: BorderRadius.circular(6),
                            ),
                            alignment: Alignment.center,
                            child: Text(
                              _isRecordingVoice
                                  ? (_voiceCancelOffset < -80 ? '松开取消' : '松开发送')
                                  : '按住说话',
                              style: TextStyle(
                                fontSize: 14,
                                color: _isRecordingVoice
                                    ? (_voiceCancelOffset < -80
                                        ? Colors.red
                                        : Colors.black87)
                                    : Colors.black54,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                          ),
                        )
                      : TextField(
                          controller: _inputCtrl,
                          enabled: !_isMuted,
                          decoration: InputDecoration(
                            hintText: _isMuted ? '您已被禁言' : '输入消息...',
                            border: InputBorder.none,
                            contentPadding:
                                const EdgeInsets.symmetric(horizontal: 12),
                          ),
                          maxLines: null,
                          textInputAction: TextInputAction.send,
                          onSubmitted: _isMuted ? null : (_) => _sendMessage(),
                        ),
                ),
                IconButton(
                  icon: Icon(
                    _showEmojiPicker
                        ? Icons.keyboard
                        : Icons.emoji_emotions_outlined,
                    color: _isMuted ? Colors.grey : Colors.amber,
                  ),
                  onPressed: _isMuted
                      ? null
                      : () =>
                          setState(() => _showEmojiPicker = !_showEmojiPicker),
                ),
                IconButton(
                  icon: Icon(Icons.send,
                      color: _isMuted ? Colors.grey : Colors.blue),
                  onPressed: _isMuted ? null : _sendMessage,
                ),
              ],
            ),
          ),
          // 表情面板
          if (_showEmojiPicker)
            Container(
              height: 200,
              color: Colors.grey.shade50,
              child: GridView.builder(
                padding: const EdgeInsets.all(8),
                gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: 8,
                  mainAxisSpacing: 4,
                  crossAxisSpacing: 4,
                ),
                itemCount: _emojis.length,
                itemBuilder: (context, index) {
                  return GestureDetector(
                    onTap: () {
                      _inputCtrl.text += _emojis[index];
                      _inputCtrl.selection = TextSelection.fromPosition(
                        TextPosition(offset: _inputCtrl.text.length),
                      );
                    },
                    child: Center(
                      child: Text(_emojis[index],
                          style: const TextStyle(fontSize: 24)),
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

class _MeetingNotice {
  final int meetingId;
  final int groupId;
  final String title;
  final String text;
  final String actionText;

  const _MeetingNotice({
    required this.meetingId,
    required this.groupId,
    required this.title,
    required this.text,
    required this.actionText,
  });
}

class _VoicePayload {
  final String url;
  final int durationMs;

  const _VoicePayload({required this.url, required this.durationMs});

  factory _VoicePayload.fromContent(String content) {
    try {
      final data = jsonDecode(content);
      if (data is Map && data['url'] != null) {
        return _VoicePayload(
          url: data['url'].toString(),
          durationMs: int.tryParse(data['durationMs']?.toString() ?? '') ?? 0,
        );
      }
    } catch (_) {}
    return _VoicePayload(url: content, durationMs: 0);
  }

  String get durationText {
    if (durationMs <= 0) return '语音消息';
    final seconds = (durationMs / 1000).ceil().clamp(1, 999);
    return '$seconds秒';
  }
}
