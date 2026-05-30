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
      final result = await ref.read(apiClientProvider).get<List<dynamic>>('/api/currency/synthesis-configs');
      setState(() {
        _configs = (result ?? []).map((e) => Map<String, dynamic>.from(e)).toList();
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
      case 'gold': return '金币';
      case 'silver': return '银币';
      case 'reward': return '奖励积分';
      default: return type;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('积分合成')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _configs.isEmpty
              ? const Center(child: Text('暂无合成配置'))
              : ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: _configs.length,
                  itemBuilder: (context, index) {
                    final c = _configs[index];
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
                                Text('积分 → ${_currencyName(target)}', style: const TextStyle(fontWeight: FontWeight.w600)),
                                const SizedBox(height: 4),
                                Text('${consume.toInt()} 积分 = ${amount.toInt()} ${_currencyName(target)}',
                                    style: const TextStyle(fontSize: 13, color: Colors.grey)),
                              ],
                            ),
                          ),
                          ElevatedButton(
                            onPressed: _synthesizing == id ? null : () => _synthesize(id),
                            child: _synthesizing == id
                                ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2))
                                : const Text('合成'),
                          ),
                        ],
                      ),
                    );
                  },
                ),
    );
  }
}
