# APK 打包安装问题记录

记录时间：2026-06-06

## 这次遇到的问题

1. 正常 `flutter build apk --debug` 和 `build-debug-apk.ps1` 跑很久没有新 APK。
   - 表现：`app/build/app/outputs/flutter-apk` 里最新包时间不变。
   - 不能只看进程还在，要看 APK 时间和构建目录最近写入时间。

2. Gradle 不是卡在安装，是卡在打包阶段。
   - 当时最新旧包是 `app-debug.apk`，时间还是中午旧时间。
   - 没生成新包前，不能拿旧包给用户安装。

3. Gradle 卡住的原因是外部依赖元数据解析/仓库响应慢。
   - `jstack` 里能看到 `AccessorBackedExternalResource.getMetaData`、`resolveComponentMetaData`。
   - 这种情况不要一直等，直接停掉当前构建，改走离线构建。

4. Android NDK 版本提示不是这次的直接失败原因。
   - 日志提示需要 `26.1.10909125`，但本机 `D:\myApp\Android\Sdk` 下没有 `ndk` 目录。
   - 离线 debug 包最后仍然打出来了，所以先不要因为这个提示乱改。

5. ADB 第一次查询设备可能只显示启动 daemon。
   - 表现：只输出 `daemon not running; starting now...`
   - 解决：再跑一次 `adb devices`，看到 `device` 状态再安装。

## 以后优先使用的本地测试打包流程

本地手机测试优先走离线 Gradle 脚本，避免联网解析依赖卡住：

```powershell
cd D:\myApp\work_ycykj\jjyx\jjyx
powershell -NoProfile -ExecutionPolicy Bypass -File .\build-gradle-offline-apk.ps1 -NetworkProfile lan -ApiHost 192.168.31.73 -ServerPort 3001 -TargetPlatform android-arm64
```

说明：

- `ApiHost` 要用当前电脑局域网 IP，先用 `ipconfig` 查。
- 这次本机 IP 是 `192.168.31.73`。
- 手机测试优先 `android-arm64`，不要一上来打 universal 包。
- 打包输出路径固定是：

```text
D:\myApp\work_ycykj\jjyx\jjyx\app\build\app\outputs\flutter-apk\app-debug.apk
```

- 现在脚本会额外复制一份带日期时间的 APK，格式类似：

```text
jjyx-lan-192.168.1.4-20260606-172530-debug.apk
```

- 后续安装和发包优先看这个带时间的文件，避免拿错旧包。

## 判断是否已经成功生成新包

```powershell
Get-ChildItem D:\myApp\work_ycykj\jjyx\jjyx\app\build\app\outputs\flutter-apk\*.apk |
  Sort-Object LastWriteTime -Descending |
  Select-Object -First 10 Name,Length,LastWriteTime,FullName
```

确认 `app-debug.apk` 的 `LastWriteTime` 是刚刚生成的时间，再说包好了。

可选校验：

```powershell
Get-FileHash -Algorithm MD5 D:\myApp\work_ycykj\jjyx\jjyx\app\build\app\outputs\flutter-apk\app-debug.apk
```

## 安装到手机

先确认手机：

```powershell
D:\myApp\Android\Sdk\platform-tools\adb.exe devices
```

安装：

```powershell
D:\myApp\Android\Sdk\platform-tools\adb.exe install -r "D:\myApp\work_ycykj\jjyx\jjyx\app\build\app\outputs\flutter-apk\app-debug.apk"
```

成功输出：

```text
Performing Streamed Install
Success
```

## 这次成功包信息

```text
路径：D:\myApp\work_ycykj\jjyx\jjyx\app\build\app\outputs\flutter-apk\app-debug.apk
时间：2026/6/6 15:55:05
大小：261736395
MD5：C8E2659484F49C29744AAD692189CC68
设备：5cd85a97 device
```

## 遇到长时间无输出时的处理

1. 先查 APK 输出目录，不要猜。
2. 查进程：

```powershell
Get-Process | Where-Object { $_.ProcessName -match 'flutter|dart|java|gradle|powershell' }
```

3. 查最近构建文件写入时间：

```powershell
Get-ChildItem -Recurse -File D:\myApp\work_ycykj\jjyx\jjyx\app\build |
  Sort-Object LastWriteTime -Descending |
  Select-Object -First 20 FullName,Length,LastWriteTime
```

4. 如果 2-3 分钟都没有新文件写入，而且没有新 APK，就停止当前构建，改用离线脚本。
