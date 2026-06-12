import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/api_client.dart';
import '../../../core/network/api_endpoints.dart';
import '../../../core/utils/toast.dart';

class SynthesizePage extends ConsumerStatefulWidget {
  const SynthesizePage({super.key});

  @override
  ConsumerState<SynthesizePage> createState() => _SynthesizePageState();
}

class _SynthesizePageState extends ConsumerState<SynthesizePage> {
  List<Map<String, dynamic>> _configs = [];
  bool _loading = true;
  int? _synthesizing;

  @override
  void initState() {
    super.initState();
    _loadConfigs();
  }

  Future<void> _loadConfigs() async {
    try {
      // 合成配置从后端获取（复用 currency 相关接口）
      final result = await ref
          .read(apiClientProvider)
          .get<List<dynamic>>('/api/currency/synthesis-configs');
      setState(() {
        _configs =
            (result ?? []).map((e) => Map<String, dynamic>.from(e)).toList();
        _loading = false;
      });
    } catch (e) {
      setState(() => _loading = false);
    }
  }

  Future<void> _synthesize(int configId) async {
    setState(() => _synthesizing = configId);
    try {
      await ref.read(apiClientProvider).post(
        ApiEndpoints.currencySynthesize,
        data: {'configId': configId},
      );
      if (mounted) {
        Toast.success(context, '合成成功');
      }
    } catch (e) {
      if (mounted) Toast.error(context, '$e');
    } finally {
      if (mounted) setState(() => _synthesizing = null);
    }
  }

  String _currencyName(String type) {
    switch (type) {
      case 'gold':
        return '金币';
      case 'silver':
        return '银币';
      case 'reward':
        return '奖励积分';
      default:
        return type;
    }
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
                const SizedBox(height: 8),
                _buildDisabledQuantityStepper(),
              ],
            ),
          ),
          const SizedBox(width: 12),
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

  Widget _buildDisabledQuantityStepper() {
    return Container(
      height: 34,
      decoration: BoxDecoration(
        color: const Color(0xFFF2F4F7),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: const Color(0xFFE4E7EC)),
      ),
      child: const Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          SizedBox(
            width: 34,
            child: Icon(Icons.remove, color: Color(0xFFB8C0CC), size: 17),
          ),
          SizedBox(
            width: 42,
            child: Center(
              child: Text(
                '0',
                style: TextStyle(
                  color: Color(0xFF98A2B3),
                  fontSize: 14,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ),
          ),
          SizedBox(
            width: 34,
            child: Icon(Icons.add, color: Color(0xFFB8C0CC), size: 17),
          ),
        ],
      ),
    );
  }

  Widget _buildConfigCard(Map<String, dynamic> c) {
    final id = c['id'] as int;
    final consume = (c['consumePoints'] as num?)?.toDouble() ?? 0;
    final target = c['targetCurrency'] as String? ?? '';
    final amount = (c['targetAmount'] as num?)?.toDouble() ?? 0;

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(10),
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '积分 → ${_currencyName(target)}',
                  style: const TextStyle(fontWeight: FontWeight.w600),
                ),
                const SizedBox(height: 4),
                Text(
                  '${consume.toInt()} 积分 = ${amount.toInt()} ${_currencyName(target)}',
                  style: const TextStyle(fontSize: 13, color: Colors.grey),
                ),
              ],
            ),
          ),
          ElevatedButton(
            onPressed: _synthesizing == id ? null : () => _synthesize(id),
            child: _synthesizing == id
                ? const SizedBox(
                    width: 16,
                    height: 16,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Text('合成'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('积分合成')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                _buildDisabledSynthesisCard(
                  title: '合成金币',
                  icon: Icons.monetization_on_rounded,
                  color: const Color(0xFFF59E0B),
                ),
                _buildDisabledSynthesisCard(
                  title: '合成银币',
                  icon: Icons.paid_rounded,
                  color: const Color(0xFF667085),
                ),
                if (_configs.isEmpty)
                  const Padding(
                    padding: EdgeInsets.only(top: 8),
                    child: Center(
                      child: Text(
                        '暂无可用合成配置',
                        style: TextStyle(color: Colors.grey),
                      ),
                    ),
                  )
                else ...[
                  const SizedBox(height: 4),
                  ..._configs.map(_buildConfigCard),
                ],
              ],
            ),
    );
  }
}
