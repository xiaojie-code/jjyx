Map<String, dynamic>? normalizeActiveMeeting(Map<String, dynamic>? meeting) {
  if (meeting == null) return null;
  final status = int.tryParse(meeting['status']?.toString() ?? '1') ?? 1;
  if (status != 1) return null;

  final participants = meeting['participants'];
  if (participants is! List) return meeting;

  final hasOnlineParticipant = participants.any((item) {
    if (item is! Map) return false;
    final isKicked = item['isKicked'] == true ||
        item['is_kicked'] == true ||
        item['isKicked']?.toString() == '1' ||
        item['is_kicked']?.toString() == '1';
    if (isKicked) return false;
    if (item['isOnline'] == true) return true;
    final leftAt = item['leftAt'] ?? item['left_at'];
    return leftAt == null || leftAt.toString().isEmpty;
  });

  return hasOnlineParticipant ? meeting : null;
}
