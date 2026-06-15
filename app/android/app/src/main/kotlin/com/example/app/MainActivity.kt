package com.example.app

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.media.AudioAttributes
import android.media.Ringtone
import android.media.RingtoneManager
import android.net.Uri
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.provider.Settings
import android.view.WindowInsets
import android.view.WindowInsetsController
import android.view.WindowManager
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
    private val pushChannelName = "com.example.app/push"
    private val windowChannelName = "com.example.app/window"
    private val NOTIFICATION_CHANNEL_ID = "new_message_alert_v2"
    private val mainHandler = Handler(Looper.getMainLooper())
    private var activeRingtone: Ringtone? = null
    private var notificationChannel: MethodChannel? = null
    private var pendingNotificationTap: HashMap<String, Any?>? = null

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
        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, pushChannelName).setMethodCallHandler { call, result ->
            when (call.method) {
                "getPushDeviceInfo" -> {
                    result.success(getPushDeviceInfo(includeToken = false))
                }
                "registerVendorPush" -> {
                    result.success(getPushDeviceInfo(includeToken = true))
                }
                else -> result.notImplemented()
            }
        }

        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, windowChannelName).setMethodCallHandler { call, result ->
            when (call.method) {
                "enterGameFullscreen" -> {
                    configureGameFullscreenWindow()
                    result.success(true)
                }
                "exitGameFullscreen" -> {
                    restoreAppWindow()
                    result.success(true)
                }
                else -> result.notImplemented()
            }
        }

        notificationChannel = MethodChannel(flutterEngine.dartExecutor.binaryMessenger, notifChannelName)
        notificationChannel?.setMethodCallHandler { call, result ->
            when (call.method) {
                "showNotification" -> {
                    val id = call.argument<Int>("id") ?: 0
                    val title = call.argument<String>("title") ?: "新消息"
                    val body = call.argument<String>("body") ?: ""
                    val conversationId = call.argument<Int>("conversationId") ?: 0
                    val playSound = call.argument<Boolean>("playSound") ?: true
                    showNotification(id, title, body, conversationId, playSound)
                    result.success(true)
                }
                "areNotificationsEnabled" -> {
                    result.success(areNotificationsEnabled())
                }
                "openNotificationSettings" -> {
                    openNotificationSettings()
                    result.success(true)
                }
                "openNewMessageNotificationSettings" -> {
                    openNewMessageNotificationSettings()
                    result.success(true)
                }
                "openFullScreenNotificationSettings" -> {
                    openFullScreenNotificationSettings()
                    result.success(true)
                }
                "getNewMessageNotificationStatus" -> {
                    result.success(getNewMessageNotificationStatus())
                }
                "showTestNotification" -> {
                    showNotification(
                        (System.currentTimeMillis() and 0x7fffffff).toInt(),
                        "新消息测试",
                        "这是一条测试消息，用来确认弹窗和声音是否正常。",
                        0,
                        true
                    )
                    result.success(true)
                }
                "getInitialNotificationTap" -> {
                    result.success(pendingNotificationTap)
                    pendingNotificationTap = null
                }
                "playNotificationSound" -> {
                    playNotificationSound()
                    result.success(true)
                }
                "moveTaskToBack" -> {
                    moveTaskToBack(true)
                    result.success(true)
                }
                "startNotificationKeepAlive" -> {
                    startNotificationKeepAlive()
                    result.success(true)
                }
                "stopNotificationKeepAlive" -> {
                    stopNotificationKeepAlive()
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

        handleNotificationIntent(intent, deliverNow = false)
    }

    private fun configureGameFullscreenWindow() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            window.attributes = window.attributes.apply {
                layoutInDisplayCutoutMode =
                    WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES
            }
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            window.setDecorFitsSystemWindows(false)
            window.insetsController?.let { controller ->
                controller.hide(WindowInsets.Type.statusBars() or WindowInsets.Type.navigationBars())
                controller.systemBarsBehavior =
                    WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
            }
        } else {
            @Suppress("DEPRECATION")
            window.decorView.systemUiVisibility =
                android.view.View.SYSTEM_UI_FLAG_FULLSCREEN or
                    android.view.View.SYSTEM_UI_FLAG_HIDE_NAVIGATION or
                    android.view.View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY or
                    android.view.View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN or
                    android.view.View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION or
                    android.view.View.SYSTEM_UI_FLAG_LAYOUT_STABLE
        }
    }

    private fun restoreAppWindow() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            window.attributes = window.attributes.apply {
                layoutInDisplayCutoutMode =
                    WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_DEFAULT
            }
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            window.setDecorFitsSystemWindows(true)
            window.insetsController?.show(WindowInsets.Type.statusBars() or WindowInsets.Type.navigationBars())
        } else {
            @Suppress("DEPRECATION")
            window.decorView.systemUiVisibility = android.view.View.SYSTEM_UI_FLAG_VISIBLE
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        handleNotificationIntent(intent, deliverNow = true)
    }

    private val DOWNLOAD_CHANNEL_ID = "app_download"
    private val DOWNLOAD_NOTIFICATION_ID = 100001

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            val channel = NotificationChannel(
                NOTIFICATION_CHANNEL_ID,
                "新消息提醒",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "聊天新消息弹窗、声音和锁屏提醒"
                enableVibration(true)
                vibrationPattern = longArrayOf(0, 180, 120, 180)
                lockscreenVisibility = android.app.Notification.VISIBILITY_PUBLIC
                setBypassDnd(false)
                setSound(
                    RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION),
                    notificationAudioAttributes()
                )
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

    private fun startNotificationKeepAlive() {
        try {
            val intent = Intent(this, MessageKeepAliveService::class.java)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                startForegroundService(intent)
            } else {
                startService(intent)
            }
        } catch (_: Exception) {
        }
    }

    private fun stopNotificationKeepAlive() {
        try {
            stopService(Intent(this, MessageKeepAliveService::class.java))
        } catch (_: Exception) {
        }
    }

    private fun showNotification(id: Int, title: String, body: String, conversationId: Int, playSound: Boolean) {
        if (!areNotificationsEnabled()) return
        val notificationId = if (id > 0) id else (System.currentTimeMillis() and 0x7fffffff).toInt()
        val soundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)

        // 点击通知时打开 App
        val intent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            putExtra("conversationId", conversationId)
            putExtra("title", title)
        }
        val pendingIntent = PendingIntent.getActivity(
            this, notificationId, intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        val defaults = if (playSound) {
            NotificationCompat.DEFAULT_SOUND or NotificationCompat.DEFAULT_VIBRATE
        } else {
            NotificationCompat.DEFAULT_VIBRATE
        }

        val notification = NotificationCompat.Builder(this, NOTIFICATION_CHANNEL_ID)
            .setSmallIcon(android.R.drawable.stat_notify_chat)
            .setContentTitle(title)
            .setContentText(body)
            .setStyle(NotificationCompat.BigTextStyle().bigText(body))
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setCategory(NotificationCompat.CATEGORY_MESSAGE)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setAutoCancel(true)
            .setContentIntent(pendingIntent)
            .setFullScreenIntent(pendingIntent, true)
            .setDefaults(defaults)
            .setVibrate(longArrayOf(0, 180, 120, 180))
            .setSound(if (playSound) soundUri else null)
            .setSilent(!playSound)
            .setOnlyAlertOnce(false)
            .setShowWhen(true)
            .setWhen(System.currentTimeMillis())
            .build()

        try {
            NotificationManagerCompat.from(this).notify(notificationId, notification)
            if (playSound) {
                playNotificationSound()
            }
        } catch (_: SecurityException) {
            // 通知权限未授予，静默忽略
        }
    }

    private fun notificationAudioAttributes(): AudioAttributes {
        return AudioAttributes.Builder()
            .setUsage(AudioAttributes.USAGE_NOTIFICATION)
            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
            .build()
    }

    private fun playNotificationSound() {
        try {
            val uri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)
            val ringtone = RingtoneManager.getRingtone(applicationContext, uri) ?: return
            ringtone.audioAttributes = notificationAudioAttributes()
            activeRingtone?.stop()
            activeRingtone = ringtone
            ringtone.play()
            mainHandler.postDelayed({
                if (activeRingtone == ringtone) {
                    try {
                        ringtone.stop()
                    } catch (_: Exception) {
                    }
                    activeRingtone = null
                }
            }, 3500)
        } catch (_: Exception) {
        }
    }

    private fun areNotificationsEnabled(): Boolean {
        val enabled = NotificationManagerCompat.from(this).areNotificationsEnabled()
        if (!enabled) return false
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            val channel = manager.getNotificationChannel(NOTIFICATION_CHANNEL_ID)
            if (channel?.importance == NotificationManager.IMPORTANCE_NONE) return false
        }
        return true
    }

    private fun getNewMessageNotificationStatus(): HashMap<String, Any?> {
        val map = hashMapOf<String, Any?>(
            "enabled" to NotificationManagerCompat.from(this).areNotificationsEnabled(),
            "channelId" to NOTIFICATION_CHANNEL_ID,
            "importance" to -1,
            "sound" to null,
            "canAlert" to NotificationManagerCompat.from(this).areNotificationsEnabled(),
            "canUseFullScreenIntent" to true,
        )
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            val channel = manager.getNotificationChannel(NOTIFICATION_CHANNEL_ID)
            val importance = channel?.importance ?: NotificationManager.IMPORTANCE_NONE
            val sound = channel?.sound?.toString()
            map["importance"] = importance
            map["sound"] = sound
            map["canAlert"] =
                NotificationManagerCompat.from(this).areNotificationsEnabled() &&
                    importance >= NotificationManager.IMPORTANCE_HIGH &&
                    !sound.isNullOrBlank()
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
                map["canUseFullScreenIntent"] = manager.canUseFullScreenIntent()
            }
        }
        return map
    }

    private fun openNotificationSettings() {
        val intent = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).apply {
                putExtra(Settings.EXTRA_APP_PACKAGE, packageName)
            }
        } else {
            Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
                data = Uri.parse("package:$packageName")
            }
        }
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        startActivity(intent)
    }

    private fun openNewMessageNotificationSettings() {
        val intent = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            Intent(Settings.ACTION_CHANNEL_NOTIFICATION_SETTINGS).apply {
                putExtra(Settings.EXTRA_APP_PACKAGE, packageName)
                putExtra(Settings.EXTRA_CHANNEL_ID, NOTIFICATION_CHANNEL_ID)
            }
        } else {
            Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
                data = Uri.parse("package:$packageName")
            }
        }
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        startActivity(intent)
    }

    private fun openFullScreenNotificationSettings() {
        val intent = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            Intent("android.settings.MANAGE_APP_USE_FULL_SCREEN_INTENT").apply {
                data = Uri.parse("package:$packageName")
            }
        } else {
            Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
                data = Uri.parse("package:$packageName")
            }
        }
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        startActivity(intent)
    }

    private fun getPushDeviceInfo(includeToken: Boolean): HashMap<String, Any?> {
        val vendor = detectPushVendor()
        return hashMapOf(
            "platform" to "android",
            "vendor" to vendor,
            "supported" to isVendorPushSupported(vendor),
            "sdkIntegrated" to false,
            "token" to if (includeToken) getStoredVendorPushToken(vendor) else null,
            "deviceId" to Settings.Secure.getString(contentResolver, Settings.Secure.ANDROID_ID),
            "manufacturer" to Build.MANUFACTURER,
            "brand" to Build.BRAND,
            "model" to Build.MODEL,
            "sdk" to Build.VERSION.SDK_INT,
            "packageName" to packageName
        )
    }

    private fun detectPushVendor(): String {
        val manufacturer = Build.MANUFACTURER.lowercase()
        val brand = Build.BRAND.lowercase()
        val text = "$manufacturer $brand"
        return when {
            text.contains("xiaomi") || text.contains("redmi") || text.contains("poco") -> "xiaomi"
            text.contains("huawei") -> "huawei"
            text.contains("honor") -> "honor"
            text.contains("oppo") || text.contains("realme") || text.contains("oneplus") -> "oppo"
            text.contains("vivo") || text.contains("iqoo") -> "vivo"
            text.contains("meizu") -> "meizu"
            else -> "unknown"
        }
    }

    private fun isVendorPushSupported(vendor: String): Boolean {
        return setOf("xiaomi", "huawei", "honor", "oppo", "vivo", "meizu").contains(vendor)
    }

    private fun getStoredVendorPushToken(vendor: String): String? {
        return getSharedPreferences("vendor_push", Context.MODE_PRIVATE)
            .getString("${vendor}_token", null)
    }

    private fun handleNotificationIntent(intent: Intent?, deliverNow: Boolean) {
        if (intent == null || !intent.hasExtra("conversationId")) return
        val conversationId = intent.getIntExtra("conversationId", 0)
        if (conversationId == 0) return
        val title = intent.getStringExtra("title") ?: "聊天"
        val args = hashMapOf<String, Any?>(
            "conversationId" to conversationId,
            "title" to title,
        )
        if (deliverNow) {
            notificationChannel?.invokeMethod("onNotificationTap", args)
        } else {
            pendingNotificationTap = args
        }
        intent.removeExtra("conversationId")
        intent.removeExtra("title")
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
