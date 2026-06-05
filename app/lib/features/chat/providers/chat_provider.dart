import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:socket_io_client/socket_io_client.dart' as io;
import '../../../core/constants/app_constants.dart';
import '../../../core/storage/token_storage.dart';

class ChatMessage {
  int id;
  final int conversationId;
  final int senderId;
  String content;
  final int msgType;
  int status; // 1=已发送 2=已读 -1=发送失败
  String createdAt;

  ChatMessage({
    required this.id,
    required this.conversationId,
    required this.senderId,
    required this.content,
    required this.msgType,
    this.status = 1,
    required this.createdAt,
  });

  factory ChatMessage.fromJson(Map<String, dynamic> json) => ChatMessage(
        id: int.tryParse(json['id']?.toString() ?? '') ?? 0,
        conversationId:
            int.tryParse(json['conversationId']?.toString() ?? '') ?? 0,
        senderId: int.tryParse(json['senderId']?.toString() ?? '') ?? 0,
        content: json['content'] as String? ?? '',
        msgType: int.tryParse(json['msgType']?.toString() ?? '') ?? 1,
        status: int.tryParse(json['status']?.toString() ?? '') ?? 1,
        createdAt: json['createdAt']?.toString() ?? '',
      );
}

class ConversationItem {
  final int conversationId;
  final int? type;
  final String? name;
  final String? avatar;
  bool isPinned;
  final int unreadCount;
  final ChatMessage? lastMessage;
  final Map<String, dynamic>? peerUser;

  ConversationItem({
    required this.conversationId,
    this.type,
    this.name,
    this.avatar,
    this.isPinned = false,
    this.unreadCount = 0,
    this.lastMessage,
    this.peerUser,
  });
}

class SocketService {
  io.Socket? _socket;
  String? _authToken;
  bool _isConnecting = false;
  final List<Function(ChatMessage)> _messageListeners = [];
  final List<Function(int messageId, int status)> _statusListeners = [];
  final List<Function(int messageId, int conversationId, String content)>
      _updateListeners = [];
  final List<Function(int userId)> _onlineListeners = [];
  final List<Function(int userId)> _offlineListeners = [];
  final List<Function()> _friendRequestListeners = [];
  final List<Function()> _conversationNewListeners = [];
  final List<Function(Map<String, dynamic>)> _serviceNotificationListeners = [];
  final List<Function()> _connectListeners = [];
  final List<Function()> _connectionStateListeners = [];

  // 发送者信息缓存（从Socket推送中获取）
  final Map<int, String> senderNicknameCache = {};
  final Map<int, String> senderAvatarCache = {};

  // 当前正在查看的会话ID（用于判断是否需要增加未读数）
  int? activeConversationId;

  // 待重发消息队列
  final List<_PendingMessage> _pendingMessages = [];

  void connect() {
    final token = TokenStorage.getToken();
    if (token == null || token.isEmpty) {
      debugPrint('[Socket] 无 token，跳过连接');
      disconnect();
      return;
    }

    if (_socket != null && _authToken == token) {
      if (_socket!.connected || _isConnecting) return;
    }

    debugPrint('[Socket] 正在连接: ${AppConstants.wsUrl}/chat');
    _socket?.disconnect();
    _authToken = token;
    _isConnecting = true;
    _socket = io.io(
      '${AppConstants.wsUrl}/chat',
      io.OptionBuilder()
          .setTransports(['websocket'])
          .setPath('/socket.io')
          .setAuth({'token': token})
          .setExtraHeaders({'Authorization': 'Bearer $token'})
          .enableForceNew()
          .disableMultiplex()
          .setTimeout(20000)
          .setReconnectionDelay(800)
          .setReconnectionDelayMax(5000)
          .disableAutoConnect()
          .enableReconnection()
          .build(),
    );

    _socket!.onConnect((_) {
      debugPrint('[Socket] 连接成功');
      _isConnecting = false;
      _notifyConnectionStateChanged();
      // 通知所有连接监听器（用于刷新会话列表等）
      for (final listener in _connectListeners) {
        listener();
      }
    });

    _socket!.onConnectError((err) {
      debugPrint('[Socket] 连接失败: $err');
      _isConnecting = false;
      _notifyConnectionStateChanged();
    });

    _socket!.onDisconnect((_) {
      debugPrint('[Socket] 断开连接');
      _isConnecting = false;
      _notifyConnectionStateChanged();
    });

    _socket!.on('message:receive', (data) {
      debugPrint('[Socket] 收到消息: $data');
      final map = Map<String, dynamic>.from(data);
      final msg = ChatMessage.fromJson(map);
      // 缓存发送者昵称和头像
      final senderId = msg.senderId;
      final senderNickname = map['senderNickname']?.toString();
      final senderAvatar = map['senderAvatar']?.toString();
      if (senderNickname != null && senderId > 0) {
        senderNicknameCache[senderId] = senderNickname;
      }
      if (senderAvatar != null && senderId > 0) {
        senderAvatarCache[senderId] = senderAvatar;
      }
      for (final listener in _messageListeners) {
        listener(msg);
      }
    });

    _socket!.on('message:status', (data) {
      final map = Map<String, dynamic>.from(data);
      final messageId = map['messageId'] as int? ?? 0;
      final status = map['status'] as int? ?? 1;
      for (final listener in _statusListeners) {
        listener(messageId, status);
      }
    });

    _socket!.on('message:update', (data) {
      final map = Map<String, dynamic>.from(data);
      final messageId = int.tryParse(map['id']?.toString() ?? '') ?? 0;
      final conversationId =
          int.tryParse(map['conversationId']?.toString() ?? '') ?? 0;
      final content = map['content']?.toString() ?? '';
      for (final listener in _updateListeners) {
        listener(messageId, conversationId, content);
      }
    });

    _socket!.on('user:online', (data) {
      final userId = (data as Map<String, dynamic>)['userId'] as int? ?? 0;
      for (final listener in _onlineListeners) {
        listener(userId);
      }
    });

    _socket!.on('user:offline', (data) {
      final userId = (data as Map<String, dynamic>)['userId'] as int? ?? 0;
      for (final listener in _offlineListeners) {
        listener(userId);
      }
    });

    _socket!.on('friend:request', (data) {
      for (final listener in _friendRequestListeners) {
        listener();
      }
    });

    _socket!.on('conversation:new', (data) {
      for (final listener in _conversationNewListeners) {
        listener();
      }
    });

    _socket!.on('service:notification', (data) {
      Map<String, dynamic> map;
      try {
        map = Map<String, dynamic>.from(data as Map);
      } catch (_) {
        map = <String, dynamic>{};
      }
      for (final listener in _serviceNotificationListeners) {
        listener(map);
      }
    });

    _socket!.on('connect', (_) {
      // 连接成功后重发失败消息
      _retryPendingMessages();
    });

    _socket!.on('connect_error', (_) {
      _isConnecting = false;
      _notifyConnectionStateChanged();
      // 标记所有待发送消息为失败
      for (final p in _pendingMessages) {
        p.onFail?.call();
      }
    });

    _socket!.connect();
  }

  void disconnect() {
    _socket?.disconnect();
    _socket = null;
    _authToken = null;
    _isConnecting = false;
    _notifyConnectionStateChanged();
  }

  bool get isConnected => _socket?.connected ?? false;

  /// 发送消息，支持失败回调
  void sendMessage(int conversationId, String content, int msgType,
      {Function()? onFail, Function(Map<String, dynamic> ack)? onSuccess}) {
    if (_socket == null || !_socket!.connected) {
      _pendingMessages.add(
          _PendingMessage(conversationId, content, msgType, onFail, onSuccess));
      connect();
      return;
    }
    var completed = false;
    Timer? ackTimer;

    void failOnce() {
      if (completed) return;
      completed = true;
      ackTimer?.cancel();
      onFail?.call();
    }

    void successOnce(Map<String, dynamic> ack) {
      if (completed) return;
      completed = true;
      ackTimer?.cancel();
      onSuccess?.call(ack);
    }

    ackTimer = Timer(const Duration(seconds: 15), failOnce);
    _socket!.emitWithAck(
      'message:send',
      {
        'conversationId': conversationId,
        'content': content,
        'msgType': msgType,
      },
      ack: (data) {
        if (data is Map && data['error'] != null) {
          failOnce();
          return;
        }
        if (data is Map) {
          successOnce(Map<String, dynamic>.from(data));
          return;
        }
        failOnce();
      },
    );
  }

  /// 重发失败消息
  void retrySendMessage(int conversationId, String content, int msgType) {
    sendMessage(conversationId, content, msgType);
  }

  void _retryPendingMessages() {
    final pending = List.of(_pendingMessages);
    _pendingMessages.clear();
    for (final p in pending) {
      sendMessage(
        p.conversationId,
        p.content,
        p.msgType,
        onFail: p.onFail,
        onSuccess: p.onSuccess,
      );
    }
  }

  void markAsRead(int conversationId, int messageId) {
    _socket?.emit('message:read', {
      'conversationId': conversationId,
      'messageId': messageId,
    });
  }

  void editMessage(int messageId, String content) {
    _socket?.emit('message:edit', {'messageId': messageId, 'content': content});
  }

  void addMessageListener(Function(ChatMessage) listener) =>
      _messageListeners.add(listener);
  void removeMessageListener(Function(ChatMessage) listener) =>
      _messageListeners.remove(listener);
  void addStatusListener(Function(int, int) listener) =>
      _statusListeners.add(listener);
  void removeStatusListener(Function(int, int) listener) =>
      _statusListeners.remove(listener);
  void addUpdateListener(Function(int, int, String) listener) =>
      _updateListeners.add(listener);
  void removeUpdateListener(Function(int, int, String) listener) =>
      _updateListeners.remove(listener);
  void addOnlineListener(Function(int) listener) =>
      _onlineListeners.add(listener);
  void removeOnlineListener(Function(int) listener) =>
      _onlineListeners.remove(listener);
  void addOfflineListener(Function(int) listener) =>
      _offlineListeners.add(listener);
  void removeOfflineListener(Function(int) listener) =>
      _offlineListeners.remove(listener);
  void addFriendRequestListener(Function() listener) =>
      _friendRequestListeners.add(listener);
  void removeFriendRequestListener(Function() listener) =>
      _friendRequestListeners.remove(listener);
  void addConversationNewListener(Function() listener) =>
      _conversationNewListeners.add(listener);
  void removeConversationNewListener(Function() listener) =>
      _conversationNewListeners.remove(listener);
  void addServiceNotificationListener(Function(Map<String, dynamic>) listener) =>
      _serviceNotificationListeners.add(listener);
  void removeServiceNotificationListener(
          Function(Map<String, dynamic>) listener) =>
      _serviceNotificationListeners.remove(listener);
  void addConnectListener(Function() listener) =>
      _connectListeners.add(listener);
  void removeConnectListener(Function() listener) =>
      _connectListeners.remove(listener);
  void addConnectionStateListener(Function() listener) =>
      _connectionStateListeners.add(listener);
  void removeConnectionStateListener(Function() listener) =>
      _connectionStateListeners.remove(listener);

  void _notifyConnectionStateChanged() {
    for (final listener in List<Function()>.from(_connectionStateListeners)) {
      listener();
    }
  }
}

class _PendingMessage {
  final int conversationId;
  final String content;
  final int msgType;
  final Function()? onFail;
  final Function(Map<String, dynamic> ack)? onSuccess;
  _PendingMessage(this.conversationId, this.content, this.msgType,
      [this.onFail, this.onSuccess]);
}

final socketServiceProvider = Provider<SocketService>((ref) => SocketService());
