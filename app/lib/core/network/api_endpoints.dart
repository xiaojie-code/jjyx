/// API 端点常量，与后端路由对应
class ApiEndpoints {
  ApiEndpoints._();

  // ==================== 用户服务 ====================
  static const String register = '/api/auth/register';
  static const String login = '/api/auth/login';
  static const String passwordResetRequest = '/api/auth/password-reset/request';
  static const String me = '/api/auth/me';
  static const String updateAvatar = '/api/auth/profile/avatar';
  static const String updateNickname = '/api/auth/profile/nickname';
  static const String changePassword = '/api/auth/password';
  static const String activate = '/api/auth/activate';

  // ==================== 货币服务 ====================
  static const String currencyBalance = '/api/currency/balance';
  static const String currencyLogs = '/api/currency/logs';
  static const String currencySynthesize = '/api/currency/synthesize';
  static const String currencySynthesisConfigs =
      '/api/currency/synthesis-configs';
  static const String currencyWithdraw = '/api/currency/withdraw';
  static const String goldOverview = '/api/currency/gold/overview';
  static const String goldWithdrawTransfer =
      '/api/currency/gold/withdraw-transfer';
  static const String goldTradeList = '/api/currency/gold/trades';
  static const String goldTradeCreate = '/api/currency/gold/trades';
  static const String goldTradeQrcode = '/api/currency/gold/trades/qrcode';
  static const String goldTradeBadge = '/api/currency/gold/trades/badge';
  static const String goldTradeBadgeRead =
      '/api/currency/gold/trades/badge/read';
  static const String copperOverview = '/api/currency/copper/overview';
  static const String copperTradeList = '/api/currency/copper/trades';
  static const String copperTradeCreate = '/api/currency/copper/trades';
  static const String copperTradeBadge = '/api/currency/copper/trades/badge';
  static const String copperTradeBadgeRead =
      '/api/currency/copper/trades/badge/read';
  static const String weeklyPointReturn = '/api/auth/weekly-point-return';
  static const String signInStatus = '/api/sign-in/status';
  static const String signInClaim = '/api/sign-in/claim';

  // ==================== 社交服务 ====================
  static const String contacts = '/api/social/contacts';
  static const String contactRequest = '/api/social/contacts/request';
  static const String contactSearch = '/api/social/contacts/search';
  static const String groups = '/api/social/groups';
  static const String conversations = '/api/social/conversations';
  static const String messageSearch = '/api/social/messages/search';
  static const String voiceUpload = '/api/social/messages/voice';
  static const String imageUpload = '/api/social/messages/image';
  static const String aiChat = '/api/social/ai/chat';
  static const String userSettings = '/api/social/settings';

  // ==================== 服务通知 ====================
  static const String serviceNotifications = '/api/notifications';
  static const String serviceNotificationsUnread =
      '/api/notifications/unread-count';
  static const String serviceNotificationsReadAll =
      '/api/notifications/read-all';

  // ==================== Vendor push ====================
  static const String pushDevice = '/api/push/device';
  static const String pushStatus = '/api/push/status';
  static const String pushTest = '/api/push/test';

  // ==================== 充值 ====================
  static const String rechargeInfo = '/api/recharge/info';
  static const String rechargeSubmit = '/api/recharge/submit';
  static const String rechargeOrders = '/api/recharge/orders';

  // ==================== 商城 ====================
  static const String shopPaymentInfo = '/api/shop/payment-info';
  static const String shopAddress = '/api/shop/address';
  static const String shopOrders = '/api/shop/orders';

  // ==================== 资产包 ====================
  static const String assetOverview = '/api/asset/overview';
  static const String assetRecharge = '/api/asset/recharge';
  static const String assetRecharges = '/api/asset/recharges';
  static const String assetWithdraw = '/api/asset/withdraw';
  static const String assetWithdrawals = '/api/asset/withdrawals';
  static const String assetReferralRewards = '/api/asset/referral-rewards';

  // ==================== 游戏服务 ====================
  static const String gameList = '/api/game/list';
  static const String lotteryConfig = '/api/game/lottery/config';
  static const String lotteryStatus = '/api/game/lottery/status';
  static const String lotterySpin = '/api/game/lottery/spin';
  static const String lotteryRecords = '/api/game/lottery/records';
  static const String horseRoomCreate = '/api/game/horse/room/create';
  static const String horseRoomJoin = '/api/game/horse/room/join';
  static const String horseBet = '/api/game/horse/bet';
  static const String horseStart = '/api/game/horse/start';
  static const String horseSettle = '/api/game/horse/settle';

  // ==================== 背包服务 ====================
  static const String backpackItems = '/api/backpack/items';

  /// 动态路径辅助方法
  static String gameDetail(int id) => '/api/game/$id';
  static String gameStart(int id) => '/api/game/$id/start';
  static String gameSettle(int id) => '/api/game/$id/settle';
  static String gamePointsChange(int id) => '/api/game/$id/points/change';
  static String gamePlayDuration(int id) => '/api/game/$id/play-duration';
  static String contactRequestHandle(int id) =>
      '/api/social/contacts/request/$id';
  static String contactRemark(int id) => '/api/social/contacts/$id/remark';
  static String contactDelete(int id) => '/api/social/contacts/$id';
  static String groupDetail(int id) => '/api/social/groups/$id';
  static String groupAvatar(int id) => '/api/social/groups/$id/avatar';
  static String groupMembers(int id) => '/api/social/groups/$id/members';
  static String groupInvitation(int id) => '/api/social/groups/invitations/$id';
  static String groupMemberRole(int id, int userId) =>
      '/api/social/groups/$id/members/$userId/role';
  static String groupAllMuted(int id) => '/api/social/groups/$id/all-muted';
  static String groupMeetingActive(int id) =>
      '/api/social/groups/$id/meetings/active';
  static String groupMeetingStart(int id) => '/api/social/groups/$id/meetings';
  static String meetingRequestReview(int id) =>
      '/api/social/meeting-requests/$id/review';
  static String conversationMessages(int id) =>
      '/api/social/conversations/$id/messages';
  static String deleteMessage(int id) => '/api/social/messages/$id';
  static String updateMessage(int id) => '/api/social/messages/$id';
  static String clearConversation(int id) =>
      '/api/social/conversations/$id/messages';
  static String pinConversation(int id) => '/api/social/conversations/$id/pin';
  static String hideConversation(int id) =>
      '/api/social/conversations/$id/hide';
  static String deleteConversation(int id) => '/api/social/conversations/$id';
  static String meetingJoin(int id) => '/api/social/meetings/$id/join';
  static String meetingLeave(int id) => '/api/social/meetings/$id/leave';
  static String meetingEnd(int id) => '/api/social/meetings/$id/end';
  static String meetingKick(int id) => '/api/social/meetings/$id/kick';
  static String meetingMuteAll(int id) => '/api/social/meetings/$id/mute-all';
  static String meetingMediaControl(int id) =>
      '/api/social/meetings/$id/media-control';
  static String meetingParticipants(int id) =>
      '/api/social/meetings/$id/participants';
  static String meetingMediaConfig(int id) =>
      '/api/social/meetings/$id/media-config';
  static String horseRoom(int id) => '/api/game/horse/room/$id';
  static String backpackItemDetail(int id) => '/api/backpack/items/$id';
  static String goldTradeDetail(int id) => '/api/currency/gold/trades/$id';
  static String goldTradeCancel(int id) =>
      '/api/currency/gold/trades/$id/cancel';
  static String goldTradeConfirmPaid(int id) =>
      '/api/currency/gold/trades/$id/confirm-paid';
  static String goldTradeConfirmReceived(int id) =>
      '/api/currency/gold/trades/$id/confirm-received';
  static String copperTradeDetail(int id) => '/api/currency/copper/trades/$id';
  static String copperTradeCancel(int id) =>
      '/api/currency/copper/trades/$id/cancel';
  static String copperTradeConfirmPaid(int id) =>
      '/api/currency/copper/trades/$id/confirm-paid';
  static String copperTradeConfirmReceived(int id) =>
      '/api/currency/copper/trades/$id/confirm-received';
}
