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
  final _nameCtrl = TextEditingController();
  final _accountCtrl = TextEditingController();
  bool _loading = false;
  bool _balanceLoading = true;
  double _balance = 0;
  int _selectedAmount = 100;
  String _paymentMethod = 'alipay'; // alipay / bank
  List<Map<String, dynamic>> _records = [];

  final List<int> _amountOptions = [100, 200, 500, 1000, 2000, 5000];

  @override
  void initState() {
    super.initState();
    _loadBalance();
    _loadRecords();
  }

  @override
  void dispose() {
    _nameCtrl.dispose();
    _accountCtrl.dispose();
    super.dispose();
  }

  Future<void> _loadBalance() async {
    try {
      // 可提现余额 = 总收益 - 已提现金额
      final result = await ref.read(apiClientProvider).get<Map<String, dynamic>>(
        '/api/currency/withdraw/balance',
      );
      if (mounted) {
        setState(() {
          final totalEarned = double.tryParse(result?['totalEarned']?.toString() ?? '0') ?? 0;
          final totalWithdrawn = double.tryParse(result?['totalWithdrawn']?.toString() ?? '0') ?? 0;
          _balance = totalEarned - totalWithdrawn;
          if (_balance < 0) _balance = 0;
          _balanceLoading = false;
        });
      }
    } catch (e) {
      if (mounted) setState(() => _balanceLoading = false);
    }
  }

  Future<void> _loadRecords() async {
    try {
      final result = await ref.read(apiClientProvider).get<List<dynamic>>(
        '/api/currency/withdraw/records',
      );
      if (mounted) {
        setState(() {
          _records = (result ?? []).map((e) => Map<String, dynamic>.from(e)).toList();
        });
      }
    } catch (_) {}
  }

  Future<void> _submit() async {
    if (_selectedAmount > _balance) {
      Toast.warning(context, '余额不足');
      return;
    }
    if (_nameCtrl.text.trim().isEmpty) {
      Toast.warning(context, '请填写收款人姓名');
      return;
    }
    if (_accountCtrl.text.trim().isEmpty) {
      Toast.warning(context, _paymentMethod == 'alipay' ? '请填写支付宝账号' : '请填写银行卡号');
      return;
    }

    // 确认弹窗：显示手续费和实际到账金额
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
            _confirmRow('提现金额', '¥$_selectedAmount'),
            const SizedBox(height: 8),
            _confirmRow('手续费（20%）', '-¥$fee'),
            const Divider(height: 20),
            _confirmRow('实际到账', '¥$actualAmount', bold: true),
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
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('取消')),
          ElevatedButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('确认提现')),
        ],
      ),
    );
    if (confirm != true) return;

    setState(() => _loading = true);
    try {
      await ref.read(apiClientProvider).post(
        ApiEndpoints.currencyWithdraw,
        data: {
          'amount': _selectedAmount,
          'paymentMethod': _paymentMethod,
          'accountName': _nameCtrl.text.trim(),
          'accountNumber': _accountCtrl.text.trim(),
        },
      );
      if (mounted) {
        Toast.success(context, '提现申请已提交，请等待审核');
        _loadBalance();
        _loadRecords();
      }
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
                  // 可提现余额
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
                        const Text('可提现余额（推广收益）',
                            style: TextStyle(color: Colors.white70, fontSize: 13)),
                        const SizedBox(height: 8),
                        Text(
                          '¥ ${_balance.toStringAsFixed(0)}',
                          style: const TextStyle(
                              color: Colors.white, fontSize: 32, fontWeight: FontWeight.bold),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 24),

                  // 提现金额选择
                  const Text('选择提现金额', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600)),
                  const SizedBox(height: 4),
                  const Text('提现金额必须是100的整数倍，手续费20%', style: TextStyle(fontSize: 12, color: Colors.grey)),
                  const SizedBox(height: 12),
                  Wrap(
                    spacing: 10,
                    runSpacing: 10,
                    children: _amountOptions.map((amount) {
                      final selected = _selectedAmount == amount;
                      final disabled = amount > _balance;
                      return GestureDetector(
                        onTap: disabled ? null : () => setState(() => _selectedAmount = amount),
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
                            '¥$amount',
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

                  // 提现方式选择
                  const Text('提现方式', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600)),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      _buildMethodCard('alipay', '支付宝', Icons.account_balance_wallet),
                      const SizedBox(width: 12),
                      _buildMethodCard('bank', '银行卡', Icons.credit_card),
                    ],
                  ),
                  const SizedBox(height: 24),

                  // 收款信息
                  const Text('收款信息', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600)),
                  const SizedBox(height: 12),
                  TextField(
                    controller: _nameCtrl,
                    decoration: InputDecoration(
                      labelText: '收款人姓名',
                      hintText: '请输入真实姓名',
                      prefixIcon: const Icon(Icons.person_outline),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                    ),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: _accountCtrl,
                    decoration: InputDecoration(
                      labelText: _paymentMethod == 'alipay' ? '支付宝账号' : '银行卡号',
                      hintText: _paymentMethod == 'alipay' ? '手机号或邮箱' : '请输入银行卡号',
                      prefixIcon: Icon(_paymentMethod == 'alipay'
                          ? Icons.account_balance_wallet_outlined
                          : Icons.credit_card_outlined),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                    ),
                    keyboardType: _paymentMethod == 'bank' ? TextInputType.number : TextInputType.text,
                  ),
                  const SizedBox(height: 32),

                  // 提交按钮
                  SizedBox(
                    width: double.infinity,
                    height: 48,
                    child: ElevatedButton(
                      onPressed: _loading ? null : _submit,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.blue,
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                      ),
                      child: _loading
                          ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                          : Text('提现 ¥$_selectedAmount（到账 ¥${(_selectedAmount * 0.8).toInt()}）', style: const TextStyle(fontSize: 15)),
                    ),
                  ),
                  const SizedBox(height: 16),
                  const Text(
                    '提示：提现申请提交后，管理员将在1-3个工作日内审核并打款。',
                    style: TextStyle(fontSize: 12, color: Colors.grey),
                  ),

                  // 提现记录
                  if (_records.isNotEmpty) ...[
                    const SizedBox(height: 32),
                    const Text('提现记录', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600)),
                    const SizedBox(height: 12),
                    ..._records.map((r) => _buildRecordItem(r)),
                  ],
                ],
              ),
            ),
    );
  }

  Widget _buildRecordItem(Map<String, dynamic> record) {
    final amount = record['amount'] ?? 0;
    final actualAmount = record['actualAmount'] ?? 0;
    final status = record['status'] as int? ?? 0;
    final statusText = record['statusText'] ?? '未知';
    final method = record['paymentMethod'] == 'alipay' ? '支付宝' : '银行卡';
    final createdAt = record['createdAt']?.toString() ?? '';
    String timeStr = '';
    if (createdAt.isNotEmpty) {
      try {
        final dt = DateTime.parse(createdAt).toLocal();
        timeStr = '${dt.month}/${dt.day} ${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')}';
      } catch (_) {}
    }

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
                Text('提现 ¥$amount → 到账 ¥$actualAmount',
                    style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w500)),
                const SizedBox(height: 4),
                Text('$method · $timeStr', style: const TextStyle(fontSize: 12, color: Colors.grey)),
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
                color: status == 0 ? Colors.orange : status == 1 ? Colors.green : Colors.red,
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMethodCard(String method, String label, IconData icon) {
    final selected = _paymentMethod == method;
    return Expanded(
      child: GestureDetector(
        onTap: () => setState(() => _paymentMethod = method),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 16),
          decoration: BoxDecoration(
            color: selected ? Colors.blue.shade50 : Colors.white,
            border: Border.all(color: selected ? Colors.blue : Colors.grey.shade300, width: selected ? 2 : 1),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Column(
            children: [
              Icon(icon, size: 28, color: selected ? Colors.blue : Colors.grey),
              const SizedBox(height: 6),
              Text(label, style: TextStyle(
                fontSize: 14,
                fontWeight: selected ? FontWeight.w600 : FontWeight.normal,
                color: selected ? Colors.blue : Colors.black87,
              )),
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
        Text(label, style: const TextStyle(fontSize: 14, color: Colors.black87)),
        Text(value, style: TextStyle(
          fontSize: bold ? 18 : 14,
          fontWeight: bold ? FontWeight.bold : FontWeight.normal,
          color: bold ? Colors.blue : Colors.black87,
        )),
      ],
    );
  }
}
