import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';
import '../../../core/network/api_endpoints.dart';
import '../../../core/utils/toast.dart';

class WeeklyPointReturnPage extends ConsumerStatefulWidget {
  const WeeklyPointReturnPage({super.key});

  @override
  ConsumerState<WeeklyPointReturnPage> createState() =>
      _WeeklyPointReturnPageState();
}

class _WeeklyPointReturnPageState extends ConsumerState<WeeklyPointReturnPage> {
  bool _loading = true;
  Map<String, dynamic> _data = {};

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() => _loading = true);
    try {
      final result = await ref
          .read(apiClientProvider)
          .get<Map<String, dynamic>>(ApiEndpoints.weeklyPointReturn);
      if (!mounted) return;
      setState(() {
        _data = result ?? {};
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() => _loading = false);
      Toast.error(context, apiErrorMessage(e, fallback: '积分返还加载失败'));
    }
  }

  double _num(dynamic value) {
    if (value is num) return value.toDouble();
    return double.tryParse(value?.toString() ?? '') ?? 0;
  }

  int _int(dynamic value) {
    if (value is int) return value;
    if (value is num) return value.toInt();
    return int.tryParse(value?.toString() ?? '') ?? 0;
  }

  String _amount(dynamic value, {int digits = 2}) {
    final n = _num(value);
    if (n % 1 == 0) return n.toInt().toString();
    return n.toStringAsFixed(digits);
  }

  String _summaryAmount(dynamic value) => _num(value).toStringAsFixed(2);

  String _dateRange(Map<String, dynamic> item, String startKey, String endKey) {
    final start = item[startKey]?.toString() ?? '';
    final end = item[endKey]?.toString() ?? '';
    if (start.isEmpty && end.isEmpty) return '-';
    if (start.isEmpty) return end;
    if (end.isEmpty) return start;
    return '$start 至 $end';
  }

  String _statusText(dynamic value) {
    switch (_int(value)) {
      case 0:
        return '返还中';
      case 1:
        return '已完成';
      case 2:
        return '无可返还';
      default:
        return '未知';
    }
  }

  Color _statusColor(dynamic value) {
    switch (_int(value)) {
      case 0:
        return Colors.orange;
      case 1:
        return Colors.green;
      case 2:
        return Colors.grey;
      default:
        return Colors.blueGrey;
    }
  }

  @override
  Widget build(BuildContext context) {
    final current = _data['current'] is Map
        ? Map<String, dynamic>.from(_data['current'] as Map)
        : null;
    final schedule = _listOfMaps(_data['schedule']);
    final history = _listOfMaps(_data['history']);
    final cumulativePeriods = _listOfMaps(_data['cumulativePeriods']);
    final cumulativeSummary = _data['cumulativeSummary'] is Map
        ? Map<String, dynamic>.from(_data['cumulativeSummary'] as Map)
        : <String, dynamic>{
            'expectedReturnPoints': _data['historicalReturnedPoints'],
            'returnedPoints': _data['historicalReturnedPoints'],
            'pendingReturnPoints': 0,
          };

    return Scaffold(
      appBar: AppBar(title: const Text('积分返还')),
      backgroundColor: const Color(0xFFF5F6FA),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _loadData,
              child: ListView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.all(16),
                children: [
                  _cumulativeTotalCard(cumulativeSummary, cumulativePeriods),
                  const SizedBox(height: 12),
                  if (current == null)
                    _emptyCard()
                  else ...[
                    _summaryCard(current),
                    const SizedBox(height: 12),
                    _progressCard(current),
                    const SizedBox(height: 12),
                    _scheduleCard(schedule),
                    const SizedBox(height: 12),
                    _historyCard(history),
                  ],
                ],
              ),
            ),
    );
  }

  Widget _cumulativeTotalCard(
    Map<String, dynamic> summary,
    List<Map<String, dynamic>> periods,
  ) {
    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(12),
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: () => _showCumulativeDetails(summary, periods),
        child: Padding(
          padding: const EdgeInsets.all(18),
          child: Row(
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: const BoxDecoration(
                  color: Color(0xFFEAF2FF),
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.account_balance_wallet_rounded,
                  color: Color(0xFF3478F6),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      '累计应返积分',
                      style: TextStyle(fontSize: 14, color: Colors.grey),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      _summaryAmount(summary['expectedReturnPoints']),
                      style: const TextStyle(
                        color: Color(0xFF3478F6),
                        fontSize: 24,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 3),
                    Text(
                      '已返 ${_amount(summary['returnedPoints'])}  ·  待返 ${_amount(summary['pendingReturnPoints'])}',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        color: Color(0xFF7B8494),
                        fontSize: 12,
                      ),
                    ),
                  ],
                ),
              ),
              const Text(
                '查看明细',
                style: TextStyle(
                  color: Color(0xFF409EFF),
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                ),
              ),
              const SizedBox(width: 4),
              const Icon(
                Icons.chevron_right_rounded,
                color: Color(0xFF98A2B3),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _showCumulativeDetails(
    Map<String, dynamic> summary,
    List<Map<String, dynamic>> periods,
  ) async {
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (sheetContext) => SafeArea(
        child: SizedBox(
          height: MediaQuery.sizeOf(sheetContext).height * 0.82,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Padding(
                padding: EdgeInsets.fromLTRB(20, 0, 20, 12),
                child: Text(
                  '累计应返明细',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                ),
              ),
              const Divider(height: 1),
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 14, 20, 12),
                child: Row(
                  children: [
                    Expanded(
                      child: _miniStat(
                        '累计消费',
                        _amount(summary['consumedPoints'], digits: 6),
                      ),
                    ),
                    Expanded(
                      child: _miniStat(
                        '累计已返',
                        _amount(summary['returnedPoints'], digits: 6),
                      ),
                    ),
                    Expanded(
                      child: _miniStat(
                        '累计待返',
                        _amount(summary['pendingReturnPoints'], digits: 6),
                      ),
                    ),
                  ],
                ),
              ),
              const Divider(height: 1),
              Expanded(
                child: periods.isEmpty
                    ? const Center(
                        child: Text(
                          '暂无返还周期记录',
                          style: TextStyle(color: Colors.grey),
                        ),
                      )
                    : ListView.builder(
                        padding: const EdgeInsets.only(bottom: 16),
                        itemCount: periods.length,
                        itemBuilder: (context, index) {
                          final period = periods[index];
                          final consumptions =
                              _listOfMaps(period['consumptionRecords']);
                          final returns = _listOfMaps(period['returnRecords']);
                          return ExpansionTile(
                            tilePadding: const EdgeInsets.symmetric(
                              horizontal: 20,
                              vertical: 2,
                            ),
                            childrenPadding:
                                const EdgeInsets.fromLTRB(20, 0, 20, 16),
                            title: Text(
                              _dateRange(
                                period,
                                'weekStartDate',
                                'weekEndDate',
                              ),
                              style:
                                  const TextStyle(fontWeight: FontWeight.w700),
                            ),
                            subtitle: Padding(
                              padding: const EdgeInsets.only(top: 4),
                              child: Text(
                                '消费 ${_amount(period['totalConsumedPoints'], digits: 6)}  ·  应返 ${_amount(period['expectedReturnPoints'], digits: 6)}  ·  ${_statusText(period['status'])}',
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: TextStyle(
                                  color: _statusColor(period['status']),
                                  fontSize: 12,
                                ),
                              ),
                            ),
                            children: [
                              _detailRow(
                                '可返还消费',
                                _amount(
                                  period['eligibleConsumedPoints'],
                                  digits: 6,
                                ),
                              ),
                              _detailRow(
                                '排除消费',
                                _amount(
                                  period['excludedConsumedPoints'],
                                  digits: 6,
                                ),
                              ),
                              _detailRow(
                                '已返还',
                                _amount(period['returnedPoints'], digits: 6),
                              ),
                              _detailRow(
                                '待返还',
                                _amount(
                                  period['pendingReturnPoints'],
                                  digits: 6,
                                ),
                              ),
                              const Divider(height: 24),
                              _recordTitle('消费记录', consumptions.length),
                              if (consumptions.isEmpty)
                                _emptyDetailText('本周期暂无消费记录')
                              else
                                ...consumptions.map(_consumptionRecord),
                              const Divider(height: 24),
                              _recordTitle('返还记录', returns.length),
                              if (returns.isEmpty)
                                _emptyDetailText('本周期暂无已返还记录')
                              else
                                ...returns.map(_returnRecord),
                            ],
                          );
                        },
                      ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _detailRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: [
          Expanded(
            child: Text(label, style: const TextStyle(color: Colors.grey)),
          ),
          Text(value, style: const TextStyle(fontWeight: FontWeight.w600)),
        ],
      ),
    );
  }

  Widget _recordTitle(String title, int count) {
    return Align(
      alignment: Alignment.centerLeft,
      child: Text(
        '$title（$count）',
        style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold),
      ),
    );
  }

  Widget _emptyDetailText(String text) {
    return Padding(
      padding: const EdgeInsets.only(top: 10),
      child: Align(
        alignment: Alignment.centerLeft,
        child: Text(text, style: const TextStyle(color: Colors.grey)),
      ),
    );
  }

  Widget _consumptionRecord(Map<String, dynamic> item) {
    final eligible = item['isEligible'] == true;
    final description = item['description']?.toString().trim() ?? '';
    return ListTile(
      dense: true,
      contentPadding: EdgeInsets.zero,
      title: Text(description.isEmpty
          ? item['logType']?.toString() ?? '积分消费'
          : description),
      subtitle: Text(
        '${item['createdAt'] ?? '-'}  ·  ${eligible ? '计入返还' : '不计返还'}',
        style: TextStyle(color: eligible ? Colors.grey : Colors.orange),
      ),
      trailing: Text(
        '-${_amount(item['consumedPoints'], digits: 6)}',
        style: const TextStyle(
          color: Color(0xFFD64545),
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }

  Widget _returnRecord(Map<String, dynamic> item) {
    return ListTile(
      dense: true,
      contentPadding: EdgeInsets.zero,
      title: Text('第 ${_int(item['dayIndex'])} 天返还'),
      subtitle: Text(item['returnDate']?.toString() ?? '-'),
      trailing: Text(
        '+${_amount(item['returnAmount'], digits: 6)}',
        style: const TextStyle(
          color: Color(0xFF28A745),
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }

  List<Map<String, dynamic>> _listOfMaps(dynamic value) {
    if (value is! List) return <Map<String, dynamic>>[];
    return value
        .whereType<Map>()
        .map((item) => Map<String, dynamic>.from(item))
        .toList();
  }

  Widget _emptyCard() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 34),
      decoration: _cardDecoration(),
      child: const Column(
        children: [
          Icon(
            Icons.account_balance_wallet_outlined,
            size: 44,
            color: Colors.grey,
          ),
          SizedBox(height: 12),
          Text(
            '暂无本周返还数据',
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
          ),
          SizedBox(height: 6),
          Text(
            '有符合规则的积分消费后，会在下个返还周期展示。',
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: 13, color: Colors.grey),
          ),
        ],
      ),
    );
  }

  Widget _summaryCard(Map<String, dynamic> current) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(18),
      decoration: _cardDecoration(),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Expanded(
                child: Text(
                  '本周待返还',
                  style: TextStyle(fontSize: 14, color: Colors.grey),
                ),
              ),
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: _statusColor(current['status']).withOpacity(0.1),
                  borderRadius: BorderRadius.circular(999),
                ),
                child: Text(
                  _statusText(current['status']),
                  style: TextStyle(
                    color: _statusColor(current['status']),
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            _summaryAmount(current['pendingReturnPoints']),
            style: const TextStyle(
              fontSize: 34,
              fontWeight: FontWeight.bold,
              color: Color(0xFFE58A00),
            ),
          ),
          const SizedBox(height: 4),
          Text(
            '返还周期：${_dateRange(current, 'returnWeekStartDate', 'returnWeekEndDate')}',
            style: const TextStyle(fontSize: 13, color: Colors.grey),
          ),
          const Divider(height: 28),
          Row(
            children: [
              Expanded(
                  child: _miniStat('已返还', _amount(current['returnedPoints']))),
              Expanded(
                  child: _miniStat(
                      '预计总返还', _amount(current['expectedReturnPoints']))),
              Expanded(
                  child:
                      _miniStat('下次预计', _amount(current['nextReturnAmount']))),
            ],
          ),
          const SizedBox(height: 14),
          Row(
            children: [
              Expanded(
                  child: _miniStat('消费周期',
                      _dateRange(current, 'weekStartDate', 'weekEndDate'))),
              Expanded(
                  child: _miniStat(
                      '上周消费', _amount(current['totalConsumedPoints']))),
            ],
          ),
        ],
      ),
    );
  }

  Widget _progressCard(Map<String, dynamic> current) {
    final paidDays = _int(current['paidDays']).clamp(0, 7).toInt();
    final progress = paidDays / 7;
    return _section(
      title: '返还进度',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  '已返还 $paidDays / 7 天',
                  style: const TextStyle(fontWeight: FontWeight.w600),
                ),
              ),
              Text(
                '剩余 ${_int(current['unpaidDays'])} 天',
                style: const TextStyle(color: Colors.grey),
              ),
            ],
          ),
          const SizedBox(height: 10),
          ClipRRect(
            borderRadius: BorderRadius.circular(999),
            child: LinearProgressIndicator(
              value: progress,
              minHeight: 8,
              backgroundColor: const Color(0xFFE9EEF7),
              color: const Color(0xFF409EFF),
            ),
          ),
          const SizedBox(height: 14),
          Row(
            children: [
              Expanded(
                  child: _miniStat(
                      '可返还消费', _amount(current['eligibleConsumedPoints']))),
              Expanded(
                  child: _miniStat(
                      '排除消费', _amount(current['excludedConsumedPoints']))),
              Expanded(
                  child: _miniStat(
                      '剩余基数', _amount(current['remainingBasePoints']))),
            ],
          ),
        ],
      ),
    );
  }

  Widget _scheduleCard(List<Map<String, dynamic>> schedule) {
    return _section(
      title: '每日明细',
      child: schedule.isEmpty
          ? const Padding(
              padding: EdgeInsets.symmetric(vertical: 18),
              child: Center(
                  child: Text('暂无明细', style: TextStyle(color: Colors.grey))),
            )
          : Column(
              children: schedule.map((item) {
                final paid = item['paid'] == true;
                return Padding(
                  padding: const EdgeInsets.only(bottom: 10),
                  child: Row(
                    children: [
                      Container(
                        width: 30,
                        height: 30,
                        alignment: Alignment.center,
                        decoration: BoxDecoration(
                          color: paid
                              ? const Color(0xFFE8F6ED)
                              : const Color(0xFFF2F4F8),
                          shape: BoxShape.circle,
                        ),
                        child: Text(
                          '${_int(item['dayIndex'])}',
                          style: TextStyle(
                            color: paid ? Colors.green : Colors.grey,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              item['returnDate']?.toString() ?? '',
                              style:
                                  const TextStyle(fontWeight: FontWeight.w600),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              paid ? '已到账' : '待返还',
                              style: TextStyle(
                                fontSize: 12,
                                color: paid ? Colors.green : Colors.grey,
                              ),
                            ),
                          ],
                        ),
                      ),
                      Text(
                        '+${_amount(item['returnAmount'], digits: 6)}',
                        style: TextStyle(
                          color: paid ? Colors.green : const Color(0xFFE58A00),
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                );
              }).toList(),
            ),
    );
  }

  Widget _historyCard(List<Map<String, dynamic>> history) {
    return _section(
      title: '历史周期',
      child: history.isEmpty
          ? const Padding(
              padding: EdgeInsets.symmetric(vertical: 18),
              child: Center(
                  child: Text('暂无历史周期', style: TextStyle(color: Colors.grey))),
            )
          : Column(
              children: history.map((item) {
                return Padding(
                  padding: const EdgeInsets.only(bottom: 10),
                  child: Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              _dateRange(item, 'weekStartDate', 'weekEndDate'),
                              style:
                                  const TextStyle(fontWeight: FontWeight.w600),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              '消费 ${_amount(item['totalConsumedPoints'])} · 已返还 ${_amount(item['returnedPoints'])}',
                              style: const TextStyle(
                                  fontSize: 12, color: Colors.grey),
                            ),
                          ],
                        ),
                      ),
                      Text(
                        _statusText(item['status']),
                        style: TextStyle(
                          color: _statusColor(item['status']),
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                );
              }).toList(),
            ),
    );
  }

  Widget _section({required String title, required Widget child}) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: _cardDecoration(),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title,
              style:
                  const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
          const SizedBox(height: 14),
          child,
        ],
      ),
    );
  }

  Widget _miniStat(String label, String value) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          value,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 4),
        Text(label, style: const TextStyle(fontSize: 12, color: Colors.grey)),
      ],
    );
  }

  BoxDecoration _cardDecoration() {
    return BoxDecoration(
      color: Colors.white,
      borderRadius: BorderRadius.circular(12),
      boxShadow: [
        BoxShadow(
          color: Colors.black.withOpacity(0.04),
          blurRadius: 12,
          offset: const Offset(0, 4),
        ),
      ],
    );
  }
}
