package com.example.app

import android.app.DownloadManager
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.os.IBinder
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat
import androidx.core.content.FileProvider
import java.io.BufferedInputStream
import java.io.BufferedOutputStream
import java.io.File
import java.io.FileInputStream
import java.io.FileOutputStream
import java.io.IOException
import java.io.InterruptedIOException
import java.io.RandomAccessFile
import java.net.HttpURLConnection
import java.net.URL
import java.security.MessageDigest
import java.util.Locale
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.ExecutorCompletionService
import java.util.concurrent.Executors
import java.util.concurrent.atomic.AtomicBoolean
import java.util.concurrent.atomic.AtomicLong

class ApkUpdateDownloadService : Service() {
    companion object {
        const val ACTION_DOWNLOAD_COMPLETE = "com.example.app.APK_UPDATE_DOWNLOAD_COMPLETE"

        private const val ACTION_START = "com.example.app.action.START_APK_UPDATE"
        private const val ACTION_MONITOR_FALLBACK = "com.example.app.action.MONITOR_APK_UPDATE_FALLBACK"
        private const val PREFS = "apk_update_download"
        private const val CHANNEL_ID = "apk_update_download_v2"
        private const val NOTIFICATION_ID = 19008
        private const val PART_COUNT = 4

        private const val KEY_STATUS = "parallelStatus"
        private const val KEY_URL = "parallelUrl"
        private const val KEY_VERSION_CODE = "parallelVersionCode"
        private const val KEY_VERSION_NAME = "parallelVersionName"
        private const val KEY_EXPECTED_SIZE = "parallelExpectedSize"
        private const val KEY_EXPECTED_MD5 = "parallelExpectedMd5"
        private const val KEY_APK_PATH = "parallelApkPath"
        private const val KEY_DOWNLOADED = "parallelDownloaded"
        private const val KEY_TOTAL = "parallelTotal"

        fun start(
            context: Context,
            url: String,
            versionCode: Int,
            versionName: String,
            expectedSize: Long,
            expectedMd5: String,
        ): Boolean {
            val apkFile = apkFile(context, versionCode)
            context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit()
                .putString(KEY_STATUS, "starting")
                .putString(KEY_URL, url)
                .putInt(KEY_VERSION_CODE, versionCode)
                .putString(KEY_VERSION_NAME, versionName)
                .putLong(KEY_EXPECTED_SIZE, expectedSize)
                .putString(KEY_EXPECTED_MD5, expectedMd5.lowercase(Locale.US))
                .putString(KEY_APK_PATH, apkFile.absolutePath)
                .apply()

            return try {
                val intent = Intent(context, ApkUpdateDownloadService::class.java).apply {
                    action = ACTION_START
                    putExtra("url", url)
                    putExtra("versionCode", versionCode)
                    putExtra("versionName", versionName)
                    putExtra("expectedSize", expectedSize)
                    putExtra("expectedMd5", expectedMd5.lowercase(Locale.US))
                }
                ContextCompat.startForegroundService(context, intent)
                true
            } catch (_: Exception) {
                context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit()
                    .putString(KEY_STATUS, "failed")
                    .apply()
                false
            }
        }

        fun query(
            context: Context,
            url: String,
            versionCode: Int,
            expectedSize: Long,
            expectedMd5: String,
        ): HashMap<String, Any?>? {
            val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            if (prefs.getString(KEY_URL, "") != url ||
                prefs.getInt(KEY_VERSION_CODE, 0) != versionCode
            ) {
                return null
            }
            val storedSize = prefs.getLong(KEY_EXPECTED_SIZE, 0L)
            val storedMd5 = prefs.getString(KEY_EXPECTED_MD5, "").orEmpty()
            if (expectedSize > 0 && storedSize > 0 && expectedSize != storedSize) return null
            if (expectedMd5.isNotBlank() && storedMd5.isNotBlank() &&
                !expectedMd5.equals(storedMd5, ignoreCase = true)
            ) {
                return null
            }
            return hashMapOf(
                "status" to prefs.getString(KEY_STATUS, "unknown"),
                "path" to prefs.getString(KEY_APK_PATH, ""),
                "downloaded" to prefs.getLong(KEY_DOWNLOADED, 0L),
                "total" to prefs.getLong(KEY_TOTAL, storedSize),
            )
        }

        fun resumeFallbackVerification(context: Context) {
            try {
                val intent = Intent(context, ApkUpdateDownloadService::class.java).apply {
                    action = ACTION_MONITOR_FALLBACK
                }
                ContextCompat.startForegroundService(context, intent)
            } catch (_: Exception) {
            }
        }

        fun apkFile(context: Context, versionCode: Int): File {
            val root = context.getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS) ?: context.filesDir
            return File(root, "jjyx-update-$versionCode.apk")
        }
    }

    private data class DownloadSpec(
        val url: String,
        val versionCode: Int,
        val versionName: String,
        val expectedSize: Long,
        val expectedMd5: String,
        val apkFile: File,
    )

    private data class ProbeResult(
        val total: Long,
        val etag: String,
        val lastModified: String,
    )

    private class RangeUnsupportedException(message: String) : IOException(message)
    private class FatalDownloadException(message: String) : IOException(message)

    private val mainExecutor = Executors.newSingleThreadExecutor()
    private val workerRunning = AtomicBoolean(false)
    private val destroyed = AtomicBoolean(false)
    private val activeConnections = ConcurrentHashMap.newKeySet<HttpURLConnection>()
    private val lastNotificationAt = AtomicLong(0L)

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val spec = specFromIntent(intent) ?: loadSpec()
        if (spec == null) {
            stopSelf(startId)
            return START_NOT_STICKY
        }

        startForeground(
            NOTIFICATION_ID,
            buildProgressNotification("准备下载更新...", 0L, spec.expectedSize, true),
        )
        if (!workerRunning.compareAndSet(false, true)) return START_STICKY

        val monitorFallback = intent?.action == ACTION_MONITOR_FALLBACK ||
            getSharedPreferences(PREFS, Context.MODE_PRIVATE)
                .getString(KEY_STATUS, "") == "fallback"
        mainExecutor.execute {
            try {
                if (monitorFallback) {
                    monitorFallbackDownload(spec)
                } else {
                    runParallelDownload(spec)
                }
            } finally {
                workerRunning.set(false)
            }
        }
        return START_STICKY
    }

    override fun onDestroy() {
        destroyed.set(true)
        activeConnections.forEach { it.disconnect() }
        activeConnections.clear()
        mainExecutor.shutdownNow()
        super.onDestroy()
    }

    private fun specFromIntent(intent: Intent?): DownloadSpec? {
        if (intent?.action != ACTION_START) return null
        val url = intent.getStringExtra("url")?.trim().orEmpty()
        val versionCode = intent.getIntExtra("versionCode", 0)
        if (url.isBlank() || versionCode <= 0) return null
        return DownloadSpec(
            url = url,
            versionCode = versionCode,
            versionName = intent.getStringExtra("versionName").orEmpty(),
            expectedSize = intent.getLongExtra("expectedSize", 0L),
            expectedMd5 = intent.getStringExtra("expectedMd5").orEmpty().lowercase(Locale.US),
            apkFile = apkFile(this, versionCode),
        )
    }

    private fun loadSpec(): DownloadSpec? {
        val prefs = getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        val url = prefs.getString(KEY_URL, "").orEmpty()
        val versionCode = prefs.getInt(KEY_VERSION_CODE, 0)
        if (url.isBlank() || versionCode <= 0) return null
        val path = prefs.getString(KEY_APK_PATH, "").orEmpty()
        return DownloadSpec(
            url = url,
            versionCode = versionCode,
            versionName = prefs.getString(KEY_VERSION_NAME, "").orEmpty(),
            expectedSize = prefs.getLong(KEY_EXPECTED_SIZE, 0L),
            expectedMd5 = prefs.getString(KEY_EXPECTED_MD5, "").orEmpty(),
            apkFile = if (path.isBlank()) apkFile(this, versionCode) else File(path),
        )
    }

    private fun runParallelDownload(spec: DownloadSpec) {
        updateState("probing", 0L, spec.expectedSize)
        updateNotification("正在连接下载服务器...", 0L, spec.expectedSize, true, force = true)

        val probe = try {
            probeRangeSupport(spec)
        } catch (_: RangeUnsupportedException) {
            startDownloadManagerFallback(spec)
            return
        } catch (e: FatalDownloadException) {
            failDownload(e.message ?: "下载地址不可用")
            return
        } catch (_: Exception) {
            startDownloadManagerFallback(spec)
            return
        }

        val total = probe.total
        if (spec.expectedSize > 0 && total != spec.expectedSize) {
            failDownload("安装包大小与更新信息不一致")
            return
        }

        val partCount = if (total < PART_COUNT) total.toInt() else PART_COUNT
        if (partCount <= 0) {
            failDownload("安装包大小无效")
            return
        }
        preparePartFiles(spec, probe, partCount)
        val parts = (0 until partCount).map { index ->
            val part = partFile(spec, index)
            val start = total * index / partCount
            val end = total * (index + 1) / partCount - 1L
            if (part.exists() && part.length() > end - start + 1L) part.delete()
            part
        }
        val initialDownloaded = parts.sumOf { it.takeIf(File::exists)?.length() ?: 0L }
        val downloaded = AtomicLong(initialDownloaded)
        updateState("running", initialDownloaded, total)
        updateNotification("正在下载更新...", initialDownloaded, total, false, force = true)

        val abort = AtomicBoolean(false)
        val pool = Executors.newFixedThreadPool(partCount)
        val completion = ExecutorCompletionService<Unit>(pool)
        repeat(partCount) { index ->
            val start = total * index / partCount
            val end = total * (index + 1) / partCount - 1L
            completion.submit {
                downloadPart(spec, probe, index, start, end, downloaded, total, abort)
            }
        }

        var failure: Throwable? = null
        try {
            repeat(partCount) {
                try {
                    completion.take().get()
                } catch (e: Exception) {
                    if (failure == null) failure = e.cause ?: e
                    abort.set(true)
                    activeConnections.forEach { it.disconnect() }
                    return@repeat
                }
            }
        } finally {
            abort.set(true)
            pool.shutdownNow()
        }

        if (destroyed.get()) return
        when (failure) {
            is RangeUnsupportedException -> {
                clearPartFiles(spec, partCount)
                startDownloadManagerFallback(spec)
            }
            null -> mergeAndVerify(spec, parts, total)
            else -> failDownload(failure?.message ?: "下载安装包失败")
        }
    }

    private fun probeRangeSupport(spec: DownloadSpec): ProbeResult {
        val connection = openConnection(spec.url).apply {
            requestMethod = "GET"
            setRequestProperty("Range", "bytes=0-0")
        }
        activeConnections.add(connection)
        try {
            val status = connection.responseCode
            if (status != HttpURLConnection.HTTP_PARTIAL) {
                if (status == HttpURLConnection.HTTP_OK) {
                    throw RangeUnsupportedException("服务器不支持分片下载")
                }
                throw FatalDownloadException("下载服务器返回状态码 $status")
            }
            connection.inputStream.use { it.read() }
            val contentRange = connection.getHeaderField("Content-Range").orEmpty()
            val total = Regex("bytes\\s+\\d+-\\d+/(\\d+)", RegexOption.IGNORE_CASE)
                .find(contentRange)?.groupValues?.getOrNull(1)?.toLongOrNull()
                ?: throw RangeUnsupportedException("服务器未返回安装包大小")
            return ProbeResult(
                total = total,
                etag = connection.getHeaderField("ETag").orEmpty(),
                lastModified = connection.getHeaderField("Last-Modified").orEmpty(),
            )
        } finally {
            activeConnections.remove(connection)
            connection.disconnect()
        }
    }

    private fun preparePartFiles(spec: DownloadSpec, probe: ProbeResult, partCount: Int) {
        val prefs = getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        val reusable = prefs.getString("partUrl", "") == spec.url &&
            prefs.getInt("partVersionCode", 0) == spec.versionCode &&
            prefs.getLong("partTotal", 0L) == probe.total &&
            prefs.getInt("partCount", 0) == partCount &&
            validatorsMatch(prefs.getString("partEtag", "").orEmpty(), probe.etag) &&
            validatorsMatch(prefs.getString("partLastModified", "").orEmpty(), probe.lastModified)

        spec.apkFile.parentFile?.mkdirs()
        if (!reusable) clearPartFiles(spec, maxOf(partCount, PART_COUNT))
        prefs.edit()
            .putString("partUrl", spec.url)
            .putInt("partVersionCode", spec.versionCode)
            .putLong("partTotal", probe.total)
            .putInt("partCount", partCount)
            .putString("partEtag", probe.etag)
            .putString("partLastModified", probe.lastModified)
            .apply()
    }

    private fun validatorsMatch(oldValue: String, newValue: String): Boolean {
        return oldValue.isBlank() || newValue.isBlank() || oldValue == newValue
    }

    private fun downloadPart(
        spec: DownloadSpec,
        probe: ProbeResult,
        index: Int,
        start: Long,
        end: Long,
        downloaded: AtomicLong,
        total: Long,
        abort: AtomicBoolean,
    ) {
        val part = partFile(spec, index)
        val expectedLength = end - start + 1L
        if (part.exists() && part.length() > expectedLength) part.delete()
        var retryDelayMs = 1000L

        while (!destroyed.get() && !abort.get()) {
            val currentLength = part.takeIf(File::exists)?.length() ?: 0L
            if (currentLength == expectedLength) return
            val requestStart = start + currentLength
            var connection: HttpURLConnection? = null
            try {
                connection = openConnection(spec.url).apply {
                    requestMethod = "GET"
                    setRequestProperty("Range", "bytes=$requestStart-$end")
                    val validator = probe.etag.ifBlank { probe.lastModified }
                    if (validator.isNotBlank()) setRequestProperty("If-Range", validator)
                }
                activeConnections.add(connection)
                val status = connection.responseCode
                if (status == HttpURLConnection.HTTP_OK) {
                    throw RangeUnsupportedException("服务器停止支持分片下载")
                }
                if (status != HttpURLConnection.HTTP_PARTIAL) {
                    if (status == 408 || status == 429 || status >= 500) {
                        throw IOException("下载服务器暂时不可用 ($status)")
                    }
                    throw FatalDownloadException("分片下载失败 ($status)")
                }

                val contentRange = connection.getHeaderField("Content-Range").orEmpty()
                val returnedStart = Regex("bytes\\s+(\\d+)-", RegexOption.IGNORE_CASE)
                    .find(contentRange)?.groupValues?.getOrNull(1)?.toLongOrNull()
                if (returnedStart != requestStart) {
                    throw RangeUnsupportedException("分片响应位置不正确")
                }

                updateState("running", downloaded.get(), total)

                RandomAccessFile(part, "rw").use { output ->
                    output.seek(currentLength)
                    BufferedInputStream(connection.inputStream, 256 * 1024).use { input ->
                        val buffer = ByteArray(256 * 1024)
                        while (!destroyed.get() && !abort.get()) {
                            val read = input.read(buffer)
                            if (read < 0) break
                            output.write(buffer, 0, read)
                            val current = downloaded.addAndGet(read.toLong())
                            updateNotification("正在下载更新...", current, total, false)
                        }
                    }
                }
                if (abort.get() || destroyed.get()) throw InterruptedIOException("下载已停止")
                if (part.length() == expectedLength) return
                if (part.length() > expectedLength) {
                    part.delete()
                    throw RangeUnsupportedException("分片长度不正确")
                }
                retryDelayMs = 1000L
            } catch (e: RangeUnsupportedException) {
                throw e
            } catch (e: FatalDownloadException) {
                throw e
            } catch (_: Exception) {
                if (abort.get() || destroyed.get()) throw InterruptedIOException("下载已停止")
                updateState("waiting", downloaded.get(), total)
                updateNotification("网络中断，等待恢复后继续...", downloaded.get(), total, false, force = true)
                sleepInterruptibly(retryDelayMs, abort)
                retryDelayMs = minOf(retryDelayMs * 2L, 30000L)
            } finally {
                connection?.let {
                    activeConnections.remove(it)
                    it.disconnect()
                }
            }
        }
        throw InterruptedIOException("下载已停止")
    }

    private fun mergeAndVerify(spec: DownloadSpec, parts: List<File>, total: Long) {
        updateState("verifying", total, total)
        updateNotification("正在校验安装包...", total, total, true, force = true)
        val mergingFile = File(spec.apkFile.absolutePath + ".merging")
        if (mergingFile.exists()) mergingFile.delete()
        val digest = if (spec.expectedMd5.isNotBlank()) MessageDigest.getInstance("MD5") else null

        try {
            FileOutputStream(mergingFile).use { fileOutput ->
                val output = BufferedOutputStream(fileOutput, 1024 * 1024)
                val buffer = ByteArray(1024 * 1024)
                for (part in parts) {
                    BufferedInputStream(FileInputStream(part), 1024 * 1024).use { input ->
                        while (true) {
                            val read = input.read(buffer)
                            if (read < 0) break
                            digest?.update(buffer, 0, read)
                            output.write(buffer, 0, read)
                        }
                    }
                }
                output.flush()
                fileOutput.fd.sync()
            }

            val actualMd5 = digest?.digest()?.joinToString("") { "%02x".format(it) }.orEmpty()
            if (mergingFile.length() != total ||
                (spec.expectedSize > 0 && mergingFile.length() != spec.expectedSize) ||
                (spec.expectedMd5.isNotBlank() && actualMd5 != spec.expectedMd5) ||
                !looksLikeApk(mergingFile)
            ) {
                throw FatalDownloadException("安装包完整性校验失败，请重新下载")
            }

            if (spec.apkFile.exists()) spec.apkFile.delete()
            if (!mergingFile.renameTo(spec.apkFile)) {
                mergingFile.copyTo(spec.apkFile, overwrite = true)
                mergingFile.delete()
            }
            parts.forEach { it.delete() }
            completeDownload(spec, total)
        } catch (e: Exception) {
            mergingFile.delete()
            clearPartFiles(spec, PART_COUNT)
            failDownload(e.message ?: "安装包校验失败")
        }
    }

    private fun startDownloadManagerFallback(spec: DownloadSpec) {
        clearPartFiles(spec, PART_COUNT)
        if (spec.apkFile.exists()) spec.apkFile.delete()
        spec.apkFile.parentFile?.mkdirs()

        val manager = getSystemService(Context.DOWNLOAD_SERVICE) as DownloadManager
        val request = DownloadManager.Request(Uri.parse(spec.url))
            .setTitle("应用更新 ${spec.versionName.ifBlank { spec.versionCode.toString() }}")
            .setDescription("正在后台下载安装包")
            .setMimeType("application/vnd.android.package-archive")
            .setAllowedNetworkTypes(
                DownloadManager.Request.NETWORK_WIFI or DownloadManager.Request.NETWORK_MOBILE
            )
            .setAllowedOverMetered(true)
            .setAllowedOverRoaming(true)
            .setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED)
            .setDestinationUri(Uri.fromFile(spec.apkFile))

        try {
            val id = manager.enqueue(request)
            getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit()
                .putString(KEY_STATUS, "fallback")
                .putLong("downloadId", id)
                .putInt("versionCode", spec.versionCode)
                .putString("versionName", spec.versionName)
                .putString("downloadUrl", spec.url)
                .putString("apkPath", spec.apkFile.absolutePath)
                .apply()
            monitorFallbackDownload(spec)
        } catch (e: Exception) {
            failDownload(e.message ?: "无法启动后台下载")
        }
    }

    private fun monitorFallbackDownload(spec: DownloadSpec) {
        val prefs = getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        val id = prefs.getLong("downloadId", -1L)
        if (id <= 0) {
            failDownload("后台下载任务不存在")
            return
        }
        val manager = getSystemService(Context.DOWNLOAD_SERVICE) as DownloadManager
        var missingCount = 0
        while (!destroyed.get()) {
            val cursor = try {
                manager.query(DownloadManager.Query().setFilterById(id))
            } catch (_: Exception) {
                null
            }
            if (cursor == null) {
                missingCount++
                if (missingCount > 10) {
                    failDownload("无法读取后台下载进度")
                    return
                }
                Thread.sleep(1000L)
                continue
            }
            cursor.use {
                if (!it.moveToFirst()) {
                    missingCount++
                } else {
                    missingCount = 0
                    val status = it.getInt(it.getColumnIndexOrThrow(DownloadManager.COLUMN_STATUS))
                    val downloaded = it.getLong(
                        it.getColumnIndexOrThrow(DownloadManager.COLUMN_BYTES_DOWNLOADED_SO_FAR)
                    )
                    val total = it.getLong(
                        it.getColumnIndexOrThrow(DownloadManager.COLUMN_TOTAL_SIZE_BYTES)
                    ).takeIf { value -> value > 0 } ?: spec.expectedSize
                    updateState("fallback", downloaded, total)
                    when (status) {
                        DownloadManager.STATUS_SUCCESSFUL -> {
                            updateNotification("正在校验安装包...", downloaded, total, true, force = true)
                            if (verifyFile(spec.apkFile, spec.expectedSize, spec.expectedMd5)) {
                                completeDownload(spec, spec.apkFile.length())
                            } else {
                                spec.apkFile.delete()
                                failDownload("安装包完整性校验失败，请重新下载")
                            }
                            return
                        }
                        DownloadManager.STATUS_FAILED -> {
                            failDownload("后台下载失败，请检查网络后重试")
                            return
                        }
                        DownloadManager.STATUS_PAUSED -> updateNotification(
                            "网络中断，等待恢复后继续...", downloaded, total, total <= 0, force = true
                        )
                        else -> updateNotification(
                            "正在后台下载更新...", downloaded, total, total <= 0
                        )
                    }
                }
            }
            if (missingCount > 10) {
                failDownload("后台下载任务不存在")
                return
            }
            Thread.sleep(1000L)
        }
    }

    private fun verifyFile(file: File, expectedSize: Long, expectedMd5: String): Boolean {
        if (!file.exists() || file.length() <= 0L || !looksLikeApk(file)) return false
        if (expectedSize > 0 && file.length() != expectedSize) return false
        if (expectedMd5.isBlank()) return true
        val digest = MessageDigest.getInstance("MD5")
        BufferedInputStream(FileInputStream(file), 1024 * 1024).use { input ->
            val buffer = ByteArray(1024 * 1024)
            while (true) {
                val read = input.read(buffer)
                if (read < 0) break
                digest.update(buffer, 0, read)
            }
        }
        val actual = digest.digest().joinToString("") { "%02x".format(it) }
        return actual.equals(expectedMd5, ignoreCase = true)
    }

    private fun looksLikeApk(file: File): Boolean {
        return try {
            FileInputStream(file).use { input ->
                input.read() == 0x50 && input.read() == 0x4b
            }
        } catch (_: Exception) {
            false
        }
    }

    private fun completeDownload(spec: DownloadSpec, total: Long) {
        updateState("successful", total, total)
        val notification = NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.stat_sys_download_done)
            .setContentTitle("更新下载完成")
            .setContentText("点击安装新版本")
            .setContentIntent(installerPendingIntent(spec.apkFile))
            .setAutoCancel(true)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .build()
        getSystemService(NotificationManager::class.java).notify(NOTIFICATION_ID, notification)
        sendBroadcast(
            Intent(ACTION_DOWNLOAD_COMPLETE)
                .setPackage(packageName)
                .putExtra("path", spec.apkFile.absolutePath)
        )
        stopForegroundCompat()
        stopSelf()
    }

    private fun failDownload(message: String) {
        getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit()
            .putString(KEY_STATUS, "failed")
            .apply()
        val notification = NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.stat_notify_error)
            .setContentTitle("更新下载失败")
            .setContentText(message)
            .setContentIntent(launchAppPendingIntent())
            .setAutoCancel(true)
            .build()
        getSystemService(NotificationManager::class.java).notify(NOTIFICATION_ID, notification)
        stopForegroundCompat()
        stopSelf()
    }

    private fun updateState(status: String, downloaded: Long, total: Long) {
        getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit()
            .putString(KEY_STATUS, status)
            .putLong(KEY_DOWNLOADED, downloaded)
            .putLong(KEY_TOTAL, total)
            .apply()
    }

    private fun updateNotification(
        text: String,
        downloaded: Long,
        total: Long,
        indeterminate: Boolean,
        force: Boolean = false,
    ) {
        val now = System.currentTimeMillis()
        if (!force) {
            val previous = lastNotificationAt.get()
            if (now - previous < 750L || !lastNotificationAt.compareAndSet(previous, now)) return
        } else {
            lastNotificationAt.set(now)
        }
        getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit()
            .putLong(KEY_DOWNLOADED, downloaded)
            .putLong(KEY_TOTAL, total)
            .apply()
        getSystemService(NotificationManager::class.java).notify(
            NOTIFICATION_ID,
            buildProgressNotification(text, downloaded, total, indeterminate),
        )
    }

    private fun buildProgressNotification(
        text: String,
        downloaded: Long,
        total: Long,
        indeterminate: Boolean,
    ) = NotificationCompat.Builder(this, CHANNEL_ID)
        .setSmallIcon(android.R.drawable.stat_sys_download)
        .setContentTitle("正在下载应用更新")
        .setContentText(
            if (total > 0 && !indeterminate) {
                "$text ${downloaded * 100L / total}%"
            } else {
                text
            }
        )
        .setProgress(
            100,
            if (total > 0) (downloaded * 100L / total).toInt().coerceIn(0, 100) else 0,
            indeterminate || total <= 0,
        )
        .setContentIntent(launchAppPendingIntent())
        .setOnlyAlertOnce(true)
        .setOngoing(true)
        .setCategory(NotificationCompat.CATEGORY_PROGRESS)
        .build()

    private fun openConnection(url: String): HttpURLConnection {
        return (URL(url).openConnection() as HttpURLConnection).apply {
            connectTimeout = 15000
            readTimeout = 30000
            instanceFollowRedirects = true
            useCaches = false
            setRequestProperty("Accept", "application/vnd.android.package-archive,*/*")
            setRequestProperty("Accept-Encoding", "identity")
            setRequestProperty("Connection", "keep-alive")
        }
    }

    private fun partFile(spec: DownloadSpec, index: Int): File {
        return File(spec.apkFile.absolutePath + ".part$index")
    }

    private fun clearPartFiles(spec: DownloadSpec, count: Int) {
        repeat(count) { partFile(spec, it).delete() }
        File(spec.apkFile.absolutePath + ".merging").delete()
    }

    private fun sleepInterruptibly(durationMs: Long, abort: AtomicBoolean) {
        var remaining = durationMs
        while (remaining > 0 && !abort.get() && !destroyed.get()) {
            val step = minOf(remaining, 500L)
            Thread.sleep(step)
            remaining -= step
        }
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val channel = NotificationChannel(
            CHANNEL_ID,
            "应用更新下载",
            NotificationManager.IMPORTANCE_LOW,
        ).apply {
            description = "显示应用更新安装包的下载进度"
            setSound(null, null)
        }
        getSystemService(NotificationManager::class.java).createNotificationChannel(channel)
    }

    private fun launchAppPendingIntent(): PendingIntent? {
        val intent = packageManager.getLaunchIntentForPackage(packageName)?.apply {
            addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP)
        } ?: return null
        return PendingIntent.getActivity(
            this,
            19009,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
    }

    private fun installerPendingIntent(file: File): PendingIntent {
        val uri = FileProvider.getUriForFile(this, "$packageName.fileprovider", file)
        val intent = Intent(Intent.ACTION_VIEW).apply {
            setDataAndType(uri, "application/vnd.android.package-archive")
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        return PendingIntent.getActivity(
            this,
            19010,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
    }

    private fun stopForegroundCompat() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            stopForeground(STOP_FOREGROUND_DETACH)
        } else {
            @Suppress("DEPRECATION")
            stopForeground(false)
        }
    }
}
