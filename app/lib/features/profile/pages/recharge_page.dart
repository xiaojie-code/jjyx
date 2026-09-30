import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter/services.dart';
import '../../../core/constants/app_constants.dart';
import '../../../core/network/api_client.dart';
import '../../../core/network/api_endpoints.dart';
import '../../../core/utils/toast.dart';

/// 充值页面：展示收款码、充值档位和申请记录。
class RechargePage extends ConsumerStatefulWidget {
  const RechargePage({super.key});

  @override
  ConsumerState<RechargePage> createState() => _RechargePageState();
}

class _RechargePageState extends ConsumerState<RechargePage> {
  static final RegExp _mobileRegex = RegExp(r'^1[3-9]\d{9}$');
  final _nameCtrl = TextEditingController();
  final _phoneCtrl = TextEditingController();
  bool _loading = true;
  bool _submitting = false;

  String _qrcode = '';
  String _walletAddress = '';
  String _payeeName = '';
  String _notice = '';
  List<int> _amountOptions = const [50];
  int? _selectedAmount = 50;
  String _paymentMethod = 'qrcode';
  List<Map<String, dynamic>> _orders = [];

  @override
  void initState() {
    super.initState();
    _loadInfo();
    _loadOrders();
  }

  @override
  void dispose() {
    _nameCtrl.dispose();
    _phoneCtrl.dispose();
    super.dispose();
  }

  Future<void> _loadInfo() async {
    try {
      final result = await ref
          .read(apiClientProvider)
          .get<Map<String, dynamic>>(ApiEndpoints.rechargeInfo);
      if (!mounted) return;
      setState(() {
        _qrcode = result?['qrcode']?.toString() ?? '';
        _walletAddress = result?['walletAddress']?.toString() ?? '';
        _payeeName = result?['payeeName']?.toString() ?? '';
        _notice = result?['notice']?.toString() ?? '';
        // 用户端当前只开放50元档，避免旧服务缓存返回历史档位。
        _amountOptions = const [50];
        final configuredMethods = (result?['paymentMethods'] as List<dynamic>?)
                ?.map((item) => item.toString())
                .toSet() ??
            <String>{};
        final methods = configuredMethods.isNotEmpty
            ? configuredMethods
            : <String>{
                if (_qrcode.isNotEmpty) 'qrcode',
                if (_walletAddress.isNotEmpty) 'wallet',
              };
        if (!methods.contains(_paymentMethod)) {
          _paymentMethod = methods.contains('qrcode') ? 'qrcode' : 'wallet';
        }
        _loading = false;
      });
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _loadOrders() async {
    try {
      final result = await ref
          .read(apiClientProvider)
          .get<List<dynamic>>(ApiEndpoints.rechargeOrders);
      if (!mounted) return;
      setState(() {
        _orders =
            (result ?? []).map((e) => Map<String, dynamic>.from(e)).toList();
      });
    } catch (_) {}
  }

  String _mediaUrl(String path) {
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    return '${AppConstants.apiBaseUrl}$path';
  }

  Future<void> _submit() async {
    final name = _nameCtrl.text.trim();
    final phone = _phoneCtrl.text.trim();
    if (name.isEmpty) {
      Toast.warning(context, '请填写姓名');
      return;
    }
    if (!_mobileRegex.hasMatch(phone)) {
      Toast.warning(context, '请输入正确的11位手机号（需以13-19开头）');
      return;
    }
    if (_selectedAmount == null) {
      Toast.warning(context, '请选择充值金额');
      return;
    }
    if (_paymentMethod == 'wallet' && _walletAddress.isEmpty) {
      Toast.warning(context, '钱包地址暂未配置，请选择其他收款方式');
      return;
    }
    if (_paymentMethod == 'qrcode' && _qrcode.isEmpty) {
      Toast.warning(context, '收款码暂未配置，请选择其他收款方式');
      return;
    }
    setState(() => _submitting = true);
    try {
      await ref.read(apiClientProvider).post(
        ApiEndpoints.rechargeSubmit,
        data: {
          'realName': name,
          'phone': phone,
          'amount': _selectedAmount,
          'packageName': '$_selectedAmount元档',
          'paymentMethod': _paymentMethod,
          'walletAddress': _paymentMethod == 'wallet' ? _walletAddress : null,
        },
      );
      if (!mounted) return;
      Toast.success(
        context,
        '充值申请已提交，管理员核实后将发放2000积分',
      );
      _nameCtrl.clear();
      _phoneCtrl.clear();
      setState(() => _selectedAmount = 50);
      _loadOrders();
    } catch (e) {
      if (!mounted) return;
      String msg = apiErrorMessage(e, fallback: '提交失败');
      if (msg.contains('待核实')) {
        msg = '你有一笔待核实的充值申请，请等待管理员处理';
      } else if (msg.contains('手机号')) {
        msg = '请输入正确的11位手机号（需以13-19开头）';
      } else if (msg.contains('姓名')) {
        msg = '请填写姓名';
      }
      Toast.error(context, msg);
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  void _showQrcodeFullscreen() {
    if (_qrcode.isEmpty) return;
    showDialog(
      context: context,
      builder: (ctx) => GestureDetector(
        onTap: () => Navigator.pop(ctx),
        child: Dialog(
          backgroundColor: Colors.white,
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Image.network(_mediaUrl(_qrcode), fit: BoxFit.contain),
          ),
        ),
      ),
    );
  }

  void _copyWalletAddress() {
    if (_walletAddress.isEmpty) return;
    Clipboard.setData(ClipboardData(text: _walletAddress));
    Toast.success(context, '钱包地址已复制');
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('充值')),
      backgroundColor: const Color(0xFFF5F5F5),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // 步骤说明
                  _buildStepCard(),
                  const SizedBox(height: 16),
                  // 收款码
                  _buildPaymentCard(),
                  const SizedBox(height: 16),
                  // 套餐选择
                  _buildPackageCard(),
                  const SizedBox(height: 16),
                  // 信息填写
                  _buildFormCard(),
                  const SizedBox(height: 16),
                  // 充值记录
                  if (_orders.isNotEmpty) _buildOrdersCard(),
                ],
              ),
            ),
    );
  }

  Widget _buildStepCard() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.blue.shade50,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('充值步骤',
              style: TextStyle(fontWeight: FontWeight.w600, fontSize: 15)),
          const SizedBox(height: 8),
          _buildStep('1', '选择收款方式完成付款'),
          _buildStep('2', '填写姓名和手机号，点击提交'),
          _buildStep('3', '管理员核实到账后发放2000积分'),
          if (_notice.isNotEmpty) ...[
            const SizedBox(height: 8),
            Text(_notice,
                style: TextStyle(fontSize: 12, color: Colors.grey.shade700)),
          ],
        ],
      ),
    );
  }

  Widget _buildStep(String num, String text) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 3),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          CircleAvatar(
            radius: 9,
            backgroundColor: Colors.blue,
            child: Text(num,
                style: const TextStyle(fontSize: 11, color: Colors.white)),
          ),
          const SizedBox(width: 8),
          Expanded(child: Text(text, style: const TextStyle(fontSize: 13))),
        ],
      ),
    );
  }

  Widget _buildPaymentCard() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        children: [
          const Text('选择收款方式', style: TextStyle(fontWeight: FontWeight.w600)),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: ChoiceChip(
                  label: const Text('收款码'),
                  selected: _paymentMethod == 'qrcode',
                  onSelected: _qrcode.isEmpty
                      ? null
                      : (_) => setState(() => _paymentMethod = 'qrcode'),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: ChoiceChip(
                  label: const Text('钱包地址'),
                  selected: _paymentMethod == 'wallet',
                  onSelected: _walletAddress.isEmpty
                      ? null
                      : (_) => setState(() => _paymentMethod = 'wallet'),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          if (_paymentMethod == 'wallet')
            _buildWalletAddressCard()
          else if (_qrcode.isNotEmpty)
            GestureDetector(
              onTap: _showQrcodeFullscreen,
              child: Image.network(
                _mediaUrl(_qrcode),
                width: 200,
                height: 200,
                fit: BoxFit.contain,
                errorBuilder: (_, __, ___) => _qrcodePlaceholder('收款码加载失败'),
              ),
            )
          else
            _qrcodePlaceholder('管理员暂未配置收款码'),
          if (_paymentMethod == 'qrcode' && _payeeName.isNotEmpty) ...[
            const SizedBox(height: 8),
            Text('收款人：$_payeeName',
                style: const TextStyle(fontSize: 14, color: Colors.black87)),
          ],
          if (_paymentMethod == 'qrcode' && _qrcode.isNotEmpty)
            const Padding(
              padding: EdgeInsets.only(top: 6),
              child: Text('点击二维码可放大',
                  style: TextStyle(fontSize: 11, color: Colors.grey)),
            ),
        ],
      ),
    );
  }

  Widget _buildWalletAddressCard() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.grey.shade50,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            child: SelectableText(
              _walletAddress,
              style: const TextStyle(fontSize: 13, height: 1.4),
            ),
          ),
          IconButton(
            onPressed: _copyWalletAddress,
            icon: const Icon(Icons.copy, size: 19),
            tooltip: '复制钱包地址',
          ),
        ],
      ),
    );
  }

  Widget _qrcodePlaceholder(String text) {
    return Container(
      width: 200,
      height: 200,
      decoration: BoxDecoration(
        color: Colors.grey.shade100,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.qr_code_2, size: 60, color: Colors.grey.shade400),
          const SizedBox(height: 8),
          Text(text,
              style: TextStyle(fontSize: 12, color: Colors.grey.shade500)),
        ],
      ),
    );
  }

  Widget _buildPackageCard() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('选择充值金额', style: TextStyle(fontWeight: FontWeight.w600)),
          const SizedBox(height: 12),
          Wrap(
            spacing: 10,
            runSpacing: 10,
            children: _amountOptions.map((amount) {
              final selected = _selectedAmount == amount;
              return ChoiceChip(
                label: Text(
                  '$amount 元  赠2000积分',
                ),
                selected: selected,
                onSelected: (_) => setState(() => _selectedAmount = amount),
              );
            }).toList(),
          ),
        ],
      ),
    );
  }

  Widget _buildFormCard() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('付款信息', style: TextStyle(fontWeight: FontWeight.w600)),
          const SizedBox(height: 12),
          TextField(
            controller: _nameCtrl,
            maxLength: 20,
            decoration: const InputDecoration(
              labelText: '姓名',
              hintText: '请填写付款人姓名',
              border: OutlineInputBorder(),
              counterText: '',
            ),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _phoneCtrl,
            keyboardType: TextInputType.phone,
            maxLength: 11,
            inputFormatters: [FilteringTextInputFormatter.digitsOnly],
            decoration: const InputDecoration(
              labelText: '手机号',
              hintText: '用于联系充值订单',
              border: OutlineInputBorder(),
              counterText: '',
            ),
          ),
          const SizedBox(height: 16),
          SizedBox(
            width: double.infinity,
            height: 46,
            child: ElevatedButton(
              onPressed: _submitting ? null : _submit,
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.blue,
                foregroundColor: Colors.white,
              ),
              child: _submitting
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(
                          strokeWidth: 2, color: Colors.white))
                  : const Text('提交充值申请', style: TextStyle(fontSize: 16)),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildOrdersCard() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('我的充值记录', style: TextStyle(fontWeight: FontWeight.w600)),
          const SizedBox(height: 8),
          ..._orders.map((o) {
            final status = o['status'] as int? ?? 0;
            final statusText = o['statusText']?.toString() ?? '';
            final color = status == 0
                ? Colors.orange
                : status == 1
                    ? Colors.green
                    : Colors.red;
            return Padding(
              padding: const EdgeInsets.symmetric(vertical: 6),
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          '${o['realName'] ?? ''}  ${o['phone'] ?? ''}',
                          style: const TextStyle(fontSize: 13),
                        ),
                        Text(
                          o['createdAt']
                                  ?.toString()
                                  .replaceFirst('T', ' ')
                                  .split('.')
                                  .first ??
                              '',
                          style: TextStyle(
                              fontSize: 11, color: Colors.grey.shade500),
                        ),
                        if ((o['adminRemark']?.toString() ?? '').isNotEmpty)
                          Text('备注：${o['adminRemark']}',
                              style: TextStyle(
                                  fontSize: 11, color: Colors.grey.shade600)),
                      ],
                    ),
                  ),
                  Text(statusText,
                      style: TextStyle(
                          fontSize: 13,
                          color: color,
                          fontWeight: FontWeight.w500)),
                ],
              ),
            );
          }),
        ],
      ),
    );
  }
}
