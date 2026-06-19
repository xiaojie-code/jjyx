import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/constants/app_constants.dart';
import '../../../core/network/api_client.dart';
import '../../../core/network/api_endpoints.dart';
import '../../../core/utils/toast.dart';

class AssetPackagePage extends ConsumerStatefulWidget {
  const AssetPackagePage({super.key});

  @override
  ConsumerState<AssetPackagePage> createState() => _AssetPackagePageState();
}

class _AssetPackagePageState extends ConsumerState<AssetPackagePage> {
  bool _loading = true;
  Map<String, dynamic> _overview = {};
  List<Map<String, dynamic>> _recharges = [];
  List<Map<String, dynamic>> _withdrawals = [];
  List<Map<String, dynamic>> _referralRewards = [];

  @override
  void initState() {
    super.initState();
    _loadAll();
  }

  Future<void> _loadAll() async {
    setState(() => _loading = true);
    try {
      final api = ref.read(apiClientProvider);
      final overview = await api.get<Map<String, dynamic>>(ApiEndpoints.assetOverview);
      final recharges = await api.get<List<dynamic>>(ApiEndpoints.assetRecharges);
      final withdrawals = await api.get<List<dynamic>>(ApiEndpoints.assetWithdrawals);
      final referralRewards = await api.get<List<dynamic>>(ApiEndpoints.assetReferralRewards);
      if (!mounted) return;
      setState(() {
        _overview = overview ?? {};
        _recharges = (recharges ?? []).map((e) => Map<String, dynamic>.from(e)).toList();
        _withdrawals = (withdrawals ?? []).map((e) => Map<String, dynamic>.from(e)).toList();
        _referralRewards = (referralRewards ?? []).map((e) => Map<String, dynamic>.from(e)).toList();
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() => _loading = false);
      Toast.error(context, apiErrorMessage(e, fallback: '资产包加载失败'));
    }
  }

  double _num(dynamic value) {
    if (value is num) return value.toDouble();
    return double.tryParse(value?.toString() ?? '') ?? 0;
  }

  String _amount(dynamic value, {int digits = 2}) {
    final n = _num(value);
    if (n % 1 == 0) return n.toInt().toString();
    return n.toStringAsFixed(digits);
  }

  String _amountFloor2(dynamic value) {
    final n = _num(value);
    final floored = (n * 100).floor() / 100;
    if (floored % 1 == 0) return floored.toInt().toString();
    return floored.toStringAsFixed(2);
  }

  String _rateText(dynamic value) {
    final rate = _num(value) * 100;
    return '${rate.toStringAsFixed(rate % 1 == 0 ? 0 : 1)}%';
  }

  String _time(dynamic value) {
    final raw = value?.toString() ?? '';
    if (raw.isEmpty) return '';
    try {
      final dt = DateTime.parse(raw).toLocal();
      String two(int n) => n.toString().padLeft(2, '0');
      return '${dt.year}-${two(dt.month)}-${two(dt.day)} ${two(dt.hour)}:${two(dt.minute)}';
    } catch (_) {
      return raw.replaceFirst('T', ' ').split('.').first;
    }
  }

  Future<void> _showRechargeDialog() async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (_) => const _AssetRechargeDialog(),
    );
    if (ok == true) _loadAll();
  }

  Future<void> _showWithdrawDialog() async {
    final total = _num(_overview['totalBalance']);
    final ok = await showDialog<bool>(
      context: context,
      builder: (_) => _AssetWithdrawDialog(available: total),
    );
    if (ok == true) _loadAll();
  }

  Future<void> _copyInviteCode(String code) async {
    await Clipboard.setData(ClipboardData(text: code));
    if (mounted) Toast.success(context, '推荐码已复制');
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('资产包')),
      backgroundColor: const Color(0xFFF5F6FA),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _loadAll,
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  _buildBalanceCard(),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(
                        child: ElevatedButton.icon(
                          onPressed: _showRechargeDialog,
                          icon: const Icon(Icons.add_card),
                          label: const Text('充值'),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: OutlinedButton.icon(
                          onPressed: _showWithdrawDialog,
                          icon: const Icon(Icons.payments_outlined),
                          label: const Text('提现'),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  _buildInterestCard(),
                  const SizedBox(height: 16),
                  _buildRecordsCard(),
                ],
              ),
            ),
    );
  }

  Widget _buildBalanceCard() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(color: Colors.black.withOpacity(0.04), blurRadius: 12, offset: const Offset(0, 4)),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('资产包总额', style: TextStyle(fontSize: 13, color: Colors.grey)),
          const SizedBox(height: 8),
          Text(
            '¥ ${_amountFloor2(_overview['totalBalance'])}',
            style: const TextStyle(fontSize: 30, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 14),
          Row(
            children: [
              Expanded(child: _miniStat('本金', '¥ ${_amount(_overview['principalBalance'])}')),
              Expanded(child: _miniStat('收益', '¥ ${_amountFloor2(_overview['interestBalance'])}')),
              Expanded(child: _miniStat('月利率', _rateText(_overview['monthlyRate'] ?? _overview['annualRate']))),
            ],
          ),
          if ((_overview['inviteCode']?.toString() ?? '').isNotEmpty) ...[
            const SizedBox(height: 14),
            InkWell(
              onTap: () => _copyInviteCode(_overview['inviteCode'].toString()),
              borderRadius: BorderRadius.circular(8),
              child: Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                decoration: BoxDecoration(
                  color: const Color(0xFFF5F8FF),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.confirmation_number_outlined, size: 18, color: Colors.blue),
                    const SizedBox(width: 8),
                    Expanded(child: Text('我的推荐码：${_overview['inviteCode']}', style: const TextStyle(fontWeight: FontWeight.w600))),
                    const Icon(Icons.copy, size: 16, color: Colors.grey),
                  ],
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildInterestCard() {
    final interests = (_overview['recentInterests'] is List)
        ? (_overview['recentInterests'] as List).map((e) => Map<String, dynamic>.from(e as Map)).toList()
        : <Map<String, dynamic>>[];
    return _section(
      title: '每日收益',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            '预计明日到账利息：¥ ${_amountFloor2(_overview['todayEstimatedInterest'])}',
            style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600),
          ),
          if (interests.isNotEmpty) ...[
            const Divider(height: 22),
            ...interests.map((item) => Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: Row(
                    children: [
                      Expanded(child: Text(item['interestDate']?.toString() ?? '', style: const TextStyle(fontSize: 13))),
                      Text('+¥ ${_amountFloor2(item['interestAmount'])}',
                          style: const TextStyle(color: Colors.green, fontWeight: FontWeight.w600)),
                    ],
                  ),
                )),
          ],
        ],
      ),
    );
  }

  Widget _buildRecordsCard() {
    final records = <Map<String, dynamic>>[
      ..._recharges.map((e) => {...e, '_kind': 'recharge'}),
      ..._withdrawals.map((e) => {...e, '_kind': 'withdraw'}),
      ..._referralRewards.map((e) => {...e, '_kind': 'referral'}),
    ]..sort((a, b) => _time(b['createdAt']).compareTo(_time(a['createdAt'])));

    return _section(
      title: '记录',
      child: records.isEmpty
          ? const Padding(
              padding: EdgeInsets.symmetric(vertical: 20),
              child: Center(child: Text('暂无记录', style: TextStyle(color: Colors.grey))),
            )
          : Column(children: records.map(_recordTile).toList()),
    );
  }

  Widget _recordTile(Map<String, dynamic> item) {
    final kind = item['_kind']?.toString() ?? '';
    final isRecharge = kind == 'recharge';
    final isReferral = kind == 'referral';
    final status = int.tryParse(item['status']?.toString() ?? '0') ?? 0;
    final color = isReferral ? Colors.green : status == 0 ? Colors.orange : status == 1 ? Colors.green : Colors.red;
    final statusText = isReferral ? '已到账' : status == 0 ? '待处理' : status == 1 ? '已通过' : '已驳回';
    final amount = isReferral ? item['rewardAmount'] : item['amount'];
    final title = isReferral
        ? '推荐收益 +¥ ${_amountFloor2(amount)}'
        : isRecharge
            ? '资产包充值 ¥ ${_amount(amount)}'
            : '资产包提现 ¥ ${_amount(amount)}';
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 10),
      decoration: BoxDecoration(border: Border(bottom: BorderSide(color: Colors.grey.shade100))),
      child: Row(
        children: [
          Icon(
            isReferral ? Icons.card_giftcard_outlined : isRecharge ? Icons.add_circle_outline : Icons.remove_circle_outline,
            color: isReferral || isRecharge ? Colors.green : Colors.blue,
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title),
                const SizedBox(height: 2),
                Text(_time(item['createdAt']), style: const TextStyle(fontSize: 12, color: Colors.grey)),
              ],
            ),
          ),
          Text(statusText, style: TextStyle(color: color, fontSize: 13, fontWeight: FontWeight.w600)),
        ],
      ),
    );
  }

  Widget _section({required String title, required Widget child}) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
          const SizedBox(height: 12),
          child,
        ],
      ),
    );
  }

  Widget _miniStat(String label, String value) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(value, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700)),
        const SizedBox(height: 3),
        Text(label, style: const TextStyle(fontSize: 12, color: Colors.grey)),
      ],
    );
  }
}

class _AssetRechargeDialog extends ConsumerStatefulWidget {
  const _AssetRechargeDialog();

  @override
  ConsumerState<_AssetRechargeDialog> createState() => _AssetRechargeDialogState();
}

class _AssetRechargeDialogState extends ConsumerState<_AssetRechargeDialog> {
  final _amountCtrl = TextEditingController();
  final _nameCtrl = TextEditingController();
  final _phoneCtrl = TextEditingController();
  final _referralCodeCtrl = TextEditingController();
  bool _submitting = false;
  String _qrcode = '';
  String _payeeName = '';

  @override
  void initState() {
    super.initState();
    _loadRechargeInfo();
  }

  @override
  void dispose() {
    _amountCtrl.dispose();
    _nameCtrl.dispose();
    _phoneCtrl.dispose();
    _referralCodeCtrl.dispose();
    super.dispose();
  }

  Future<void> _loadRechargeInfo() async {
    try {
      final result = await ref.read(apiClientProvider).get<Map<String, dynamic>>(ApiEndpoints.rechargeInfo);
      if (!mounted) return;
      setState(() {
        _qrcode = result?['qrcode']?.toString() ?? '';
        _payeeName = result?['payeeName']?.toString() ?? '';
      });
    } catch (_) {}
  }

  String _mediaUrl(String path) {
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    return '${AppConstants.apiBaseUrl}$path';
  }

  Future<void> _submit() async {
    final amount = int.tryParse(_amountCtrl.text.trim()) ?? 0;
    if (amount < 500 || amount > 100000 || amount % 100 != 0) {
      Toast.warning(context, '充值金额必须是500到10W之间的100整数倍');
      return;
    }
    if (_nameCtrl.text.trim().isEmpty) {
      Toast.warning(context, '请填写付款姓名');
      return;
    }
    if (!RegExp(r'^1\d{10}$').hasMatch(_phoneCtrl.text.trim())) {
      Toast.warning(context, '请填写正确的11位手机号');
      return;
    }
    setState(() => _submitting = true);
    try {
      final referralCode = _referralCodeCtrl.text.trim().toUpperCase();
      await ref.read(apiClientProvider).post(ApiEndpoints.assetRecharge, data: {
        'amount': amount,
        'realName': _nameCtrl.text.trim(),
        'phone': _phoneCtrl.text.trim(),
        if (referralCode.isNotEmpty) 'referralCode': referralCode,
      });
      if (!mounted) return;
      Toast.success(context, '充值申请已提交');
      Navigator.pop(context, true);
    } catch (e) {
      if (mounted) Toast.error(context, apiErrorMessage(e, fallback: '提交失败'));
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('资产包充值'),
      content: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (_qrcode.isNotEmpty) ...[
              Image.network(
                _mediaUrl(_qrcode),
                width: 160,
                height: 160,
                fit: BoxFit.contain,
                errorBuilder: (_, __, ___) => const SizedBox(
                  height: 80,
                  child: Center(child: Text('收款码加载失败')),
                ),
              ),
              if (_payeeName.isNotEmpty)
                Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: Text('收款人：$_payeeName', style: const TextStyle(fontSize: 12, color: Colors.grey)),
                ),
            ],
            TextField(
              controller: _amountCtrl,
              keyboardType: TextInputType.number,
              inputFormatters: [FilteringTextInputFormatter.digitsOnly],
              decoration: const InputDecoration(labelText: '充值金额', hintText: '500-100000，100的整数倍'),
            ),
            TextField(controller: _nameCtrl, decoration: const InputDecoration(labelText: '付款姓名')),
            TextField(
              controller: _phoneCtrl,
              keyboardType: TextInputType.phone,
              inputFormatters: [FilteringTextInputFormatter.digitsOnly],
              maxLength: 11,
              decoration: const InputDecoration(labelText: '手机号', counterText: ''),
            ),
            TextField(
              controller: _referralCodeCtrl,
              textCapitalization: TextCapitalization.characters,
              inputFormatters: [FilteringTextInputFormatter.allow(RegExp(r'[a-zA-Z0-9]'))],
              maxLength: 20,
              decoration: const InputDecoration(labelText: '推荐码（选填）', counterText: ''),
            ),
          ],
        ),
      ),
      actions: [
        TextButton(onPressed: _submitting ? null : () => Navigator.pop(context, false), child: const Text('取消')),
        ElevatedButton(onPressed: _submitting ? null : _submit, child: const Text('提交')),
      ],
    );
  }
}

class _AssetWithdrawDialog extends ConsumerStatefulWidget {
  const _AssetWithdrawDialog({required this.available});

  final double available;

  @override
  ConsumerState<_AssetWithdrawDialog> createState() => _AssetWithdrawDialogState();
}

class _AssetWithdrawDialogState extends ConsumerState<_AssetWithdrawDialog> {
  final _amountCtrl = TextEditingController();
  final _nameCtrl = TextEditingController();
  final _accountCtrl = TextEditingController();
  bool _submitting = false;
  String _method = 'alipay';

  @override
  void dispose() {
    _amountCtrl.dispose();
    _nameCtrl.dispose();
    _accountCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final amount = int.tryParse(_amountCtrl.text.trim()) ?? 0;
    if (amount < 100 || amount % 100 != 0) {
      Toast.warning(context, '提现金额必须满100且是100的整数倍');
      return;
    }
    if (amount > widget.available) {
      Toast.warning(context, '资产包余额不足');
      return;
    }
    if (_method != 'alipay') {
      Toast.warning(context, '当前只支持支付宝提现');
      return;
    }
    if (_nameCtrl.text.trim().isEmpty || _accountCtrl.text.trim().isEmpty) {
      Toast.warning(context, '请填写收款信息');
      return;
    }
    if (!RegExp(r'^1\d{10}$').hasMatch(_accountCtrl.text.trim())) {
      Toast.warning(context, '请填写正确的11位支付宝手机号');
      return;
    }
    setState(() => _submitting = true);
    try {
      await ref.read(apiClientProvider).post(ApiEndpoints.assetWithdraw, data: {
        'amount': amount,
        'paymentMethod': _method,
        'accountName': _nameCtrl.text.trim(),
        'accountNumber': _accountCtrl.text.trim(),
      });
      if (!mounted) return;
      Toast.success(context, '提现申请已提交');
      Navigator.pop(context, true);
    } catch (e) {
      if (mounted) Toast.error(context, apiErrorMessage(e, fallback: '提交失败'));
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final amount = int.tryParse(_amountCtrl.text.trim()) ?? 0;
    final actual = amount > 0 ? (amount * 0.8).toStringAsFixed(0) : '0';
    return AlertDialog(
      title: const Text('资产包提现'),
      content: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Align(
              alignment: Alignment.centerLeft,
              child: Text('可提现：¥ ${widget.available.toStringAsFixed(2)}', style: const TextStyle(color: Colors.grey)),
            ),
            TextField(
              controller: _amountCtrl,
              keyboardType: TextInputType.number,
              inputFormatters: [FilteringTextInputFormatter.digitsOnly],
              onChanged: (_) => setState(() {}),
              decoration: const InputDecoration(labelText: '提现金额', hintText: '满100，100的整数倍'),
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                ChoiceChip(label: const Text('支付宝'), selected: _method == 'alipay', onSelected: (_) => setState(() => _method = 'alipay')),
                const SizedBox(width: 8),
                const ChoiceChip(label: Text('银行卡'), selected: false, onSelected: null),
              ],
            ),
            TextField(controller: _nameCtrl, decoration: const InputDecoration(labelText: '收款人姓名')),
            TextField(
              controller: _accountCtrl,
              keyboardType: TextInputType.phone,
              inputFormatters: [FilteringTextInputFormatter.digitsOnly],
              maxLength: 11,
              decoration: const InputDecoration(labelText: '支付宝手机号', counterText: ''),
            ),
            const SizedBox(height: 10),
            Text('手续费20%，预计到账 ¥ $actual', style: const TextStyle(color: Colors.blueGrey)),
          ],
        ),
      ),
      actions: [
        TextButton(onPressed: _submitting ? null : () => Navigator.pop(context, false), child: const Text('取消')),
        ElevatedButton(onPressed: _submitting ? null : _submit, child: const Text('提交提现')),
      ],
    );
  }
}
