import 'package:flutter/material.dart';
import 'package:video_player/video_player.dart';

import '../../../core/theme/app_theme.dart';
import '../../../core/utils/toast.dart';

class ShopPage extends StatefulWidget {
  const ShopPage({super.key});

  @override
  State<ShopPage> createState() => _ShopPageState();
}

class _ShopPageState extends State<ShopPage> {
  late final VideoPlayerController _controller;
  bool _hasError = false;
  bool _isMuted = false;
  bool _showControls = true;

  static const List<_ShopProduct> _products = [
    _ShopProduct(
      title: '云芯智能电饭煲 4L',
      subtitle: '蒸煮一体、24h 预约、IH 电磁加热',
      price: '¥899',
      imageName: 'wecom-temp-102952-7f383878d5d4ae179ab2335d5ebe12a1.jpg',
    ),
    _ShopProduct(
      title: '云芯智能饮水机',
      subtitle: 'RO 反渗透、即热即饮、五重过滤',
      price: '¥2,199',
      imageName: 'wecom-temp-104741-4729fce3272ce5f72e4c37a95c51e0b4.jpg',
    ),
    _ShopProduct(
      title: '云芯扫地机器人 R10',
      subtitle: '激光导航、自动集尘、APP 划区清扫',
      price: '¥2,599',
      imageName: 'wecom-temp-106614-d3636a8da16208935187051b9af7d1b0.jpg',
    ),
    _ShopProduct(
      title: '云芯大屏对开门冰箱 605L',
      subtitle: 'AI 屏显食材、风冷无霜、双循环保鲜',
      price: '¥6,999',
      imageName: 'wecom-temp-118430-281e0c3401f86df1e1c929e80d621e2b.jpg',
    ),
    _ShopProduct(
      title: '云芯智慧大屏 65 英寸',
      subtitle: '4K HDR、AI 影音、远场语音、全面屏',
      price: '¥3,599',
      imageName: 'wecom-temp-66807-eeaeb548f43a250372d3c78260367bdf.jpg',
    ),
    _ShopProduct(
      title: '云芯即热式电热水器',
      subtitle: '即开即热、精准恒温、智能节能',
      price: '¥1,599',
      imageName: 'wecom-temp-81610-3123efb8a6290ed8802926f63a996ab5.jpg',
    ),
  ];

  @override
  void initState() {
    super.initState();
    _controller = VideoPlayerController.asset('video/video(9).mp4')
      ..initialize().then((_) {
        if (!mounted) return;
        setState(() {});
        _controller
          ..setLooping(true)
          ..play();
        _autoHideControls();
      }).catchError((_) {
        if (mounted) setState(() => _hasError = true);
      });
    _controller.addListener(() {
      if (mounted && _controller.value.isInitialized) setState(() {});
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
    setState(() => _showControls = !_showControls);
    if (_showControls) _autoHideControls();
  }

  void _togglePlay() {
    if (_controller.value.isPlaying) {
      _controller.pause();
    } else {
      _controller.play();
      _autoHideControls();
    }
    setState(() => _showControls = true);
  }

  void _toggleMute() {
    setState(() {
      _isMuted = !_isMuted;
      _controller.setVolume(_isMuted ? 0 : 1);
      _showControls = true;
    });
    _autoHideControls();
  }

  void _replay() {
    _controller
      ..seekTo(Duration.zero)
      ..play();
    setState(() => _showControls = true);
    _autoHideControls();
  }

  String _productImageAsset(String imageName) {
    return 'assets/shangcheng/$imageName';
  }

  String _formatDuration(Duration duration) {
    final minutes = duration.inMinutes.remainder(60).toString();
    final seconds = duration.inSeconds.remainder(60).toString().padLeft(2, '0');
    return '$minutes:$seconds';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF7F9FB),
      appBar: AppBar(
        title: const Text('商城'),
        backgroundColor: AppTheme.primaryColor,
        foregroundColor: Colors.white,
        surfaceTintColor: AppTheme.primaryColor,
      ),
      body: SafeArea(
        child: CustomScrollView(
          slivers: [
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(16, 18, 16, 16),
              sliver: SliverToBoxAdapter(child: _buildVideoSection()),
            ),
            const SliverToBoxAdapter(
              child: Padding(
                padding: EdgeInsets.fromLTRB(16, 4, 16, 10),
                child: Text(
                  '精选商品',
                  style: TextStyle(
                    color: Color(0xFF101828),
                    fontSize: 21,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ),
            ),
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
              sliver: SliverGrid(
                delegate: SliverChildBuilderDelegate(
                  (context, index) => _buildProductCard(_products[index]),
                  childCount: _products.length,
                ),
                gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: 2,
                  crossAxisSpacing: 12,
                  mainAxisSpacing: 12,
                  childAspectRatio: 0.56,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildVideoSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        const Text(
          '产品介绍',
          style: TextStyle(
            color: Color(0xFF101828),
            fontSize: 25,
            fontWeight: FontWeight.w900,
            height: 1.2,
          ),
        ),
        const SizedBox(height: 8),
        const Text(
          '两分钟 带你走进沧恒云芯',
          style: TextStyle(
            color: Color(0xFF667085),
            fontSize: 14,
            fontWeight: FontWeight.w500,
          ),
        ),
        const SizedBox(height: 18),
        Container(
          decoration: BoxDecoration(
            color: Colors.black,
            borderRadius: BorderRadius.circular(8),
            boxShadow: const [
              BoxShadow(
                color: Color(0x1A101828),
                blurRadius: 22,
                offset: Offset(0, 12),
              ),
            ],
          ),
          clipBehavior: Clip.antiAlias,
          child: _buildVideoPlayer(),
        ),
      ],
    );
  }

  Widget _buildVideoPlayer() {
    if (_hasError) {
      return const AspectRatio(
        aspectRatio: 16 / 9,
        child: Center(
          child: Icon(Icons.videocam_off, size: 52, color: Colors.white54),
        ),
      );
    }
    if (!_controller.value.isInitialized) {
      return const AspectRatio(
        aspectRatio: 16 / 9,
        child: Center(child: CircularProgressIndicator(color: Colors.white)),
      );
    }

    return AspectRatio(
      aspectRatio: 16 / 9,
      child: Stack(
        fit: StackFit.expand,
        children: [
          FittedBox(
            fit: BoxFit.cover,
            child: SizedBox(
              width: _controller.value.size.width,
              height: _controller.value.size.height,
              child: VideoPlayer(_controller),
            ),
          ),
          GestureDetector(
            behavior: HitTestBehavior.opaque,
            onTap: _onVideoTap,
            child: const SizedBox.expand(),
          ),
          Positioned.fill(
            child: IgnorePointer(
              child: DecoratedBox(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                    colors: [
                      Colors.black.withOpacity(0.08),
                      Colors.transparent,
                      Colors.black.withOpacity(0.48),
                    ],
                  ),
                ),
              ),
            ),
          ),
          if (_showControls || !_controller.value.isPlaying)
            Center(
              child: IconButton.filled(
                onPressed: _togglePlay,
                style: IconButton.styleFrom(
                  backgroundColor: Colors.black.withOpacity(0.48),
                  foregroundColor: Colors.white,
                  fixedSize: const Size(58, 58),
                ),
                icon: Icon(
                  _controller.value.isPlaying ? Icons.pause : Icons.play_arrow,
                  size: 34,
                ),
              ),
            ),
          if (_showControls) _buildVideoControls(),
        ],
      ),
    );
  }

  Widget _buildVideoControls() {
    final position = _controller.value.position;
    final duration = _controller.value.duration;
    final maxMs = duration.inMilliseconds <= 0 ? 1 : duration.inMilliseconds;
    final valueMs = position.inMilliseconds.clamp(0, maxMs).toDouble();

    return Positioned(
      left: 10,
      right: 10,
      bottom: 8,
      child: Column(
        children: [
          SliderTheme(
            data: SliderTheme.of(context).copyWith(
              trackHeight: 3,
              activeTrackColor: Colors.white,
              inactiveTrackColor: Colors.white38,
              thumbColor: Colors.white,
              overlayColor: Colors.white24,
              thumbShape: const RoundSliderThumbShape(enabledThumbRadius: 5),
              overlayShape: const RoundSliderOverlayShape(overlayRadius: 12),
            ),
            child: Slider(
              value: valueMs,
              min: 0,
              max: maxMs.toDouble(),
              onChanged: (value) {
                _controller.seekTo(Duration(milliseconds: value.toInt()));
              },
            ),
          ),
          Row(
            children: [
              IconButton(
                onPressed: _togglePlay,
                icon: Icon(
                  _controller.value.isPlaying ? Icons.pause : Icons.play_arrow,
                  color: Colors.white,
                ),
                visualDensity: VisualDensity.compact,
              ),
              Text(
                '${_formatDuration(position)} / ${_formatDuration(duration)}',
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                ),
              ),
              const Spacer(),
              IconButton(
                onPressed: _replay,
                icon: const Icon(Icons.replay, color: Colors.white),
                visualDensity: VisualDensity.compact,
              ),
              IconButton(
                onPressed: _toggleMute,
                icon: Icon(
                  _isMuted ? Icons.volume_off : Icons.volume_up,
                  color: Colors.white,
                ),
                visualDensity: VisualDensity.compact,
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildProductCard(_ShopProduct product) {
    return _ProductCard(
      product: product,
      imageAsset: _productImageAsset(product.imageName),
      onTap: () => Toast.info(context, '测试中，敬请期待'),
    );
  }
}

class _ProductCard extends StatefulWidget {
  const _ProductCard({
    required this.product,
    required this.imageAsset,
    required this.onTap,
  });

  final _ShopProduct product;
  final String imageAsset;
  final VoidCallback onTap;

  @override
  State<_ProductCard> createState() => _ProductCardState();
}

class _ProductCardState extends State<_ProductCard> {
  bool _pressed = false;

  void _setPressed(bool value) {
    if (_pressed == value) return;
    setState(() => _pressed = value);
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedScale(
      scale: _pressed ? 0.975 : 1,
      duration: const Duration(milliseconds: 90),
      curve: Curves.easeOut,
      child: Material(
        color: Colors.white,
        borderRadius: BorderRadius.circular(8),
        clipBehavior: Clip.antiAlias,
        child: Ink(
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(8),
            border: Border.all(color: const Color(0xFFE6E9EE)),
            boxShadow: const [
              BoxShadow(
                color: Color(0x08000000),
                blurRadius: 10,
                offset: Offset(0, 4),
              ),
            ],
          ),
          child: InkWell(
            borderRadius: BorderRadius.circular(8),
            splashColor: const Color(0xFFFF4D24).withOpacity(0.08),
            highlightColor: const Color(0xFFFF4D24).withOpacity(0.04),
            onTap: widget.onTap,
            onTapDown: (_) => _setPressed(true),
            onTapUp: (_) => _setPressed(false),
            onTapCancel: () => _setPressed(false),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                AspectRatio(
                  aspectRatio: 1.08,
                  child: Ink(
                    color: const Color(0xFFFBFBFC),
                    child: Image.asset(
                      widget.imageAsset,
                      fit: BoxFit.cover,
                      width: double.infinity,
                      height: double.infinity,
                      errorBuilder: (context, error, stackTrace) =>
                          const Center(
                        child: Icon(
                          Icons.image_not_supported_outlined,
                          color: Color(0xFF98A2B3),
                          size: 34,
                        ),
                      ),
                    ),
                  ),
                ),
                Expanded(
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(12, 11, 12, 12),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          widget.product.title,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            color: Color(0xFF101828),
                            fontSize: 14,
                            fontWeight: FontWeight.w800,
                            height: 1.25,
                          ),
                        ),
                        const SizedBox(height: 7),
                        Text(
                          widget.product.subtitle,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            color: Color(0xFF7A8494),
                            fontSize: 12,
                            height: 1.35,
                          ),
                        ),
                        const SizedBox(height: 9),
                        FittedBox(
                          fit: BoxFit.scaleDown,
                          alignment: Alignment.centerLeft,
                          child: Row(
                            crossAxisAlignment: CrossAxisAlignment.end,
                            children: [
                              Text(
                                widget.product.price,
                                style: const TextStyle(
                                  color: Color(0xFFFF4D24),
                                  fontSize: 20,
                                  fontWeight: FontWeight.w900,
                                  height: 1,
                                ),
                              ),
                              const SizedBox(width: 3),
                              const Text(
                                '起',
                                style: TextStyle(
                                  color: Color(0xFFFF4D24),
                                  fontSize: 11,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _ShopProduct {
  const _ShopProduct({
    required this.title,
    required this.subtitle,
    required this.price,
    required this.imageName,
  });

  final String title;
  final String subtitle;
  final String price;
  final String imageName;
}
