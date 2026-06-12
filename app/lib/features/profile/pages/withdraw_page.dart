import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/api_client.dart';
import '../../../core/network/api_endpoints.dart';
import '../../../core/utils/toast.dart';

class WithdrawPage extends ConsumerStatefulWidget {
  const WithdrawPage({super.key});

  @override
  ConsumerState<WithdrawPage> createState() => _WithdrawPageState();
}

class _WithdrawPageState extends ConsumerState<WithdrawPage> {
  static const _resetPasswordSignal = '__reset_withdraw_password__';

  final _nameCtrl = TextEditingController();
  final _accountCtrl = TextEditingController();
  bool _loading = false;
  bool _balanceLoading = true;
  bool _hasWithdrawPassword = false;
  String _withdrawPhoneMasked = '';
  double _balance = 0;
  int _selectedAmount = 100;
  String _paymentMethod = 'alipay';
  List<Map<String, dynamic>> _records = [];

  final List<int> _amountOptions = [100, 200, 500, 1000, 2000, 5000];

  @override
  void initState() {
    super.initState();
    _loadBalance();
    _loadRecords();
    _loadWithdrawSecurity();
  }

  @override
  void dispose() {
    _nameCtrl.dispose();
    _accountCtrl.dispose();
    super.dispose();
  }

  Future<void> _loadBalance() async {
    try {
      final result =
          await ref.read(apiClientProvider).get<Map<String, dynamic>>(
                '/api/currency/withdraw/balance',
              );
      if (!mounted) return;
      setState(() {
        final totalEarned =
            double.tryParse(result?['totalEarned']?.toString() ?? '0') ?? 0;
        final totalWithdrawn =
            double.tryParse(result?['totalWithdrawn']?.toString() ?? '0') ?? 0;
        _balance = totalEarned - totalWithdrawn;
        if (_balance < 0) _balance = 0;
        _balanceLoading = false;
      });
    } catch (_) {
      if (mounted) setState(() => _balanceLoading = false);
    }
  }

  Future<void> _loadRecords() async {
    try {
      final result = await ref.read(apiClientProvider).get<List<dynamic>>(
            '/api/currency/withdraw/records',
          );
      if (!mounted) return;
      setState(() {
        _records = (result ?? [])
            .map((item) => Map<String, dynamic>.from(item))
            .toList();
      });
    } catch (_) {}
  }

  Future<void> _loadWithdrawSecurity() async {
    try {
      final result =
          await ref.read(apiClientProvider).get<Map<String, dynamic>>(
                '/api/currency/withdraw/security',
              );
      if (!mounted) return;
      setState(() {
        _hasWithdrawPassword = result?['hasPassword'] == true;
        _withdrawPhoneMasked = result?['phoneMasked']?.toString() ?? '';
      });
    } catch (_) {}
  }

  Future<bool> _showWithdrawPasswordSetupDialog({bool reset = false}) async {
    final ok = await showDialog<bool>(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => _WithdrawPasswordSetupDialog(
        reset: reset,
        onSubmit: (phone, password, confirmPassword) async {
          await ref.read(apiClientProvider).post(
            reset
                ? '/api/currency/withdraw/password/reset'
                : '/api/currency/withdraw/password',
            data: {
              'phone': phone,
              'password': password,
              'confirmPassword': confirmPassword,
            },
          );
        },
      ),
    );

    if (ok == true && mounted) {
      setState(() => _hasWithdrawPassword = true);
      Toast.success(context, reset ? '提现密码已重置' : '提现密码已设置');
      await _loadWithdrawSecurity();
    }
    return ok == true;
  }

  Future<String?> _showWithdrawPasswordInputDialog() async {
    final result = await showDialog<String>(
      context: context,
      builder: (_) => _WithdrawPasswordInputDialog(
        phoneMasked: _withdrawPhoneMasked,
        resetSignal: _resetPasswordSignal,
      ),
    );

    if (result == _resetPasswordSignal) {
      await Future<void>.delayed(const Duration(milliseconds: 120));
      await _showWithdrawPasswordSetupDialog(reset: true);
      return null;
    }
    return result;
  }

  Future<void> _submit() async {
    if (_loading) return;
    if (_selectedAmount > _balance) {
      Toast.warning(context, '余额不足');
      return;
    }
    if (_nameCtrl.text.trim().isEmpty) {
      Toast.warning(context, '请填写收款人姓名');
      return;
    }
    if (_paymentMethod == 'bank') {
      _showBankUnavailableDialog();
      return;
    }
    if (_accountCtrl.text.trim().isEmpty) {
      Toast.warning(
        context,
        _paymentMethod == 'alipay' ? '请填写支付宝账号' : '请填写银行卡号',
      );
      return;
    }

    setState(() => _loading = true);
    try {
      if (!_hasWithdrawPassword) {
        final setupOk = await _showWithdrawPasswordSetupDialog();
        if (!setupOk) return;
        if (!mounted) return;
      }

      final fee = (_selectedAmount * 0.2).toInt();
      final actualAmount = _selectedAmount - fee;
      final confirm = await showDialog<bool>(
        context: context,
        builder: (ctx) => AlertDialog(
          title: const Text('确认提现'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _confirmRow('提现金额', '￥$_selectedAmount'),
              const SizedBox(height: 8),
              _confirmRow('手续费（20%）', '-￥$fee'),
              const Divider(height: 20),
              _confirmRow('实际到账', '￥$actualAmount', bold: true),
              const SizedBox(height: 12),
              Text(
                '收款方式：${_paymentMethod == 'alipay' ? '支付宝' : '银行卡'}',
                style: const TextStyle(fontSize: 13, color: Colors.grey),
              ),
              Text(
                '收款账号：${_accountCtrl.text.trim()}',
                style: const TextStyle(fontSize: 13, color: Colors.grey),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx, false),
              child: const Text('取消'),
            ),
            ElevatedButton(
              onPressed: () => Navigator.pop(ctx, true),
              child: const Text('确认提现'),
            ),
          ],
        ),
      );
      if (confirm != true) return;

      final withdrawPassword = await _showWithdrawPasswordInputDialog();
      if (withdrawPassword == null) return;

      await ref.read(apiClientProvider).post(
        ApiEndpoints.currencyWithdraw,
        data: {
          'amount': _selectedAmount,
          'paymentMethod': _paymentMethod,
          'accountName': _nameCtrl.text.trim(),
          'accountNumber': _accountCtrl.text.trim(),
          'withdrawPassword': withdrawPassword,
        },
      );
      if (!mounted) return;
      Toast.success(context, '提现申请已提交，请等待审核');
      _loadBalance();
      _loadRecords();
    } catch (e) {
      if (mounted) Toast.error(context, '$e');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('提现')),
      body: _balanceLoading
          ? const Center(child: CircularProgressIndicator())
          : SingleChildScrollView(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        colors: [Colors.blue.shade600, Colors.blue.shade400],
                      ),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          '可提现余额（推广收益）',
                          style: TextStyle(color: Colors.white70, fontSize: 13),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          '￥ ${_balance.toStringAsFixed(0)}',
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 32,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 24),
                  const Text(
                    '选择提现金额',
                    style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600),
                  ),
                  const SizedBox(height: 4),
                  const Text(
                    '提现金额必须是100的整数倍，手续费20%',
                    style: TextStyle(fontSize: 12, color: Colors.grey),
                  ),
                  const SizedBox(height: 12),
                  Wrap(
                    spacing: 10,
                    runSpacing: 10,
                    children: _amountOptions.map((amount) {
                      final selected = _selectedAmount == amount;
                      final disabled = amount > _balance;
                      return GestureDetector(
                        onTap: disabled
                            ? null
                            : () => setState(() => _selectedAmount = amount),
                        child: Container(
                          width: 100,
                          padding: const EdgeInsets.symmetric(vertical: 12),
                          decoration: BoxDecoration(
                            color: disabled
                                ? Colors.grey.shade100
                                : selected
                                    ? Colors.blue
                                    : Colors.white,
                            border: Border.all(
                              color: disabled
                                  ? Colors.grey.shade300
                                  : selected
                                      ? Colors.blue
                                      : Colors.grey.shade300,
                            ),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          alignment: Alignment.center,
                          child: Text(
                            '￥$amount',
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w600,
                              color: disabled
                                  ? Colors.grey.shade400
                                  : selected
                                      ? Colors.white
                                      : Colors.black87,
                            ),
                          ),
                        ),
                      );
                    }).toList(),
                  ),
                  const SizedBox(height: 24),
                  const Text(
                    '提现方式',
                    style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600),
                  ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      _buildMethodCard(
                        'alipay',
                        '支付宝',
                        Icons.account_balance_wallet,
                      ),
                      const SizedBox(width: 12),
                      _buildMethodCard(
                        'bank',
                        '银行卡',
                        Icons.credit_card,
                        enabled: false,
                      ),
                    ],
                  ),
                  const SizedBox(height: 24),
                  const Text(
                    '收款信息',
                    style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: _nameCtrl,
                    decoration: InputDecoration(
                      labelText: '收款人姓名',
                      hintText: '请输入真实姓名',
                      prefixIcon: const Icon(Icons.person_outline),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(8),
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: _accountCtrl,
                    decoration: InputDecoration(
                      labelText: _paymentMethod == 'alipay' ? '支付宝账号' : '银行卡号',
                      hintText:
                          _paymentMethod == 'alipay' ? '手机号或邮箱' : '请输入银行卡号',
                      prefixIcon: Icon(_paymentMethod == 'alipay'
                          ? Icons.account_balance_wallet_outlined
                          : Icons.credit_card_outlined),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(8),
                      ),
                    ),
                    keyboardType: _paymentMethod == 'bank'
                        ? TextInputType.number
                        : TextInputType.text,
                  ),
                  const SizedBox(height: 32),
                  SizedBox(
                    width: double.infinity,
                    height: 48,
                    child: ElevatedButton(
                      onPressed: _loading ? null : _submit,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.blue,
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(8),
                        ),
                      ),
                      child: _loading
                          ? const SizedBox(
                              width: 20,
                              height: 20,
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                                color: Colors.white,
                              ),
                            )
                          : Text(
                              '提现 ￥$_selectedAmount（到账 ￥${(_selectedAmount * 0.8).toInt()}）',
                              style: const TextStyle(fontSize: 15),
                            ),
                    ),
                  ),
                  const SizedBox(height: 16),
                  const Text(
                    '提示：提现申请提交后，管理员将在1-3个工作日内审核并打款。',
                    style: TextStyle(fontSize: 12, color: Colors.grey),
                  ),
                  if (_records.isNotEmpty) ...[
                    const SizedBox(height: 32),
                    const Text(
                      '交易记录',
                      style:
                          TextStyle(fontSize: 15, fontWeight: FontWeight.w600),
                    ),
                    const SizedBox(height: 12),
                    ..._records.map((record) => _buildRecordItem(record)),
                  ],
                ],
              ),
            ),
    );
  }

  Widget _buildRecordItem(Map<String, dynamic> record) {
    final transactionType =
        record['transactionType']?.toString() ?? 'withdrawal';
    if (transactionType == 'income') {
      return _buildIncomeRecordItem(record);
    }

    final amount = record['amount'] ?? 0;
    final actualAmount = record['actualAmount'] ?? 0;
    final status = record['status'] as int? ?? 0;
    final statusText = record['statusText']?.toString() ?? '未知';
    final method = record['paymentMethod'] == 'alipay' ? '支付宝' : '银行卡';
    final timeStr = _formatTime(record['createdAt']?.toString() ?? '');

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '提现 ￥$amount → 到账 ￥$actualAmount',
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w500,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  '$method · $timeStr',
                  style: const TextStyle(fontSize: 12, color: Colors.grey),
                ),
              ],
            ),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
            decoration: BoxDecoration(
              color: status == 0
                  ? Colors.orange.shade50
                  : status == 1
                      ? Colors.green.shade50
                      : Colors.red.shade50,
              borderRadius: BorderRadius.circular(4),
            ),
            child: Text(
              statusText,
              style: TextStyle(
                fontSize: 12,
                color: status == 0
                    ? Colors.orange
                    : status == 1
                        ? Colors.green
                        : Colors.red,
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildIncomeRecordItem(Map<String, dynamic> record) {
    final amount = double.tryParse(record['amount']?.toString() ?? '0') ?? 0;
    final title = record['title']?.toString() ?? '推广收益';
    final sourceNickname = record['sourceNickname']?.toString() ?? '';
    final sourceAccount = record['sourceAccount']?.toString() ?? '';
    final source = sourceNickname.isNotEmpty
        ? '$sourceNickname（$sourceAccount）'
        : sourceAccount;
    final timeStr = _formatTime(record['createdAt']?.toString() ?? '');

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                      fontSize: 14, fontWeight: FontWeight.w500),
                ),
                const SizedBox(height: 4),
                Text(
                  source.isEmpty ? timeStr : '来源：$source · $timeStr',
                  style: const TextStyle(fontSize: 12, color: Colors.grey),
                ),
              ],
            ),
          ),
          Text(
            '+${amount.toStringAsFixed(amount % 1 == 0 ? 0 : 2)}',
            style: const TextStyle(
              fontSize: 16,
              color: Colors.green,
              fontWeight: FontWeight.bold,
            ),
          ),
        ],
      ),
    );
  }

  String _formatTime(String value) {
    if (value.isEmpty) return '';
    try {
      final dt = DateTime.parse(value).toLocal();
      return '${dt.month}/${dt.day} ${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')}';
    } catch (_) {
      return '';
    }
  }

  Future<void> _showBankUnavailableDialog() {
    return showDialog<void>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('提示'),
        content: const Text('此功能待开放'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('确定'),
          ),
        ],
      ),
    );
  }

  Widget _buildMethodCard(
    String method,
    String label,
    IconData icon, {
    bool enabled = true,
  }) {
    final selected = _paymentMethod == method;
    final active = enabled && selected;
    return Expanded(
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTap: enabled
            ? () => setState(() => _paymentMethod = method)
            : _showBankUnavailableDialog,
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 16),
          decoration: BoxDecoration(
            color: !enabled
                ? Colors.grey.shade100
                : active
                    ? Colors.blue.shade50
                    : Colors.white,
            border: Border.all(
              color: active ? Colors.blue : Colors.grey.shade300,
              width: active ? 2 : 1,
            ),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Column(
            children: [
              Icon(
                icon,
                size: 28,
                color: active ? Colors.blue : Colors.grey.shade400,
              ),
              const SizedBox(height: 6),
              Text(
                label,
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: active ? FontWeight.w600 : FontWeight.normal,
                  color: active
                      ? Colors.blue
                      : enabled
                          ? Colors.black87
                          : Colors.grey.shade500,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _confirmRow(String label, String value, {bool bold = false}) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label,
            style: const TextStyle(fontSize: 14, color: Colors.black87)),
        Text(
          value,
          style: TextStyle(
            fontSize: bold ? 18 : 14,
            fontWeight: bold ? FontWeight.bold : FontWeight.normal,
            color: bold ? Colors.blue : Colors.black87,
          ),
        ),
      ],
    );
  }
}

class _WithdrawPasswordSetupDialog extends StatefulWidget {
  const _WithdrawPasswordSetupDialog({
    required this.reset,
    required this.onSubmit,
  });

  final bool reset;
  final Future<void> Function(
    String phone,
    String password,
    String confirmPassword,
  ) onSubmit;

  @override
  State<_WithdrawPasswordSetupDialog> createState() =>
      _WithdrawPasswordSetupDialogState();
}

class _WithdrawPasswordSetupDialogState
    extends State<_WithdrawPasswordSetupDialog> {
  final _phoneCtrl = TextEditingController();
  final _passwordCtrl = TextEditingController();
  final _confirmCtrl = TextEditingController();
  bool _submitting = false;

  @override
  void dispose() {
    _phoneCtrl.dispose();
    _passwordCtrl.dispose();
    _confirmCtrl.dispose();
    super.dispose();
  }

  Future<void> _close(Object? result) async {
    FocusManager.instance.primaryFocus?.unfocus();
    await Future<void>.delayed(const Duration(milliseconds: 80));
    if (mounted) Navigator.of(context).pop(result);
  }

  Future<void> _submit() async {
    final phone = _phoneCtrl.text.trim();
    final password = _passwordCtrl.text.trim();
    final confirm = _confirmCtrl.text.trim();

    if (!RegExp(r'^1\d{10}$').hasMatch(phone)) {
      Toast.warning(context, '请输入正确的预留手机号');
      return;
    }
    if (!RegExp(r'^\d{6}$').hasMatch(password)) {
      Toast.warning(context, '提现密码必须是6位数字');
      return;
    }
    if (password != confirm) {
      Toast.warning(context, '两次输入的提现密码不一致');
      return;
    }

    setState(() => _submitting = true);
    try {
      await widget.onSubmit(phone, password, confirm);
      await _close(true);
    } catch (e) {
      if (!widget.reset && e.toString().contains('已设置')) {
        await _close(true);
        return;
      }
      if (mounted) Toast.error(context, '$e');
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: Text(widget.reset ? '重置提现密码' : '设置提现密码'),
      content: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: _phoneCtrl,
              keyboardType: TextInputType.phone,
              maxLength: 11,
              decoration: const InputDecoration(
                labelText: '预留手机号',
                hintText: '请输入11位手机号',
                counterText: '',
              ),
            ),
            const SizedBox(height: 8),
            TextField(
              controller: _passwordCtrl,
              keyboardType: TextInputType.number,
              maxLength: 6,
              obscureText: true,
              decoration: const InputDecoration(
                labelText: '提现密码',
                hintText: '请输入6位数字',
                counterText: '',
              ),
            ),
            const SizedBox(height: 8),
            TextField(
              controller: _confirmCtrl,
              keyboardType: TextInputType.number,
              maxLength: 6,
              obscureText: true,
              decoration: const InputDecoration(
                labelText: '确认提现密码',
                hintText: '请再次输入6位数字',
                counterText: '',
              ),
            ),
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed: _submitting ? null : () => _close(false),
          child: const Text('取消'),
        ),
        ElevatedButton(
          onPressed: _submitting ? null : _submit,
          child: Text(widget.reset ? '确认重置' : '确认设置'),
        ),
      ],
    );
  }
}

class _WithdrawPasswordInputDialog extends StatefulWidget {
  const _WithdrawPasswordInputDialog({
    required this.phoneMasked,
    required this.resetSignal,
  });

  final String phoneMasked;
  final String resetSignal;

  @override
  State<_WithdrawPasswordInputDialog> createState() =>
      _WithdrawPasswordInputDialogState();
}

class _WithdrawPasswordInputDialogState
    extends State<_WithdrawPasswordInputDialog> {
  final _passwordCtrl = TextEditingController();

  @override
  void dispose() {
    _passwordCtrl.dispose();
    super.dispose();
  }

  Future<void> _close(Object? result) async {
    FocusManager.instance.primaryFocus?.unfocus();
    await Future<void>.delayed(const Duration(milliseconds: 80));
    if (mounted) Navigator.of(context).pop(result);
  }

  void _submit() {
    final value = _passwordCtrl.text.trim();
    if (!RegExp(r'^\d{6}$').hasMatch(value)) {
      Toast.warning(context, '请输入6位数字提现密码');
      return;
    }
    _close(value);
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('输入提现密码'),
      content: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (widget.phoneMasked.isNotEmpty)
              Padding(
                padding: const EdgeInsets.only(bottom: 10),
                child: Text(
                  '预留手机号：${widget.phoneMasked}',
                  style: const TextStyle(fontSize: 12, color: Colors.grey),
                ),
              ),
            TextField(
              controller: _passwordCtrl,
              keyboardType: TextInputType.number,
              maxLength: 6,
              obscureText: true,
              decoration: const InputDecoration(
                labelText: '提现密码',
                hintText: '请输入6位数字',
                counterText: '',
              ),
            ),
          ],
        ),
      ),
      actions: [
        TextButton(onPressed: () => _close(null), child: const Text('取消')),
        TextButton(
          onPressed: () => _close(widget.resetSignal),
          child: const Text('忘记密码'),
        ),
        ElevatedButton(onPressed: _submit, child: const Text('确认')),
      ],
    );
  }
}
