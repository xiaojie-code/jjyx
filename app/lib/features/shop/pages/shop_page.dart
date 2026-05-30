import 'package:flutter/material.dart';
import 'package:video_player/video_player.dart';

/// 商城页面 - 视频播放器 + 暂未开放提示
class ShopPage extends StatefulWidget {
  const ShopPage({super.key});

  @override
  State<ShopPage> createState() => _ShopPageState();
}

class _ShopPageState extends State<ShopPage> {
  late VideoPlayerController _controller;
  bool _hasError = false;
  bool _isMuted = false;
  bool _showControls = true;

  @override
  void initState() {
    super.initState();
    _controller = VideoPlayerController.asset('video/video(9).mp4')
      ..initialize().then((_) {
        if (mounted) {
          setState(() {});
          _controller.setLooping(true);
          _controller.play();
          _autoHideControls();
        }
      }).catchError((e) {
        if (mounted) setState(() => _hasError = true);
      });
    _controller.addListener(() {
      if (mounted) setState(() {});
    });
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _autoHideControls() {
    Future.delayed(const Duration(seconds: 4), () {
      if (mounted && _controller.value.isPlaying) {
        setState(() => _showControls = false);
      }
    });
  }

  void _onVideoTap() {
    setState(() => _showControls = true);
    _autoHideControls();
  }

  void _togglePlay() {
    if (_controller.value.isPlaying) {
      _controller.pause();
    } else {
      _controller.play();
      _autoHideControls();
    }
    setState(() {});
  }

  void _toggleMute() {
    setState(() {
      _isMuted = !_isMuted;
      _controller.setVolume(_isMuted ? 0 : 1);
    });
  }

  void _replay() {
    _controller.seekTo(Duration.zero);
    _controller.play();
    _autoHideControls();
  }

  String _fmt(Duration d) {
    final m = d.inMinutes.remainder(60).toString().padLeft(2, '0');
    final s = d.inSeconds.remainder(60).toString().padLeft(2, '0');
    return '$m:$s';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('商城')),
      body: Column(
        children: [
          // 视频区域
          _buildVideoPlayer(),
          // 提示文字
          const SizedBox(height: 20),
          const Text(
            '测试中，暂未开放',
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: 18, color: Colors.grey, fontWeight: FontWeight.w500),
          ),
        ],
      ),
    );
  }

  Widget _buildVideoPlayer() {
    if (_hasError) {
      return Container(
        height: 220, color: Colors.black,
        child: const Center(child: Icon(Icons.videocam_off, size: 64, color: Colors.grey)),
      );
    }
    if (!_controller.value.isInitialized) {
      return Container(
        height: 220, color: Colors.black,
        child: const Center(child: CircularProgressIndicator(color: Colors.white)),
      );
    }

    return AspectRatio(
      aspectRatio: _controller.value.aspectRatio,
      child: Stack(
        children: [
          // 视频层
          VideoPlayer(_controller),
          // 透明点击层（覆盖在视频上方接收点击）
          Positioned.fill(
            child: GestureDetector(
              behavior: HitTestBehavior.opaque,
              onTap: _onVideoTap,
              child: const SizedBox.expand(),
            ),
          ),
          // 中间播放/暂停按钮
          if (_showControls || !_controller.value.isPlaying)
            Center(
              child: GestureDetector(
                onTap: _togglePlay,
                child: Container(
                  decoration: BoxDecoration(
                    color: Colors.black.withOpacity(0.5),
                    shape: BoxShape.circle,
                  ),
                  padding: const EdgeInsets.all(14),
                  child: Icon(
                    _controller.value.isPlaying ? Icons.pause : Icons.play_arrow,
                    color: Colors.white, size: 36,
                  ),
                ),
              ),
            ),
          // 底部控制栏
          if (_showControls)
            Positioned(
              left: 0, right: 0, bottom: 0,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                    colors: [Colors.transparent, Colors.black.withOpacity(0.7)],
                  ),
                ),
                child: Row(
                  children: [
                    Text(_fmt(_controller.value.position),
                        style: const TextStyle(color: Colors.white, fontSize: 12)),
                    Expanded(
                      child: SliderTheme(
                        data: SliderTheme.of(context).copyWith(
                          trackHeight: 2,
                          thumbShape: const RoundSliderThumbShape(enabledThumbRadius: 5),
                          activeTrackColor: Colors.white,
                          inactiveTrackColor: Colors.white38,
                          thumbColor: Colors.white,
                        ),
                        child: Slider(
                          value: _controller.value.position.inMilliseconds.toDouble().clamp(
                              0, _controller.value.duration.inMilliseconds.toDouble()),
                          max: _controller.value.duration.inMilliseconds.toDouble(),
                          onChanged: (v) => _controller.seekTo(Duration(milliseconds: v.toInt())),
                        ),
                      ),
                    ),
                    Text(_fmt(_controller.value.duration),
                        style: const TextStyle(color: Colors.white, fontSize: 12)),
                    const SizedBox(width: 6),
                    GestureDetector(
                      onTap: _replay,
                      child: const Icon(Icons.replay, color: Colors.white, size: 20),
                    ),
                    const SizedBox(width: 10),
                    GestureDetector(
                      onTap: _toggleMute,
                      child: Icon(_isMuted ? Icons.volume_off : Icons.volume_up,
                          color: Colors.white, size: 20),
                    ),
                    const SizedBox(width: 4),
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }
}
