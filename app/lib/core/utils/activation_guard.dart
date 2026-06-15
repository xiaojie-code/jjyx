import 'package:flutter/material.dart';
import 'toast.dart';

/// 未激活状态拦截，点击功能时提示"请激活"
bool checkActivation(BuildContext context, bool isActivated) {
  if (!isActivated) {
    Toast.error(context, '请先激活');
    return false;
  }
  return true;
}
