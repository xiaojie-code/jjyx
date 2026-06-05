package com.example.app

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.FileProvider
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel
import java.io.File

class MainActivity: FlutterActivity() {
    private val apkChannelName = "com.example.app/apk_installer"
    private val notifChannelName = "com.example.app/notifications"
    private val NOTIFICATION_CHANNEL_ID = "new_message"

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)

        createNotificationChannel()

        // APK 安装器 channel
        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, apkChannelName).setMethodCallHandler { call, result ->
            when (call.method) {
                "installApk" -> {
                    val apkPath = call.argument<String>("path")
                    if (apkPath.isNullOrBlank()) {
                        result.error("invalid_path", "APK path is empty", null)
                    } else {
                        installApk(apkPath, result)
                    }
                }
                else -> result.notImplemented()
            }
        }

        // 通知 channel
        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, notifChannelName).setMethodCallHandler { call, result ->
            when (call.method) {
                "showNotification" -> {
                    val id = call.argument<Int>("id") ?: 0
                    val title = call.argument<String>("title") ?: "新消息"
                    val body = call.argument<String>("body") ?: ""
                    val conversationId = call.argument<Int>("conversationId") ?: 0
                    showNotification(id, title, body, conversationId)
                    result.success(true)
                }
                "showDownloadProgress" -> {
                    val progress = call.argument<Int>("progress") ?: 0
                    val indeterminate = call.argument<Boolean>("indeterminate") ?: false
                    showDownloadProgress(progress, indeterminate)
                    result.success(true)
                }
                "cancelDownloadProgress" -> {
                    cancelDownloadProgress()
                    result.success(true)
                }
                else -> result.notImplemented()
            }
        }
    }

    private val DOWNLOAD_CHANNEL_ID = "app_download"
    private val DOWNLOAD_NOTIFICATION_ID = 100001

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            val channel = NotificationChannel(
                NOTIFICATION_CHANNEL_ID,
                "新消息",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "新消息通知"
                enableVibration(true)
            }
            manager.createNotificationChannel(channel)

            // 下载进度通知 channel（低优先级，不打扰）
            val downloadChannel = NotificationChannel(
                DOWNLOAD_CHANNEL_ID,
                "应用更新",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "应用更新下载进度"
                enableVibration(false)
                setSound(null, null)
            }
            manager.createNotificationChannel(downloadChannel)
        }
    }

    private fun showDownloadProgress(progress: Int, indeterminate: Boolean) {
        val notification = NotificationCompat.Builder(this, DOWNLOAD_CHANNEL_ID)
            .setSmallIcon(android.R.drawable.stat_sys_download)
            .setContentTitle("正在下载更新")
            .setContentText(if (indeterminate) "准备下载..." else "已下载 $progress%")
            .setProgress(100, progress, indeterminate)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .build()
        try {
            NotificationManagerCompat.from(this).notify(DOWNLOAD_NOTIFICATION_ID, notification)
        } catch (_: SecurityException) {
        }
    }

    private fun cancelDownloadProgress() {
        try {
            NotificationManagerCompat.from(this).cancel(DOWNLOAD_NOTIFICATION_ID)
        } catch (_: Exception) {
        }
    }

    private fun showNotification(id: Int, title: String, body: String, conversationId: Int) {
        // 点击通知时打开 App
        val intent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            putExtra("conversationId", conversationId)
            putExtra("title", title)
        }
        val pendingIntent = PendingIntent.getActivity(
            this, conversationId, intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val notification = NotificationCompat.Builder(this, NOTIFICATION_CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentTitle(title)
            .setContentText(body)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
            .setContentIntent(pendingIntent)
            .setDefaults(NotificationCompat.DEFAULT_SOUND or NotificationCompat.DEFAULT_VIBRATE)
            .build()

        try {
            NotificationManagerCompat.from(this).notify(id, notification)
        } catch (_: SecurityException) {
            // 通知权限未授予，静默忽略
        }
    }

    private fun installApk(apkPath: String, result: MethodChannel.Result) {
        try {
            val apkFile = File(apkPath)
            if (!apkFile.exists()) {
                result.error("file_not_found", "APK file not found", null)
                return
            }

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && !packageManager.canRequestPackageInstalls()) {
                val intent = Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES).apply {
                    data = Uri.parse("package:$packageName")
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                startActivity(intent)
                result.error("permission_required", "Please allow this app to install unknown apps", null)
                return
            }

            val apkUri = FileProvider.getUriForFile(
                this,
                "$packageName.fileprovider",
                apkFile,
            )
            val intent = Intent(Intent.ACTION_VIEW).apply {
                setDataAndType(apkUri, "application/vnd.android.package-archive")
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
            }
            startActivity(intent)
            result.success(true)
        } catch (e: Exception) {
            result.error("install_failed", e.message, null)
        }
    }
}
