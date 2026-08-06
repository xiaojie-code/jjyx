import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:video_player/video_player.dart';

import '../../../core/constants/app_constants.dart';
import '../../../core/network/api_client.dart';
import '../../../core/network/api_endpoints.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/utils/toast.dart';
import '../../auth/providers/auth_provider.dart';

String _formatShopAmount(int value) {
  return value.toString().replaceAllMapped(
        RegExp(r'\B(?=(\d{3})+(?!\d))'),
        (match) => ',',
      );
}

enum _ShopPaymentMethod { silver, cash }

class ShopPage extends ConsumerStatefulWidget {
  const ShopPage({super.key});

  @override
  ConsumerState<ShopPage> createState() => _ShopPageState();
}

class _ShopPageState extends ConsumerState<ShopPage> {
  late final VideoPlayerController _controller;
  final _receiverNameCtrl = TextEditingController();
  final _receiverPhoneCtrl = TextEditingController();
  final _receiverAddressCtrl = TextEditingController();
  bool _hasError = false;
  bool _isMuted = true;
  bool _showControls = true;
  String _paymentQrcode = '';
  String _paymentPayeeName = '';
  _CagOffer _cagOffer = const _CagOffer();
  static const int _defaultSilverPrice = 1000;

  static const List<_ShopProduct> _products = [
    _ShopProduct(
      key: 'cag',
      title: 'CAG',
      subtitle: '银币专属兑换',
      imageName: '28c6042b-83b9-423f-89a3-8b5042532853.png',
      cashPrice: null,
      silverOnly: true,
    ),
    _ShopProduct(
      key: 'health-ring',
      title: '云芯智能健康指环',
      subtitle: '血压血氧心电、血脂尿酸、睡眠监测',
      imageName: 'd31a7373-c4e4-4a6a-9d09-c50f5c7fcab6.png',
      imageFit: BoxFit.contain,
      cashPrice: 925,
    ),
    _ShopProduct(
      key: 'health-watch',
      title: '云芯健康陪伴手表',
      subtitle: '血压心率监测、SOS 求助、防摔倒提醒',
      imageName: 'product-health-watch.png',
      cashPrice: 628,
    ),
    _ShopProduct(
      key: 'health-watch-2',
      title: '云芯健康陪伴手表二代',
      subtitle: '气泵测压、心电监测、AI 中医诊疗',
      imageName: 'product-health-watch-2.jpg',
      cashPrice: 1598,
    ),
    _ShopProduct(
      key: 'ai-glasses',
      title: '云芯ai智能眼镜',
      subtitle: '拍照录像录音、AI 识物、实时翻译',
      imageName: '0da22a71-4ed1-42b3-9037-51f839110739.png',
      cashPrice: 728,
    ),
    _ShopProduct(
      key: 'water-dispenser',
      title: '云芯智能饮水机',
      subtitle: 'RO 反渗透、即热即饮、五重过滤',
      imageName: 'wecom-temp-104741-4729fce3272ce5f72e4c37a95c51e0b4.jpg',
      cashPrice: 3150,
    ),
    _ShopProduct(
      key: 'sweeping-robot',
      title: '云芯扫地机器人 R10',
      subtitle: '激光导航、自动集尘、APP 划区清扫',
      imageName: 'wecom-temp-106614-d3636a8da16208935187051b9af7d1b0.jpg',
      cashPrice: 4050,
    ),
    _ShopProduct(
      key: 'ai-companion-robot',
      title: '云芯 AI 伴侣机器人',
      subtitle: '可定制专属脸模与声音，支持陪伴互动、日程提醒和情绪交流',
      imageName: 'a7246507-baef-40e4-88be-cdc79ccf5700.png',
      imageFit: BoxFit.contain,
      cashPrice: 61668,
    ),
    _ShopProduct(
      key: 'water-heater',
      title: '云芯即热式电热水器',
      subtitle: '即开即热、精准恒温、智能节能',
      imageName: 'wecom-temp-81610-3123efb8a6290ed8802926f63a996ab5.jpg',
      cashPrice: 7515,
    ),
    _ShopProduct(
      key: 'range-hood',
      title: '云芯抽油烟机',
      subtitle: '大吸力排烟、低噪运行、智能清洁',
      imageName: '3082d493-56e4-445e-8025-24748e08d55a.png',
      cashPrice: 4068,
    ),
    _ShopProduct(
      key: 'dishwasher-dryer',
      title: '云芯洗碗机-带烘干',
      subtitle: '强力洗净、热风烘干、除菌存储',
      imageName: '31f8b0f3-454e-4b00-9a4e-29b6dd93abdd.png',
      cashPrice: 6299,
    ),
    _ShopProduct(
      key: 'cooking-machine',
      title: '云芯智能炒菜机',
      subtitle: '智能菜谱、精准控温、自动翻炒，少油烟也能稳定出餐',
      imageName: 'wecom-temp-102952-7f383878d5d4ae179ab2335d5ebe12a1.jpg',
      cashPrice: 4500,
    ),
    _ShopProduct(
      key: 'air-conditioner',
      title: '云芯空调（上门安装）',
      subtitle: '快速制冷暖、静音节能、上门安装',
      imageName: '3ec9c07d-3382-4c4a-9944-c9d4f0789b48.jpg',
      cashPrice: 5788,
    ),
    _ShopProduct(
      key: 'three-wheel',
      title: '云芯三轮车',
      subtitle: '灵活出行、稳定承载、智能续航',
      imageName: 'slc-composite.png',
      imageFit: BoxFit.contain,
      cashPrice: 30000,
    ),
    _ShopProduct(
      key: 'fridge-605l',
      title: '云芯大屏对开门冰箱 605L',
      subtitle: 'AI 屏显食材、风冷无霜、双循环保鲜',
      imageName: 'wecom-temp-118430-281e0c3401f86df1e1c929e80d621e2b.jpg',
      cashPrice: 8089,
    ),
    _ShopProduct(
      key: 'tv-100',
      title: '云芯智慧大屏 100 寸',
      subtitle: '4K HDR、AI 影音、远场语音、全面屏',
      imageName: 'wecom-temp-66807-eeaeb548f43a250372d3c78260367bdf.jpg',
      cashPrice: 17098,
    ),
  ];

  @override
  void initState() {
    super.initState();
    _loadShopSupportInfo();
    _controller = VideoPlayerController.asset('video/product_intro.mp4')
      ..initialize().then((_) {
        if (!mounted) return;
        setState(() {});
        _controller
          ..setLooping(true)
          ..setVolume(0);
      }).catchError((_) {
        if (mounted) setState(() => _hasError = true);
      });
    _controller.addListener(() {
      if (mounted && _controller.value.isInitialized) setState(() {});
    });
  }

  @override
  void dispose() {
    _receiverNameCtrl.dispose();
    _receiverPhoneCtrl.dispose();
    _receiverAddressCtrl.dispose();
    _controller.dispose();
    super.dispose();
  }

  Future<void> _loadShopSupportInfo() async {
    final api = ref.read(apiClientProvider);
    try {
      final results = await Future.wait<Object?>([
        api.get<Map<String, dynamic>>(ApiEndpoints.shopPaymentInfo),
        api.get<Map<String, dynamic>>(ApiEndpoints.shopAddress),
        api.get<List<dynamic>>(ApiEndpoints.shopCatalog),
      ]);
      if (!mounted) return;
      final payment =
          results[0] as Map<String, dynamic>? ?? <String, dynamic>{};
      final address =
          results[1] as Map<String, dynamic>? ?? <String, dynamic>{};
      final catalog = results[2] as List<dynamic>? ?? const [];
      Map<String, dynamic>? cagData;
      for (final item in catalog) {
        if (item is Map && item['key']?.toString() == 'cag') {
          cagData = Map<String, dynamic>.from(item);
          break;
        }
      }
      setState(() {
        _paymentQrcode = payment['qrcode']?.toString() ?? '';
        _paymentPayeeName = payment['payeeName']?.toString() ?? '';
        _cagOffer = _CagOffer.fromJson(cagData);
        if (_receiverNameCtrl.text.trim().isEmpty) {
          _receiverNameCtrl.text = address['receiverName']?.toString() ?? '';
        }
        if (_receiverPhoneCtrl.text.trim().isEmpty) {
          _receiverPhoneCtrl.text = address['receiverPhone']?.toString() ?? '';
        }
        if (_receiverAddressCtrl.text.trim().isEmpty) {
          _receiverAddressCtrl.text =
              address['receiverAddress']?.toString() ?? '';
        }
      });
    } catch (_) {}
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
    if (imageName.startsWith('assets/')) {
      return imageName;
    }
    return 'assets/shangcheng/$imageName';
  }

  String _mediaUrl(String path) {
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    return '${AppConstants.apiBaseUrl}$path';
  }

  String? _validateAddress() {
    if (_receiverNameCtrl.text.trim().isEmpty) return '请填写收货人姓名';
    if (_receiverPhoneCtrl.text.trim().isEmpty) return '请填写收货人手机号';
    if (_receiverAddressCtrl.text.trim().isEmpty) return '请填写收货地址';
    return null;
  }

  Future<double> _loadCurrentSilver() async {
    final balance = await ref
        .read(apiClientProvider)
        .get<Map<String, dynamic>>(ApiEndpoints.currencyBalance);
    return (balance?['silver'] as num?)?.toDouble() ?? 0;
  }

  Future<bool> _showCashPaymentDialog(String totalText) async {
    if (_paymentQrcode.isEmpty) {
      Toast.warning(context, '管理员暂未配置收款码，请稍后再试');
      return false;
    }
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => Dialog(
        insetPadding: const EdgeInsets.symmetric(horizontal: 28, vertical: 24),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        child: Padding(
          padding: const EdgeInsets.fromLTRB(18, 18, 18, 16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                children: [
                  const Expanded(
                    child: Text(
                      '扫码付款',
                      style: TextStyle(
                        color: Color(0xFF101828),
                        fontSize: 18,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                  ),
                  IconButton(
                    onPressed: () => Navigator.of(ctx).pop(false),
                    icon: const Icon(Icons.close_rounded),
                    visualDensity: VisualDensity.compact,
                  ),
                ],
              ),
              const SizedBox(height: 10),
              Text(
                '应付金额：$totalText',
                textAlign: TextAlign.center,
                style: const TextStyle(
                  color: Color(0xFFFF4D24),
                  fontSize: 17,
                  fontWeight: FontWeight.w900,
                ),
              ),
              const SizedBox(height: 12),
              ClipRRect(
                borderRadius: BorderRadius.circular(10),
                child: Image.network(
                  _mediaUrl(_paymentQrcode),
                  height: 240,
                  fit: BoxFit.contain,
                  errorBuilder: (_, __, ___) => Container(
                    height: 220,
                    color: const Color(0xFFF3F7FB),
                    alignment: Alignment.center,
                    child: const Text('收款码加载失败'),
                  ),
                ),
              ),
              if (_paymentPayeeName.isNotEmpty) ...[
                const SizedBox(height: 8),
                Text(
                  '收款人：$_paymentPayeeName',
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    color: Color(0xFF667085),
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ],
              const SizedBox(height: 14),
              FilledButton(
                onPressed: () => Navigator.of(ctx).pop(true),
                style: FilledButton.styleFrom(
                  backgroundColor: const Color(0xFFFF4D24),
                  foregroundColor: Colors.white,
                  fixedSize: const Size.fromHeight(44),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(8),
                  ),
                ),
                child: const Text(
                  '我已付款，确认购买',
                  style: TextStyle(fontSize: 15, fontWeight: FontWeight.w900),
                ),
              ),
            ],
          ),
        ),
      ),
    );
    return confirmed == true;
  }

  Future<bool> _submitShopOrder({
    required _ShopProduct product,
    required int quantity,
    required _ShopPaymentMethod paymentMethod,
    required int silverTotal,
    required String totalText,
    String? walletAddress,
  }) async {
    if (product.key != 'cag') {
      final addressError = _validateAddress();
      if (addressError != null) {
        Toast.warning(context, addressError);
        return false;
      }
    }
    if (paymentMethod == _ShopPaymentMethod.silver) {
      try {
        final silver = await _loadCurrentSilver();
        if (!mounted) return false;
        if (silver < silverTotal) {
          Toast.warning(context, '银币不足，当前银币 ${silver.toStringAsFixed(0)}');
          return false;
        }
      } catch (e) {
        if (mounted) {
          Toast.error(context, apiErrorMessage(e, fallback: '银币余额校验失败'));
        }
        return false;
      }
    } else {
      final paid = await _showCashPaymentDialog(totalText);
      if (!paid) return false;
    }

    try {
      await ref.read(apiClientProvider).post(
        ApiEndpoints.shopOrders,
        data: {
          'productKey': product.key,
          'quantity': quantity,
          'paymentMethod':
              paymentMethod == _ShopPaymentMethod.silver ? 'silver' : 'cash',
          'receiverName': _receiverNameCtrl.text.trim(),
          'receiverPhone': _receiverPhoneCtrl.text.trim(),
          'receiverAddress': _receiverAddressCtrl.text.trim(),
          if (walletAddress != null) 'walletAddress': walletAddress.trim(),
        },
      );
      await ref.read(authProvider.notifier).loadProfile();
      if (!mounted) return true;
      Toast.success(
        context,
        paymentMethod == _ShopPaymentMethod.silver
            ? '兑换订单已提交，等待管理员审核'
            : '购买订单已提交，等待管理员审核',
      );
      return true;
    } catch (e) {
      if (mounted) {
        Toast.error(context, apiErrorMessage(e, fallback: '订单提交失败'));
      }
      return false;
    }
  }

  Future<void> _showOrderDialog(_ShopProduct product) async {
    if (product.key == 'cag') {
      await _showCagExchangeDialog(product);
      return;
    }
    final imageAsset = product.imageName == null
        ? null
        : _productImageAsset(product.imageName!);
    var quantity = 1;
    var paymentMethod = _ShopPaymentMethod.cash;
    var submitting = false;

    await showDialog<void>(
      context: context,
      builder: (dialogContext) => StatefulBuilder(
        builder: (innerContext, setDialogState) {
          final silverTotal = _defaultSilverPrice * quantity;
          final cashTotal =
              product.cashPrice == null ? null : product.cashPrice! * quantity;
          final isCashSelected = paymentMethod == _ShopPaymentMethod.cash;
          final canSubmit = !isCashSelected || cashTotal != null;
          final totalText =
              cashTotal == null ? '价格待定' : '¥${_formatShopAmount(cashTotal)}';
          final cashTotalText =
              cashTotal == null ? '价格待定' : '¥${_formatShopAmount(cashTotal)}';

          return Dialog(
            insetPadding:
                const EdgeInsets.symmetric(horizontal: 24, vertical: 24),
            shape:
                RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxHeight: 690),
              child: SingleChildScrollView(
                padding: const EdgeInsets.fromLTRB(18, 18, 18, 16),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            product.title,
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              color: Color(0xFF101828),
                              fontSize: 18,
                              fontWeight: FontWeight.w900,
                              height: 1.25,
                            ),
                          ),
                        ),
                        IconButton(
                          onPressed: submitting
                              ? null
                              : () => Navigator.of(dialogContext).pop(),
                          icon: const Icon(Icons.close_rounded),
                          tooltip: '关闭',
                          visualDensity: VisualDensity.compact,
                        ),
                      ],
                    ),
                    const SizedBox(height: 14),
                    ClipRRect(
                      borderRadius: BorderRadius.circular(10),
                      child: SizedBox(
                        height: 210,
                        child: _buildOrderImage(
                          imageAsset,
                          fit: product.imageFit,
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),
                    const Text(
                      '收货信息',
                      style: TextStyle(
                        color: Color(0xFF344054),
                        fontSize: 15,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    const SizedBox(height: 10),
                    TextField(
                      controller: _receiverNameCtrl,
                      textInputAction: TextInputAction.next,
                      decoration: _shopInputDecoration(
                        label: '收货人',
                        hint: '请输入收货人姓名',
                        icon: Icons.person_outline_rounded,
                      ),
                    ),
                    const SizedBox(height: 10),
                    TextField(
                      controller: _receiverPhoneCtrl,
                      keyboardType: TextInputType.phone,
                      textInputAction: TextInputAction.next,
                      decoration: _shopInputDecoration(
                        label: '手机号',
                        hint: '请输入收货人手机号',
                        icon: Icons.phone_iphone_rounded,
                      ),
                    ),
                    const SizedBox(height: 10),
                    TextField(
                      controller: _receiverAddressCtrl,
                      minLines: 2,
                      maxLines: 3,
                      textInputAction: TextInputAction.done,
                      decoration: _shopInputDecoration(
                        label: '收货地址',
                        hint: '请输入省市区及详细地址',
                        icon: Icons.location_on_outlined,
                      ),
                    ),
                    const SizedBox(height: 16),
                    const Text(
                      '支付方式',
                      style: TextStyle(
                        color: Color(0xFF344054),
                        fontSize: 15,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    const SizedBox(height: 10),
                    Row(
                      children: [
                        Expanded(
                          child: _buildPaymentOption(
                            selected: false,
                            enabled: false,
                            icon: Icons.toll_rounded,
                            title: '银币兑换',
                            price: '暂未开放',
                            onTap: () {},
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: _buildPaymentOption(
                            selected: isCashSelected,
                            icon: Icons.payments_rounded,
                            title: '直接购买',
                            price: product.cashPrice == null
                                ? '价格待定'
                                : '¥${_formatShopAmount(product.cashPrice!)}/件',
                            onTap: () => setDialogState(
                              () => paymentMethod = _ShopPaymentMethod.cash,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    Row(
                      children: [
                        const Text(
                          '数量',
                          style: TextStyle(
                            color: Color(0xFF344054),
                            fontSize: 15,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                        const Spacer(),
                        _buildQuantityStepper(
                          quantity: quantity,
                          onDecrease: quantity <= 1
                              ? null
                              : () => setDialogState(() => quantity -= 1),
                          onIncrease: () => setDialogState(() => quantity += 1),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 14,
                        vertical: 12,
                      ),
                      decoration: BoxDecoration(
                        color: const Color(0xFFFFF7F3),
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: const Color(0xFFFFD6C2)),
                      ),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          _buildOrderTotalLine(
                            label: '现金合计',
                            value: cashTotalText,
                            active: isCashSelected,
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 14),
                    SizedBox(
                      height: 46,
                      child: FilledButton(
                        onPressed: canSubmit && !submitting
                            ? () async {
                                setDialogState(() => submitting = true);
                                final success = await _submitShopOrder(
                                  product: product,
                                  quantity: quantity,
                                  paymentMethod: paymentMethod,
                                  silverTotal: silverTotal,
                                  totalText: totalText,
                                );
                                if (success && mounted) {
                                  if (dialogContext.mounted) {
                                    Navigator.of(dialogContext).pop();
                                  }
                                  return;
                                }
                                if (mounted && innerContext.mounted) {
                                  setDialogState(() => submitting = false);
                                }
                              }
                            : null,
                        style: FilledButton.styleFrom(
                          backgroundColor: const Color(0xFFFF4D24),
                          disabledBackgroundColor: const Color(0xFFE4E7EC),
                          foregroundColor: Colors.white,
                          disabledForegroundColor: const Color(0xFF98A2B3),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(8),
                          ),
                        ),
                        child: Text(
                          submitting ? '提交中...' : '确认购买',
                          style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w900,
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          );
        },
      ),
    );
  }

  Future<void> _showCagExchangeDialog(_ShopProduct product) async {
    final offer = _cagOffer;
    if (!offer.available) {
      Toast.warning(
        context,
        offer.unavailableReason.isEmpty
            ? 'CAG兑换当前不可用'
            : offer.unavailableReason,
      );
      return;
    }
    final imageAsset = product.imageName == null
        ? null
        : _productImageAsset(product.imageName!);
    final maxQuantity = offer.remainingLimit == null
        ? 99
        : (offer.remainingLimit! < 99 ? offer.remainingLimit! : 99);
    final walletAddressController = TextEditingController();
    var quantity = 1;
    var submitting = false;
    await showDialog<void>(
      context: context,
      builder: (dialogContext) => StatefulBuilder(
        builder: (innerContext, setDialogState) {
          final silverTotal = offer.silverPrice * quantity;
          return Dialog(
            insetPadding:
                const EdgeInsets.symmetric(horizontal: 24, vertical: 24),
            shape:
                RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            child: SingleChildScrollView(
              padding: const EdgeInsets.fromLTRB(18, 18, 18, 16),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          product.title,
                          style: const TextStyle(
                            color: Color(0xFF101828),
                            fontSize: 18,
                            fontWeight: FontWeight.w900,
                          ),
                        ),
                      ),
                      IconButton(
                        onPressed: submitting
                            ? null
                            : () => Navigator.of(dialogContext).pop(),
                        icon: const Icon(Icons.close_rounded),
                        tooltip: '关闭',
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  ClipRRect(
                    borderRadius: BorderRadius.circular(8),
                    child: SizedBox(
                      height: 210,
                      child:
                          _buildOrderImage(imageAsset, fit: product.imageFit),
                    ),
                  ),
                  const SizedBox(height: 16),
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 14,
                      vertical: 12,
                    ),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF4F7FB),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: const Color(0xFFD7DFEA)),
                    ),
                    child: Column(
                      children: [
                        Row(
                          children: [
                            const Icon(
                              Icons.toll_rounded,
                              color: Color(0xFF667085),
                            ),
                            const SizedBox(width: 10),
                            const Expanded(
                              child: Text(
                                '银币兑换',
                                style: TextStyle(
                                  color: Color(0xFF344054),
                                  fontWeight: FontWeight.w800,
                                ),
                              ),
                            ),
                            Text(
                              '1 CAG = ${_formatShopAmount(offer.silverPrice)} 银币',
                              style: const TextStyle(
                                color: Color(0xFFFF4D24),
                                fontWeight: FontWeight.w900,
                              ),
                            ),
                          ],
                        ),
                        if (offer.periodText.isNotEmpty) ...[
                          const SizedBox(height: 8),
                          Align(
                            alignment: Alignment.centerLeft,
                            child: Text(
                              offer.periodText,
                              style: const TextStyle(
                                color: Color(0xFF667085),
                                fontSize: 12,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              '兑换数量',
                              style: TextStyle(
                                color: Color(0xFF344054),
                                fontWeight: FontWeight.w800,
                              ),
                            ),
                            if (offer.remainingLimit != null)
                              Text(
                                '当前还可兑换 ${offer.remainingLimit} 个',
                                style: const TextStyle(
                                  color: Color(0xFF98A2B3),
                                  fontSize: 12,
                                ),
                              ),
                          ],
                        ),
                      ),
                      IconButton(
                        onPressed: !submitting && quantity > 1
                            ? () => setDialogState(() => quantity--)
                            : null,
                        icon: const Icon(Icons.remove_rounded),
                        tooltip: '减少数量',
                      ),
                      SizedBox(
                        width: 44,
                        child: Text(
                          '$quantity',
                          textAlign: TextAlign.center,
                          style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w900,
                          ),
                        ),
                      ),
                      IconButton(
                        onPressed: !submitting && quantity < maxQuantity
                            ? () => setDialogState(() => quantity++)
                            : null,
                        icon: const Icon(Icons.add_rounded),
                        tooltip: '增加数量',
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: walletAddressController,
                    enabled: !submitting,
                    maxLength: 255,
                    autocorrect: false,
                    enableSuggestions: false,
                    textInputAction: TextInputAction.done,
                    decoration: InputDecoration(
                      labelText: '钱包地址（必填）',
                      hintText: '请输入接收 CAG 的钱包地址',
                      prefixIcon:
                          const Icon(Icons.account_balance_wallet_outlined),
                      counterText: '',
                      filled: true,
                      fillColor: const Color(0xFFF8FAFC),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(8),
                      ),
                    ),
                  ),
                  const Divider(height: 24),
                  Row(
                    children: [
                      const Expanded(
                        child: Text(
                          '银币合计',
                          style: TextStyle(
                            color: Color(0xFF344054),
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                      ),
                      Text(
                        '${_formatShopAmount(silverTotal)} 银币',
                        style: const TextStyle(
                          color: Color(0xFFFF4D24),
                          fontSize: 18,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 14),
                  FilledButton(
                    onPressed: submitting
                        ? null
                        : () async {
                            final walletAddress =
                                walletAddressController.text.trim();
                            if (walletAddress.isEmpty) {
                              Toast.warning(innerContext, '请填写钱包地址');
                              return;
                            }
                            setDialogState(() => submitting = true);
                            final success = await _submitShopOrder(
                              product: product,
                              quantity: quantity,
                              paymentMethod: _ShopPaymentMethod.silver,
                              silverTotal: silverTotal,
                              totalText: '${_formatShopAmount(silverTotal)} 银币',
                              walletAddress: walletAddress,
                            );
                            if (success) {
                              if (dialogContext.mounted) {
                                Navigator.of(dialogContext).pop();
                              }
                              await _loadShopSupportInfo();
                              return;
                            }
                            if (innerContext.mounted) {
                              setDialogState(() => submitting = false);
                            }
                          },
                    style: FilledButton.styleFrom(
                      backgroundColor: const Color(0xFFFF4D24),
                      foregroundColor: Colors.white,
                      fixedSize: const Size.fromHeight(46),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(8),
                      ),
                    ),
                    child: submitting
                        ? const SizedBox(
                            width: 20,
                            height: 20,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              color: Colors.white,
                            ),
                          )
                        : const Text(
                            '确认兑换',
                            style: TextStyle(fontWeight: FontWeight.w900),
                          ),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
    walletAddressController.dispose();
  }

  Widget _buildOrderImage(String? asset, {BoxFit fit = BoxFit.cover}) {
    if (asset == null) {
      return const ColoredBox(
        color: Color(0xFFF3F7FB),
        child: Center(
          child: Icon(
            Icons.image_not_supported_outlined,
            color: Color(0xFF98A2B3),
            size: 42,
          ),
        ),
      );
    }

    return ColoredBox(
      color: const Color(0xFFFBFBFC),
      child: Image.asset(
        asset,
        fit: fit,
        alignment: Alignment.center,
        width: double.infinity,
        height: double.infinity,
        errorBuilder: (context, error, stackTrace) => const Center(
          child: Icon(
            Icons.image_not_supported_outlined,
            color: Color(0xFF98A2B3),
            size: 42,
          ),
        ),
      ),
    );
  }

  InputDecoration _shopInputDecoration({
    required String label,
    required String hint,
    required IconData icon,
  }) {
    return InputDecoration(
      labelText: label,
      hintText: hint,
      prefixIcon: Icon(icon, size: 20),
      isDense: true,
      filled: true,
      fillColor: const Color(0xFFF8FAFC),
      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(10),
        borderSide: const BorderSide(color: Color(0xFFE4E7EC)),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(10),
        borderSide: const BorderSide(color: Color(0xFFE4E7EC)),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(10),
        borderSide: const BorderSide(color: Color(0xFFFF9B7A), width: 1.4),
      ),
    );
  }

  Widget _buildOrderTotalLine({
    required String label,
    required String value,
    required bool active,
  }) {
    return Row(
      children: [
        Text(
          label,
          style: TextStyle(
            color: active ? const Color(0xFFFF4D24) : const Color(0xFF667085),
            fontSize: 14,
            fontWeight: FontWeight.w800,
          ),
        ),
        const Spacer(),
        Flexible(
          child: Text(
            value,
            textAlign: TextAlign.right,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(
              color: active ? const Color(0xFFFF4D24) : const Color(0xFF344054),
              fontSize: active ? 18 : 15,
              fontWeight: FontWeight.w900,
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildPaymentOption({
    required bool selected,
    required IconData icon,
    required String title,
    required String price,
    required VoidCallback onTap,
    bool enabled = true,
  }) {
    final color = !enabled
        ? const Color(0xFF98A2B3)
        : selected
            ? const Color(0xFFFF4D24)
            : const Color(0xFF344054);
    return Material(
      color: !enabled
          ? const Color(0xFFF2F4F7)
          : selected
              ? const Color(0xFFFFF4ED)
              : const Color(0xFFF8FAFC),
      borderRadius: BorderRadius.circular(10),
      child: InkWell(
        borderRadius: BorderRadius.circular(10),
        onTap: enabled ? onTap : null,
        child: Container(
          padding: const EdgeInsets.all(10),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(10),
            border: Border.all(
              color: !enabled
                  ? const Color(0xFFE4E7EC)
                  : selected
                      ? const Color(0xFFFF9B7A)
                      : const Color(0xFFE4E7EC),
              width: selected ? 1.5 : 1,
            ),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Icon(icon, size: 18, color: color),
                  const SizedBox(width: 6),
                  Expanded(
                    child: Text(
                      title,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        color: color,
                        fontSize: 13,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Text(
                price,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  color: !enabled
                      ? const Color(0xFF98A2B3)
                      : selected
                          ? const Color(0xFFFF4D24)
                          : const Color(0xFF667085),
                  fontSize: 12,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildQuantityStepper({
    required int quantity,
    required VoidCallback? onDecrease,
    required VoidCallback onIncrease,
  }) {
    return Container(
      height: 36,
      decoration: BoxDecoration(
        color: const Color(0xFFF8FAFC),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: const Color(0xFFE4E7EC)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          _QuantityButton(
            icon: Icons.remove_rounded,
            onTap: onDecrease,
          ),
          SizedBox(
            width: 38,
            child: Center(
              child: Text(
                '$quantity',
                style: const TextStyle(
                  color: Color(0xFF344054),
                  fontSize: 15,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ),
          ),
          _QuantityButton(
            icon: Icons.add_rounded,
            onTap: onIncrease,
          ),
        ],
      ),
    );
  }

  String _formatDuration(Duration duration) {
    final minutes = duration.inMinutes.remainder(60).toString();
    final seconds = duration.inSeconds.remainder(60).toString().padLeft(2, '0');
    return '$minutes:$seconds';
  }

  @override
  Widget build(BuildContext context) {
    final textScale = MediaQuery.textScalerOf(context).scale(1);
    final scaleExtra = (textScale - 1.0).clamp(0.0, 0.45).toDouble();
    final screenWidth = MediaQuery.sizeOf(context).width;
    final cardWidth = (screenWidth - 32.0 - 12.0) / 2;
    final imageHeight = cardWidth > 0 ? cardWidth / 1.08 : 160.0;
    final regularCardExtent = imageHeight + 206.0 + scaleExtra * 72.0;

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
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
              sliver: SliverGrid(
                delegate: SliverChildBuilderDelegate(
                  (context, index) => _buildProductCard(_products[index]),
                  childCount: _products.length,
                ),
                gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: 2,
                  crossAxisSpacing: 12,
                  mainAxisSpacing: 12,
                  mainAxisExtent: regularCardExtent,
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
      imageAsset: product.imageName == null
          ? null
          : _productImageAsset(product.imageName!),
      imageFit: product.imageFit,
      onTap: () => _showOrderDialog(product),
    );
  }
}

class _QuantityButton extends StatelessWidget {
  const _QuantityButton({
    required this.icon,
    required this.onTap,
  });

  final IconData icon;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final enabled = onTap != null;
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(8),
      child: SizedBox(
        width: 36,
        height: 36,
        child: Icon(
          icon,
          color: enabled ? const Color(0xFFFF4D24) : const Color(0xFFC6CCD6),
          size: 18,
        ),
      ),
    );
  }
}

class _ProductCard extends StatefulWidget {
  const _ProductCard({
    required this.product,
    required this.onTap,
    this.imageAsset,
    this.imageFit = BoxFit.cover,
  });

  final _ShopProduct product;
  final String? imageAsset;
  final BoxFit imageFit;
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
                  child: _buildProductImageArea(),
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
                        const SizedBox(height: 6),
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
                        const SizedBox(height: 8),
                        if (widget.product.cashPrice != null)
                          Text(
                            '¥${_formatShopAmount(widget.product.cashPrice!)}',
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              color: Color(0xFFFF4D24),
                              fontSize: 15,
                              fontWeight: FontWeight.w900,
                            ),
                          ),
                        const Spacer(),
                        const SizedBox(height: 8),
                        SizedBox(
                          width: double.infinity,
                          height: 34,
                          child: DecoratedBox(
                            decoration: BoxDecoration(
                              color: const Color(0xFFFF4D24),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Center(
                              child: Text(
                                widget.product.silverOnly ? '兑换' : '订购',
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontSize: 14,
                                  fontWeight: FontWeight.w800,
                                ),
                              ),
                            ),
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

  Widget _buildProductImageArea() {
    return _buildProductImage(widget.imageAsset);
  }

  Widget _buildProductImage(String? asset) {
    if (asset == null) {
      return Ink(
        decoration: const BoxDecoration(
          color: Color(0xFFF3F7FB),
        ),
        child: const Center(
          child: Icon(
            Icons.smart_toy_outlined,
            color: Color(0xFF2F80ED),
            size: 54,
          ),
        ),
      );
    }

    return Ink(
      color: const Color(0xFFFBFBFC),
      child: Image.asset(
        asset,
        fit: widget.imageFit,
        alignment: Alignment.center,
        width: double.infinity,
        height: double.infinity,
        errorBuilder: (context, error, stackTrace) => const Center(
          child: Icon(
            Icons.image_not_supported_outlined,
            color: Color(0xFF98A2B3),
            size: 34,
          ),
        ),
      ),
    );
  }
}

class _ShopProduct {
  const _ShopProduct({
    required this.key,
    required this.title,
    required this.subtitle,
    this.imageName,
    this.imageFit = BoxFit.cover,
    this.cashPrice,
    this.silverOnly = false,
  });

  final String key;
  final String title;
  final String subtitle;
  final String? imageName;
  final BoxFit imageFit;
  final int? cashPrice;
  final bool silverOnly;
}

class _CagOffer {
  const _CagOffer({
    this.silverPrice = 0,
    this.available = false,
    this.unavailableReason = 'CAG兑换当前未开启',
    this.startAt = '',
    this.endAt = '',
    this.userLimit = 0,
    this.exchangedQuantity = 0,
    this.remainingLimit,
  });

  factory _CagOffer.fromJson(Map<String, dynamic>? json) {
    if (json == null) return const _CagOffer();
    return _CagOffer(
      silverPrice: (json['silverPrice'] as num?)?.toInt() ?? 0,
      available: json['available'] == true,
      unavailableReason: json['unavailableReason']?.toString() ?? '',
      startAt: json['exchangeStartAt']?.toString() ?? '',
      endAt: json['exchangeEndAt']?.toString() ?? '',
      userLimit: (json['userLimit'] as num?)?.toInt() ?? 0,
      exchangedQuantity: (json['exchangedQuantity'] as num?)?.toInt() ?? 0,
      remainingLimit: json['remainingLimit'] == null
          ? null
          : (json['remainingLimit'] as num).toInt(),
    );
  }

  final int silverPrice;
  final bool available;
  final String unavailableReason;
  final String startAt;
  final String endAt;
  final int userLimit;
  final int exchangedQuantity;
  final int? remainingLimit;

  String get periodText {
    if (startAt.isNotEmpty && endAt.isNotEmpty) {
      return '兑换时间：$startAt 至 $endAt';
    }
    if (startAt.isNotEmpty) return '兑换开始时间：$startAt';
    if (endAt.isNotEmpty) return '兑换截止时间：$endAt';
    return '';
  }
}
