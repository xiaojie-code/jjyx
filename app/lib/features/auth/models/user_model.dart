class UserModel {
  final int id;
  final String account;
  final String nickname;
  final String avatar;
  final bool isActivated;

  UserModel({
    required this.id,
    required this.account,
    required this.nickname,
    required this.avatar,
    required this.isActivated,
  });

  factory UserModel.fromJson(Map<String, dynamic> json) {
    return UserModel(
      id: json['id'] as int,
      account: json['account'] as String? ?? '',
      nickname: json['nickname'] as String? ?? '',
      avatar: json['avatar'] as String? ?? '',
      isActivated: json['isActivated'] as bool? ?? false,
    );
  }
}

class CurrencyModel {
  final double points;
  final double gold;
  final double silver;
  final double specialPointsTier1;
  final double specialPointsTier2;
  final double specialPointsTier3;
  final double rewardPoints;
  final double invitePoints;

  CurrencyModel({
    required this.points,
    required this.gold,
    required this.silver,
    required this.specialPointsTier1,
    required this.specialPointsTier2,
    required this.specialPointsTier3,
    required this.rewardPoints,
    required this.invitePoints,
  });

  factory CurrencyModel.fromJson(Map<String, dynamic> json) {
    return CurrencyModel(
      points: (json['points'] as num?)?.toDouble() ?? 0,
      gold: (json['gold'] as num?)?.toDouble() ?? 0,
      silver: (json['silver'] as num?)?.toDouble() ?? 0,
      specialPointsTier1: (json['specialPointsTier1'] as num?)?.toDouble() ?? 0,
      specialPointsTier2: (json['specialPointsTier2'] as num?)?.toDouble() ?? 0,
      specialPointsTier3: (json['specialPointsTier3'] as num?)?.toDouble() ?? 0,
      rewardPoints: (json['rewardPoints'] as num?)?.toDouble() ?? 0,
      invitePoints: (json['invitePoints'] as num?)?.toDouble() ?? 0,
    );
  }
}

class ProfileModel {
  final UserModel user;
  final int shares;
  final String inviteCode;
  final CurrencyModel? currency;

  ProfileModel({
    required this.user,
    required this.shares,
    required this.inviteCode,
    this.currency,
  });

  factory ProfileModel.fromJson(Map<String, dynamic> json) {
    return ProfileModel(
      user: UserModel(
        id: json['id'] as int,
        account: json['account'] as String? ?? '',
        nickname: json['nickname'] as String? ?? '',
        avatar: json['avatar'] as String? ?? '',
        isActivated: json['isActivated'] as bool? ?? false,
      ),
      shares: json['shares'] as int? ?? 0,
      inviteCode: json['inviteCode'] as String? ?? '',
      currency: json['currency'] != null
          ? CurrencyModel.fromJson(json['currency'])
          : null,
    );
  }
}
