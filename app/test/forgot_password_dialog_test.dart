import 'dart:async';

import 'package:competitive_game_platform/features/auth/widgets/forgot_password_dialog.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

Future<void> openDialog(
  WidgetTester tester,
  Future<void> Function(String, String) onSubmit, {
  ValueChanged<bool?>? onResult,
}) async {
  await tester.pumpWidget(MaterialApp(
    home: Scaffold(
      body: Builder(builder: (context) {
        return TextButton(
          onPressed: () async {
            final result = await showDialog<bool>(
              context: context,
              barrierDismissible: false,
              builder: (_) => ForgotPasswordDialog(
                initialAccount: 'test-account',
                onSubmit: onSubmit,
              ),
            );
            onResult?.call(result);
          },
          child: const Text('Open'),
        );
      }),
    ),
  ));
  await tester.tap(find.text('Open'));
  await tester.pumpAndSettle();
}

void main() {
  testWidgets('submission survives closing animation and reopening',
      (tester) async {
    bool? result;
    var calls = 0;
    final pending = Completer<void>();
    await openDialog(tester, (account, phone) {
      expect(account, 'test-account');
      expect(phone, '13800138000');
      calls++;
      return pending.future;
    }, onResult: (value) => result = value);
    await tester.enterText(find.byType(TextField).last, '13800138000');
    await tester.tap(find.text('确认发送'));
    await tester.pump();
    expect(
        tester
            .widget<TextButton>(find.widgetWithText(TextButton, '取消'))
            .onPressed,
        isNull);
    await tester.binding.handlePopRoute();
    await tester.pump();
    expect(find.byType(ForgotPasswordDialog), findsOneWidget);
    pending.complete();
    await tester.pump();
    // Exercise rebuilds while the route is still animating out.
    await tester.pump(const Duration(milliseconds: 50));
    expect(tester.takeException(), isNull);
    await tester.pumpAndSettle();
    expect(result, isTrue);
    expect(calls, 1);
    expect(find.byType(ForgotPasswordDialog), findsNothing);
    await tester.tap(find.text('Open'));
    await tester.pumpAndSettle();
    expect(
        tester.widget<TextField>(find.byType(TextField).last).controller!.text,
        isEmpty);
    await tester.tap(find.text('取消'));
    await tester.pumpAndSettle();
    expect(result, isFalse);
    expect(tester.takeException(), isNull);
  });

  testWidgets('validation and API failure keep fields available for retry',
      (tester) async {
    var calls = 0;
    await openDialog(tester, (_, __) async {
      calls++;
      if (calls == 1) throw Exception('request failed');
    });
    await tester.enterText(find.byType(TextField).last, '123');
    await tester.tap(find.text('确认发送'));
    await tester.pump();
    expect(calls, 0);
    expect(find.text('请输入正确的11位手机号'), findsOneWidget);
    await tester.enterText(find.byType(TextField).last, '13800138000');
    await tester.tap(find.text('确认发送'));
    await tester.pumpAndSettle();
    expect(find.text('Exception: request failed'), findsOneWidget);
    expect(
        tester.widget<TextField>(find.byType(TextField).last).controller!.text,
        '13800138000');
    await tester.tap(find.text('确认发送'));
    await tester.pumpAndSettle();
    expect(calls, 2);
    expect(find.byType(ForgotPasswordDialog), findsNothing);
    expect(tester.takeException(), isNull);
  });

  testWidgets('late completion after page removal is ignored', (tester) async {
    final pending = Completer<void>();
    await openDialog(tester, (_, __) => pending.future);
    await tester.enterText(find.byType(TextField).last, '13800138000');
    await tester.tap(find.text('确认发送'));
    await tester.pump();
    await tester.pumpWidget(const SizedBox());
    pending.complete();
    await tester.pumpAndSettle();
    expect(tester.takeException(), isNull);
  });
}
