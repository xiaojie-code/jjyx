import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';

import '../../../core/constants/app_constants.dart';
import '../../../core/network/api_client.dart';
import '../../../core/network/api_endpoints.dart';
import '../../../core/utils/toast.dart';
import '../../auth/providers/auth_provider.dart';

class SynthesizePage extends ConsumerStatefulWidget {
  const SynthesizePage({super.key});

  @override
  ConsumerState<SynthesizePage> createState() => _SynthesizePageState();
}

class _SynthesizePageState extends ConsumerState<SynthesizePage> {
  static const bool _showTradeFeatures = false;
  List<Map<String, dynamic>> _configs = [];
  final List<Map<String, dynamic>> _goldTrades = [];
  final List<Map<String, dynamic>> _copperTrades = [];
  Map<String, dynamic>? _goldOverview;
  Map<String, dynamic>? _copperOverview;
  bool _loading = true;
  bool _goldBusy = false;
  int? _synthesizing;
  int _silverQuantity = 1;
  bool _showCopperSquare = false;

  @override
  void initState() {
    super.initState();
    Future.microtask(() async {
      ref.read(authProvider.notifier).loadProfile();
      await _loadAll();
    });
  }

  Future<void> _loadAll() async {
    if (mounted) setState(() => _loading = true);
    try {
      final api = ref.read(apiClientProvider);
      final configs = await api.get<List<dynamic>>(
        ApiEndpoints.currencySynthesisConfigs,
      );
      if (!mounted) return;
      setState(() {
        _configs =
            (configs ?? []).map((e) => Map<String, dynamic>.from(e)).toList();
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() => _loading = false);
      Toast.error(context, apiErrorMessage(e, fallback: '合成页面加载失败'));
    }
  }

  Map<String, dynamic>? _configFor(String targetCurrency) {
    for (final config in _configs) {
      final target = (config['targetCurrency'] ?? '').toString();
      if (target == targetCurrency ||
          (target == 'reward' && targetCurrency == 'copper')) {
        return config;
      }
    }
    return null;
  }

  Future<void> _synthesize(int configId, int quantity) async {
    setState(() => _synthesizing = configId);
    try {
      await ref.read(apiClientProvider).post(
        ApiEndpoints.currencySynthesize,
        data: {'configId': configId, 'quantity': quantity},
      );
      await ref.read(authProvider.notifier).loadProfile();
      if (mounted) Toast.success(context, '合成成功');
    } catch (e) {
      if (mounted) Toast.error(context, apiErrorMessage(e, fallback: '合成失败'));
    } finally {
      if (mounted) setState(() => _synthesizing = null);
    }
  }

  double _numberValue(dynamic value) {
    if (value is num) return value.toDouble();
    return double.tryParse(value?.toString() ?? '') ?? 0;
  }

  int _intValue(dynamic value) {
    if (value is int) return value;
    if (value is num) return value.toInt();
    return int.tryParse(value?.toString() ?? '') ?? 0;
  }

  bool _isCurrentUserActivated() {
    final auth = ref.read(authProvider);
    return auth.user?.isActivated ?? auth.profile?.user.isActivated ?? false;
  }

  bool _ensureCurrencyTradeAllowed() {
    if (_isCurrentUserActivated()) return true;
    Toast.error(context, '请先激活后再进行金币、铜币交易');
    return false;
  }

  String _formatNumber(double value) {
    if (value % 1 == 0) return value.toInt().toString();
    return value.toStringAsFixed(2);
  }

  String _formatMoney(double value) {
    return value.toStringAsFixed(2);
  }

  String _currencyName(String type) {
    switch (type) {
      case 'gold':
        return '金币';
      case 'silver':
        return '银币';
      case 'copper':
      case 'reward':
        return '铜币';
      default:
        return type;
    }
  }

  String _mediaUrl(String url) {
    if (url.startsWith('http')) return url;
    if (url.isEmpty) return url;
    return '${AppConstants.apiBaseUrl}$url';
  }

  bool _validHundred(int quantity) => quantity >= 100 && quantity % 100 == 0;
  double _goldTradeFee(int quantity) =>
      quantity <= 0 ? 0 : double.parse((quantity * 0.05).toStringAsFixed(2));
  double _goldTradeLock(int quantity) =>
      quantity <= 0 ? 100 : quantity + _goldTradeFee(quantity) + 100;
  double _copperTradeLock(int quantity) => quantity <= 0 ? 0 : quantity * 2;

  Future<String?> _uploadQrcode(Uint8List bytes, String filename) async {
    final formData = FormData.fromMap({
      'image': MultipartFile.fromBytes(bytes, filename: filename),
    });
    final result =
        await ref.read(apiClientProvider).upload<Map<String, dynamic>>(
              ApiEndpoints.goldTradeQrcode,
              formData: formData,
            );
    return result?['url']?.toString();
  }

  Future<void> _showWithdrawGoldDialog() async {
    final quantityCtrl = TextEditingController(text: '100');
    bool submitting = false;
    final currentGold = _numberValue(_goldOverview?['gold'] ??
        ref.read(authProvider).profile?.currency?.gold);
    final rate = _numberValue(_goldOverview?['exchangeRate']);

    await showDialog<void>(
      context: context,
      builder: (dialogContext) {
        return StatefulBuilder(
          builder: (context, setDialogState) {
            final quantity = int.tryParse(quantityCtrl.text.trim()) ?? 0;
            final cash = (quantity * (rate <= 0 ? 1 : rate)).toDouble();
            return AlertDialog(
              title: const Text('金币提现'),
              content: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('当前金币：${_formatNumber(currentGold)}'),
                  const SizedBox(height: 6),
                  Text('兑换比例：1金币 = ${_formatNumber(rate <= 0 ? 1 : rate)}元'),
                  const SizedBox(height: 14),
                  TextField(
                    controller: quantityCtrl,
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(
                      labelText: '提现金币数量',
                      helperText: '只能填写100或100的整数倍',
                    ),
                    onChanged: (_) => setDialogState(() {}),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    '预计转入提现额度：${_formatMoney(cash)}元',
                    style: const TextStyle(fontWeight: FontWeight.w700),
                  ),
                ],
              ),
              actions: [
                TextButton(
                  onPressed: submitting ? null : () => Navigator.pop(context),
                  child: const Text('取消'),
                ),
                ElevatedButton(
                  onPressed: submitting
                      ? null
                      : () async {
                          if (!_validHundred(quantity)) {
                            Toast.error(context, '提现金币数量必须是100的整数倍');
                            return;
                          }
                          if (quantity > currentGold) {
                            Toast.error(context, '金币余额不足');
                            return;
                          }
                          setDialogState(() => submitting = true);
                          var closed = false;
                          try {
                            await ref.read(apiClientProvider).post(
                              ApiEndpoints.goldWithdrawTransfer,
                              data: {'quantity': quantity},
                            );
                            await ref.read(authProvider.notifier).loadProfile();
                            await _loadAll();
                            if (!mounted || !dialogContext.mounted) return;
                            Navigator.pop(dialogContext);
                            closed = true;
                            Toast.success(this.context, '已转入提现模块');
                          } catch (e) {
                            if (mounted) {
                              Toast.error(this.context,
                                  apiErrorMessage(e, fallback: '提现转入失败'));
                            }
                          } finally {
                            if (mounted && !closed) {
                              setDialogState(() => submitting = false);
                            }
                          }
                        },
                  child: submitting
                      ? const SizedBox(
                          width: 16,
                          height: 16,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Text('确认'),
                ),
              ],
            );
          },
        );
      },
    );
  }

  Future<void> _showSellTradeDialog({required bool isCopper}) async {
    if (!isCopper && !_ensureCurrencyTradeAllowed()) return;
    final currencyName = isCopper ? '铜币' : '金币';
    final currentBalance = isCopper
        ? _numberValue(_copperOverview?['copper'] ??
            ref.read(authProvider).profile?.currency?.copper)
        : _numberValue(_goldOverview?['gold'] ??
            ref.read(authProvider).profile?.currency?.gold);
    final rate = isCopper
        ? 1.0
        : (_numberValue(_goldOverview?['exchangeRate']) <= 0
            ? 1.0
            : _numberValue(_goldOverview?['exchangeRate']));
    final quantityCtrl = TextEditingController(text: isCopper ? '1' : '100');
    final priceCtrl = TextEditingController(
      text: isCopper ? '' : _formatMoney(100 * rate),
    );
    final nameCtrl = TextEditingController();
    String qrcodeUrl = '';
    Uint8List? previewBytes;
    bool uploading = false;
    bool submitting = false;
    bool priceTouched = false;

    await showDialog<void>(
      context: context,
      builder: (dialogContext) {
        return StatefulBuilder(
          builder: (context, setDialogState) {
            final quantity = int.tryParse(quantityCtrl.text.trim()) ?? 0;
            final fee = isCopper ? 0.0 : _goldTradeFee(quantity);
            final deposit = isCopper ? quantity.toDouble() : 100.0;
            final lock = isCopper
                ? _copperTradeLock(quantity)
                : _goldTradeLock(quantity);
            final validQuantity =
                isCopper ? quantity > 0 : _validHundred(quantity);
            final lockEnough = validQuantity && lock <= currentBalance;
            final formula = isCopper
                ? '出售${_formatNumber(quantity.toDouble())} + 担保${_formatNumber(deposit)}'
                : '出售${_formatNumber(quantity.toDouble())} + 手续费${_formatNumber(fee)} + 担保${_formatNumber(deposit)}';
            return AlertDialog(
              title: Text('出售$currencyName'),
              content: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('当前$currencyName：${_formatNumber(currentBalance)}'),
                    const SizedBox(height: 8),
                    TextField(
                      controller: quantityCtrl,
                      keyboardType: TextInputType.number,
                      decoration: InputDecoration(
                        labelText: '出售数量',
                        helperText: isCopper ? '可填写任意正整数' : '只能填写100或100的整数倍',
                      ),
                      onChanged: (value) {
                        if (!isCopper && !priceTouched) {
                          final nextQuantity = int.tryParse(value.trim()) ?? 0;
                          priceCtrl.text = nextQuantity <= 0
                              ? ''
                              : _formatMoney(nextQuantity * rate);
                        }
                        setDialogState(() {});
                      },
                    ),
                    const SizedBox(height: 8),
                    TextField(
                      controller: priceCtrl,
                      keyboardType:
                          const TextInputType.numberWithOptions(decimal: true),
                      decoration: const InputDecoration(labelText: '出售总价（元）'),
                      onChanged: (_) => priceTouched = true,
                    ),
                    const SizedBox(height: 8),
                    TextField(
                      controller: nameCtrl,
                      decoration: const InputDecoration(labelText: '支付宝实名姓名'),
                    ),
                    const SizedBox(height: 12),
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: lockEnough
                            ? const Color(0xFFF8FAFC)
                            : const Color(0xFFFFF1F2),
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(
                          color: lockEnough
                              ? const Color(0xFFE6E9EE)
                              : const Color(0xFFFDA4AF),
                        ),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              const Expanded(
                                child: Text(
                                  '发布需锁定',
                                  style: TextStyle(
                                    color: Color(0xFF667085),
                                    fontWeight: FontWeight.w700,
                                  ),
                                ),
                              ),
                              Text(
                                '${_formatNumber(lock)}$currencyName',
                                style: TextStyle(
                                  color: lockEnough
                                      ? const Color(0xFF101828)
                                      : const Color(0xFFE5484D),
                                  fontWeight: FontWeight.w800,
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 6),
                          Text(
                            formula,
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              color: Color(0xFF667085),
                              fontSize: 12,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 12),
                    OutlinedButton.icon(
                      onPressed: uploading
                          ? null
                          : () async {
                              try {
                                final picked = await ImagePicker().pickImage(
                                  source: ImageSource.gallery,
                                  maxWidth: 1200,
                                  imageQuality: 86,
                                );
                                if (picked == null) return;
                                final bytes = await picked.readAsBytes();
                                setDialogState(() {
                                  uploading = true;
                                  previewBytes = bytes;
                                });
                                final url = await _uploadQrcode(
                                  bytes,
                                  picked.name.isEmpty
                                      ? 'alipay-qrcode.jpg'
                                      : picked.name,
                                );
                                setDialogState(() {
                                  qrcodeUrl = url ?? '';
                                  uploading = false;
                                });
                              } catch (e) {
                                setDialogState(() => uploading = false);
                                if (mounted) {
                                  Toast.error(this.context,
                                      apiErrorMessage(e, fallback: '收款码上传失败'));
                                }
                              }
                            },
                      icon: uploading
                          ? const SizedBox(
                              width: 16,
                              height: 16,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            )
                          : const Icon(Icons.photo_library_outlined),
                      label: Text(qrcodeUrl.isEmpty ? '上传支付宝收款码' : '已上传收款码'),
                    ),
                    if (previewBytes != null) ...[
                      const SizedBox(height: 10),
                      ClipRRect(
                        borderRadius: BorderRadius.circular(8),
                        child: Image.memory(
                          previewBytes!,
                          height: 120,
                          width: 120,
                          fit: BoxFit.cover,
                        ),
                      ),
                    ],
                  ],
                ),
              ),
              actions: [
                TextButton(
                  onPressed: submitting ? null : () => Navigator.pop(context),
                  child: const Text('取消'),
                ),
                ElevatedButton(
                  onPressed: submitting
                      ? null
                      : () async {
                          final price =
                              double.tryParse(priceCtrl.text.trim()) ?? 0;
                          if (isCopper
                              ? quantity <= 0
                              : !_validHundred(quantity)) {
                            Toast.error(
                              context,
                              isCopper ? '出售数量必须是大于0的整数' : '出售数量必须是100的整数倍',
                            );
                            return;
                          }
                          if (lock > currentBalance) {
                            Toast.error(context, '$currencyName余额不足');
                            return;
                          }
                          if (price <= 0) {
                            Toast.error(context, '请填写正确的出售价格');
                            return;
                          }
                          if (nameCtrl.text.trim().isEmpty) {
                            Toast.error(context, '请填写支付宝实名姓名');
                            return;
                          }
                          if (qrcodeUrl.isEmpty) {
                            Toast.error(context, '请上传支付宝收款码');
                            return;
                          }
                          setDialogState(() => submitting = true);
                          var closed = false;
                          try {
                            await ref.read(apiClientProvider).post(
                              isCopper
                                  ? ApiEndpoints.copperTradeCreate
                                  : ApiEndpoints.goldTradeCreate,
                              data: {
                                'quantity': quantity,
                                'totalPrice': price,
                                'alipayName': nameCtrl.text.trim(),
                                'alipayQrcode': qrcodeUrl,
                              },
                            );
                            await ref.read(authProvider.notifier).loadProfile();
                            await _loadAll();
                            if (!mounted || !dialogContext.mounted) return;
                            Navigator.pop(dialogContext);
                            closed = true;
                            Toast.success(this.context, '出售订单已发布');
                          } catch (e) {
                            if (mounted) {
                              Toast.error(this.context,
                                  apiErrorMessage(e, fallback: '发布出售失败'));
                            }
                          } finally {
                            if (mounted && !closed) {
                              setDialogState(() => submitting = false);
                            }
                          }
                        },
                  child: submitting
                      ? const SizedBox(
                          width: 16,
                          height: 16,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Text('发布'),
                ),
              ],
            );
          },
        );
      },
    );
  }

  Future<void> _openTradeDetail(
    Map<String, dynamic> item, {
    required bool isCopper,
  }) async {
    if (!isCopper && !_ensureCurrencyTradeAllowed()) return;
    final id = _intValue(item['id']);
    if (id <= 0) return;
    final currencyName = isCopper ? '铜币' : '金币';
    Map<String, dynamic> detail = item;
    try {
      final result =
          await ref.read(apiClientProvider).get<Map<String, dynamic>>(
                isCopper
                    ? ApiEndpoints.copperTradeDetail(id)
                    : ApiEndpoints.goldTradeDetail(id),
              );
      if (result != null) detail = Map<String, dynamic>.from(result);
    } catch (_) {}
    if (!mounted) return;

    await showDialog<void>(
      context: context,
      builder: (dialogContext) {
        bool submitting = false;
        return StatefulBuilder(
          builder: (context, setDialogState) {
            final status = _intValue(detail['status']);
            final isSeller = detail['isSeller'] == true;
            final canBuy = detail['canBuy'] == true;
            final qrcode = detail['alipayQrcode']?.toString() ?? '';
            return AlertDialog(
              title: Text('$currencyName出售详情'),
              content: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _detailLine('出售数量',
                        '${_formatNumber(_numberValue(detail['quantity']))}$currencyName'),
                    _detailLine('出售总价',
                        '¥${_formatMoney(_numberValue(detail['totalPrice']))}'),
                    _detailLine('单价',
                        '¥${_formatMoney(_numberValue(detail['unitPrice']))}/$currencyName'),
                    _detailLine(
                        '卖家',
                        (detail['sellerNickname'] ??
                                detail['sellerAccount'] ??
                                '')
                            .toString()),
                    _detailLine('状态', (detail['statusText'] ?? '').toString()),
                    if (qrcode.isNotEmpty &&
                        (canBuy || detail['isBuyer'] == true)) ...[
                      const SizedBox(height: 12),
                      const Text(
                        '支付宝收款码',
                        style: TextStyle(fontWeight: FontWeight.w700),
                      ),
                      const SizedBox(height: 8),
                      Center(
                        child: ClipRRect(
                          borderRadius: BorderRadius.circular(8),
                          child: Image.network(
                            _mediaUrl(qrcode),
                            width: 180,
                            height: 180,
                            fit: BoxFit.cover,
                            errorBuilder: (_, __, ___) => const Text('收款码加载失败'),
                          ),
                        ),
                      ),
                    ],
                    if (status == 1 && isSeller) ...[
                      const SizedBox(height: 10),
                      const Text(
                        '买家已确认支付，请确认现金到账后再放币。',
                        style: TextStyle(
                          color: Color(0xFFE5484D),
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ],
                    if (status == 1 && detail['isBuyer'] == true) ...[
                      const SizedBox(height: 10),
                      const Text(
                        '你已确认付款，卖家确认到账后会转入你的账户。',
                        style: TextStyle(
                          color: Color(0xFFE5484D),
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ],
                  ],
                ),
              ),
              actions: [
                if (isSeller && status == 0)
                  TextButton(
                    onPressed: submitting
                        ? null
                        : () => _submitTradeAction(
                              setDialogState,
                              () => submitting = true,
                              () => submitting = false,
                              isCopper
                                  ? ApiEndpoints.copperTradeCancel(id)
                                  : ApiEndpoints.goldTradeCancel(id),
                              '已取消出售',
                              dialogContext,
                            ),
                    child: const Text('取消出售'),
                  ),
                TextButton(
                  onPressed: submitting ? null : () => Navigator.pop(context),
                  child: const Text('关闭'),
                ),
                if (canBuy)
                  ElevatedButton(
                    onPressed: submitting
                        ? null
                        : () => _submitTradeAction(
                              setDialogState,
                              () => submitting = true,
                              () => submitting = false,
                              isCopper
                                  ? ApiEndpoints.copperTradeConfirmPaid(id)
                                  : ApiEndpoints.goldTradeConfirmPaid(id),
                              '已确认支付，等待卖家放币',
                              dialogContext,
                            ),
                    child: const Text('我已扫码付款'),
                  ),
                if (isSeller && status == 1)
                  ElevatedButton(
                    onPressed: submitting
                        ? null
                        : () => _submitTradeAction(
                              setDialogState,
                              () => submitting = true,
                              () => submitting = false,
                              isCopper
                                  ? ApiEndpoints.copperTradeConfirmReceived(id)
                                  : ApiEndpoints.goldTradeConfirmReceived(id),
                              '已确认到账，$currencyName已转给买家',
                              dialogContext,
                            ),
                    child: const Text('确认到账并放币'),
                  ),
              ],
            );
          },
        );
      },
    );
  }

  Future<void> _submitTradeAction(
    StateSetter setDialogState,
    VoidCallback markSubmitting,
    VoidCallback clearSubmitting,
    String endpoint,
    String successText,
    BuildContext dialogContext,
  ) async {
    setDialogState(markSubmitting);
    var closed = false;
    try {
      await ref.read(apiClientProvider).post(endpoint);
      await ref.read(authProvider.notifier).loadProfile();
      await _loadAll();
      if (!mounted || !dialogContext.mounted) return;
      Navigator.pop(dialogContext);
      closed = true;
      Toast.success(context, successText);
    } catch (e) {
      if (mounted) {
        Toast.error(context, apiErrorMessage(e, fallback: '操作失败'));
      }
    } finally {
      if (mounted && !closed) setDialogState(clearSubmitting);
    }
  }

  Widget _detailLine(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 7),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 78,
            child: Text(
              label,
              style: const TextStyle(color: Color(0xFF667085)),
            ),
          ),
          Expanded(
            child: Text(
              value.isEmpty ? '-' : value,
              style: const TextStyle(fontWeight: FontWeight.w700),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildGoldCard() {
    final currentGold = _numberValue(_goldOverview?['gold'] ??
        ref.watch(authProvider).profile?.currency?.gold);
    final totalEarned = _numberValue(_goldOverview?['totalGoldEarned']);
    final rate = _numberValue(_goldOverview?['exchangeRate']);
    final safeRate = (rate <= 0 ? 1 : rate).toDouble();

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: const Color(0xFFE6E9EE)),
      ),
      child: Row(
        children: [
          Container(
            width: 42,
            height: 42,
            decoration: const BoxDecoration(
              color: Color(0xFFFFF4D6),
              shape: BoxShape.circle,
            ),
            child: const Icon(
              Icons.monetization_on_rounded,
              color: Color(0xFFF59E0B),
              size: 23,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  '金币',
                  style: TextStyle(
                    color: Color(0xFF101828),
                    fontSize: 16,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(height: 6),
                SizedBox(
                  width: double.infinity,
                  child: FittedBox(
                    fit: BoxFit.scaleDown,
                    alignment: Alignment.centerLeft,
                    child: Text(
                      '余额 ${_formatNumber(currentGold)}，比例 1金币=${_formatNumber(safeRate)}元',
                      maxLines: 1,
                      softWrap: false,
                      style: const TextStyle(
                        color: Color(0xFF667085),
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  '原始累计获得 ${_formatNumber(totalEarned)} 金币',
                  style: const TextStyle(
                    color: Color(0xFF98A2B3),
                    fontSize: 12,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 12),
          SizedBox(
            width: 88,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                SizedBox(
                  height: 38,
                  child: ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      padding: EdgeInsets.zero,
                      minimumSize: const Size(88, 38),
                      tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                    ),
                    onPressed: _goldBusy
                        ? null
                        : () async {
                            if (!_ensureCurrencyTradeAllowed()) return;
                            setState(() => _goldBusy = true);
                            await _showSellTradeDialog(isCopper: false);
                            if (mounted) setState(() => _goldBusy = false);
                          },
                    child: const FittedBox(child: Text('出售')),
                  ),
                ),
                const SizedBox(height: 8),
                SizedBox(
                  height: 38,
                  child: OutlinedButton(
                    style: OutlinedButton.styleFrom(
                      padding: EdgeInsets.zero,
                      minimumSize: const Size(88, 38),
                      tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                    ),
                    onPressed: _goldBusy
                        ? null
                        : () async {
                            setState(() => _goldBusy = true);
                            await _showWithdrawGoldDialog();
                            if (mounted) setState(() => _goldBusy = false);
                          },
                    child: const FittedBox(child: Text('提现')),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCopperCard() {
    final currentCopper = _numberValue(_copperOverview?['copper'] ??
        ref.watch(authProvider).profile?.currency?.copper);

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: const Color(0xFFE6E9EE)),
      ),
      child: Row(
        children: [
          Container(
            width: 42,
            height: 42,
            decoration: const BoxDecoration(
              color: Color(0xFFFFE9D5),
              shape: BoxShape.circle,
            ),
            child: const Icon(
              Icons.paid_rounded,
              color: Color(0xFFC65D16),
              size: 23,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  '铜币',
                  style: TextStyle(
                    color: Color(0xFF101828),
                    fontSize: 16,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  '余额 ${_formatNumber(currentCopper)}',
                  style: const TextStyle(
                    color: Color(0xFF667085),
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 4),
                const Text(
                  '出售无手续费，担保铜币与出售数量相同',
                  style: TextStyle(
                    color: Color(0xFF98A2B3),
                    fontSize: 12,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 12),
          SizedBox(
            width: 88,
            height: 38,
            child: ElevatedButton(
              style: ElevatedButton.styleFrom(
                padding: EdgeInsets.zero,
                minimumSize: const Size(88, 38),
                tapTargetSize: MaterialTapTargetSize.shrinkWrap,
              ),
              onPressed: _goldBusy
                  ? null
                  : () async {
                      setState(() => _goldBusy = true);
                      await _showSellTradeDialog(isCopper: true);
                      if (mounted) setState(() => _goldBusy = false);
                    },
              child: const FittedBox(child: Text('出售')),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDisabledSynthesisCard({
    required String title,
    required IconData icon,
    required Color color,
  }) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: const Color(0xFFE6E9EE)),
      ),
      child: Row(
        children: [
          Container(
            width: 42,
            height: 42,
            decoration: BoxDecoration(
              color: color.withOpacity(0.12),
              shape: BoxShape.circle,
            ),
            child: Icon(icon, color: color, size: 23),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              title,
              style: const TextStyle(
                color: Color(0xFF101828),
                fontSize: 16,
                fontWeight: FontWeight.w800,
              ),
            ),
          ),
          ElevatedButton(
            onPressed: null,
            style: ElevatedButton.styleFrom(
              disabledBackgroundColor: const Color(0xFFE4E7EC),
              disabledForegroundColor: const Color(0xFF98A2B3),
              minimumSize: const Size(90, 38),
            ),
            child: Text(title),
          ),
        ],
      ),
    );
  }

  Widget _buildEnabledSynthesisCard({
    required String title,
    required IconData icon,
    required Color color,
    required Map<String, dynamic> config,
    required int quantity,
    required double availablePoints,
    required ValueChanged<int> onQuantityChanged,
  }) {
    final id = int.tryParse(config['id']?.toString() ?? '') ?? 0;
    final consume = _numberValue(config['consumePoints']);
    final target = (config['targetCurrency'] ?? '').toString();
    final targetAmount = _numberValue(config['targetAmount']);
    final totalConsume = consume * quantity;
    final hasEnoughPoints = availablePoints >= totalConsume;
    final isSubmitting = _synthesizing == id;
    final canSubmit =
        id > 0 && totalConsume > 0 && hasEnoughPoints && !isSubmitting;

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: const Color(0xFFE6E9EE)),
      ),
      child: Row(
        children: [
          Container(
            width: 42,
            height: 42,
            decoration: BoxDecoration(
              color: color.withOpacity(0.12),
              shape: BoxShape.circle,
            ),
            child: Icon(icon, color: color, size: 23),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    color: Color(0xFF101828),
                    fontSize: 16,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  '${_formatNumber(consume)}积分 = ${_formatNumber(targetAmount)}${_currencyName(target)}',
                  style: const TextStyle(
                    color: Color(0xFF667085),
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 8),
                _buildQuantityStepper(
                  quantity: quantity,
                  onDecrease: quantity <= 1
                      ? null
                      : () => onQuantityChanged(quantity - 1),
                  onIncrease: () => onQuantityChanged(quantity + 1),
                ),
              ],
            ),
          ),
          const SizedBox(width: 12),
          ElevatedButton(
            onPressed: canSubmit ? () => _synthesize(id, quantity) : null,
            style: ElevatedButton.styleFrom(
              minimumSize: const Size(90, 38),
            ),
            child: isSubmitting
                ? const SizedBox(
                    width: 16,
                    height: 16,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Text('合成银币'),
          ),
        ],
      ),
    );
  }

  Widget _buildQuantityStepper({
    required int quantity,
    required VoidCallback? onDecrease,
    required VoidCallback onIncrease,
  }) {
    return Container(
      height: 34,
      decoration: BoxDecoration(
        color: const Color(0xFFF8FAFC),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: const Color(0xFFE4E7EC)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          _QuantityButton(icon: Icons.remove_rounded, onTap: onDecrease),
          SizedBox(
            width: 42,
            child: Center(
              child: Text(
                '$quantity',
                style: const TextStyle(
                  color: Color(0xFF344054),
                  fontSize: 14,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ),
          ),
          _QuantityButton(icon: Icons.add_rounded, onTap: onIncrease),
        ],
      ),
    );
  }

  Widget _buildGoldTradeSquare() {
    final trades = _showCopperSquare ? _copperTrades : _goldTrades;
    final currencyName = _showCopperSquare ? '铜币' : '金币';
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SizedBox(height: 8),
        Row(
          children: [
            Expanded(
              child: Row(
                children: [
                  Expanded(
                    child: _TradeSquareTab(
                      title: '金币出售广场',
                      active: !_showCopperSquare,
                      onTap: () => setState(() => _showCopperSquare = false),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: _TradeSquareTab(
                      title: '铜币出售广场',
                      active: _showCopperSquare,
                      onTap: () => setState(() => _showCopperSquare = true),
                    ),
                  ),
                ],
              ),
            ),
            IconButton(
              onPressed: _loadAll,
              icon: const Icon(Icons.refresh_rounded),
            ),
          ],
        ),
        if (trades.isEmpty)
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(vertical: 28),
            alignment: Alignment.center,
            child: Text(
              '暂无$currencyName出售订单',
              style: const TextStyle(color: Color(0xFF98A2B3)),
            ),
          )
        else
          ...trades.map((item) => _buildGoldTradeItem(
                item,
                isCopper: _showCopperSquare,
              )),
      ],
    );
  }

  Widget _buildGoldTradeItem(
    Map<String, dynamic> item, {
    required bool isCopper,
  }) {
    final currencyName = isCopper ? '铜币' : '金币';
    final quantity = _numberValue(item['quantity']);
    final totalPrice = _numberValue(item['totalPrice']);
    final unitPrice = _numberValue(item['unitPrice']);
    final statusText = (item['statusText'] ?? '').toString();
    final seller =
        (item['sellerNickname'] ?? item['sellerAccount'] ?? '').toString();
    final isMine = item['isSeller'] == true;
    final pending = _intValue(item['status']) == 1 && isMine;

    return InkWell(
      onTap: () => _openTradeDetail(item, isCopper: isCopper),
      borderRadius: BorderRadius.circular(10),
      child: Container(
        margin: const EdgeInsets.only(bottom: 10),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: pending ? const Color(0xFFFFF7ED) : Colors.white,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(
            color: pending ? const Color(0xFFF97316) : const Color(0xFFE6E9EE),
          ),
        ),
        child: Row(
          children: [
            Container(
              width: 42,
              height: 42,
              decoration: const BoxDecoration(
                color: Color(0xFFFFF4D6),
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.paid_rounded,
                color: Color(0xFFF59E0B),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    '${_formatNumber(quantity)}$currencyName  ¥${_formatMoney(totalPrice)}',
                    style: const TextStyle(
                      color: Color(0xFF101828),
                      fontSize: 15,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    '单价¥${_formatMoney(unitPrice)} · ${seller.isEmpty ? '卖家' : seller}',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      color: Color(0xFF667085),
                      fontSize: 12,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 8),
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                if (pending)
                  Container(
                    width: 8,
                    height: 8,
                    margin: const EdgeInsets.only(bottom: 6),
                    decoration: const BoxDecoration(
                      color: Colors.red,
                      shape: BoxShape.circle,
                    ),
                  ),
                Text(
                  statusText,
                  style: TextStyle(
                    color: pending
                        ? const Color(0xFFF97316)
                        : const Color(0xFF667085),
                    fontWeight: FontWeight.w700,
                    fontSize: 12,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final silverConfig = _configFor('silver');
    final availablePoints =
        ref.watch(authProvider).profile?.currency?.points ?? 0;

    return Scaffold(
      appBar: AppBar(title: const Text('合成')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _loadAll,
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  if (_showTradeFeatures) ...[
                    _buildGoldCard(),
                    _buildCopperCard(),
                  ],
                  if (silverConfig == null)
                    _buildDisabledSynthesisCard(
                      title: '合成银币',
                      icon: Icons.paid_rounded,
                      color: const Color(0xFF667085),
                    )
                  else
                    _buildEnabledSynthesisCard(
                      title: '合成银币',
                      icon: Icons.paid_rounded,
                      color: const Color(0xFF667085),
                      config: silverConfig,
                      quantity: _silverQuantity,
                      availablePoints: availablePoints,
                      onQuantityChanged: (value) {
                        setState(
                          () => _silverQuantity = value.clamp(1, 999).toInt(),
                        );
                      },
                    ),
                  if (_showTradeFeatures) _buildGoldTradeSquare(),
                ],
              ),
            ),
    );
  }
}

class _TradeSquareTab extends StatelessWidget {
  const _TradeSquareTab({
    required this.title,
    required this.active,
    required this.onTap,
  });

  final String title;
  final bool active;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(8),
      child: Container(
        height: 36,
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: active ? const Color(0xFFE5484D) : const Color(0xFFF2F4F7),
          borderRadius: BorderRadius.circular(8),
          border: Border.all(
            color: active ? const Color(0xFFE5484D) : const Color(0xFFE4E7EC),
          ),
        ),
        child: Text(
          title,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: TextStyle(
            color: active ? Colors.white : const Color(0xFF667085),
            fontSize: 14,
            fontWeight: FontWeight.w800,
          ),
        ),
      ),
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
        width: 34,
        height: 34,
        child: Icon(
          icon,
          color: enabled ? const Color(0xFF4D8FEA) : const Color(0xFFC6CCD6),
          size: 17,
        ),
      ),
    );
  }
}
