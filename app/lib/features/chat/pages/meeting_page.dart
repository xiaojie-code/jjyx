import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_webrtc/flutter_webrtc.dart';
import 'package:permission_handler/permission_handler.dart' as permissions;
import 'package:socket_io_client/socket_io_client.dart' as io;
import 'dart:async';
import 'dart:convert';
import '../../../core/constants/app_constants.dart';
import '../../../core/network/api_client.dart';
import '../../../core/network/api_endpoints.dart';
import '../../../core/storage/token_storage.dart';
import '../../../core/utils/toast.dart';
import '../../auth/providers/auth_provider.dart';

class MeetingPage extends ConsumerStatefulWidget {
  final int groupId;
  final String groupName;
  final Map<String, dynamic> meeting;

  const MeetingPage({
    super.key,
    required this.groupId,
    required this.groupName,
    required this.meeting,
  });

  @override
  ConsumerState<MeetingPage> createState() => _MeetingPageState();
}

class _MeetingPageState extends ConsumerState<MeetingPage> {
  late Map<String, dynamic> _meeting;
  List<Map<String, dynamic>> _participants = [];
  final Map<int, _MeetingMediaState> _mediaStates = {};
  final RTCVideoRenderer _localRenderer = RTCVideoRenderer();
  final Map<int, RTCVideoRenderer> _remoteRenderers = {};
  final Map<int, MediaStream> _remoteStreams = {};
  final List<MediaStream> _localCaptureStreams = [];
  final Map<int, RTCPeerConnection> _peerConnections = {};
  final Map<int, List<RTCIceCandidate>> _pendingRemoteCandidates = {};
  final Map<int, Set<String>> _localTrackIdsByPeer = {};
  final Set<int> _offerSentTo = {};
  final Set<int> _remoteDescriptionReady = {};
  MediaStream? _localStream;
  io.Socket? _meetingSocket;
  String? _meetingAuthToken;
  bool _loading = true;
  bool _micOn = false;
  bool _cameraOn = false;
  bool _allMuted = false;
  bool _closingPage = false;
  bool _mediaInitializing = false;
  bool _meetingSocketConnecting = false;
  bool _meetingRoomJoined = false;
  bool _rtcReady = false;
  bool _frontCamera = true;
  bool _localRendererReady = false;
  Map<String, dynamic> _rtcConfiguration = {
    'iceServers': [
      {'urls': 'stun:stun.l.google.com:19302'},
    ],
  };
  String _mediaMode = 'p2p';
  bool _recordingEnabled = false;
  bool _recordingAvailable = false;
  String _recordingUrl = '';
  String _connectionText = '连接中';
  int? _activeCameraUserId;

  int get _meetingId => int.tryParse(_meeting['id']?.toString() ?? '') ?? 0;

  int get _myId {
    final authState = ref.read(authProvider);
    final id = authState.user?.id ?? authState.profile?.user.id ?? 0;
    if (id > 0) return id;
    return _getMyIdFromToken();
  }

  int _getMyIdFromToken() {
    try {
      final token = TokenStorage.getToken();
      if (token == null) return 0;
      final parts = token.split('.');
      if (parts.length != 3) return 0;
      final payload =
          utf8.decode(base64Url.decode(base64Url.normalize(parts[1])));
      final map = jsonDecode(payload) as Map<String, dynamic>;
      return int.tryParse(map['sub']?.toString() ?? '') ?? 0;
    } catch (_) {
      return 0;
    }
  }

  @override
  void initState() {
    super.initState();
    _meeting = Map<String, dynamic>.from(widget.meeting);
    _joinAndLoad();
  }

  @override
  void dispose() {
    _disconnectMeetingSocket(notifyLeave: false);
    _disposeRtc();
    super.dispose();
  }

  Future<void> _joinAndLoad() async {
    try {
      await ref
          .read(apiClientProvider)
          .post(ApiEndpoints.meetingJoin(_meetingId));
      await _loadMediaConfig();
      await _loadParticipants();
      await _prepareRtc();
      if (!mounted) return;
      _connectMeetingSocket();
      await _loadParticipants();
    } catch (e) {
      if (mounted) Toast.error(context, '加入会议失败');
      if (mounted) setState(() => _loading = false);
    }
  }

  void _connectMeetingSocket() {
    final token = TokenStorage.getToken();
    if (token == null || token.isEmpty) {
      if (mounted) setState(() => _connectionText = '未连接');
      return;
    }

    if (_meetingSocket != null && _meetingAuthToken == token) {
      if (_meetingSocket!.connected || _meetingSocketConnecting) return;
    }

    _meetingLog('socket connecting url=${AppConstants.wsUrl}/meeting');
    _meetingSocket?.disconnect();
    _meetingAuthToken = token;
    _meetingSocketConnecting = true;
    if (mounted) setState(() => _connectionText = '连接中');

    final socket = io.io(
      '${AppConstants.wsUrl}/meeting',
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
    _meetingSocket = socket;

    socket.onConnect((_) async {
      _meetingLog('socket connected');
      _meetingSocketConnecting = false;
      _meetingRoomJoined = false;
      if (!mounted) return;
      setState(() => _connectionText = '入会中');
      final joined = await _joinMeetingSocketRoom(socket);
      if (!mounted || _meetingSocket != socket || !joined) return;
      setState(() => _connectionText = '已连接');
      _emitMediaStatus();
      await _loadParticipants();
      _syncPeerConnections();
    });

    socket.onDisconnect((reason) {
      _meetingLog('socket disconnected reason=$reason');
      _meetingSocketConnecting = false;
      _meetingRoomJoined = false;
      unawaited(_clearPeerConnections());
      if (mounted) setState(() => _connectionText = '已断开');
    });

    socket.onConnectError((error) {
      _meetingLog('socket connect_error error=$error');
      _meetingSocketConnecting = false;
      if (mounted) setState(() => _connectionText = '连接失败');
    });

    socket.on('connect_error', (error) {
      _meetingLog('socket connect_error event=$error');
      _meetingSocketConnecting = false;
      if (mounted) setState(() => _connectionText = '连接失败');
    });

    socket.on('reconnect_attempt', (attempt) {
      _meetingLog('socket reconnect_attempt attempt=$attempt');
      if (mounted) setState(() => _connectionText = '重连中');
    });

    socket.on('reconnect', (attempt) async {
      _meetingLog('socket reconnected attempt=$attempt');
      _meetingSocketConnecting = false;
      _meetingRoomJoined = false;
      if (!mounted) return;
      setState(() => _connectionText = '入会中');
      final joined = await _joinMeetingSocketRoom(socket);
      if (!mounted || _meetingSocket != socket || !joined) return;
      setState(() => _connectionText = '已连接');
      _emitMediaStatus();
      await _loadParticipants();
      await _syncPeerConnections();
    });

    socket.on('meeting:join-error', (data) {
      _meetingLog('socket join_error data=$data');
      if (mounted) setState(() => _connectionText = '加入失败');
    });
    socket.on('meeting:user-joined', _handleUserJoined);
    socket.on('meeting:user-left', _handleUserLeft);
    socket.on('meeting:participant-refresh', (data) async {
      _meetingLog('participant-refresh data=$data');
      await _loadParticipants();
      await _syncPeerConnections();
    });
    socket.on('meeting:signal', _handleSignal);
    socket.on('meeting:media-status', _handleMediaStatus);
    socket.on('meeting:media-status-snapshot', _handleMediaStatusSnapshot);
    socket.on('meeting:camera-share-state', _handleCameraShareState);
    socket.on('meeting:camera-share-rejected', _handleCameraShareRejected);
    socket.on('meeting:media-control', _handleMediaControl);
    socket.on('meeting:mute-all', _handleMuteAll);
    socket.on('meeting:kicked', _handleKicked);
    socket.on('meeting:ended', _handleEnded);
    socket.connect();
  }

  void _disconnectMeetingSocket({required bool notifyLeave}) {
    final socket = _meetingSocket;
    if (socket != null && notifyLeave) {
      socket.emit('meeting:leave', {'meetingId': _meetingId});
    }
    socket?.disconnect();
    _meetingSocket = null;
    _meetingAuthToken = null;
    _meetingSocketConnecting = false;
    _meetingRoomJoined = false;
  }

  Future<bool> _joinMeetingSocketRoom(io.Socket socket) async {
    final completer = Completer<bool>();
    _meetingLog('socket join emit meeting=$_meetingId');
    socket.emitWithAck(
      'meeting:join',
      {'meetingId': _meetingId},
      ack: (data) {
        if (completer.isCompleted) return;
        if (data is Map && data['error'] == null) {
          completer.complete(true);
          return;
        }
        _meetingLog('socket join ack failed data=$data');
        completer.complete(false);
      },
    );
    final joined = await completer.future.timeout(
      const Duration(seconds: 8),
      onTimeout: () {
        _meetingLog('socket join ack timeout');
        return false;
      },
    );
    if (joined) {
      _meetingRoomJoined = true;
      _meetingLog('socket join ack ok');
    } else if (mounted) {
      setState(() => _connectionText = '加入失败');
    }
    return joined;
  }

  Future<void> _loadParticipants() async {
    final result = await ref.read(apiClientProvider).get<List<dynamic>>(
          ApiEndpoints.meetingParticipants(_meetingId),
        );
    if (!mounted) return;
    setState(() {
      _participants = (result ?? [])
          .map((e) => Map<String, dynamic>.from(e))
          .where((e) => e['isOnline'] == true)
          .toList();
      _loading = false;
    });
    await _syncPeerConnections();
  }

  Future<void> _loadMediaConfig() async {
    try {
      final result = await ref.read(apiClientProvider).get<Map<String, dynamic>>(
            ApiEndpoints.meetingMediaConfig(_meetingId),
          );
      if (!mounted || result == null) return;
      final recording = result['recording'] is Map
          ? Map<String, dynamic>.from(result['recording'] as Map)
          : <String, dynamic>{};
      setState(() {
        _mediaMode = result['mediaMode']?.toString() == 'sfu' ? 'sfu' : 'p2p';
        _rtcConfiguration = {
          'iceServers': _normalizeIceServers(result['iceServers']),
        };
        _recordingEnabled = recording['enabled'] == true;
        _recordingAvailable = recording['replayAvailable'] == true;
        _recordingUrl = recording['url']?.toString() ?? '';
      });
      _meetingLog(
          'media config loaded mode=$_mediaMode ice=${(_rtcConfiguration['iceServers'] as List).length} recording=$_recordingEnabled replay=$_recordingAvailable');
    } catch (e) {
      _meetingLog('media config load failed error=$e');
    }
  }

  List<Map<String, dynamic>> _normalizeIceServers(dynamic value) {
    final servers = <Map<String, dynamic>>[];
    if (value is List) {
      for (final item in value) {
        if (item is Map) {
          final map = Map<String, dynamic>.from(item);
          if (map['urls'] != null) servers.add(map);
        }
      }
    }
    if (servers.isEmpty) {
      servers.add({'urls': 'stun:stun.l.google.com:19302'});
    }
    return servers;
  }

  Future<void> _prepareRtc() async {
    if (!_localRendererReady) {
      await _localRenderer.initialize();
      _localRendererReady = true;
    }
    try {
      await Helper.setSpeakerphoneOn(true);
    } catch (_) {}
    if (!mounted) return;
    setState(() => _rtcReady = true);
  }

  Future<bool> _ensureLocalMedia({
    required bool audio,
    required bool video,
  }) async {
    final currentStream = _localStream;
    final needsAudio =
        audio && (currentStream?.getAudioTracks().isEmpty ?? true);
    final needsVideo =
        video && (currentStream?.getVideoTracks().isEmpty ?? true);
    if (!needsAudio && !needsVideo) return true;
    if (_mediaInitializing) return false;
    _mediaInitializing = true;
    try {
      final requiredPermissions = <permissions.Permission>[
        if (needsAudio) permissions.Permission.microphone,
        if (needsVideo) permissions.Permission.camera,
      ];
      final permissionResult = await requiredPermissions.request();
      final denied = permissionResult.values.any((status) => !status.isGranted);
      if (denied) throw Exception('media_permission_denied');
      if (!_localRendererReady) {
        await _localRenderer.initialize();
        _localRendererReady = true;
      }
      final stream = await navigator.mediaDevices.getUserMedia({
        'audio': needsAudio,
        'video': needsVideo ? _videoConstraints() : false,
      });
      _localCaptureStreams.add(stream);
      if (_localStream == null) {
        _localStream = stream;
      } else {
        for (final track in stream.getTracks()) {
          await _localStream!.addTrack(track);
        }
      }
      _localRenderer.srcObject = _localStream;
      try {
        await Helper.setSpeakerphoneOn(true);
      } catch (_) {}
      _applyLocalMediaState();
      _meetingLog(
          'local media ready audio=${_localStream?.getAudioTracks().length ?? 0} video=${_localStream?.getVideoTracks().length ?? 0}');
      if (!mounted) return true;
      setState(() {
        _rtcReady = true;
      });
      await _syncPeerConnections();
      return true;
    } catch (e) {
      _meetingLog('local media failed error=$e');
      if (mounted) {
        setState(() => _rtcReady = true);
        Toast.warning(context, video ? '请允许摄像头权限' : '请允许麦克风权限');
      }
      return false;
    } finally {
      _mediaInitializing = false;
    }
  }

  Map<String, dynamic> _videoConstraints() {
    return {
      'facingMode': _frontCamera ? 'user' : 'environment',
      'width': {'ideal': 640},
      'height': {'ideal': 480},
    };
  }

  void _applyLocalMediaState() {
    final stream = _localStream;
    if (stream == null) return;
    for (final track in stream.getAudioTracks()) {
      track.enabled = _micOn;
    }
    for (final track in stream.getVideoTracks()) {
      track.enabled = _cameraOn;
    }
  }

  Future<void> _syncPeerConnections() async {
    final socket = _meetingSocket;
    if (socket == null || !socket.connected) return;
    if (!_meetingRoomJoined) return;
    final myId = _myId;
    if (myId <= 0) return;
    final onlineIds = _participants
        .map((e) => int.tryParse(e['userId']?.toString() ?? '') ?? 0)
        .where((id) => id > 0 && id != myId)
        .toSet();
    _meetingLog(
        'sync peers onlineIds=${onlineIds.join(',')} rtcReady=$_rtcReady');
    // 移除已离开的用户
    for (final peerId in _peerConnections.keys.toList()) {
      if (!onlineIds.contains(peerId)) await _removePeer(peerId);
    }
    // 如果 RTC 还没就绪，先不建立连接。
    if (!_rtcReady) return;
    // 为所有在线用户创建 PeerConnection，ID 小的一方主动发 offer
    for (final peerId in onlineIds) {
      if (!_peerConnections.containsKey(peerId)) {
        await _ensurePeerConnection(peerId, createOffer: myId < peerId);
      } else {
        final pc = _peerConnections[peerId]!;
        final tracksAdded = await _ensureLocalTracks(peerId, pc);
        if (tracksAdded) {
          await _renegotiateAfterLocalTracksAdded(peerId, pc);
        } else if (myId < peerId && !_offerSentTo.contains(peerId)) {
          await _createAndSendOffer(peerId, pc);
        }
      }
    }
  }

  Future<RTCPeerConnection> _ensurePeerConnection(
    int peerId, {
    bool createOffer = false,
  }) async {
    final existing = _peerConnections[peerId];
    if (existing != null) {
      if (createOffer && !_offerSentTo.contains(peerId)) {
        await _createAndSendOffer(peerId, existing);
      }
      return existing;
    }

    final pc = await createPeerConnection(_rtcConfiguration);
    _meetingLog('peer created peer=$peerId offer=$createOffer');
    _peerConnections[peerId] = pc;

    final remoteRenderer = RTCVideoRenderer();
    await remoteRenderer.initialize();
    _remoteRenderers[peerId] = remoteRenderer;

    final stream = _localStream;
    if (stream != null) {
      await _ensureLocalTracks(peerId, pc);
    }

    pc.onIceCandidate = (candidate) {
      if (candidate.candidate == null) return;
      _meetingLog('send candidate to=$peerId mid=${candidate.sdpMid}');
      _sendSignal(peerId, 'candidate', candidate.toMap());
    };
    pc.onTrack = (event) {
      _handleRemoteTrack(peerId, remoteRenderer, event);
    };
    pc.onConnectionState = (state) {
      if (!mounted) return;
      final status = state.toString().split('.').last;
      _meetingLog('peer connection state peer=$peerId state=$status');
    };

    if (createOffer) await _createAndSendOffer(peerId, pc);
    return pc;
  }

  Future<void> _createAndSendOffer(int peerId, RTCPeerConnection pc) async {
    _offerSentTo.add(peerId);
    _meetingLog('create offer peer=$peerId');
    final offer = await pc.createOffer({
      'offerToReceiveAudio': 1,
      'offerToReceiveVideo': 1,
    });
    await pc.setLocalDescription(offer);
    _sendSignal(peerId, 'offer', offer.toMap());
  }

  Future<void> _handleRemoteTrack(
    int peerId,
    RTCVideoRenderer remoteRenderer,
    RTCTrackEvent event,
  ) async {
    final stream = _remoteStreams[peerId] ??
        (event.streams.isNotEmpty
            ? event.streams.first
            : await createLocalMediaStream('remote-$peerId'));
    _remoteStreams[peerId] = stream;
    final trackId =
        event.track.id ?? '${event.track.kind}-${identityHashCode(event.track)}';
    final exists = stream.getTracks().any((track) {
      final id = track.id ?? '${track.kind}-${identityHashCode(track)}';
      return id == trackId;
    });
    if (!exists) await stream.addTrack(event.track);
    if (event.track.kind == 'audio') {
      event.track.enabled = true;
      try {
        await Helper.setSpeakerphoneOn(true);
      } catch (_) {}
    }
    _meetingLog(
        'remote track received peer=$peerId kind=${event.track.kind} streams=${event.streams.length}');
    remoteRenderer.srcObject = stream;
    if (mounted) setState(() {});
  }

  Future<bool> _ensureLocalTracks(
    int peerId,
    RTCPeerConnection pc,
  ) async {
    final stream = _localStream;
    if (stream == null) return false;
    final attachedTrackIds =
        _localTrackIdsByPeer.putIfAbsent(peerId, () => <String>{});
    var added = false;
    for (final track in stream.getTracks()) {
      final trackId = track.id ?? '${track.kind}-${identityHashCode(track)}';
      if (attachedTrackIds.contains(trackId)) continue;
      await pc.addTrack(track, stream);
      attachedTrackIds.add(trackId);
      added = true;
      _meetingLog(
          'add local track peer=$peerId kind=${track.kind} id=$trackId');
    }
    return added;
  }

  Future<void> _renegotiateAfterLocalTracksAdded(
    int peerId,
    RTCPeerConnection pc,
  ) async {
    if (_meetingSocket?.connected != true || !_rtcReady) return;
    if (_myId < peerId) {
      _offerSentTo.remove(peerId);
      await _createAndSendOffer(peerId, pc);
      return;
    }
    _sendSignal(peerId, 'renegotiate', {'reason': 'local_tracks_ready'});
  }

  Future<void> _handleSignal(dynamic data) async {
    if (!mounted || data is! Map) return;
    final map = Map<String, dynamic>.from(data);
    final signalMeetingId =
        int.tryParse(map['meetingId']?.toString() ?? '') ?? _meetingId;
    if (signalMeetingId != _meetingId) return;
    final fromUserId = int.tryParse(map['fromUserId']?.toString() ?? '') ?? 0;
    if (fromUserId <= 0 || fromUserId == _myId) return;
    final type = map['type']?.toString() ?? '';
    final payload = map['payload'];
    if (payload is! Map) return;
    final payloadMap = Map<String, dynamic>.from(payload);
    _meetingLog('receive signal type=$type from=$fromUserId');
    final pc = await _ensurePeerConnection(fromUserId);
    if (type == 'offer') {
      await pc.setRemoteDescription(
        RTCSessionDescription(
          payloadMap['sdp']?.toString(),
          payloadMap['type']?.toString(),
        ),
      );
      _remoteDescriptionReady.add(fromUserId);
      await _flushPendingCandidates(fromUserId, pc);
      final answer = await pc.createAnswer({
        'offerToReceiveAudio': 1,
        'offerToReceiveVideo': 1,
      });
      await pc.setLocalDescription(answer);
      _meetingLog('send answer to=$fromUserId');
      _sendSignal(fromUserId, 'answer', answer.toMap());
    } else if (type == 'answer') {
      await pc.setRemoteDescription(
        RTCSessionDescription(
          payloadMap['sdp']?.toString(),
          payloadMap['type']?.toString(),
        ),
      );
      _remoteDescriptionReady.add(fromUserId);
      await _flushPendingCandidates(fromUserId, pc);
    } else if (type == 'candidate') {
      final candidate = _candidateFromPayload(payloadMap);
      if (!_remoteDescriptionReady.contains(fromUserId)) {
        _pendingRemoteCandidates
            .putIfAbsent(fromUserId, () => [])
            .add(candidate);
        _meetingLog(
            'cache candidate from=$fromUserId count=${_pendingRemoteCandidates[fromUserId]?.length ?? 0}');
        return;
      }
      await _addRemoteCandidate(fromUserId, pc, candidate);
    } else if (type == 'renegotiate') {
      if (_rtcReady && _myId < fromUserId) {
        await _ensureLocalTracks(fromUserId, pc);
        _offerSentTo.remove(fromUserId);
        await _createAndSendOffer(fromUserId, pc);
      }
    }
  }

  RTCIceCandidate _candidateFromPayload(Map<String, dynamic> payload) {
    return RTCIceCandidate(
      payload['candidate']?.toString(),
      payload['sdpMid']?.toString(),
      int.tryParse(payload['sdpMLineIndex']?.toString() ?? ''),
    );
  }

  Future<void> _addRemoteCandidate(
    int peerId,
    RTCPeerConnection pc,
    RTCIceCandidate candidate,
  ) async {
    try {
      await pc.addCandidate(candidate);
      _meetingLog('candidate added peer=$peerId mid=${candidate.sdpMid}');
    } catch (e) {
      _pendingRemoteCandidates.putIfAbsent(peerId, () => []).add(candidate);
      _meetingLog('candidate add failed peer=$peerId cached error=$e');
    }
  }

  Future<void> _flushPendingCandidates(
    int peerId,
    RTCPeerConnection pc,
  ) async {
    final candidates = _pendingRemoteCandidates.remove(peerId) ?? [];
    if (candidates.isEmpty) return;
    _meetingLog('flush candidates peer=$peerId count=${candidates.length}');
    for (final candidate in candidates) {
      await _addRemoteCandidate(peerId, pc, candidate);
    }
  }

  void _sendSignal(
      int targetUserId, String type, Map<String, dynamic> payload) {
    if (!_meetingRoomJoined) {
      _meetingLog('skip signal before join type=$type to=$targetUserId');
      return;
    }
    _meetingLog('send signal type=$type to=$targetUserId');
    _meetingSocket?.emit('meeting:signal', {
      'meetingId': _meetingId,
      'targetUserId': targetUserId,
      'type': type,
      'payload': payload,
    });
  }

  Future<void> _handleUserJoined(dynamic data) async {
    _meetingLog('user joined data=$data');
    await _loadParticipants();
    if (data is! Map) return;
    final userId = int.tryParse(data['userId']?.toString() ?? '') ?? 0;
    if (userId > 0 && userId != _myId && _myId < userId) {
      await _ensurePeerConnection(userId, createOffer: true);
    }
  }

  Future<void> _handleUserLeft(dynamic data) async {
    _meetingLog('user left data=$data');
    if (data is Map) {
      final userId = int.tryParse(data['userId']?.toString() ?? '') ?? 0;
      if (userId > 0) await _removePeer(userId);
    }
    await _loadParticipants();
  }

  Future<void> _removePeer(int peerId) async {
    _meetingLog('remove peer=$peerId');
    _offerSentTo.remove(peerId);
    _remoteDescriptionReady.remove(peerId);
    _pendingRemoteCandidates.remove(peerId);
    _localTrackIdsByPeer.remove(peerId);
    final pc = _peerConnections.remove(peerId);
    await pc?.close();
    await pc?.dispose();
    final renderer = _remoteRenderers.remove(peerId);
    renderer?.srcObject = null;
    await renderer?.dispose();
    final stream = _remoteStreams.remove(peerId);
    stream?.dispose();
    if (mounted) setState(() {});
  }

  Future<void> _clearPeerConnections() async {
    for (final peerId in _peerConnections.keys.toList()) {
      await _removePeer(peerId);
    }
  }

  void _disposeRtc() {
    for (final pc in _peerConnections.values) {
      pc.close();
      pc.dispose();
    }
    _peerConnections.clear();
    _offerSentTo.clear();
    _remoteDescriptionReady.clear();
    _pendingRemoteCandidates.clear();
    _localTrackIdsByPeer.clear();
    for (final renderer in _remoteRenderers.values) {
      renderer.srcObject = null;
      renderer.dispose();
    }
    _remoteRenderers.clear();
    for (final stream in _remoteStreams.values) {
      stream.dispose();
    }
    _remoteStreams.clear();
    final stream = _localStream;
    if (stream != null) {
      for (final track in stream.getTracks()) {
        track.stop();
      }
      stream.dispose();
    }
    for (final captureStream in _localCaptureStreams) {
      if (!identical(captureStream, stream)) {
        captureStream.dispose();
      }
    }
    _localCaptureStreams.clear();
    _localRenderer.srcObject = null;
    if (_localRendererReady) _localRenderer.dispose();
  }

  void _meetingLog(String message) {
    debugPrint('[MeetingP2P] meeting=$_meetingId user=$_myId $message');
  }

  void _handleMediaStatus(dynamic data) {
    if (!mounted || data is! Map) return;
    final map = Map<String, dynamic>.from(data);
    final userId = int.tryParse(map['userId']?.toString() ?? '') ?? 0;
    if (userId == 0) return;
    final cameraOn = map['cameraOn'] == true;
    setState(() {
      _mediaStates[userId] = _MeetingMediaState(
        micOn: map['micOn'] == true,
        cameraOn: cameraOn,
      );
      if (cameraOn) {
        _activeCameraUserId = userId;
      } else if (_activeCameraUserId == userId) {
        _activeCameraUserId = null;
      }
    });
  }

  void _handleMediaStatusSnapshot(dynamic data) {
    if (!mounted || data is! Map) return;
    final map = Map<String, dynamic>.from(data);
    final states = map['states'];
    setState(() {
      if (states is List) {
        for (final item in states) {
          if (item is! Map) continue;
          final state = Map<String, dynamic>.from(item);
          final userId = int.tryParse(state['userId']?.toString() ?? '') ?? 0;
          if (userId <= 0) continue;
          _mediaStates[userId] = _MeetingMediaState(
            micOn: state['micOn'] == true,
            cameraOn: state['cameraOn'] == true,
          );
        }
      }
      _activeCameraUserId =
          int.tryParse(map['activeCameraUserId']?.toString() ?? '');
    });
  }

  void _handleCameraShareState(dynamic data) {
    if (!mounted || data is! Map) return;
    final map = Map<String, dynamic>.from(data);
    setState(() {
      _activeCameraUserId =
          int.tryParse(map['activeUserId']?.toString() ?? '');
    });
  }

  void _handleCameraShareRejected(dynamic data) {
    if (!mounted) return;
    final activeUserId = data is Map
        ? int.tryParse(data['activeUserId']?.toString() ?? '')
        : null;
    setState(() {
      _cameraOn = false;
      _activeCameraUserId = activeUserId;
      final userId = _myId;
      if (userId > 0) {
        _mediaStates[userId] =
            _MeetingMediaState(micOn: _micOn, cameraOn: false);
      }
    });
    _applyLocalMediaState();
    _emitMediaStatus();
    Toast.info(context, '已有用户正在分享画面，请稍等');
  }

  void _handleMuteAll(dynamic data) {
    if (!mounted || data is! Map) return;
    final map = Map<String, dynamic>.from(data);
    final operatorId = int.tryParse(map['operatorId']?.toString() ?? '') ?? 0;
    final muted = map['muted'] != false;
    setState(() => _allMuted = muted);
    if (!muted) {
      if (operatorId != _myId) Toast.info(context, '群主或管理员已解除全员静音');
      return;
    }
    if (operatorId != _myId && !_canControlMeeting() && _micOn) {
      setState(() => _micOn = false);
      _applyLocalMediaState();
      _emitMediaStatus();
    }
    if (operatorId != _myId) Toast.info(context, '群主或管理员已开启全员静音');
  }

  void _handleMediaControl(dynamic data) {
    if (!mounted || data is! Map) return;
    final map = Map<String, dynamic>.from(data);
    final targetUserId =
        int.tryParse(map['targetUserId']?.toString() ?? '') ?? 0;
    if (targetUserId == 0) return;
    final hasMic = map.containsKey('micOn');
    final hasCamera = map.containsKey('cameraOn');
    final current = _mediaStateFor(targetUserId);
    final nextMicOn = hasMic ? map['micOn'] == true : current.micOn;
    final nextCameraOn = hasCamera ? map['cameraOn'] == true : current.cameraOn;
    setState(() {
      _mediaStates[targetUserId] =
          _MeetingMediaState(micOn: nextMicOn, cameraOn: nextCameraOn);
      if (nextCameraOn) {
        _activeCameraUserId = targetUserId;
      } else if (_activeCameraUserId == targetUserId) {
        _activeCameraUserId = null;
      }
      if (targetUserId == _myId) {
        _micOn = nextMicOn;
        _cameraOn = nextCameraOn;
      }
    });
    if (targetUserId == _myId) {
      _applyLocalMediaState();
      _emitMediaStatus();
      if (hasMic && !nextMicOn) Toast.info(context, '群主或管理员已关闭你的麦克风');
      if (hasCamera && !nextCameraOn) Toast.info(context, '群主或管理员已关闭你的摄像头');
    }
  }

  void _handleKicked(dynamic data) {
    if (!mounted || data is! Map) return;
    final map = Map<String, dynamic>.from(data);
    final targetUserId =
        int.tryParse(map['targetUserId']?.toString() ?? '') ?? 0;
    if (targetUserId == _myId) {
      _finishAndPop('你已被移出本次会议');
      return;
    }
    _loadParticipants();
  }

  void _handleEnded(dynamic data) {
    if (!mounted || data is! Map) return;
    final map = Map<String, dynamic>.from(data);
    final force = map['force'] == true;
    _finishAndPop(force ? '后台已强制结束会议' : '会议已结束');
  }

  void _emitMediaStatus() {
    final userId = _myId;
    if (userId > 0) {
      _mediaStates[userId] =
          _MeetingMediaState(micOn: _micOn, cameraOn: _cameraOn);
      _activeCameraUserId = _cameraOn
          ? userId
          : _activeCameraUserId == userId
              ? null
              : _activeCameraUserId;
    }
    if (!_meetingRoomJoined) return;
    _meetingSocket?.emit('meeting:media-status', {
      'meetingId': _meetingId,
      'micOn': _micOn,
      'cameraOn': _cameraOn,
    });
  }

  Future<void> _toggleMic({required bool locked}) async {
    if (locked) return;
    final nextMicOn = !_micOn;
    setState(() => _micOn = nextMicOn);
    if (nextMicOn) {
      final ready = await _ensureLocalMedia(audio: true, video: false);
      final hasAudio = _localStream?.getAudioTracks().isNotEmpty == true;
      if (!ready || !hasAudio) {
        if (mounted) setState(() => _micOn = false);
        _applyLocalMediaState();
        _emitMediaStatus();
        return;
      }
    }
    _applyLocalMediaState();
    _emitMediaStatus();
    await _syncPeerConnections();
  }

  Future<void> _toggleCamera() async {
    if (!_cameraOn) {
      final activeUserId = _activeCameraUserId;
      if (activeUserId != null && activeUserId != _myId) {
        Toast.info(context, '已有用户正在分享画面，请稍等');
        return;
      }
    }
    final nextCameraOn = !_cameraOn;
    setState(() => _cameraOn = nextCameraOn);
    if (nextCameraOn) {
      final ready = await _ensureLocalMedia(audio: false, video: true);
      final hasVideo = _localStream?.getVideoTracks().isNotEmpty == true;
      if (!ready || !hasVideo) {
        if (mounted) setState(() => _cameraOn = false);
        _applyLocalMediaState();
        _emitMediaStatus();
        return;
      }
    }
    _applyLocalMediaState();
    _emitMediaStatus();
    await _syncPeerConnections();
  }

  Future<void> _switchCamera() async {
    final tracks = _localStream?.getVideoTracks() ?? [];
    if (tracks.isEmpty) {
      Toast.warning(context, '当前没有可切换的摄像头');
      return;
    }
    try {
      await Helper.switchCamera(tracks.first);
      if (mounted) setState(() => _frontCamera = !_frontCamera);
    } catch (_) {
      if (mounted) Toast.error(context, '摄像头切换失败');
    }
  }

  Future<void> _leave({bool closePage = true}) async {
    if (_closingPage) return;
    if (closePage) {
      setState(() => _closingPage = true);
    }
    try {
      _disconnectMeetingSocket(notifyLeave: true);
      await ref
          .read(apiClientProvider)
          .post(ApiEndpoints.meetingLeave(_meetingId));
      if (closePage && mounted) Navigator.pop(context, true);
    } catch (_) {
      if (closePage && mounted) setState(() => _closingPage = false);
      if (mounted) Toast.error(context, '离开会议失败');
    }
  }

  Future<void> _end() async {
    try {
      await ref
          .read(apiClientProvider)
          .post(ApiEndpoints.meetingEnd(_meetingId));
      _finishAndPop('会议已结束');
    } catch (_) {
      if (mounted) Toast.error(context, '只有群主或管理员可结束会议');
    }
  }

  Future<void> _muteAll() async {
    final nextMuted = !_allMuted;
    try {
      await ref
          .read(apiClientProvider)
          .post(ApiEndpoints.meetingMuteAll(_meetingId), data: {
        'muted': nextMuted,
      });
      if (mounted) {
        setState(() => _allMuted = nextMuted);
        Toast.success(context, nextMuted ? '已开启全员静音' : '已解除全员静音');
      }
    } catch (_) {
      if (mounted) Toast.error(context, '只有主持人、群主或管理员可操作全员静音');
    }
  }

  Future<void> _kick(int userId) async {
    try {
      await ref.read(apiClientProvider).post(
        ApiEndpoints.meetingKick(_meetingId),
        data: {'targetUserId': userId},
      );
      if (mounted) Toast.success(context, '已移出会议');
      await _loadParticipants();
    } catch (_) {
      if (mounted) Toast.error(context, '移出失败');
    }
  }

  Future<void> _controlMedia(
    int userId, {
    bool? micOn,
    bool? cameraOn,
  }) async {
    try {
      final data = <String, dynamic>{'targetUserId': userId};
      if (micOn != null) data['micOn'] = micOn;
      if (cameraOn != null) data['cameraOn'] = cameraOn;
      await ref
          .read(apiClientProvider)
          .post(ApiEndpoints.meetingMediaControl(_meetingId), data: data);
      final current = _mediaStateFor(userId);
      setState(() {
        _mediaStates[userId] = _MeetingMediaState(
          micOn: micOn ?? current.micOn,
          cameraOn: cameraOn ?? current.cameraOn,
        );
        if (cameraOn == false && _activeCameraUserId == userId) {
          _activeCameraUserId = null;
        }
      });
      if (mounted) Toast.success(context, '操作已发送');
    } catch (_) {
      if (mounted) Toast.error(context, '只能控制普通成员的麦克风或摄像头');
    }
  }

  void _finishAndPop(String message) {
    if (!mounted || _closingPage) return;
    setState(() => _closingPage = true);
    _disconnectMeetingSocket(notifyLeave: false);
    Toast.info(context, message);
    Navigator.pop(context, true);
  }

  _MeetingMediaState _mediaStateFor(int userId) {
    return _mediaStates[userId] ??
        _MeetingMediaState(
          micOn: userId == _myId ? _micOn : false,
          cameraOn: userId == _myId ? _cameraOn : false,
        );
  }

  Map<String, dynamic>? _participantFor(int userId) {
    for (final participant in _participants) {
      if (int.tryParse(participant['userId']?.toString() ?? '') == userId) {
        return participant;
      }
    }
    return null;
  }

  bool _canControlMeeting() {
    // 会议创建者（主持人）有控制权限
    final creatorId = int.tryParse(_meeting['creatorId']?.toString() ?? '') ?? 0;
    if (creatorId == _myId && _myId > 0) return true;
    // 群主、管理员也有控制权限
    final participant = _participantFor(_myId);
    final role = int.tryParse(participant?['role']?.toString() ?? '') ?? 1;
    return participant?['isOwner'] == true || participant?['isCreator'] == true || role >= 2;
  }

  Color _connectionColor() {
    switch (_connectionText) {
      case '已连接':
        return Colors.green;
      case '入会中':
      case '重连中':
      case '连接中':
        return Colors.orange;
      default:
        return Colors.red;
    }
  }

  int get _onlineCount =>
      _participants.where((e) => e['isOnline'] == true).length;

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authProvider);
    final myId = authState.user?.id ?? authState.profile?.user.id ?? 0;
    final canControl = _canControlMeeting();
    final micLocked = _allMuted && !canControl;

    return PopScope(
      canPop: _closingPage,
      onPopInvokedWithResult: (didPop, result) async {
        if (didPop || _closingPage) return;
        await _leave(closePage: false);
        if (!context.mounted) return;
        setState(() => _closingPage = true);
        Navigator.pop(context, true);
      },
      child: Scaffold(
        appBar: AppBar(
          title: Text('${widget.groupName} 会议'),
          actions: [
            if (canControl)
              IconButton(
                  icon: Icon(_allMuted ? Icons.volume_up : Icons.volume_off),
                  onPressed: _muteAll),
            if (canControl)
              IconButton(icon: const Icon(Icons.call_end), onPressed: _end),
          ],
        ),
        body: _loading
            ? const Center(child: CircularProgressIndicator())
            : Column(
                children: [
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.fromLTRB(16, 18, 16, 16),
                    color: const Color(0xFF111827),
                    child: Column(
                      children: [
                        Wrap(
                          alignment: WrapAlignment.center,
                          spacing: 8,
                          runSpacing: 6,
                          children: [
                            _statusPill(_connectionText, _connectionColor()),
                            _statusPill('$_onlineCount 人在线', Colors.blue),
                            _statusPill(_mediaMode.toUpperCase(), Colors.purple),
                            if (_allMuted)
                              _statusPill('全员静音中', Colors.orange),
                            if (_recordingEnabled || _recordingUrl.isNotEmpty)
                              _statusPill(
                                _recordingAvailable ? '回放' : '录制',
                                Colors.teal,
                              ),
                          ],
                        ),
                        const SizedBox(height: 16),
                        _videoStage(),
                        const SizedBox(height: 10),
                        Text(
                          _meeting['title']?.toString() ?? '群会议',
                          style: const TextStyle(
                              color: Colors.white,
                              fontSize: 18,
                              fontWeight: FontWeight.w600),
                        ),
                        const SizedBox(height: 4),
                        Text('会议号 $_meetingId',
                            style: const TextStyle(
                                color: Colors.white70, fontSize: 13)),
                      ],
                    ),
                  ),
                  Padding(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 16, vertical: 12),
                    child: Row(
                      children: [
                        Expanded(
                          child: OutlinedButton.icon(
                            onPressed: micLocked
                                ? null
                                : () => _toggleMic(locked: micLocked),
                            icon: Icon(_micOn && !micLocked
                                ? Icons.mic
                                : Icons.mic_off),
                            label: Text(micLocked
                                ? '已全员静音'
                                : _micOn
                                    ? '麦克风开'
                                    : '麦克风关'),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: OutlinedButton.icon(
                            onPressed: _toggleCamera,
                            icon: Icon(_cameraOn
                                ? Icons.videocam
                                : Icons.videocam_off),
                            label: Text(_cameraOn ? '摄像头开' : '摄像头关'),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: OutlinedButton.icon(
                            onPressed: _cameraOn ? _switchCamera : null,
                            icon: const Icon(Icons.cameraswitch),
                            label: const Text('切换'),
                          ),
                        ),
                      ],
                    ),
                  ),
                  if (canControl)
                    Padding(
                      padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
                      child: SizedBox(
                        width: double.infinity,
                        child: OutlinedButton.icon(
                          onPressed: _muteAll,
                          icon: Icon(
                              _allMuted ? Icons.volume_up : Icons.volume_off),
                          label: Text(_allMuted ? '解除全员静音' : '全员静音'),
                        ),
                      ),
                    ),
                  Expanded(
                    child: RefreshIndicator(
                      onRefresh: _loadParticipants,
                      child: ListView.separated(
                        itemCount: _participants.length,
                        separatorBuilder: (_, __) => const Divider(height: 1),
                        itemBuilder: (context, index) {
                          final participant = _participants[index];
                          final online = participant['isOnline'] == true;
                          final isOwner = participant['isOwner'] == true;
                          final isCreator = participant['isCreator'] == true;
                          final targetRole = int.tryParse(
                                  participant['role']?.toString() ?? '') ??
                              1;
                          final userId = int.tryParse(
                                  participant['userId']?.toString() ?? '') ??
                              0;
                          final media = _mediaStateFor(userId);
                          final canManageTarget = canControl &&
                              userId != myId &&
                              !isOwner &&
                              targetRole < 2;
                          return ListTile(
                            leading: CircleAvatar(
                              backgroundColor: online
                                  ? Colors.green.shade100
                                  : Colors.grey.shade200,
                              child: Icon(
                                  online ? Icons.person : Icons.person_off,
                                  color: online ? Colors.green : Colors.grey),
                            ),
                            title: Row(
                              children: [
                                Expanded(
                                  child: Text(participant['nickname']
                                              ?.toString()
                                              .isNotEmpty ==
                                          true
                                      ? participant['nickname'].toString()
                                      : '用户$userId'),
                                ),
                                if (isCreator)
                                  _roleBadge(canManageTarget ? '发起人' : '主持人',
                                      Colors.blue),
                                if (!isCreator && isOwner)
                                  _roleBadge('群主', Colors.blue),
                                if (!isCreator &&
                                    !isOwner &&
                                    (int.tryParse(participant['role']
                                                    ?.toString() ??
                                                '') ??
                                            1) >=
                                        2)
                                  _roleBadge('管理员', Colors.orange),
                              ],
                            ),
                            subtitle: Row(
                              children: [
                                Text(online
                                    ? '会议中'
                                    : participant['isKicked'] == true
                                        ? '已被移出'
                                        : '已离开'),
                                const SizedBox(width: 10),
                                Icon(media.micOn ? Icons.mic : Icons.mic_off,
                                    size: 16,
                                    color: media.micOn
                                        ? Colors.green
                                        : Colors.grey),
                                const SizedBox(width: 6),
                                Icon(
                                    media.cameraOn
                                        ? Icons.videocam
                                        : Icons.videocam_off,
                                    size: 16,
                                    color: media.cameraOn
                                        ? Colors.green
                                        : Colors.grey),
                              ],
                            ),
                            trailing: canManageTarget
                                ? PopupMenuButton<String>(
                                    onSelected: (value) {
                                      switch (value) {
                                        case 'mic':
                                          _controlMedia(userId, micOn: false);
                                          break;
                                        case 'camera':
                                          _controlMedia(userId,
                                              cameraOn: false);
                                          break;
                                        case 'kick':
                                          _kick(userId);
                                          break;
                                      }
                                    },
                                    itemBuilder: (_) => [
                                      const PopupMenuItem(
                                          value: 'mic', child: Text('关闭麦克风')),
                                      const PopupMenuItem(
                                          value: 'camera',
                                          child: Text('关闭摄像头')),
                                      const PopupMenuDivider(),
                                      const PopupMenuItem(
                                          value: 'kick',
                                          child: Text('移出会议',
                                              style: TextStyle(
                                                  color: Colors.red))),
                                    ],
                                  )
                                : null,
                          );
                        },
                      ),
                    ),
                  ),
                  SafeArea(
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: SizedBox(
                        width: double.infinity,
                        child: ElevatedButton.icon(
                          onPressed: () => _leave(),
                          icon: const Icon(Icons.logout),
                          label: const Text('离开会议'),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
      ),
    );
  }

  Widget _statusPill(String text, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: color.withOpacity(0.16),
        border: Border.all(color: color.withOpacity(0.35)),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Text(text, style: TextStyle(color: color, fontSize: 12)),
    );
  }

  Widget _videoStage() {
    final activeUserId = _activeVideoUserId();
    if (activeUserId == null) {
      return SizedBox(
        height: 260,
        child: _videoPlaceholder('暂无成员分享摄像头画面'),
      );
    }

    final isMe = activeUserId == _myId;
    return SizedBox(
      height: 320,
      child: _videoTile(
        renderer: isMe ? _localRenderer : _remoteRenderers[activeUserId],
        label: isMe ? '我' : _participantName(activeUserId),
        cameraOn: true,
        mirror: isMe && _frontCamera,
      ),
    );
  }

  int? _activeVideoUserId() {
    final activeUserId = _activeCameraUserId;
    if (activeUserId != null) return activeUserId;
    final myId = _myId;
    if (_cameraOn && myId > 0) return myId;
    for (final entry in _mediaStates.entries) {
      if (entry.value.cameraOn) return entry.key;
    }
    return null;
  }

  Widget _videoTile({
    required RTCVideoRenderer? renderer,
    required String label,
    required bool cameraOn,
    required bool mirror,
  }) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(8),
      child: Container(
        color: Colors.black,
        child: Stack(
          fit: StackFit.expand,
          children: [
            if (cameraOn && renderer != null && renderer.srcObject != null)
              RTCVideoView(
                renderer,
                mirror: mirror,
                objectFit: RTCVideoViewObjectFit.RTCVideoViewObjectFitCover,
              )
            else
              _videoPlaceholder(label),
            Positioned(
              left: 8,
              top: 8,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
                decoration: BoxDecoration(
                  color: Colors.black.withOpacity(0.48),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Text(
                  label,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(color: Colors.white, fontSize: 11),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _videoPlaceholder(String text) {
    return Container(
      alignment: Alignment.center,
      color: const Color(0xFF1F2937),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.videocam_off, color: Colors.white60, size: 34),
          const SizedBox(height: 8),
          Text(text,
              style: const TextStyle(color: Colors.white70, fontSize: 12)),
        ],
      ),
    );
  }

  String _participantName(int userId) {
    final participant = _participantFor(userId);
    final nickname = participant?['nickname']?.toString() ?? '';
    if (nickname.isNotEmpty) return nickname;
    return '用户$userId';
  }

  Widget _roleBadge(String text, Color color) {
    return Container(
      margin: const EdgeInsets.only(left: 6),
      padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(3),
      ),
      child: Text(text, style: TextStyle(fontSize: 10, color: color)),
    );
  }
}

class _MeetingMediaState {
  final bool micOn;
  final bool cameraOn;

  const _MeetingMediaState({required this.micOn, required this.cameraOn});
}
