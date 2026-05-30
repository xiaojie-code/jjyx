import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/api_client.dart';
import '../../../core/network/api_endpoints.dart';

class CurrencyDetailPage extends ConsumerStatefulWidget {
  final String? currencyType;
  const CurrencyDetailPage({super.key, this.currencyType});

  @override
  ConsumerState<CurrencyDetailPage> createState() => _CurrencyDetailPageState();
}

class _CurrencyDetailPageState extends ConsumerState<CurrencyDetailPage> {
  List<dynamic> _logs = [];
  bool _loading = true;
  int _page = 1;

  @override
  void initState() {
    super.initState();
    _loadLogs();
  }

  Future<void> _loadLogs() async {
    setState(() => _loading = true);
    try {
      final params = <String, dynamic>{'page': _page, 'pageSize': 20};
      if (widget.currencyType != null) params['currencyType'] = widget.currencyType;
      final result = await ref.read(apiClientProvider).get<Map<String, dynamic>>(
        ApiEndpoints.currencyLogs,
        queryParameters: params,
      );
      setState(() {
        _logs = (result?['list'] as List?) ?? [];
        _loading = false;
      });
    } catch (e) {
      setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('货币明细')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _logs.isEmpty
              ? const Center(child: Text('暂无记录'))
              : ListView.builder(
                  itemCount: _logs.length,
                  itemBuilder: (context, index) {
                    final log = _logs[index] as Map<String, dynamic>;
                    final amount = (log['amount'] as num?)?.toDouble() ?? 0;
                    return ListTile(
                      title: Text(log['description'] ?? ''),
                      subtitle: Text('${log['currencyType']} · ${log['createdAt']}'),
                      trailing: Text(
                        amount >= 0 ? '+${amount.toStringAsFixed(2)}' : amount.toStringAsFixed(2),
                        style: TextStyle(
                          color: amount >= 0 ? Colors.green : Colors.red,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    );
                  },
                ),
    );
  }
}
