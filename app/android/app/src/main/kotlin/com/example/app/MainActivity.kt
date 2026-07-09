package com.example.app

import android.app.Activity
import android.app.DownloadManager
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.media.AudioAttributes
import android.media.Ringtone
import android.media.RingtoneManager
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.os.Handler
import android.os.Looper
import android.provider.OpenableColumns
import android.provider.Settings
import android.view.WindowInsets
import android.view.WindowInsetsController
import android.view.WindowManager
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.FileProvider
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodCall
import io.flutter.plugin.common.MethodChannel
import java.io.File

class MainActivity: FlutterActivity() {
    private val apkChannelName = "com.example.app/apk_installer"
    private val notifChannelName = "com.example.app/notifications"
    private val pushChannelName = "com.example.app/push"
    private val windowChannelName = "com.example.app/window"
    private val digitalHumanChannelName = "com.example.app/digital_human"
    private val PICK_AUDIO_REQUEST_CODE = 5107
    private val NOTIFICATION_CHANNEL_ID = "new_message_alert_v2"
    private val APK_DOWNLOAD_PREFS = "apk_update_download"
    private val mainHandler = Handler(Looper.getMainLooper())
    private var activeRingtone: Ringtone? = null
    private var notificationChannel: MethodChannel? = null
    private var pendingNotificationTap: HashMap<String, Any?>? = null
    private var pendingAudioPickResult: MethodChannel.Result? = null
    private var apkDownloadReceiverRegistered = false
    private val apkDownloadReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            if (intent?.action != DownloadManager.ACTION_DOWNLOAD_COMPLETE) return
            val completedId = intent.getLongExtra(DownloadManager.EXTRA_DOWNLOAD_ID, -1L)
            val prefs = getSharedPreferences(APK_DOWNLOAD_PREFS, Context.MODE_PRIVATE)
            val expectedId = prefs.getLong("downloadId", -1L)
            if (completedId <= 0 || completedId != expectedId) return

            val status = queryApkDownloadStatus(completedId)
            if (status?.get("status") == "successful") {
                val path = prefs.getString("apkPath", null)
                if (!path.isNullOrBlank()) openApkInstaller(path)
            }
        }
    }

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)

        createNotificationChannel()
        registerApkDownloadReceiver()

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
                "startBackgroundApkDownload" -> {
                    startBackgroundApkDownload(call, result)
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

        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, digitalHumanChannelName).setMethodCallHandler { call, result ->
            when (call.method) {
                "pickAudioFile" -> pickAudioFile(result)
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

    override fun onDestroy() {
        if (apkDownloadReceiverRegistered) {
            try {
                unregisterReceiver(apkDownloadReceiver)
            } catch (_: Exception) {
            }
            apkDownloadReceiverRegistered = false
        }
        super.onDestroy()
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

    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode != PICK_AUDIO_REQUEST_CODE) return

        val result = pendingAudioPickResult ?: return
        pendingAudioPickResult = null
        val uri = data?.data
        if (resultCode != Activity.RESULT_OK || uri == null) {
            result.success(null)
            return
        }

        result.success(
            hashMapOf(
                "uri" to uri.toString(),
                "name" to getDisplayName(uri)
            )
        )
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

    private fun pickAudioFile(result: MethodChannel.Result) {
        if (pendingAudioPickResult != null) {
            result.error("busy", "文件选择器正在打开", null)
            return
        }

        pendingAudioPickResult = result
        val intent = Intent(Intent.ACTION_OPEN_DOCUMENT).apply {
            addCategory(Intent.CATEGORY_OPENABLE)
            type = "audio/*"
            putExtra(
                Intent.EXTRA_MIME_TYPES,
                arrayOf(
                    "audio/mpeg",
                    "audio/mp3",
                    "audio/wav",
                    "audio/x-wav",
                    "audio/mp4",
                    "audio/aac",
                    "audio/flac",
                    "audio/ogg",
                    "audio/opus",
                    "audio/amr",
                    "audio/x-ms-wma",
                )
            )
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
        }

        try {
            startActivityForResult(intent, PICK_AUDIO_REQUEST_CODE)
        } catch (e: Exception) {
            pendingAudioPickResult = null
            result.error("open_failed", e.message, null)
        }
    }

    private fun getDisplayName(uri: Uri): String {
        var displayName: String? = null
        try {
            contentResolver.query(uri, arrayOf(OpenableColumns.DISPLAY_NAME), null, null, null)?.use { cursor ->
                if (cursor.moveToFirst()) {
                    val index = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME)
                    if (index >= 0) displayName = cursor.getString(index)
                }
            }
        } catch (_: Exception) {
        }
        return displayName ?: uri.lastPathSegment ?: uri.toString()
    }

    private fun registerApkDownloadReceiver() {
        if (apkDownloadReceiverRegistered) return
        try {
            val filter = IntentFilter(DownloadManager.ACTION_DOWNLOAD_COMPLETE)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                registerReceiver(apkDownloadReceiver, filter, Context.RECEIVER_NOT_EXPORTED)
            } else {
                @Suppress("DEPRECATION")
                registerReceiver(apkDownloadReceiver, filter)
            }
            apkDownloadReceiverRegistered = true
        } catch (_: Exception) {
            apkDownloadReceiverRegistered = false
        }
    }

    private fun startBackgroundApkDownload(call: MethodCall, result: MethodChannel.Result) {
        val downloadUrl = call.argument<String>("url")?.trim().orEmpty()
        val versionCode = call.argument<Int>("versionCode") ?: 0
        val versionName = call.argument<String>("versionName")?.trim().orEmpty()
        val uri = try {
            Uri.parse(downloadUrl)
        } catch (_: Exception) {
            null
        }
        if (uri == null || (uri.scheme != "http" && uri.scheme != "https")) {
            result.error("invalid_url", "APK download url is invalid", null)
            return
        }
        if (versionCode <= 0) {
            result.error("invalid_version", "Version code is invalid", null)
            return
        }

        val manager = getSystemService(Context.DOWNLOAD_SERVICE) as DownloadManager
        val prefs = getSharedPreferences(APK_DOWNLOAD_PREFS, Context.MODE_PRIVATE)
        val apkFile = backgroundApkFile(versionCode)
        val existingId = prefs.getLong("downloadId", -1L)
        val existingUrl = prefs.getString("downloadUrl", "")
        val existingVersion = prefs.getInt("versionCode", 0)

        if (existingId > 0 && existingUrl == downloadUrl && existingVersion == versionCode) {
            val status = queryApkDownloadStatus(existingId)
            val statusName = status?.get("status")?.toString()
            if (statusName == "successful" && apkFile.exists()) {
                val installResult = openApkInstaller(apkFile.absolutePath)
                installResult["downloadId"] = existingId
                installResult["path"] = apkFile.absolutePath
                result.success(installResult)
                return
            }
            if (statusName == "pending" || statusName == "running" || statusName == "paused") {
                status?.put("downloadId", existingId)
                status?.put("path", apkFile.absolutePath)
                result.success(status)
                return
            }
            try {
                manager.remove(existingId)
            } catch (_: Exception) {
            }
        }

        try {
            if (apkFile.exists()) apkFile.delete()
        } catch (_: Exception) {
        }
        apkFile.parentFile?.mkdirs()

        val request = DownloadManager.Request(uri)
            .setTitle("App update ${if (versionName.isBlank()) versionCode else versionName}")
            .setDescription("Downloading update package")
            .setMimeType("application/vnd.android.package-archive")
            .setAllowedNetworkTypes(
                DownloadManager.Request.NETWORK_WIFI or DownloadManager.Request.NETWORK_MOBILE
            )
            .setAllowedOverMetered(true)
            .setAllowedOverRoaming(true)
            .setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED)
            .setDestinationUri(Uri.fromFile(apkFile))

        val downloadId = manager.enqueue(request)
        prefs.edit()
            .putLong("downloadId", downloadId)
            .putInt("versionCode", versionCode)
            .putString("versionName", versionName)
            .putString("downloadUrl", downloadUrl)
            .putString("apkPath", apkFile.absolutePath)
            .apply()

        result.success(
            hashMapOf<String, Any?>(
                "status" to "started",
                "downloadId" to downloadId,
                "path" to apkFile.absolutePath,
            )
        )
    }

    private fun backgroundApkFile(versionCode: Int): File {
        val root = getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS) ?: filesDir
        return File(root, "jjyx-update-$versionCode.apk")
    }

    private fun queryApkDownloadStatus(downloadId: Long): HashMap<String, Any?>? {
        val manager = getSystemService(Context.DOWNLOAD_SERVICE) as DownloadManager
        val cursor = try {
            manager.query(DownloadManager.Query().setFilterById(downloadId))
        } catch (_: Exception) {
            null
        } ?: return null
        cursor.use {
            if (!it.moveToFirst()) return null
            val status = it.getInt(it.getColumnIndexOrThrow(DownloadManager.COLUMN_STATUS))
            val reason = it.getInt(it.getColumnIndexOrThrow(DownloadManager.COLUMN_REASON))
            val downloaded = it.getLong(it.getColumnIndexOrThrow(DownloadManager.COLUMN_BYTES_DOWNLOADED_SO_FAR))
            val total = it.getLong(it.getColumnIndexOrThrow(DownloadManager.COLUMN_TOTAL_SIZE_BYTES))
            return hashMapOf(
                "status" to downloadStatusName(status),
                "reason" to reason,
                "downloaded" to downloaded,
                "total" to total,
            )
        }
    }

    private fun downloadStatusName(status: Int): String {
        return when (status) {
            DownloadManager.STATUS_PENDING -> "pending"
            DownloadManager.STATUS_RUNNING -> "running"
            DownloadManager.STATUS_PAUSED -> "paused"
            DownloadManager.STATUS_SUCCESSFUL -> "successful"
            DownloadManager.STATUS_FAILED -> "failed"
            else -> "unknown"
        }
    }

    private fun openApkInstaller(apkPath: String): HashMap<String, Any?> {
        try {
            val apkFile = File(apkPath)
            if (!apkFile.exists()) {
                return hashMapOf(
                    "status" to "file_not_found",
                    "message" to "APK file not found",
                    "path" to apkPath,
                )
            }

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && !packageManager.canRequestPackageInstalls()) {
                val intent = Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES).apply {
                    data = Uri.parse("package:$packageName")
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                startActivity(intent)
                return hashMapOf(
                    "status" to "permission_required",
                    "message" to "Please allow this app to install unknown apps",
                    "path" to apkPath,
                )
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
            return hashMapOf(
                "status" to "installing",
                "path" to apkPath,
            )
        } catch (e: Exception) {
            return hashMapOf(
                "status" to "install_failed",
                "message" to e.message,
                "path" to apkPath,
            )
        }
    }

    private fun installApk(apkPath: String, result: MethodChannel.Result) {
        val installResult = openApkInstaller(apkPath)
        val status = installResult["status"]?.toString().orEmpty()
        if (status == "installing") {
            result.success(true)
        } else {
            result.error(status.ifBlank { "install_failed" }, installResult["message"]?.toString(), null)
        }
    }
}
